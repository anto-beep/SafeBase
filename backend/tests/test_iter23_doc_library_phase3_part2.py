"""
Iter23 — Document Library Phase 3 Part 2 (15 NEW doc types) backend regression.
Total doc types now = 31 (8 Phase2 + 8 Phase3-Part1 + 15 Phase3-Part2).

NEW types validated here:
  gas_compliance/GAS  pressure_test/PT    backflow_test/BFT
  tmp/TMP             plant_prestart/PPS  scaffold_handover/SCF
  heights_permit/WAH  loto/LOTO           manual_handling_ra/MHR
  noise_assessment/NOISE  silica_plan/SIL welding_procedure/WPS
  test_tag_register/TT    fire_safety_plan/FSP  emp/EMP

Categories: 20 safety / 1 worker / 7 trade / 3 plant
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
PHASE3_P1_TYPES = [
    "whs_mgmt_plan", "asbestos_register", "ccew", "plumbing_coc",
    "hot_work_permit", "excavation_permit", "lift_plan", "fall_protection",
]
PHASE3_P2_TYPES = [
    "gas_compliance", "pressure_test", "backflow_test", "tmp",
    "plant_prestart", "scaffold_handover", "heights_permit", "loto",
    "manual_handling_ra", "noise_assessment", "silica_plan",
    "welding_procedure", "test_tag_register", "fire_safety_plan", "emp",
]

EXPECTED_PREFIXES = {
    "gas_compliance": "GAS", "pressure_test": "PT", "backflow_test": "BFT",
    "tmp": "TMP", "plant_prestart": "PPS", "scaffold_handover": "SCF",
    "heights_permit": "WAH", "loto": "LOTO", "manual_handling_ra": "MHR",
    "noise_assessment": "NOISE", "silica_plan": "SIL",
    "welding_procedure": "WPS", "test_tag_register": "TT",
    "fire_safety_plan": "FSP", "emp": "EMP",
}

EXPECTED_CATEGORIES = {
    "gas_compliance": "trade", "pressure_test": "trade",
    "backflow_test": "trade", "welding_procedure": "trade",
    "test_tag_register": "trade",
    "tmp": "safety", "heights_permit": "safety", "loto": "safety",
    "manual_handling_ra": "safety", "noise_assessment": "safety",
    "silica_plan": "safety", "fire_safety_plan": "safety", "emp": "safety",
    "plant_prestart": "plant", "scaffold_handover": "plant",
}

# Minimum valid payloads per spec hint
MIN_PAYLOADS = {
    "gas_compliance": {"licensee_name": "TEST_GAS licensee", "licence_no": "G-123"},
    "pressure_test": {"project": "TEST_PT project", "test_pressure_kpa": 1500},
    "backflow_test": {"site": "TEST_BFT site", "device_type": "RPZ"},
    "tmp": {"project_name": "TEST_TMP project", "speed_zone": 60},
    "plant_prestart": {"plant_name": "TEST_PPS excavator", "plant_serial": "X-1"},
    "scaffold_handover": {"project": "TEST_SCF project", "max_swl": 450},
    "heights_permit": {"location": "TEST_WAH roof", "height_metres": 6.5},
    "loto": {"system": "TEST_LOTO panel", "energy_sources": "Electrical 415V"},
    "manual_handling_ra": {"task": "TEST_MHR lifting", "assessed_by": "Tester"},
    "noise_assessment": {"site": "TEST_NOISE site",
                         "measurements": [{"source": "Grinder", "db_a": 92,
                                           "duration": "4h"}]},
    "silica_plan": {"project": "TEST_SIL project",
                    "tasks": [{"task": "Cutting pavers", "material": "Concrete"}]},
    "welding_procedure": {"wps_number": "TEST_WPS-001",
                          "welding_process": "MIG"},
    "test_tag_register": {"company_name": "TEST_TT Co",
                          "items": [{"asset_id": "A-1",
                                     "description": "Drill"}]},
    "fire_safety_plan": {"site_name": "TEST_FSP site",
                         "building_class": "Class 5"},
    "emp": {"project": "TEST_EMP project", "site_state": "NSW"},
}


# ---------- auth fixtures ----------
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
    """Create one doc of each Phase 3 Part 2 type; tear down at end."""
    ids = {}
    for dt in PHASE3_P2_TYPES:
        r = requests.post(f"{BASE}/api/docs/{dt}", json=MIN_PAYLOADS[dt],
                          headers=headers, timeout=30)
        assert r.status_code == 200, \
            f"{dt} create failed: {r.status_code} {r.text[:300]}"
        d = r.json()
        assert d["doc_type"] == dt
        assert d["doc_id"].startswith("doc_")
        prefix = EXPECTED_PREFIXES[dt]
        assert d["reference"].startswith(prefix + "-"), \
            f"{dt}: reference {d['reference']} missing prefix {prefix}-"
        assert d["status"] == "draft"
        assert d["version"] == 1
        ids[dt] = d["doc_id"]
    yield ids
    for did in ids.values():
        requests.delete(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
        requests.delete(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)


# ---------- /docs/types: 31 total ----------
def test_types_returns_31_total(headers):
    r = requests.get(f"{BASE}/api/docs/types", headers=headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    types = body.get("types", [])
    assert len(types) == 31, f"expected 31 types, got {len(types)}"
    type_ids = {t["id"] for t in types}
    all_expected = PHASE2_TYPES + PHASE3_P1_TYPES + PHASE3_P2_TYPES
    for t in all_expected:
        assert t in type_ids, f"missing doc type: {t}"


def test_all_15_new_types_prefixes_and_categories(headers):
    r = requests.get(f"{BASE}/api/docs/types", headers=headers, timeout=15)
    body = r.json()
    by_id = {t["id"]: t for t in body["types"]}
    for dt in PHASE3_P2_TYPES:
        assert dt in by_id, f"{dt} not in /docs/types"
        spec = by_id[dt]
        assert spec["counter_prefix"] == EXPECTED_PREFIXES[dt], \
            f"{dt} prefix {spec['counter_prefix']} != {EXPECTED_PREFIXES[dt]}"
        assert spec["category"] == EXPECTED_CATEGORIES[dt], \
            f"{dt} category {spec['category']} != {EXPECTED_CATEGORIES[dt]}"
        assert isinstance(spec.get("fields"), list) and len(spec["fields"]) > 0


def test_category_counts(headers):
    """Phase 3 Part 2 target distribution: 20 safety / 1 worker / 7 trade / 3 plant"""
    r = requests.get(f"{BASE}/api/docs/types", headers=headers, timeout=15)
    body = r.json()
    counts = {}
    for t in body["types"]:
        counts[t["category"]] = counts.get(t["category"], 0) + 1
    assert counts.get("safety", 0) == 20, f"safety={counts.get('safety')}"
    assert counts.get("worker", 0) == 1, f"worker={counts.get('worker')}"
    assert counts.get("trade", 0) == 7, f"trade={counts.get('trade')}"
    assert counts.get("plant", 0) == 3, f"plant={counts.get('plant')}"


def test_new_table_field_type_widgets_present(headers):
    """Spot-check: new table field type names registered in spec['fields']."""
    r = requests.get(f"{BASE}/api/docs/types", headers=headers, timeout=15)
    by_id = {t["id"]: t for t in r.json()["types"]}

    def ftype(doc_id, key):
        for f in by_id[doc_id]["fields"]:
            if f["key"] == key:
                return f.get("type")
        return None

    assert ftype("backflow_test", "tests") == "backflow_tests"
    assert ftype("noise_assessment", "measurements") == "noise_measurements"
    assert ftype("test_tag_register", "items") == "test_tag_items"
    assert ftype("emp", "aspects") == "emp_aspects"
    assert ftype("silica_plan", "tasks") == "silica_tasks"
    assert ftype("loto", "isolation_points") == "loto_points"
    assert ftype("tmp", "signage") == "tmp_signage"
    assert ftype("manual_handling_ra", "factors") == "mh_factors"
    assert ftype("manual_handling_ra", "controls") == "mh_controls"
    assert ftype("fire_safety_plan", "detection_systems") == "fire_detection"
    assert ftype("fire_safety_plan", "equipment") == "fire_equipment"
    assert ftype("emp", "waste_streams") == "waste_streams"
    assert ftype("emp", "compliance_items") == "emp_compliance"
    assert ftype("silica_plan", "rpe") == "rpe_items"


# ---------- Auth enforcement on 3 new endpoints ----------
@pytest.mark.parametrize("dt", ["welding_procedure", "loto", "emp"])
def test_auth_required_on_new_types(dt):
    r = requests.post(f"{BASE}/api/docs/{dt}", json={}, timeout=15)
    assert r.status_code in (401, 403), f"{dt} -> {r.status_code}"


# ---------- Per-type: list filter ----------
@pytest.mark.parametrize("dt", PHASE3_P2_TYPES)
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


# ---------- Per-type: GET single ----------
@pytest.mark.parametrize("dt", PHASE3_P2_TYPES)
def test_get_single_doc(headers, created_ids, dt):
    did = created_ids[dt]
    r = requests.get(f"{BASE}/api/docs/{did}", headers=headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["doc_id"] == did
    assert body["doc_type"] == dt
    assert "_id" not in body


# ---------- Per-type: PDF ----------
@pytest.mark.parametrize("dt", PHASE3_P2_TYPES)
def test_pdf_returns_application_pdf_size_gt_5000(headers, created_ids, dt):
    did = created_ids[dt]
    r = requests.get(f"{BASE}/api/docs/{did}/pdf", headers=headers, timeout=60)
    assert r.status_code == 200, f"{dt} pdf: {r.status_code} {r.text[:200]}"
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content[:4] == b"%PDF", f"{dt} bad magic: {r.content[:6]}"
    assert len(r.content) > 5000, f"{dt} pdf too small: {len(r.content)}"


# ---------- PATCH on 2 new types ----------
def test_patch_tmp_updates_speed_zone(headers, created_ids):
    did = created_ids["tmp"]
    r = requests.patch(f"{BASE}/api/docs/{did}",
                       json={"speed_zone": 40, "road_class": "Local",
                             "status": "in_use"},
                       headers=headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["speed_zone"] == 40
    assert body["road_class"] == "Local"
    g = requests.get(f"{BASE}/api/docs/{did}", headers=headers, timeout=15).json()
    assert g["speed_zone"] == 40
    assert g["road_class"] == "Local"


def test_patch_loto_updates_stored_energy_steps(headers, created_ids):
    did = created_ids["loto"]
    steps = "Bleed accumulator; Verify zero volts; Ground & isolate."
    r = requests.patch(f"{BASE}/api/docs/{did}",
                       json={"stored_energy_steps": steps,
                             "personnel_clear": "Y"},
                       headers=headers, timeout=15)
    assert r.status_code == 200
    assert r.json()["stored_energy_steps"] == steps
    g = requests.get(f"{BASE}/api/docs/{did}", headers=headers, timeout=15).json()
    assert g["stored_energy_steps"] == steps
    assert g["personnel_clear"] == "Y"


# ---------- DELETE soft then hard (on welding_procedure) ----------
def test_delete_archives_then_removes(headers):
    r = requests.post(f"{BASE}/api/docs/welding_procedure",
                      json={"wps_number": "TEST_delete_me_WPS"},
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


# ---------- Regression: 3 existing types still generate PDF ----------
@pytest.mark.parametrize("dt,payload", [
    ("jsa", {"task": "TEST_regression_jsa", "site": "Lot 1"}),
    ("whs_mgmt_plan", {"project_name": "TEST_regression_WMP",
                       "site_state": "NSW", "prepared_by": "Tester"}),
    ("ccew", {"licensee_name": "TEST_regression_CCEW",
              "licence_no": "EL12345", "site_address": "Lot 1"}),
])
def test_regression_existing_types_pdf(headers, dt, payload):
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
