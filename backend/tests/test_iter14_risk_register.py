"""
Backend tests for Iteration 14: Risk Register & 4 Library modules.

Covers:
- Library CRUD (process/activity/task/control) + idempotent seed
- Risk create / patch / summary / HRCW meta / levels computation
- Risk review flow (create, submit, approve/request_changes/reject)
- Approval writes residual back to source risk
- AI endpoints (accept real or fallback:true)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

TEST_EMAIL = "owner@safetradie.demo"
TEST_PASSWORD = "Demo@1234"


@pytest.fixture(scope="session")
def token():
    r = requests.post(
        f"{API}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def s(token):
    sess = requests.Session()
    sess.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return sess


# -------- Library seed & CRUD --------
class TestLibrarySeed:
    def test_process_seed(self, s):
        r = s.get(f"{API}/library/process", timeout=20)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 20, f"Got {len(rows)} processes; expected >=20"

    def test_activity_seed(self, s):
        r = s.get(f"{API}/library/activity", timeout=20)
        assert r.status_code == 200
        assert len(r.json()) >= 25

    def test_control_seed(self, s):
        r = s.get(f"{API}/library/control", timeout=20)
        assert r.status_code == 200
        assert len(r.json()) >= 28

    def test_seed_idempotent(self, s):
        before = len(s.get(f"{API}/library/process", timeout=20).json())
        s.get(f"{API}/library/process", timeout=20)
        after = len(s.get(f"{API}/library/process", timeout=20).json())
        assert after == before

    def test_hrcw_meta_19(self, s):
        r = s.get(f"{API}/risks/meta/hrcw", timeout=10)
        assert r.status_code == 200
        assert len(r.json()["categories"]) == 19


class TestLibraryCRUD:
    def test_process_crud(self, s):
        # Create
        r = s.post(
            f"{API}/library/process",
            json={"name": "TEST_ProcessX", "description": "t", "trade_types": ["Electrical"], "status": "active"},
            timeout=10,
        )
        assert r.status_code == 200
        pid = r.json()["id"]
        assert r.json()["name"] == "TEST_ProcessX"
        # Patch
        r2 = s.patch(f"{API}/library/process/{pid}", json={"description": "updated"}, timeout=10)
        assert r2.status_code == 200 and r2.json()["description"] == "updated"
        # Delete
        r3 = s.delete(f"{API}/library/process/{pid}", timeout=10)
        assert r3.status_code == 200 and r3.json()["deleted"] is True

    def test_task_hrcw_persistence(self, s):
        # need a parent activity
        acts = s.get(f"{API}/library/activity").json()
        parent_id = acts[0]["id"]
        body = {
            "name": "TEST_TaskHRCW",
            "parent_activity_id": parent_id,
            "hrcw_trigger": True,
            "hrcw_categories": ["Work in or near a confined space"],
        }
        r = s.post(f"{API}/library/task", json=body, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["hrcw_trigger"] is True
        assert "Work in or near a confined space" in d["hrcw_categories"]
        # cleanup
        s.delete(f"{API}/library/task/{d['id']}")


# -------- Risk register --------
class TestRiskRegister:
    def test_create_risk_levels(self, s):
        body = {
            "title": "TEST_Risk_LevelCalc",
            "inherent_likelihood": 4, "inherent_consequence": 5,
            "residual_likelihood": 2, "residual_consequence": 4,
        }
        r = s.post(f"{API}/risks", json=body, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["inherent_score"] == 20
        assert d["inherent_level"] == "extreme"
        assert d["residual_score"] == 8
        assert d["residual_level"] == "medium"
        assert d["risk_id"].startswith("RISK-")
        # stash
        TestRiskRegister.rid = d["risk_id"]

    def test_patch_audit_log_grows(self, s):
        rid = TestRiskRegister.rid
        before = s.get(f"{API}/risks/{rid}").json()
        before_len = len(before.get("audit_log") or [])
        r = s.patch(f"{API}/risks/{rid}", json={"title": "TEST_Risk_LevelCalc_v2"}, timeout=10)
        assert r.status_code == 200
        after_len = len(r.json()["audit_log"])
        assert after_len > before_len

    def test_summary_shape(self, s):
        r = s.get(f"{API}/risks/summary", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ("total", "by_level", "reviews_overdue", "reviews_due_30", "open_actions", "avg_residual_score"):
            assert k in d
        for lvl in ("extreme", "high", "medium", "low"):
            assert lvl in d["by_level"]


# -------- Reviews --------
class TestReviewFlow:
    def test_full_flow(self, s):
        # Create fresh risk
        risk = s.post(f"{API}/risks", json={
            "title": "TEST_ReviewRisk",
            "risk_owner": "Jane Owner",
            "inherent_likelihood": 5, "inherent_consequence": 5,
            "residual_likelihood": 3, "residual_consequence": 4,
            "review_frequency": "quarterly",
        }, timeout=10).json()
        rid = risk["risk_id"]

        # Create review
        rv = s.post(f"{API}/risk-reviews", json={
            "risk_id": rid,
            "reasons": ["scheduled"],
            "updated_likelihood": 2, "updated_consequence": 3,
        }, timeout=10)
        assert rv.status_code == 200
        review = rv.json()
        assert review["status"] == "in_progress"
        assert review["assigned_to"] == "Jane Owner"
        review_id = review["review_id"]

        # Submit
        sub = s.post(f"{API}/risk-reviews/{review_id}/submit", timeout=10)
        assert sub.status_code == 200
        g = s.get(f"{API}/risk-reviews/{review_id}").json()
        assert g["status"] == "pending_approval"

        # Approve → residual rewritten on risk
        ap = s.post(f"{API}/risk-reviews/{review_id}/approve", json={"decision": "approve"}, timeout=10)
        assert ap.status_code == 200
        g2 = s.get(f"{API}/risk-reviews/{review_id}").json()
        assert g2["status"] == "approved"
        risk2 = s.get(f"{API}/risks/{rid}").json()
        assert risk2["residual_likelihood"] == 2
        assert risk2["residual_consequence"] == 3
        assert risk2["residual_score"] == 6
        assert risk2["residual_level"] == "medium"
        assert risk2["last_reviewed_at"] is not None

    def test_request_changes_and_reject(self, s):
        risk = s.post(f"{API}/risks", json={"title": "TEST_ReviewReject", "residual_likelihood": 2, "residual_consequence": 2}, timeout=10).json()
        review = s.post(f"{API}/risk-reviews", json={"risk_id": risk["risk_id"], "reasons": ["audit"]}, timeout=10).json()
        s.post(f"{API}/risk-reviews/{review['review_id']}/submit", timeout=10)
        r_chg = s.post(f"{API}/risk-reviews/{review['review_id']}/approve", json={"decision": "request_changes", "comment": "fix it"}, timeout=10)
        assert r_chg.status_code == 200
        assert s.get(f"{API}/risk-reviews/{review['review_id']}").json()["status"] == "in_progress"

        s.post(f"{API}/risk-reviews/{review['review_id']}/submit", timeout=10)
        r_rej = s.post(f"{API}/risk-reviews/{review['review_id']}/approve", json={"decision": "reject"}, timeout=10)
        assert r_rej.status_code == 200
        assert s.get(f"{API}/risk-reviews/{review['review_id']}").json()["status"] == "rejected"


# -------- AI endpoints (accept fallback) --------
class TestAIEndpoints:
    def _is_valid(self, d, key):
        return isinstance(d, dict) and (key in d or d.get("fallback") is True)

    def test_suggest_risks(self, s):
        r = s.post(f"{API}/risks/ai/suggest", json={"process_name": "Electrical Installation Work", "activity_name": "Cable pulling"}, timeout=60)
        assert r.status_code == 200
        assert "risks" in r.json()
        assert len(r.json()["risks"]) >= 1

    def test_suggest_controls(self, s):
        r = s.post(f"{API}/risks/ai/suggest-controls", json={"hazard_description": "Live electrical work"}, timeout=60)
        assert r.status_code == 200
        assert "controls" in r.json()
        assert len(r.json()["controls"]) >= 1

    def test_review_summary(self, s):
        r = s.post(f"{API}/risk-reviews/ai/review-summary", json={"risk_title": "x", "observations": "y"}, timeout=60)
        assert r.status_code == 200
        assert "summary" in r.json()

    def test_evidence(self, s):
        # need a risk
        risks = s.get(f"{API}/risks").json()
        if not risks:
            pytest.skip("no risks available")
        r = s.post(f"{API}/risk-reviews/ai/evidence", json={"risk_id": risks[0]["risk_id"]}, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "summary" in d and "points" in d

    def test_intelligence(self, s):
        r = s.get(f"{API}/risks/ai/intelligence", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("trending", "not_effective", "gap_activities", "overdue_with_activity", "benchmarks"):
            assert k in d


# -------- Regression --------
class TestRegression:
    def test_workers(self, s):
        assert s.get(f"{API}/workers", timeout=10).status_code == 200

    def test_reports_catalog(self, s):
        assert s.get(f"{API}/reports", timeout=10).status_code == 200

    def test_auth_me(self, s):
        assert s.get(f"{API}/auth/me", timeout=10).status_code == 200


# Cleanup — runs last
def test_zz_cleanup(s):
    # Archive TEST risks
    for r in s.get(f"{API}/risks").json():
        if (r.get("title") or "").startswith("TEST_"):
            s.delete(f"{API}/risks/{r['risk_id']}")
