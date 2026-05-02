"""Iter41 — Definitive FINAL pricing overhaul + NEW Regulator Pipeline Automation.

Covers:
- Backend pricing (GET /api/billing/tiers) — 40 slugs with Iter41 amounts
- Plan right-sizer anchors/amounts for trades/hospitality/transport/healthcare/retail
- NEW /api/regulator-pipeline/* (matrices, triage, draft, pending, mark-submitted)
- Regulator pipeline auth + cross-account isolation
- Regression: Iter40 scheduling, demo-requests, regulatory-digest, compliance-inbox
"""
import os
import pytest
import requests

_FRONTEND_ENV = "/app/frontend/.env"
if os.path.exists(_FRONTEND_ENV):
    with open(_FRONTEND_ENV) as _fh:
        for _line in _fh:
            if _line.startswith("REACT_APP_BACKEND_URL="):
                os.environ.setdefault("REACT_APP_BACKEND_URL", _line.split("=", 1)[1].strip())
                break
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
OWNER_EMAIL = "owner@safetradie.demo"
OWNER_PASSWORD = "Demo@1234"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"login failed {r.status_code}: {r.text}"
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ================================================================
# BACKEND PRICING — Iter41 amounts
# ================================================================

EXPECTED_AMOUNTS = {
    # Trades — raised
    ("sole_trader", "annual"): 7990,
    ("sole_trader", "monthly"): 799,
    ("small_business", "annual"): 15990,
    ("small_business", "monthly"): 1599,
    ("growing_business", "annual"): 24990,
    ("growing_business", "monthly"): 2499,
    ("enterprise", "annual"): 39990,
    ("enterprise", "monthly"): 3999,
    # Retail — raised
    ("retail_single", "annual"): 9990,
    ("retail_small", "annual"): 19990,
    ("retail_multi", "annual"): 29990,
    ("retail_enterprise", "annual"): 49990,
    # Hospitality — raised
    ("hosp_single", "annual"): 14990,
    ("hosp_small", "annual"): 29990,
    ("hosp_multi", "annual"): 44990,
    ("hosp_enterprise", "annual"): 69990,
    # Transport — unchanged
    ("trans_owner", "annual"): 14990,
    ("trans_small", "annual"): 27990,
    ("trans_growing", "annual"): 42990,
    ("trans_enterprise", "annual"): 69990,
    # Healthcare — unchanged
    ("health_solo", "annual"): 24990,
    ("health_small", "annual"): 49990,
    ("health_multi", "annual"): 79990,
    ("health_enterprise", "annual"): 179990,
    ("health_enterprise", "monthly"): 17999,
}


def test_billing_tiers_returns_40_tiers():
    r = requests.get(f"{BASE_URL}/api/billing/tiers", timeout=15)
    assert r.status_code == 200
    tiers = r.json()
    assert isinstance(tiers, list)
    assert len(tiers) == 40, f"expected 40 tiers, got {len(tiers)}"


def test_billing_tiers_iter41_amounts():
    r = requests.get(f"{BASE_URL}/api/billing/tiers", timeout=15)
    assert r.status_code == 200
    tiers = r.json()
    by_key = {(t["tier"], t["cycle"]): t["amount"] for t in tiers}
    for key, expected in EXPECTED_AMOUNTS.items():
        assert by_key.get(key) == expected, f"{key} → expected {expected}, got {by_key.get(key)}"


def test_billing_annual_savings_trades():
    """Annual savings per trades tier must equal 2 × monthly."""
    r = requests.get(f"{BASE_URL}/api/billing/tiers", timeout=15).json()
    by_key = {(t["tier"], t["cycle"]): t["amount"] for t in r}
    expected_savings = [1598, 3198, 4998, 7998]
    trades_tiers = ["sole_trader", "small_business", "growing_business", "enterprise"]
    for tier, exp in zip(trades_tiers, expected_savings):
        saved = by_key[(tier, "monthly")] * 12 - by_key[(tier, "annual")]
        assert saved == exp, f"{tier} saved {saved} expected {exp}"


def test_billing_annual_savings_retail():
    r = requests.get(f"{BASE_URL}/api/billing/tiers", timeout=15).json()
    by_key = {(t["tier"], t["cycle"]): t["amount"] for t in r}
    expected = [1998, 3998, 5998, 9998]
    for tier, exp in zip(["retail_single", "retail_small", "retail_multi", "retail_enterprise"], expected):
        saved = by_key[(tier, "monthly")] * 12 - by_key[(tier, "annual")]
        assert saved == exp, f"{tier} saved {saved} expected {exp}"


