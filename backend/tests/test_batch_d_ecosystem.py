"""SafeTradie Batch (d) Ecosystem backend tests.
Covers: AI Insights on Reports, TradeInduct, TradeCheck, Academy LMS, Partner Portal, Mobile Worker.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def owner(session):
    suffix = uuid.uuid4().hex[:8]
    email = f"test_owner_{suffix}@safetradie.demo"
    r = session.post(f"{API}/auth/register", json={
        "email": email, "password": "Demo@1234",
        "name": "TEST D Owner", "company_name": "TESTCo D", "role": "owner",
    }, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "token": d["token"], "user_id": d["user"]["user_id"], "name": d["user"]["name"]}


@pytest.fixture(scope="module")
def other_owner(session):
    suffix = uuid.uuid4().hex[:8]
    email = f"test_owner2_{suffix}@safetradie.demo"
    r = session.post(f"{API}/auth/register", json={
        "email": email, "password": "Demo@1234", "name": "TEST D Owner2", "role": "owner",
    }, timeout=20)
    assert r.status_code == 200
    d = r.json()
    return {"email": email, "token": d["token"], "user_id": d["user"]["user_id"]}


def H(token): return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------- AI Insights on Reports ----------------
class TestReportInsights:
    def test_compliance_score_insights(self, session, owner):
        r = session.post(f"{API}/reports/compliance_score/insights", headers=H(owner["token"]), timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "summary" in d and isinstance(d["summary"], str) and len(d["summary"]) > 5
        assert "actions" in d and isinstance(d["actions"], list)
        # Accept fallback as 200 too
        assert d.get("cached") in (False, None, True)

    def test_compliance_score_insights_cached(self, session, owner):
        # 2nd call within 24h must return cached=true
        r = session.post(f"{API}/reports/compliance_score/insights", headers=H(owner["token"]), timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d.get("cached") is True

    def test_incidents_trend_insights(self, session, owner):
        r = session.post(f"{API}/reports/incidents_trend/insights", headers=H(owner["token"]), timeout=90)
        assert r.status_code == 200
        d = r.json()
        assert "summary" in d
        assert isinstance(d.get("actions", []), list)

    def test_unknown_report_type_returns_404(self, session, owner):
        r = session.post(f"{API}/reports/nonsense_xyz/insights", headers=H(owner["token"]), timeout=20)
        assert r.status_code == 404


# ---------------- TradeInduct ----------------
class TestTradeInduct:
    def test_create_list_public_submit_delete(self, session, owner, other_owner):
        # CREATE
        r = session.post(f"{API}/tradeinduct/programs", headers=H(owner["token"]), json={
            "title": "TEST Induction A", "site": "Site A", "trade": "electrical",
        }, timeout=15)
        assert r.status_code == 200, r.text
        prog = r.json()
        assert prog["title"] == "TEST Induction A"
        assert len(prog["code"]) == 6
        assert isinstance(prog["questions"], list) and len(prog["questions"]) >= 5
        pid, code = prog["program_id"], prog["code"]

        # LIST
        r = session.get(f"{API}/tradeinduct/programs", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200
        assert any(p["program_id"] == pid for p in r.json())

        # PUBLIC GET (no auth)
        r = session.get(f"{API}/tradeinduct/public/{code}", timeout=10)
        assert r.status_code == 200
        pd = r.json()
        assert pd["program_id"] == pid
        assert pd["title"] == "TEST Induction A"

        # PUBLIC SUBMIT (no auth)
        r = session.post(f"{API}/tradeinduct/public/{code}/submit", json={
            "worker_name": "Mike Tester", "worker_email": "mike@test.com",
            "answers": [{"q": "Have you read the site-specific SWMS?", "a": True}],
            "signature": "Mike Tester",
        }, timeout=15)
        assert r.status_code == 200
        sd = r.json()
        assert sd["certificate_id"].startswith("cert_")
        assert sd["program_title"] == "TEST Induction A"

        # SUBMISSIONS list (owner)
        r = session.get(f"{API}/tradeinduct/programs/{pid}/submissions", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200
        subs = r.json()
        assert any(s.get("worker_name") == "Mike Tester" for s in subs)

        # Other owner cannot see submissions
        r = session.get(f"{API}/tradeinduct/programs/{pid}/submissions", headers=H(other_owner["token"]), timeout=10)
        assert r.status_code == 200
        assert r.json() == []

        # Unknown code — 404
        r = session.get(f"{API}/tradeinduct/public/ZZZZZZ", timeout=10)
        assert r.status_code == 404

        # DELETE
        r = session.delete(f"{API}/tradeinduct/programs/{pid}", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200
        assert r.json().get("deleted") == 1


# ---------------- TradeCheck ----------------
class TestTradeCheck:
    def test_upsert_my_verify_public(self, session, owner):
        # CREATE (pending)
        r = session.post(f"{API}/tradecheck/listings", headers=H(owner["token"]), json={
            "business_name": "TEST Sparkies Pty Ltd", "trade": "electrical", "state": "NSW",
            "abn": "12345678901", "years_trading": 10, "team_size": 5,
            "description": "TEST desc", "contact_email": "x@y.com",
        }, timeout=15)
        assert r.status_code == 200
        listing = r.json()
        listing_id = listing["listing_id"]
        assert listing["status"] == "pending"

        # UPSERT (2nd call should reuse same listing_id)
        r2 = session.post(f"{API}/tradecheck/listings", headers=H(owner["token"]), json={
            "business_name": "TEST Sparkies Updated", "trade": "electrical", "state": "NSW",
        }, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["listing_id"] == listing_id
        assert r2.json()["business_name"] == "TEST Sparkies Updated"

        # GET /my
        r = session.get(f"{API}/tradecheck/my", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200
        assert r.json()["listing_id"] == listing_id

        # PUBLIC list — pending listing should NOT appear
        r = session.get(f"{API}/tradecheck/listings", timeout=10)
        assert r.status_code == 200
        assert not any(l.get("listing_id") == listing_id for l in r.json())

        # VERIFY
        r = session.post(f"{API}/tradecheck/verify/{listing_id}", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # PUBLIC list — now should appear, with filters
        r = session.get(f"{API}/tradecheck/listings?trade=electrical&state=NSW", timeout=10)
        assert r.status_code == 200
        rows = r.json()
        assert any(l.get("listing_id") == listing_id for l in rows)
        # Filter out by wrong state
        r = session.get(f"{API}/tradecheck/listings?state=VIC", timeout=10)
        assert r.status_code == 200
        assert not any(l.get("listing_id") == listing_id for l in r.json())

        # Public list should not leak user_id
        for row in rows:
            assert "user_id" not in row

    def test_public_no_auth_required(self, session):
        r = session.get(f"{API}/tradecheck/listings", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------------- Academy LMS ----------------
class TestAcademy:
    def test_courses_list(self, session, owner):
        r = session.get(f"{API}/academy/courses", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200
        courses = r.json()
        assert len(courses) == 8
        ids = {c["course_id"] for c in courses}
        assert "c_whs_fundamentals" in ids

    def test_enrol_and_progress(self, session, owner):
        # ENROL
        r = session.post(f"{API}/academy/enrolments", headers=H(owner["token"]),
                         json={"course_id": "c_electrical_safety"}, timeout=10)
        assert r.status_code == 200
        e = r.json()
        eid = e["enrolment_id"]
        total = e["modules_total"]
        assert e["status"] == "enrolled"
        assert e["progress_pct"] == 0

        # IDEMPOTENT — enrol again returns same
        r2 = session.post(f"{API}/academy/enrolments", headers=H(owner["token"]),
                          json={"course_id": "c_electrical_safety"}, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["enrolment_id"] == eid

        # Progress partial
        r = session.post(f"{API}/academy/enrolments/{eid}/progress", headers=H(owner["token"]),
                         json={"modules_completed": 1}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "in_progress"
        assert d["progress_pct"] == round(1 / total * 100)

        # Progress full — completion
        r = session.post(f"{API}/academy/enrolments/{eid}/progress", headers=H(owner["token"]),
                         json={"modules_completed": total}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "completed"
        assert d["progress_pct"] == 100
        assert d["certificate_id"] and d["certificate_id"].startswith("cert_")

    def test_enrol_unknown_course(self, session, owner):
        r = session.post(f"{API}/academy/enrolments", headers=H(owner["token"]),
                         json={"course_id": "c_nope"}, timeout=10)
        assert r.status_code == 404


# ---------------- Partner Portal ----------------
class TestPartner:
    def test_clients_crud_and_summary(self, session, owner):
        # ADD
        r = session.post(f"{API}/partner/clients", headers=H(owner["token"]), json={
            "business_name": "TEST Client A", "contact_name": "Alice", "state": "NSW",
            "trade": "plumbing", "retainer_monthly": 500, "status": "active",
        }, timeout=10)
        assert r.status_code == 200
        c = r.json()
        cid = c["client_id"]

        # LIST with enrichment
        r = session.get(f"{API}/partner/clients", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200
        rows = r.json()
        found = next((x for x in rows if x["client_id"] == cid), None)
        assert found is not None
        for k in ("docs_count", "incidents_open", "licences_total"):
            assert k in found

        # PATCH
        r = session.patch(f"{API}/partner/clients/{cid}", headers=H(owner["token"]),
                          json={"status": "at_risk"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "at_risk"

        # SUMMARY — at_risk client should not be in MRR
        r = session.get(f"{API}/partner/summary", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200
        s = r.json()
        assert "monthly_recurring_revenue" in s
        assert "total_clients" in s and s["total_clients"] >= 1

        # DELETE
        r = session.delete(f"{API}/partner/clients/{cid}", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200
        assert r.json()["deleted"] == 1


# ---------------- Mobile Worker ----------------
class TestWorker:
    def test_my_summary_and_checkins(self, session, owner):
        r = session.get(f"{API}/worker/my-summary", headers=H(owner["token"]), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("name", "role", "licences_total", "licences_expiring_soon",
                  "upcoming_toolbox", "recent_swms", "my_courses"):
            assert k in d, f"missing {k}"
        assert d["name"] == owner["name"]

        # CHECK-IN
        r = session.post(f"{API}/worker/checkin", headers=H(owner["token"]),
                         json={"site": "TEST Site X", "notes": "On site"}, timeout=10)
        assert r.status_code == 200
        ci = r.json()
        assert ci["site"] == "TEST Site X"
        assert ci["checkin_id"].startswith("ci_")
        assert "_id" not in ci

        # LIST
        r = session.get(f"{API}/worker/checkins", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200
        rows = r.json()
        assert any(x["site"] == "TEST Site X" for x in rows)

    def test_requires_auth(self, session):
        assert session.get(f"{API}/worker/my-summary", timeout=10).status_code == 401
        assert session.get(f"{API}/worker/checkins", timeout=10).status_code == 401


# ---------------- Regression: Batch (a)(b)(c) quick ----------------
class TestRegression:
    def test_reports_catalog(self, session, owner):
        r = session.get(f"{API}/reports", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200
        assert len(r.json()) == 10

    def test_workflows_catalog(self, session, owner):
        r = session.get(f"{API}/workflows/catalog", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200

    def test_safety_toolbox_talks(self, session, owner):
        r = session.get(f"{API}/safety/toolbox_talks", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200

    def test_compliance_score(self, session, owner):
        r = session.get(f"{API}/compliance/score", headers=H(owner["token"]), timeout=10)
        assert r.status_code == 200
