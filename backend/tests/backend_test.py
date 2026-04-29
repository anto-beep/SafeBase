"""SafeTradie backend integration tests.
Covers auth, workers, licences, incidents, documents (AI), compliance score, and user isolation.
"""
import os
import uuid
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def primary_user(session):
    """Register a fresh primary user for the entire test session."""
    suffix = uuid.uuid4().hex[:8]
    email = f"test_owner_{suffix}@safetradie.demo"
    payload = {
        "email": email,
        "password": "Demo@1234",
        "name": "Test Owner",
        "company_name": "TestCo",
        "role": "owner",
    }
    r = session.post(f"{API}/auth/register", json=payload, timeout=20)
    assert r.status_code == 200, f"register failed {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 10
    assert data["user"]["email"] == email
    assert data["user"]["role"] == "owner"
    return {"email": email, "password": "Demo@1234", "token": data["token"], "user": data["user"]}


@pytest.fixture(scope="session")
def secondary_user(session):
    """Second user for user-isolation tests."""
    suffix = uuid.uuid4().hex[:8]
    email = f"test_worker_{suffix}@safetradie.demo"
    payload = {
        "email": email,
        "password": "Demo@1234",
        "name": "Test Worker User",
        "role": "worker",
    }
    r = session.post(f"{API}/auth/register", json=payload, timeout=20)
    assert r.status_code == 200
    data = r.json()
    return {"email": email, "password": "Demo@1234", "token": data["token"], "user": data["user"]}


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------- Health / Auth ----------------
class TestHealthAndAuth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_register_duplicate_rejected(self, session, primary_user):
        r = session.post(f"{API}/auth/register", json={
            "email": primary_user["email"], "password": "Demo@1234", "name": "Dup",
        }, timeout=15)
        assert r.status_code == 400

    def test_login_valid(self, session, primary_user):
        r = session.post(f"{API}/auth/login", json={
            "email": primary_user["email"], "password": primary_user["password"],
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "token" in d
        assert d["user"]["email"] == primary_user["email"]

    def test_login_invalid(self, session, primary_user):
        r = session.post(f"{API}/auth/login", json={
            "email": primary_user["email"], "password": "WrongPass!",
        }, timeout=15)
        assert r.status_code == 401

    def test_me_with_jwt(self, session, primary_user):
        r = session.get(f"{API}/auth/me", headers=auth_headers(primary_user["token"]), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == primary_user["email"]
        assert d["user_id"] == primary_user["user"]["user_id"]

    def test_me_unauthenticated(self, session):
        r = session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_logout(self, session, primary_user):
        r = session.post(f"{API}/auth/logout", headers=auth_headers(primary_user["token"]), timeout=10)
        assert r.status_code == 200
        assert r.json().get("success") is True


# ---------------- Workers ----------------
class TestWorkers:
    def test_create_list_delete_worker(self, session, primary_user):
        h = auth_headers(primary_user["token"])
        # CREATE
        r = session.post(f"{API}/workers", headers=h, json={
            "name": "TEST Mike", "email": "mike@test.com", "phone": "0400000000",
            "role": "Electrician", "trade": "electrical",
        }, timeout=15)
        assert r.status_code == 200, r.text
        worker = r.json()
        assert "worker_id" in worker
        assert worker["name"] == "TEST Mike"
        assert worker["user_id"] == primary_user["user"]["user_id"]
        wid = worker["worker_id"]

        # LIST verifies persistence
        r = session.get(f"{API}/workers", headers=h, timeout=10)
        assert r.status_code == 200
        ids = [w["worker_id"] for w in r.json()]
        assert wid in ids

        # DELETE
        r = session.delete(f"{API}/workers/{wid}", headers=h, timeout=10)
        assert r.status_code == 200
        assert r.json().get("deleted") == 1

        # Verify gone
        r = session.get(f"{API}/workers", headers=h, timeout=10)
        ids = [w["worker_id"] for w in r.json()]
        assert wid not in ids

    def test_workers_require_auth(self, session):
        r = session.get(f"{API}/workers", timeout=10)
        assert r.status_code == 401


# ---------------- Licences ----------------
class TestLicences:
    @pytest.fixture
    def worker_id(self, session, primary_user):
        h = auth_headers(primary_user["token"])
        r = session.post(f"{API}/workers", headers=h, json={
            "name": "TEST LicWorker", "role": "Plumber", "trade": "plumbing",
        }, timeout=15)
        assert r.status_code == 200
        return r.json()["worker_id"]

    def test_licence_status_computation(self, session, primary_user, worker_id):
        h = auth_headers(primary_user["token"])
        future_far = (datetime.now(timezone.utc) + timedelta(days=365)).date().isoformat()
        future_near = (datetime.now(timezone.utc) + timedelta(days=10)).date().isoformat()
        past = (datetime.now(timezone.utc) - timedelta(days=5)).date().isoformat()

        for exp, expected_status in [(future_far, "active"), (future_near, "expiring_soon"), (past, "expired")]:
            r = session.post(f"{API}/licences", headers=h, json={
                "worker_id": worker_id,
                "licence_type": "white_card",
                "licence_number": f"WC-{uuid.uuid4().hex[:6]}",
                "expiry_date": exp,
            }, timeout=15)
            assert r.status_code == 200, r.text

        r = session.get(f"{API}/licences", headers=h, timeout=10)
        assert r.status_code == 200
        lics = r.json()
        # check all three statuses are computed in this user's list
        statuses = {l["status"] for l in lics if l.get("worker_id") == worker_id}
        assert "active" in statuses
        assert "expiring_soon" in statuses
        assert "expired" in statuses
        # days_until_expiry present
        for l in lics:
            assert "days_until_expiry" in l


# ---------------- Incidents ----------------
class TestIncidents:
    def test_serious_sets_notify_regulator(self, session, primary_user):
        h = auth_headers(primary_user["token"])
        r = session.post(f"{API}/incidents", headers=h, json={
            "title": "TEST Serious fall", "description": "Fall from height",
            "severity": "serious", "incident_type": "injury",
            "location": "Site A", "photos": [], "workers_involved": [],
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["notify_regulator"] is True
        assert d["status"] == "open"
        iid = d["incident_id"]

        # Minor severity should NOT notify
        r2 = session.post(f"{API}/incidents", headers=h, json={
            "title": "TEST Minor cut", "description": "Small cut on hand",
            "severity": "minor", "incident_type": "injury",
        }, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["notify_regulator"] is False

        # PATCH status
        r = session.patch(f"{API}/incidents/{iid}", headers=h, json={
            "status": "closed", "corrective_actions": "Installed guardrails",
        }, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "closed"
        assert d["corrective_actions"] == "Installed guardrails"

        # LIST returns incidents
        r = session.get(f"{API}/incidents", headers=h, timeout=10)
        assert r.status_code == 200
        assert any(i["incident_id"] == iid for i in r.json())


# ---------------- Documents (AI) ----------------
class TestDocumentsAI:
    def test_generate_swms_document(self, session, primary_user):
        h = auth_headers(primary_user["token"])
        r = session.post(f"{API}/documents/generate", headers=h, json={
            "document_type": "SWMS",
            "trade": "electrical",
            "job_description": "Install new switchboard in commercial kitchen",
            "site_location": "123 Test St, Sydney",
            "hazards": ["electric shock", "working at heights"],
            "extra_notes": "Two workers, one supervisor.",
        }, timeout=180)
        assert r.status_code == 200, f"AI generate failed {r.status_code} {r.text[:500]}"
        d = r.json()
        assert "document_id" in d
        assert d["document_type"] == "SWMS"
        assert d["trade"] == "electrical"
        assert isinstance(d["content"], str) and len(d["content"]) > 100
        # Markdown likely contains a heading
        assert "#" in d["content"] or "**" in d["content"]
        doc_id = d["document_id"]

        # GET document
        r = session.get(f"{API}/documents/{doc_id}", headers=h, timeout=10)
        assert r.status_code == 200
        assert r.json()["document_id"] == doc_id

        # LIST documents
        r = session.get(f"{API}/documents", headers=h, timeout=10)
        assert r.status_code == 200
        assert any(x["document_id"] == doc_id for x in r.json())

        # DELETE
        r = session.delete(f"{API}/documents/{doc_id}", headers=h, timeout=10)
        assert r.status_code == 200
        assert r.json().get("deleted") == 1

        # GET 404 after delete
        r = session.get(f"{API}/documents/{doc_id}", headers=h, timeout=10)
        assert r.status_code == 404


# ---------------- Compliance Score ----------------
class TestCompliance:
    def test_score_structure(self, session, primary_user):
        h = auth_headers(primary_user["token"])
        r = session.get(f"{API}/compliance/score", headers=h, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "score" in d and 0 <= d["score"] <= 100
        m = d["metrics"]
        for k in ["workers", "licences_total", "licences_expired",
                  "licences_expiring_30d", "documents",
                  "incidents_total", "incidents_open", "incidents_serious"]:
            assert k in m, f"missing metric {k}"
        assert isinstance(d["insights"], list) and len(d["insights"]) >= 1


# ---------------- User isolation ----------------
class TestUserIsolation:
    def test_users_only_see_own_data(self, session, primary_user, secondary_user):
        h1 = auth_headers(primary_user["token"])
        h2 = auth_headers(secondary_user["token"])

        # User1 creates worker
        r = session.post(f"{API}/workers", headers=h1, json={
            "name": "TEST IsolationW", "role": "Carpenter",
        }, timeout=10)
        assert r.status_code == 200
        wid = r.json()["worker_id"]

        # User2 should NOT see it
        r = session.get(f"{API}/workers", headers=h2, timeout=10)
        assert r.status_code == 200
        ids = [w["worker_id"] for w in r.json()]
        assert wid not in ids

        # User2 deletion attempt does nothing (deleted=0)
        r = session.delete(f"{API}/workers/{wid}", headers=h2, timeout=10)
        assert r.status_code == 200
        assert r.json().get("deleted") == 0