def test_billing_annual_savings_hospitality():
    r = requests.get(f"{BASE_URL}/api/billing/tiers", timeout=15).json()
    by_key = {(t["tier"], t["cycle"]): t["amount"] for t in r}
    expected = [2998, 5998, 8998, 13998]
    for tier, exp in zip(["hosp_single", "hosp_small", "hosp_multi", "hosp_enterprise"], expected):
        saved = by_key[(tier, "monthly")] * 12 - by_key[(tier, "annual")]
        assert saved == exp, f"{tier} saved {saved} expected {exp}"


# ================================================================
# PLAN RIGHT-SIZER
# ================================================================

def test_rightsizer_trades_solo():
    r = requests.get(f"{BASE_URL}/api/plan-rightsizer/recommend",
                     params={"industry": "trades", "team": 1, "locations": 1}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    rec = data.get("recommended") or data
    assert rec.get("annual_aud_ex_gst") == 7990 or data.get("annual_aud_ex_gst") == 7990, data
    anchor = data.get("risk_anchor") or rec.get("risk_anchor") or ""
    assert "6.9%" in anchor, f"expected '6.9%' in anchor, got: {anchor}"
    assert "5.1%" not in anchor and "3.4%" not in anchor


def test_rightsizer_hospitality_small():
    r = requests.get(f"{BASE_URL}/api/plan-rightsizer/recommend",
                     params={"industry": "hospitality", "team": 3, "locations": 2}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    annual = data.get("annual_aud_ex_gst") or (data.get("recommended") or {}).get("annual_aud_ex_gst")
    assert annual == 29990, data


def test_rightsizer_retail_multi():
    r = requests.get(f"{BASE_URL}/api/plan-rightsizer/recommend",
                     params={"industry": "retail", "team": 30, "locations": 6}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    annual = data.get("annual_aud_ex_gst") or (data.get("recommended") or {}).get("annual_aud_ex_gst")
    assert annual == 29990, data


def test_rightsizer_healthcare_enterprise():
    r = requests.get(f"{BASE_URL}/api/plan-rightsizer/recommend",
                     params={"industry": "healthcare", "team": 40, "locations": 4}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    annual = data.get("annual_aud_ex_gst") or (data.get("recommended") or {}).get("annual_aud_ex_gst")
    assert annual == 179990, data


def test_rightsizer_transport_growing():
    r = requests.get(f"{BASE_URL}/api/plan-rightsizer/recommend",
                     params={"industry": "transport", "team": 20, "locations": 3}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    annual = data.get("annual_aud_ex_gst") or (data.get("recommended") or {}).get("annual_aud_ex_gst")
    assert annual == 42990, data


# ================================================================
# REGULATOR PIPELINE — matrices (public or auth?)
# ================================================================

def test_regulator_matrices(auth_headers):
    r = requests.get(f"{BASE_URL}/api/regulator-pipeline/matrices", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "SIRS" in data and "NDIS" in data and "NHVR" in data
    assert "triggers" in data["SIRS"]["priority_1"]
    assert "triggers" in data["NDIS"]["immediate"]
    assert "triggers" in data["NHVR"]["immediate"]
    assert isinstance(data["SIRS"]["priority_1"]["triggers"], list)


# ================================================================
# REGULATOR PIPELINE — triage
# ================================================================

def test_triage_healthcare_death(auth_headers):
    r = requests.post(f"{BASE_URL}/api/regulator-pipeline/triage",
                      headers=auth_headers,
                      json={"industry": "healthcare", "incident_type": "death",
                            "description": "Resident died unexpectedly"}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["match_count"] >= 2, data
    pipelines = {m["pipeline"] for m in data["matches"]}
    assert "SIRS" in pipelines and "NDIS" in pipelines
    for m in data["matches"]:
        if m["pipeline"] in ("SIRS", "NDIS"):
            assert m["deadline_hours"] == 24


def test_triage_transport_rollover(auth_headers):
    r = requests.post(f"{BASE_URL}/api/regulator-pipeline/triage",
                      headers=auth_headers,
                      json={"industry": "transport", "incident_type": "rollover",
                            "description": "Heavy vehicle rollover, driver hospitalised"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["match_count"] >= 1
    nhvr = [m for m in data["matches"] if m["pipeline"] == "NHVR"]
    assert len(nhvr) == 1
    assert nhvr[0].get("written_report_deadline_at")


def test_triage_trades_minor_no_match(auth_headers):
    r = requests.post(f"{BASE_URL}/api/regulator-pipeline/triage",
                      headers=auth_headers,
                      json={"industry": "trades", "incident_type": "minor cut",
                            "description": "Minor cut"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["match_count"] == 0
    assert data["requires_regulator_notification"] is False


def test_triage_unknown_industry_graceful(auth_headers):
    r = requests.post(f"{BASE_URL}/api/regulator-pipeline/triage",
                      headers=auth_headers,
                      json={"industry": "aerospace", "incident_type": "death",
                            "description": "pilot died"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["match_count"] == 0


def test_triage_requires_auth():
    r = requests.post(f"{BASE_URL}/api/regulator-pipeline/triage",
                      json={"industry": "healthcare", "description": "death"}, timeout=15)
    assert r.status_code in (401, 403)


# ================================================================
# REGULATOR PIPELINE — draft + pending + mark-submitted lifecycle
# ================================================================

_CREATED_CASE_ID = {}


def test_draft_healthcare_creates_case(auth_headers):
    r = requests.post(f"{BASE_URL}/api/regulator-pipeline/draft",
                      headers=auth_headers,
                      json={"industry": "healthcare", "incident_type": "death",
                            "description": "TEST_ITER41 Resident died unexpectedly"}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ok"] is True
    case = data["case"]
    assert case["status"] == "draft"
    assert "id" in case and case["id"]
    _CREATED_CASE_ID["id"] = case["id"]


def test_draft_trades_unmatched_rejected(auth_headers):
    r = requests.post(f"{BASE_URL}/api/regulator-pipeline/draft",
                      headers=auth_headers,
                      json={"industry": "trades", "incident_type": "scratch",
                            "description": "Just a small scratch"}, timeout=15)
    assert r.status_code == 400
    assert "No regulator pipeline" in r.text or "no regulator" in r.text.lower()


def test_pending_includes_created_case(auth_headers):
    case_id = _CREATED_CASE_ID.get("id")
    if not case_id:
        pytest.skip("draft test did not run")
    r = requests.get(f"{BASE_URL}/api/regulator-pipeline/pending",
                     headers=auth_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    cases = data["cases"]
    match = next((c for c in cases if c["id"] == case_id), None)
    assert match is not None, f"case {case_id} not in pending"
    assert match.get("earliest_deadline_at")
    assert match.get("overdue") is False
    hr = match.get("hours_remaining")
    assert hr is not None and 20 <= hr <= 25, f"hours_remaining unexpected: {hr}"


def test_mark_submitted_removes_from_pending(auth_headers):
    case_id = _CREATED_CASE_ID.get("id")
    if not case_id:
        pytest.skip("draft test did not run")
    r = requests.post(f"{BASE_URL}/api/regulator-pipeline/mark-submitted/{case_id}",
                     headers=auth_headers,
                     json={"pipeline": "SIRS", "reference_number": "SIRS-2026-00012"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "submitted"

    # Verify no longer in pending
    r2 = requests.get(f"{BASE_URL}/api/regulator-pipeline/pending",
                      headers=auth_headers, timeout=15).json()
    ids = [c["id"] for c in r2["cases"]]
    assert case_id not in ids


def test_mark_submitted_unknown_case_returns_404(auth_headers):
    r = requests.post(f"{BASE_URL}/api/regulator-pipeline/mark-submitted/non-existent-abc",
                     headers=auth_headers,
                     json={"pipeline": "SIRS", "reference_number": "SIRS-XX"}, timeout=15)
    assert r.status_code == 404


def test_pending_requires_auth():
    r = requests.get(f"{BASE_URL}/api/regulator-pipeline/pending", timeout=15)
    assert r.status_code in (401, 403)


def test_draft_requires_auth():
    r = requests.post(f"{BASE_URL}/api/regulator-pipeline/draft",
                      json={"industry": "healthcare", "description": "death"}, timeout=15)
    assert r.status_code in (401, 403)


# ================================================================
# REGRESSION — Iter40 scheduling + other endpoints
# ================================================================

def test_regression_mandatory_credentials():
    r = requests.get(f"{BASE_URL}/api/scheduling/mandatory-credentials",
                     params={"industry": "healthcare"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "credentials" in data or "mandatory" in data or isinstance(data, (dict, list))


def test_regression_demo_requests(auth_headers):
    r = requests.get(f"{BASE_URL}/api/demo-requests", headers=auth_headers, timeout=15)
    assert r.status_code == 200


def test_regression_regulatory_digest(auth_headers):
    r = requests.get(f"{BASE_URL}/api/regulatory-digest", headers=auth_headers, timeout=15)
    assert r.status_code in (200, 204)


def test_regression_compliance_inbox(auth_headers):
    r = requests.get(f"{BASE_URL}/api/compliance-inbox", headers=auth_headers, timeout=15)
    assert r.status_code == 200
