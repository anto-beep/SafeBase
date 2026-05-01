"""Iter20 — SWMS Generator Phase 1 backend tests."""
import os
import time
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')


@pytest.fixture(scope="module")
def owner_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "owner@safetradie.demo", "password": "Demo@1234"}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    try:
        db = MongoClient(MONGO_URL)[DB_NAME]
        db.swms.delete_many({"reference": {"$regex": "^SWMS-"}, "work_activity": {"$regex": "^TEST_"}})
        db.swms_sign_tokens.delete_many({"worker_name": {"$regex": "^TEST_"}})
    except Exception as e:
        print(f"cleanup skip: {e}")


# -------- Reference --------
def test_reference_data(auth_headers):
    r = requests.get(f"{BASE_URL}/api/swms/reference", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert len(d["hrcw_categories"]) == 20
    assert len(d["trades"]) == 21
    assert len(d["state_regulators"]) == 8
    assert len(d["hierarchy_levels"]) == 6
    assert len(d["standard_ppe"]) == 19
    assert len(d["standard_training"]) == 18


# -------- AI suggest-hrcw --------
def test_suggest_hrcw_solar(auth_headers):
    r = requests.post(f"{BASE_URL}/api/swms/ai/suggest-hrcw",
                      headers=auth_headers,
                      json={"trade": "electrician", "activity": "Solar and renewable energy installation"},
                      timeout=20)
    assert r.status_code == 200
    codes = r.json()["hrcw_codes"]
    assert "fall_2m" in codes and "energised_electrical" in codes


def test_suggest_hrcw_unknown(auth_headers):
    r = requests.post(f"{BASE_URL}/api/swms/ai/suggest-hrcw",
                      headers=auth_headers,
                      json={"trade": "nonexistent", "activity": ""},
                      timeout=20)
    assert r.status_code == 200
    assert r.json()["hrcw_codes"] == []


def test_suggest_hrcw_underground(auth_headers):
    r = requests.post(f"{BASE_URL}/api/swms/ai/suggest-hrcw",
                      headers=auth_headers,
                      json={"trade": "electrician", "activity": "Underground cable laying"},
                      timeout=20)
    codes = r.json()["hrcw_codes"]
    assert "excavation_1_5m" in codes
    assert "energised_electrical" in codes  # default for electrician


# -------- AI suggest-rows (may use fallback) --------
def test_suggest_rows_structure(auth_headers):
    r = requests.post(f"{BASE_URL}/api/swms/ai/suggest-rows",
                      headers=auth_headers,
                      json={"trade": "electrician",
                            "activity": "Solar and renewable energy installation",
                            "hrcw_codes": ["fall_2m", "energised_electrical"],
                            "site_state": "NSW"},
                      timeout=90)
    assert r.status_code == 200
    data = r.json()
    assert "rows" in data and "fallback" in data
    rows = data["rows"]
    assert len(rows) >= 1
    for row in rows:
        assert "row_id" in row and "task" in row
        assert isinstance(row["hazards"], list)
        for c in row["controls"]:
            assert c["level"] in ["eliminate", "substitute", "isolate", "engineer", "admin", "ppe"]


# -------- CRUD --------
@pytest.fixture(scope="module")
def created_swms(auth_headers):
    payload = {
        "company_name": "TEST_Co",
        "work_activity": "TEST_solar_install",
        "site_location": "123 Test St, Sydney",
        "site_state": "NSW",
        "trade": "electrician",
        "activity": "Solar and renewable energy installation",
        "hrcw_codes": ["fall_2m", "energised_electrical"],
        "workers": [{"name": "TEST_Worker1"}, {"name": "TEST_Worker2"}],
        "rows": [{"task": "Set up fall arrest", "hazards": ["Fall from roof"],
                  "controls": [{"level": "engineer", "text": "Install guardrails"}]}],
    }
    r = requests.post(f"{BASE_URL}/api/swms", headers=auth_headers, json=payload, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


def test_create_swms(created_swms):
    assert created_swms["reference"].startswith("SWMS-")
    assert created_swms["version"] == 1
    assert created_swms["status"] == "draft"
    assert created_swms["audit_log"][0]["event"] == "created"
    assert created_swms["revisions"][0]["version"] == 1
    assert "retention_until" in created_swms
    assert "review_date" in created_swms


def test_list_swms(auth_headers, created_swms):
    r = requests.get(f"{BASE_URL}/api/swms", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    assert any(s["swms_id"] == created_swms["swms_id"] for s in r.json())


def test_get_swms(auth_headers, created_swms):
    r = requests.get(f"{BASE_URL}/api/swms/{created_swms['swms_id']}", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    assert r.json()["reference"] == created_swms["reference"]


def test_patch_swms_draft_no_bump(auth_headers, created_swms):
    r = requests.patch(f"{BASE_URL}/api/swms/{created_swms['swms_id']}",
                       headers=auth_headers,
                       json={"ppe": ["Safety helmet (hard hat) — AS/NZS 1801"]}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    # version does NOT bump when status is draft
    assert d["version"] == 1
    assert any(e["event"] == "updated" for e in d["audit_log"])


def test_patch_swms_bumps_after_signed(auth_headers, created_swms):
    sid = created_swms["swms_id"]
    # force status to signed
    requests.post(f"{BASE_URL}/api/swms/{sid}/status", headers=auth_headers,
                  json={"status": "signed"}, timeout=15)
    r = requests.patch(f"{BASE_URL}/api/swms/{sid}", headers=auth_headers,
                       json={"rows": [{"task": "Updated", "hazards": [], "controls": []}]}, timeout=15)
    assert r.status_code == 200
    assert r.json()["version"] == 2
    # reset to draft for later tests via raw update is skipped; use status
    requests.post(f"{BASE_URL}/api/swms/{sid}/status", headers=auth_headers,
                  json={"status": "draft"}, timeout=15)


def test_duplicate_swms(auth_headers, created_swms):
    r = requests.post(f"{BASE_URL}/api/swms/{created_swms['swms_id']}/duplicate",
                      headers=auth_headers, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["swms_id"] != created_swms["swms_id"]
    assert d["reference"] != created_swms["reference"]
    assert d["status"] == "draft"
    assert d["version"] == 1
    assert all(not w.get("signed") for w in d.get("workers", []))
    assert d["audit_log"][0]["event"] == "duplicated"


# -------- Sign --------
def test_sign_swms_in_person(auth_headers, created_swms):
    r = requests.post(f"{BASE_URL}/api/swms/{created_swms['swms_id']}/sign",
                      headers=auth_headers,
                      json={"name": "TEST_Worker1", "signature_data": "data:image/png;base64,AAA",
                            "signed_via": "in_person"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["signed"] is True
    assert d["status"] == "awaiting_signatures"  # still one unsigned


def test_sign_missing_sig(auth_headers, created_swms):
    r = requests.post(f"{BASE_URL}/api/swms/{created_swms['swms_id']}/sign",
                      headers=auth_headers, json={"name": "X"}, timeout=15)
    assert r.status_code == 400


# -------- Send sign links + public flow --------
def test_send_sign_links_and_public_sign(auth_headers, created_swms):
    sid = created_swms["swms_id"]
    r = requests.post(f"{BASE_URL}/api/swms/{sid}/send-sign-links",
                      headers=auth_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["sent"] >= 1
    token = data["tokens"][0]["token"]
    # Public GET (no auth)
    r2 = requests.get(f"{BASE_URL}/api/public/swms/sign/{token}", timeout=15)
    assert r2.status_code == 200, r2.text
    pub = r2.json()
    assert pub["reference"] == created_swms["reference"]
    assert "rows" in pub and "ppe" in pub
    # Public POST sign
    r3 = requests.post(f"{BASE_URL}/api/public/swms/sign/{token}",
                       json={"signature_data": "data:image/png;base64,BBB"}, timeout=15)
    assert r3.status_code == 200
    assert r3.json()["signed"] is True
    # Reuse should 410
    r4 = requests.get(f"{BASE_URL}/api/public/swms/sign/{token}", timeout=15)
    assert r4.status_code == 410
    # Unknown token 404
    r5 = requests.get(f"{BASE_URL}/api/public/swms/sign/unknowntoken123", timeout=15)
    assert r5.status_code == 404


# -------- Status transitions --------
def test_status_reviewed_pushes_review_date(auth_headers, created_swms):
    r = requests.post(f"{BASE_URL}/api/swms/{created_swms['swms_id']}/status",
                      headers=auth_headers, json={"status": "reviewed"}, timeout=15)
    assert r.status_code == 200
    get_r = requests.get(f"{BASE_URL}/api/swms/{created_swms['swms_id']}", headers=auth_headers, timeout=10)
    doc = get_r.json()
    assert doc["status"] == "reviewed"
    assert doc.get("last_reviewed_at")


def test_status_invalid(auth_headers, created_swms):
    r = requests.post(f"{BASE_URL}/api/swms/{created_swms['swms_id']}/status",
                      headers=auth_headers, json={"status": "weird"}, timeout=15)
    assert r.status_code == 400


# -------- Link incident --------
def test_link_incident_locks(auth_headers, created_swms):
    sid = created_swms["swms_id"]
    r = requests.post(f"{BASE_URL}/api/swms/{sid}/link-incident",
                      headers=auth_headers,
                      json={"incident_id": "TEST_inc_1", "notifiable": True}, timeout=15)
    assert r.status_code == 200
    assert r.json()["locked"] is True
    # Delete should 400
    r2 = requests.delete(f"{BASE_URL}/api/swms/{sid}", headers=auth_headers, timeout=15)
    assert r2.status_code == 400


# -------- PDF --------
def test_pdf_download(auth_headers, created_swms):
    r = requests.get(f"{BASE_URL}/api/swms/{created_swms['swms_id']}/pdf",
                     headers=auth_headers, timeout=45)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert "attachment" in r.headers.get("content-disposition", "")
    assert r.content[:5] == b"%PDF-"
    assert len(r.content) >= 20_000


# -------- Delete soft/hard (on a fresh SWMS, not incident-locked) --------
def test_soft_then_hard_delete(auth_headers):
    payload = {
        "company_name": "TEST_DelCo", "work_activity": "TEST_del",
        "site_location": "X", "site_state": "NSW",
        "trade": "electrician", "activity": "Cable installation and termination",
    }
    r = requests.post(f"{BASE_URL}/api/swms", headers=auth_headers, json=payload, timeout=15)
    sid = r.json()["swms_id"]
    # First delete → archive
    r1 = requests.delete(f"{BASE_URL}/api/swms/{sid}", headers=auth_headers, timeout=15)
    assert r1.status_code == 200
    assert r1.json().get("archived") is True
    # Second delete → hard remove
    r2 = requests.delete(f"{BASE_URL}/api/swms/{sid}", headers=auth_headers, timeout=15)
    assert r2.status_code == 200
    assert r2.json().get("deleted") is True
    # 404 after
    r3 = requests.get(f"{BASE_URL}/api/swms/{sid}", headers=auth_headers, timeout=10)
    assert r3.status_code == 404
