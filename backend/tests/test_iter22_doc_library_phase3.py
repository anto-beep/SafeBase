"""
Iter22 — Document Library Phase 3 (8 NEW doc types) backend regression
NEW types: whs_mgmt_plan, asbestos_register, ccew, plumbing_coc,
            hot_work_permit, excavation_permit, lift_plan, fall_protection
Counter prefixes: WMP / ASB / CCEW / PLB / HWP / EXP / LIFT / FPP

Endpoints reused (no new routes):
  GET    /api/docs/types
  POST   /api/docs/{doc_type}
  GET    /api/docs?doc_type=...
  GET    /api/docs/{doc_id}
  PATCH  /api/docs/{doc_id}
  DELETE /api/docs/{doc_id}
  GET    /api/docs/{doc_id}/pdf
"""
import os
import requests
import pytest

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"

PHASE2_TYPES = [
    "jsa", "risk_assessment", "sssp", "emergency_plan",
    "hazardous_chemicals", "site_induction",
    "confined_space_permit", "toolbox_talk_record",
]

PHASE3_TYPES = [
    "whs_mgmt_plan", "asbestos_register", "ccew", "plumbing_coc",
    "hot_work_permit", "excavation_permit", "lift_plan", "fall_protection",
]

EXPECTED_PREFIXES = {
    "whs_mgmt_plan": "WMP",
    "asbestos_register": "ASB",
    "ccew": "CCEW",
    "plumbing_coc": "PLB",
    "hot_work_permit": "HWP",
    "excavation_permit": "EXP",
    "lift_plan": "LIFT",
    "fall_protection": "FPP",
}

