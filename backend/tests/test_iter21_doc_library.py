"""
Iter21 — Document Library Phase 2 (8 doc types) backend regression
Tests: /api/docs/types, POST /api/docs/{doc_type}, GET /api/docs?doc_type=...,
       GET/PATCH/DELETE /api/docs/{doc_id}, GET /api/docs/{doc_id}/pdf, auth,
       unknown doc type 404.
"""
import os
import requests
import pytest

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"

DOC_TYPES = [
    "jsa", "risk_assessment", "sssp", "emergency_plan",
    "hazardous_chemicals", "site_induction",
    "confined_space_permit", "toolbox_talk_record",
]

MIN_PAYLOADS = {
    "jsa": {"task": "TEST_jsa task", "site": "Lot 1", "prepared_by": "Tester"},
    "risk_assessment": {"activity": "TEST_RA", "site": "Lot 1", "trade": "Electrical"},
    "sssp": {"site_name": "TEST_SSSP", "site_state": "NSW"},
    "emergency_plan": {"site_name": "TEST_EP", "site_state": "VIC"},
    "hazardous_chemicals": {"company_name": "TEST_HCR Co", "site_location": "Yard"},
    "site_induction": {"worker_name": "TEST_W", "site_name": "Lot 1"},
    "confined_space_permit": {"space_id": "TEST_CSP-1", "location": "Tank A"},
    "toolbox_talk_record": {"topic": "TEST_TBT", "site": "Lot 1"},
}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    if r.status_code != 200:
        # Try register then login
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
    """Create one doc per type, yield mapping doc_type -> doc_id, cleanup at end."""
    ids = {}
    for dt in DOC_TYPES:
        r = requests.post(f"{BASE}/api/docs/{dt}", json=MIN_PAYLOADS[dt],
                          headers=headers, timeout=30)
        assert r.status_code == 200, f"{dt} create: {r.status_code} {r.text}"
        d = r.json()
        assert d["doc_type"] == dt
        assert d["reference"]
        assert d["doc_id"].startswith("doc_")
        assert d["status"] == "draft"
        assert d["version"] == 1
        ids[dt] = d["doc_id"]
    yield ids
    # cleanup: delete twice (archive then hard remove)
    for did in ids.values():
        requests.delete(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
        requests.delete(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)


# ---------- /docs/types ----------
def test_docs_types_returns_8_types_and_categories(headers):
    r = requests.get(f"{BASE}/api/docs/types", headers=headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert "categories" in body and len(body["categories"]) == 6
    assert "types" in body and len(body["types"]) == 8
    type_ids = {t["id"] for t in body["types"]}
    assert type_ids == set(DOC_TYPES)
    assert "states" in body and len(body["states"]) == 8
    for t in body["types"]:
        assert "fields" in t and isinstance(t["fields"], list)
        assert "category" in t and "label" in t and "counter_prefix" in t


# ---------- Auth enforcement ----------
@pytest.mark.parametrize("path,method", [
    ("/api/docs/jsa", "POST"),
    ("/api/docs", "GET"),
    ("/api/docs/doc_anything", "GET"),
    ("/api/docs/doc_anything", "PATCH"),
    ("/api/docs/doc_anything", "DELETE"),
    ("/api/docs/doc_anything/pdf", "GET"),
])
def test_auth_required(path, method):
    r = requests.request(method, f"{BASE}{path}", json={}, timeout=15)
    assert r.status_code in (401, 403), f"{method} {path} -> {r.status_code}"


# ---------- Unknown doc type ----------
def test_unknown_doc_type_returns_404(headers):
    r = requests.post(f"{BASE}/api/docs/not_a_type", json={"foo": "bar"},
                      headers=headers, timeout=15)
    assert r.status_code == 404


# ---------- Create + List + Get + Patch + PDF per doc type ----------
@pytest.mark.parametrize("dt", DOC_TYPES)
def test_list_filters_by_doc_type(headers, created_ids, dt):
    r = requests.get(f"{BASE}/api/docs?doc_type={dt}", headers=headers, timeout=15)
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list)
    ids = {row["doc_id"] for row in rows}
    assert created_ids[dt] in ids
    for row in rows:
        assert row["doc_type"] == dt
        assert "_id" not in row  # ObjectId stripped


@pytest.mark.parametrize("dt", DOC_TYPES)
def test_get_single_doc(headers, created_ids, dt):
    did = created_ids[dt]
    r = requests.get(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["doc_id"] == did
    assert body["doc_type"] == dt
    assert "_id" not in body


@pytest.mark.parametrize("dt", DOC_TYPES)
def test_patch_updates_status_and_persists(headers, created_ids, dt):
    did = created_ids[dt]
    r = requests.patch(f"{BASE}/api/docs/{did}",
                       json={"status": "in_use", "notes": "TEST_updated"},
                       headers=headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "in_use"
    assert body["notes"] == "TEST_updated"
    # GET to verify persistence
    g = requests.get(f"{BASE}/api/docs/{did}", headers=headers, timeout=15).json()
    assert g["status"] == "in_use"
    assert g["notes"] == "TEST_updated"


@pytest.mark.parametrize("dt", DOC_TYPES)
def test_pdf_returns_application_pdf(headers, created_ids, dt):
    did = created_ids[dt]
    r = requests.get(f"{BASE}/api/docs/{did}/pdf", headers=headers, timeout=60)
    assert r.status_code == 200, f"{dt} pdf: {r.status_code} {r.text[:200]}"
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert len(r.content) > 1000, f"{dt} pdf too small: {len(r.content)}"
    assert r.content[:4] == b"%PDF"


def test_delete_archives_then_removes(headers):
    # Create a fresh doc just for delete
    r = requests.post(f"{BASE}/api/docs/jsa",
                      json={"task": "TEST_delete_me"}, headers=headers, timeout=20)
    did = r.json()["doc_id"]
    # First delete = archive
    d1 = requests.delete(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
    assert d1.status_code == 200
    assert d1.json().get("archived") is True
    g1 = requests.get(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
    assert g1.status_code == 200
    assert g1.json()["status"] == "archived"
    # Second delete = hard remove
    d2 = requests.delete(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
    assert d2.status_code == 200
    assert d2.json().get("deleted") is True
    g2 = requests.get(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
    assert g2.status_code == 404


# ---------- Phase 1 regression ----------
def test_swms_regression_list(headers):
    r = requests.get(f"{BASE}/api/swms", headers=headers, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_swms_regression_create(headers):
    # Use the same minimal payload pattern as iter20 test
    r = requests.post(f"{BASE}/api/swms",
                      json={"company_name": "TEST_SWMS Co",
                            "work_activity": "TEST_regression",
                            "site_location": "Lot 1",
                            "site_state": "NSW",
                            "trade": "Electrical",
                            "activity": "TEST_regression",
                            "workers": [{"name": "Tester", "role": "Tester"}],
                            "hrcw_codes": [],
                            "rows": [],
                            "ppe_codes": [],
                            "training_codes": []},
                      headers=headers, timeout=30)
    assert r.status_code == 200, f"swms create: {r.status_code} {r.text[:300]}"
    body = r.json()
    assert body.get("reference", "").startswith("SWMS-")
    # cleanup
    sid = body["swms_id"]
    requests.delete(f"{BASE}/api/swms/{sid}", headers=headers, timeout=15)
    requests.delete(f"{BASE}/api/swms/{sid}", headers=headers, timeout=15)
