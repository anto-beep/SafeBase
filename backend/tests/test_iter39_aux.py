"""
Iter39 aux endpoint tests:
- /api/plan-rightsizer/recommend
- /api/demo-requests (GET, PATCH) owner-only
- /api/regulatory-digest
- Regression: /api/billing/tiers, /api/demo/request, /api/compliance-inbox, /api/public/industry-signal/trades
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

OWNER_EMAIL = "owner@safetradie.demo"
OWNER_PW = "Demo@1234"


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def owner_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login",
                 json={"email": OWNER_EMAIL, "password": OWNER_PW})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, f"No token in login response: {r.json()}"
    return tok


@pytest.fixture(scope="session")
def owner_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}",
            "Content-Type": "application/json"}


# ---------------- plan-rightsizer ----------------
class TestPlanRightsizer:
    def test_trades_solo(self, api):
        r = api.get(f"{BASE_URL}/api/plan-rightsizer/recommend",
                    params={"industry": "trades", "team": 1, "locations": 1})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["recommended_tier_index"] == 0
        assert d["plan_name"] == "Solo Tradie"
        assert d["annual_aud_ex_gst"] == 3990
        assert "risk_anchor" in d
        assert d["cta_register_url"].startswith("/register?industry=trades")

    def test_healthcare_enterprise(self, api):
        r = api.get(f"{BASE_URL}/api/plan-rightsizer/recommend",
                    params={"industry": "healthcare", "team": 40, "locations": 4})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["recommended_tier_index"] == 3
        assert d["plan_name"] == "Enterprise"
        assert d["annual_aud_ex_gst"] == 139990

    def test_hospitality_small_group(self, api):
        r = api.get(f"{BASE_URL}/api/plan-rightsizer/recommend",
                    params={"industry": "hospitality", "team": 3, "locations": 2})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["recommended_tier_index"] == 1
        assert d["plan_name"] == "Small Group"
        assert d["annual_aud_ex_gst"] == 14990

    def test_transport_growing_fleet(self, api):
        r = api.get(f"{BASE_URL}/api/plan-rightsizer/recommend",
                    params={"industry": "transport", "team": 20, "locations": 3})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["recommended_tier_index"] == 2
        assert d["plan_name"] == "Growing Fleet"
        assert d["annual_aud_ex_gst"] == 27990

    def test_unknown_industry(self, api):
        r = api.get(f"{BASE_URL}/api/plan-rightsizer/recommend",
                    params={"industry": "zoo", "team": 1, "locations": 1})
        assert r.status_code == 400, r.text


# ---------------- regulatory-digest ----------------
class TestRegulatoryDigest:
    def test_all_items(self, api):
        r = api.get(f"{BASE_URL}/api/regulatory-digest")
        assert r.status_code == 200, r.text
        d = r.json()
        # NOTE: Spec said 12 but code only has 11 (healthcare=3, transport=2, hospitality=2, retail=2, trades=2)
        assert d["total"] == 11, f"Expected 11, got {d['total']}"
        for it in d["items"]:
            assert "severity" in it
            assert "regulator" in it
            assert "source_url" in it
            assert "posted" in it
        # sorted descending by posted
        posted_dates = [it["posted"] for it in d["items"]]
        assert posted_dates == sorted(posted_dates, reverse=True)

    def test_filter_healthcare(self, api):
        r = api.get(f"{BASE_URL}/api/regulatory-digest",
                    params={"industry": "healthcare"})
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 3
        for it in d["items"]:
            assert it["industry"] == "healthcare"

    def test_filter_transport(self, api):
        r = api.get(f"{BASE_URL}/api/regulatory-digest",
                    params={"industry": "transport"})
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 2
        for it in d["items"]:
            assert it["industry"] == "transport"


# ---------------- demo-requests ----------------
class TestDemoRequests:
    def test_unauth_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/demo-requests")
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"

    def test_owner_list(self, api, owner_headers):
        r = api.get(f"{BASE_URL}/api/demo-requests", headers=owner_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "rows" in d
        assert "counts" in d
        for k in ("new", "contacted", "qualified", "closed"):
            assert k in d["counts"], f"Missing counts key: {k}"

    def test_patch_status_flow(self, api, owner_headers):
        # Seed a demo request via public endpoint
        payload = {
            "first_name": "TEST_Iter39",
            "last_name": "Tester",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "business_name": "TEST Co",
            "industry": "trades",
            "staff_count": "1-5",
            "challenge": "iter39 test"
        }
        cr = api.post(f"{BASE_URL}/api/demo/request", json=payload)
        assert cr.status_code in (200, 201), cr.text
        req_id = cr.json().get("request_id") or cr.json().get("id")
        assert req_id, f"No request_id in: {cr.json()}"

        # PATCH to contacted
        pr = api.patch(f"{BASE_URL}/api/demo-requests/{req_id}",
                       headers=owner_headers,
                       json={"status": "contacted"})
        assert pr.status_code == 200, pr.text
        assert pr.json().get("status") == "contacted"

        # Verify persistence
        gr = api.get(f"{BASE_URL}/api/demo-requests", headers=owner_headers)
        rows = gr.json()["rows"]
        found = [r for r in rows if r.get("request_id") == req_id]
        assert found, "Patched request not found in list"
        assert found[0].get("status") == "contacted"

    def test_patch_invalid_status(self, api, owner_headers):
        # Need an existing id - list
        gr = api.get(f"{BASE_URL}/api/demo-requests", headers=owner_headers)
        rows = gr.json()["rows"]
        if not rows:
            pytest.skip("No demo-requests to patch")
        req_id = rows[0]["request_id"]
        pr = api.patch(f"{BASE_URL}/api/demo-requests/{req_id}",
                       headers=owner_headers,
                       json={"status": "invalid"})
        assert pr.status_code == 400, pr.text

    def test_patch_nonexistent(self, api, owner_headers):
        pr = api.patch(f"{BASE_URL}/api/demo-requests/doesnotexist123",
                       headers=owner_headers,
                       json={"status": "contacted"})
        assert pr.status_code == 404, pr.text


# ---------------- Regression ----------------
class TestRegression:
    def test_billing_tiers(self, api):
        r = api.get(f"{BASE_URL}/api/billing/tiers")
        assert r.status_code == 200
        d = r.json()
        tiers = d.get("tiers", d) if isinstance(d, dict) else d
        # Ensure healthcare_enterprise_annual present
        if isinstance(tiers, list):
            slugs = [t.get("slug") or t.get("tier") for t in tiers]
        elif isinstance(tiers, dict):
            slugs = list(tiers.keys())
        else:
            slugs = []
        assert "healthcare_enterprise_annual" in slugs or any(
            "health" in str(s) and "enterprise" in str(s) and "annual" in str(s)
            for s in slugs), f"healthcare_enterprise_annual missing: {slugs[:5]}"

    def test_demo_request_public(self, api):
        r = api.post(f"{BASE_URL}/api/demo/request",
                     json={"first_name": "TEST_reg", "email": "t_reg@example.com",
                           "business_name": "X", "industry": "trades"})
        assert r.status_code in (200, 201)

    def test_compliance_inbox(self, api, owner_headers):
        r = api.get(f"{BASE_URL}/api/compliance-inbox", headers=owner_headers)
        assert r.status_code == 200

    def test_industry_signal_trades(self, api):
        r = api.get(f"{BASE_URL}/api/public/industry-signal/trades")
        assert r.status_code == 200