MIN_PAYLOADS = {
    "whs_mgmt_plan": {"project_name": "TEST_WMP project", "site_state": "NSW",
                      "prepared_by": "Tester"},
    "asbestos_register": {"site_name": "TEST_ASB site", "prepared_by": "Tester",
                          "items": [{"location": "Roof", "material": "Cement sheet",
                                     "friable": "No", "condition": "Good"}]},
    "ccew": {"licensee_name": "TEST_CCEW licensee", "licence_no": "EL12345",
             "site_address": "Lot 1"},
    "plumbing_coc": {"licensee_name": "TEST_PLB licensee", "licence_no": "PL999",
                     "job_site": "Lot 1"},
    "hot_work_permit": {"location": "TEST_HWP site", "work_description": "Welding",
                        "fire_watch_person": "Tester"},
    "excavation_permit": {"location": "TEST_EXP site", "work_description": "Trench"},
    "lift_plan": {"site": "TEST_LIFT site", "load_description": "Steel beam",
                  "load_weight_kg": 1500},
    "fall_protection": {"site": "TEST_FPP site", "work_area": "Roof edge",
                        "height_metres": 4.5},
}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    if r.status_code != 200:
        requests.post(f"{BASE}/api/auth/register", json={
            "email": EMAIL, "password": PASSWORD,
            "full_name": "Owner Demo", "business_name": "SafeTradie Demo"
        }, timeout=20)
        r = requests.post(f"{BASE}/api/auth/login",
                          json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def created_ids(headers):
    ids = {}
    refs = {}
    for dt in PHASE3_TYPES:
        r = requests.post(f"{BASE}/api/docs/{dt}", json=MIN_PAYLOADS[dt],
                          headers=headers, timeout=30)
        assert r.status_code == 200, f"{dt} create: {r.status_code} {r.text[:300]}"
        d = r.json()
        assert d["doc_type"] == dt
        assert d["doc_id"].startswith("doc_")
        assert d["reference"], f"{dt} missing reference"
        prefix = EXPECTED_PREFIXES[dt]
        assert d["reference"].startswith(prefix + "-"), \
            f"{dt} reference {d['reference']} does not start with {prefix}-"
        assert d["status"] == "draft"
        assert d["version"] == 1
        ids[dt] = d["doc_id"]
        refs[dt] = d["reference"]
    yield ids
    for did in ids.values():
        requests.delete(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
        requests.delete(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)


# ---------- /docs/types: 16 total ----------
def test_types_returns_16_total_with_phase3(headers):
    r = requests.get(f"{BASE}/api/docs/types", headers=headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    types = body.get("types", [])
    assert len(types) >= 16, f"expected at least 16 types, got {len(types)}"
    type_ids = {t["id"] for t in types}
    for t in PHASE2_TYPES + PHASE3_TYPES:
        assert t in type_ids, f"missing doc type: {t}"
    # spot-check counter_prefix
    by_id = {t["id"]: t for t in types}
    for dt, prefix in EXPECTED_PREFIXES.items():
        assert by_id[dt]["counter_prefix"] == prefix, \
            f"{dt} prefix {by_id[dt]['counter_prefix']} != {prefix}"
        assert "fields" in by_id[dt] and len(by_id[dt]["fields"]) > 0


def test_types_includes_new_table_field_types(headers):
    """Phase 3 introduced 4 new field type widgets."""
    r = requests.get(f"{BASE}/api/docs/types", headers=headers, timeout=15)
    body = r.json()
    by_id = {t["id"]: t for t in body["types"]}

    def field_type(doc_id, key):
        for f in by_id[doc_id]["fields"]:
            if f["key"] == key:
                return f.get("type")
        return None

    assert field_type("whs_mgmt_plan", "responsibilities") == "responsibilities"
    assert field_type("asbestos_register", "items") == "asbestos_items"
    assert field_type("ccew", "test_results") == "test_results"
    assert field_type("plumbing_coc", "work_items") == "plumbing_items"


# ---------- Auth enforcement (Phase 3 sample) ----------
@pytest.mark.parametrize("path,method", [
    ("/api/docs/whs_mgmt_plan", "POST"),
    ("/api/docs/lift_plan", "POST"),
    ("/api/docs/ccew", "POST"),
])
def test_auth_required_phase3(path, method):
    r = requests.request(method, f"{BASE}{path}", json={}, timeout=15)
    assert r.status_code in (401, 403), f"{method} {path} -> {r.status_code}"


# ---------- Unknown doc type ----------
def test_unknown_doc_type_returns_404(headers):
    r = requests.post(f"{BASE}/api/docs/zzz_not_a_type",
                      json={"foo": "bar"}, headers=headers, timeout=15)
    assert r.status_code == 404


# ---------- Per-type: list filter ----------
@pytest.mark.parametrize("dt", PHASE3_TYPES)
def test_list_filters_by_doc_type(headers, created_ids, dt):
    r = requests.get(f"{BASE}/api/docs?doc_type={dt}", headers=headers, timeout=15)
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list)
    ids = {row["doc_id"] for row in rows}
    assert created_ids[dt] in ids
    for row in rows:
        assert row["doc_type"] == dt
        assert "_id" not in row


# ---------- Per-type: get single ----------
@pytest.mark.parametrize("dt", PHASE3_TYPES)
def test_get_single_doc(headers, created_ids, dt):
    did = created_ids[dt]
    r = requests.get(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["doc_id"] == did
    assert body["doc_type"] == dt
    assert "_id" not in body


# ---------- Per-type: PDF ----------
@pytest.mark.parametrize("dt", PHASE3_TYPES)
def test_pdf_returns_application_pdf_size_gt_5000(headers, created_ids, dt):
    did = created_ids[dt]
    r = requests.get(f"{BASE}/api/docs/{did}/pdf", headers=headers, timeout=60)
    assert r.status_code == 200, f"{dt} pdf: {r.status_code} {r.text[:200]}"
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content[:4] == b"%PDF", f"{dt} bad magic: {r.content[:6]}"
    assert len(r.content) > 5000, f"{dt} pdf too small: {len(r.content)}"


# ---------- PATCH spot-check on lift_plan ----------
def test_patch_lift_plan_updates_load_weight_and_hazards(headers, created_ids):
    did = created_ids["lift_plan"]
    payload = {
        "load_weight_kg": 2750,
        "hazards": ["Wind > 30km/h", "Adjacent power line", "Soft ground"],
        "status": "in_use",
    }
    r = requests.patch(f"{BASE}/api/docs/{did}", json=payload,
                       headers=headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["load_weight_kg"] == 2750
    assert body["hazards"] == payload["hazards"]
    assert body["status"] == "in_use"
    g = requests.get(f"{BASE}/api/docs/{did}", headers=headers, timeout=15).json()
    assert g["load_weight_kg"] == 2750
    assert g["hazards"] == payload["hazards"]
    assert g["status"] == "in_use"


# ---------- DELETE soft then hard ----------
def test_delete_archives_then_removes_phase3(headers):
    r = requests.post(f"{BASE}/api/docs/hot_work_permit",
                      json={"location": "TEST_delete_me_HWP",
                            "work_description": "to delete"},
                      headers=headers, timeout=20)
    assert r.status_code == 200, r.text[:300]
    did = r.json()["doc_id"]
    d1 = requests.delete(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
    assert d1.status_code == 200
    assert d1.json().get("archived") is True
    g1 = requests.get(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
    assert g1.status_code == 200
    assert g1.json()["status"] == "archived"
    d2 = requests.delete(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
    assert d2.status_code == 200
    assert d2.json().get("deleted") is True
    g2 = requests.get(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
    assert g2.status_code == 404


# ---------- Phase-2 regression: PDFs still render ----------
@pytest.mark.parametrize("dt,payload", [
    ("jsa", {"task": "TEST_phase2_regression", "site": "Lot 1"}),
    ("emergency_plan", {"site_name": "TEST_phase2_regression", "site_state": "VIC"}),
])
def test_phase2_regression_pdf(headers, dt, payload):
    r = requests.post(f"{BASE}/api/docs/{dt}", json=payload,
                      headers=headers, timeout=30)
    assert r.status_code == 200, f"{dt} create: {r.status_code} {r.text[:300]}"
    did = r.json()["doc_id"]
    p = requests.get(f"{BASE}/api/docs/{did}/pdf", headers=headers, timeout=60)
    assert p.status_code == 200
    assert p.headers.get("content-type", "").startswith("application/pdf")
    assert p.content[:4] == b"%PDF"
    assert len(p.content) > 1000
    requests.delete(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
    requests.delete(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
