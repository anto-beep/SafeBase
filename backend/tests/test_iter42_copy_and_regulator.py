"""Iter42 regression — auto-triage wiring + no pricing regression."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Regulator Pipeline (unchanged since Iter41) ----------
class TestRegulatorPipeline:
    def test_matrices_public(self):
        r = requests.get(f"{API}/regulator-pipeline/matrices")
        assert r.status_code == 200
        d = r.json()
        assert "SIRS" in d and "NDIS" in d and "NHVR" in d

    def test_triage_healthcare_death(self, auth_headers):
        r = requests.post(
            f"{API}/regulator-pipeline/triage",
            headers=auth_headers,
            json={"industry": "healthcare", "incident_type": "death", "description": "resident died unexpectedly"},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["match_count"] >= 2
        pipelines = {m["pipeline"] for m in d["matches"]}
        assert "SIRS" in pipelines and "NDIS" in pipelines
        assert d["requires_regulator_notification"] is True

    def test_triage_transport_rollover(self, auth_headers):
        r = requests.post(
            f"{API}/regulator-pipeline/triage",
            headers=auth_headers,
            json={"industry": "transport", "incident_type": "dangerous incident", "description": "rollover on highway"},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["match_count"] >= 1
        assert any(m["pipeline"] == "NHVR" for m in d["matches"])

    def test_triage_trades_silent(self, auth_headers):
        r = requests.post(
            f"{API}/regulator-pipeline/triage",
            headers=auth_headers,
            json={"industry": "trades", "incident_type": "", "description": "Cut finger on box cutter"},
        )
        assert r.status_code == 200
        assert r.json()["match_count"] == 0

    def test_draft_and_pending_and_submit(self, auth_headers):
        body = {"industry": "healthcare", "incident_type": "death", "description": "resident died unexpectedly", "incident_id": "TEST_ITER42_INC"}
        r = requests.post(f"{API}/regulator-pipeline/draft", headers=auth_headers, json=body)
        assert r.status_code == 200
        case = r.json()["case"]
        case_id = case["id"]
        assert case["status"] == "draft"
        assert case["incident_id"] == "TEST_ITER42_INC"

        r2 = requests.get(f"{API}/regulator-pipeline/pending", headers=auth_headers)
        assert r2.status_code == 200
        cases = r2.json()["cases"]
        assert any(c["id"] == case_id for c in cases)
        found = next(c for c in cases if c["id"] == case_id)
        assert found.get("earliest_deadline_at")
        assert found.get("hours_remaining") is not None

        r3 = requests.post(
            f"{API}/regulator-pipeline/mark-submitted/{case_id}",
            headers=auth_headers,
            json={"pipeline": "SIRS", "reference_number": "TEST_REF_42"},
        )
        assert r3.status_code == 200
        assert r3.json()["status"] == "submitted"


# ---------- Pricing Regression (40 tiers, Iter41 amounts) ----------
class TestPricingRegression:
    def test_billing_tiers_count_and_amounts(self):
        r = requests.get(f"{API}/billing/tiers")
        assert r.status_code == 200
        tiers = r.json()
        # may be list or dict
        if isinstance(tiers, dict) and "tiers" in tiers:
            tiers = tiers["tiers"]
        assert len(tiers) == 40, f"expected 40 tiers, got {len(tiers)}"
        by_slug = {t["slug"]: t for t in tiers}
        # Iter41 amounts should persist ({tier}_{cycle} slugs, amount field)
        assert by_slug["sole_trader_annual"]["amount"] == 7990
        assert by_slug["enterprise_annual"]["amount"] == 39990
        assert by_slug["hosp_single_annual"]["amount"] == 14990
        assert by_slug["hosp_enterprise_annual"]["amount"] == 69990
        assert by_slug["retail_single_annual"]["amount"] == 9990
        assert by_slug["retail_enterprise_annual"]["amount"] == 49990
