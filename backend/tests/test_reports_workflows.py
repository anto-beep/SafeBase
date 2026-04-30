"""Backend tests for Batch (c) — Reports + Workflows (W1..W5)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")

EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"

REPORT_TYPES = [
    "compliance_score", "incidents_trend", "licence_expiry", "training_matrix",
    "swms_register", "toolbox_talks_log", "risk_register_export",
    "inspections_summary", "plant_register", "worker_roster",
]

WORKFLOW_TYPES = ["new_employee", "incident_resolution", "swms_job_start", "annual_review", "subcontractor"]


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text}")
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    if not tok:
        pytest.skip(f"No token in login response: {data}")
    return tok


@pytest.fixture(scope="module")
def client(token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


# -------------------- REPORTS --------------------
class TestReports:
    def test_list_reports_returns_10(self, client):
        r = client.get(f"{BASE_URL}/api/reports", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 10
        types = {d["type"] for d in data}
        assert types == set(REPORT_TYPES)
        for d in data:
            assert d.get("title") and d.get("desc")

    @pytest.mark.parametrize("rtype", REPORT_TYPES)
    def test_report_detail_ok(self, client, rtype):
        r = client.get(f"{BASE_URL}/api/reports/{rtype}", timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "meta" in body and body["meta"].get("title")
        assert "generated_at" in body
        if rtype == "compliance_score":
            assert "score" in body and isinstance(body["score"], int)
            assert 0 <= body["score"] <= 100
            assert "pillars" in body and len(body["pillars"]) >= 4
        elif rtype == "incidents_trend":
            for k in ("by_type", "by_severity", "by_month", "total"):
                assert k in body
        elif rtype == "licence_expiry":
            assert "counts" in body
            for k in ("valid", "expiring", "expired"):
                assert k in body["counts"]
        elif rtype == "training_matrix":
            assert "licence_types" in body
            assert "rows" in body
        else:
            assert "rows" in body or "by_outcome" in body

    def test_report_bogus_returns_404(self, client):
        r = client.get(f"{BASE_URL}/api/reports/bogus_type", timeout=20)
        assert r.status_code == 404


# -------------------- WORKFLOWS --------------------
class TestWorkflowsCatalog:
    def test_catalog_has_5_types(self, client):
        r = client.get(f"{BASE_URL}/api/workflows/catalog", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 5
        types = {d["type"] for d in data}
        assert types == set(WORKFLOW_TYPES)
        for d in data:
            assert isinstance(d["steps"], list)
            assert len(d["steps"]) >= 5
            for s in d["steps"]:
                assert "key" in s and "label" in s

    def test_summary_has_all_5(self, client):
        r = client.get(f"{BASE_URL}/api/workflows/summary", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert set(data.keys()) == set(WORKFLOW_TYPES)
        for t, stats in data.items():
            for k in ("total", "not_started", "in_progress", "complete"):
                assert k in stats
                assert isinstance(stats[k], int)

    def test_bogus_workflow_404(self, client):
        r = client.get(f"{BASE_URL}/api/workflows/bogus", timeout=20)
        assert r.status_code == 404


class TestWorkflowCRUD:
    """Full CRUD for each of the 5 workflow types."""

    @pytest.mark.parametrize("wtype", WORKFLOW_TYPES)
    def test_full_lifecycle(self, client, wtype):
        # CREATE
        create_body = {"title": f"TEST_{wtype}_wf", "entity_name": "TEST_entity", "notes": "pytest"}
        r = client.post(f"{BASE_URL}/api/workflows/{wtype}", json=create_body, timeout=20)
        assert r.status_code == 200, r.text
        inst = r.json()
        assert inst["workflow_type"] == wtype
        assert inst["title"] == f"TEST_{wtype}_wf"
        assert inst.get("progress_pct") == 0
        assert inst.get("status") == "not_started"
        assert isinstance(inst["steps"], list) and len(inst["steps"]) >= 5
        for s in inst["steps"]:
            assert s["completed"] is False
        iid = inst["instance_id"]

        # LIST contains instance
        r2 = client.get(f"{BASE_URL}/api/workflows/{wtype}", timeout=20)
        assert r2.status_code == 200
        ids = [x["instance_id"] for x in r2.json()]
        assert iid in ids

        # PATCH notes
        r3 = client.patch(f"{BASE_URL}/api/workflows/{wtype}/{iid}", json={"notes": "updated by pytest"}, timeout=20)
        assert r3.status_code == 200, r3.text
        assert r3.json()["notes"] == "updated by pytest"

        # Toggle first step
        first_key = inst["steps"][0]["key"]
        r4 = client.post(f"{BASE_URL}/api/workflows/{wtype}/{iid}/step",
                         json={"step_key": first_key, "completed": True}, timeout=20)
        assert r4.status_code == 200, r4.text
        d4 = r4.json()
        assert d4["status"] == "in_progress"
        assert d4["progress_pct"] > 0
        assert d4["completed_steps"] == 1

        # Complete ALL remaining steps
        total_steps = d4["total_steps"]
        for s in inst["steps"][1:]:
            rr = client.post(f"{BASE_URL}/api/workflows/{wtype}/{iid}/step",
                             json={"step_key": s["key"], "completed": True}, timeout=20)
            assert rr.status_code == 200
        # Verify fully complete
        r5 = client.get(f"{BASE_URL}/api/workflows/{wtype}", timeout=20)
        cur = [x for x in r5.json() if x["instance_id"] == iid][0]
        assert cur["progress_pct"] == 100
        assert cur["status"] == "complete"
        assert cur["completed_steps"] == total_steps

        # Toggle one back off → should go in_progress
        r6 = client.post(f"{BASE_URL}/api/workflows/{wtype}/{iid}/step",
                         json={"step_key": first_key, "completed": False}, timeout=20)
        assert r6.status_code == 200
        assert r6.json()["status"] == "in_progress"
        assert r6.json()["progress_pct"] < 100

        # DELETE
        r7 = client.delete(f"{BASE_URL}/api/workflows/{wtype}/{iid}", timeout=20)
        assert r7.status_code == 200
        assert r7.json().get("deleted", 0) >= 1

        # Confirm removed
        r8 = client.get(f"{BASE_URL}/api/workflows/{wtype}", timeout=20)
        ids2 = [x["instance_id"] for x in r8.json()]
        assert iid not in ids2


# -------------------- REGRESSION: Batch (b) + (a) --------------------
class TestRegression:
    def test_safety_summary_ok(self, client):
        r = client.get(f"{BASE_URL}/api/safety/summary", timeout=20)
        assert r.status_code == 200, r.text

    def test_safety_risks_list_ok(self, client):
        r = client.get(f"{BASE_URL}/api/safety/risks", timeout=20)
        assert r.status_code == 200

    def test_risk_create_enrich(self, client):
        payload = {"title": "TEST_BATCH_C_risk", "category": "Electrical",
                   "likelihood": "4", "consequence": "4"}
        r = client.post(f"{BASE_URL}/api/safety/risks", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        item = r.json()
        assert item.get("inherent_score") == 16
        assert item.get("inherent_level") in ("high", "extreme")
        # cleanup
        iid = item.get("item_id")
        if iid:
            client.delete(f"{BASE_URL}/api/safety/risks/{iid}", timeout=20)

    def test_onboarding_get_ok(self, client):
        r = client.get(f"{BASE_URL}/api/onboarding", timeout=20)
        assert r.status_code == 200

    def test_notifications_get_ok(self, client):
        r = client.get(f"{BASE_URL}/api/notifications", timeout=20)
        assert r.status_code == 200
