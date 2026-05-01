"""Iter38 — Plan Right-sizer / Risk Calc / Book-Demo / Ecosystem redirect.

Backend tests:
- POST /api/demo/request validation (400 when required fields missing)
- POST /api/demo/request success (200 + request_id DMO-*)
- /api/billing/tiers still returns 40 tiers (regression)
- trades regression: /api/features/me, /api/swms, /api/incidents, /api/workers, /api/compliance-inbox/summary
"""
import os
import pytest
import requests

# Load frontend .env to mirror the production URL users actually hit
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
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
    assert r.status_code == 200, f"login failed {r.status_code}: {r.text}"
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Demo request endpoint ----------

class TestDemoRequest:
    def test_missing_industry_returns_400(self):
        r = requests.post(f"{BASE_URL}/api/demo/request", json={"first_name": "A", "email": "a@b.com"})
        assert r.status_code == 400, r.text
        assert "industry" in r.text.lower()

    def test_missing_email_returns_400(self):
        r = requests.post(f"{BASE_URL}/api/demo/request", json={"first_name": "A", "industry": "trades"})
        assert r.status_code == 400

    def test_missing_first_name_returns_400(self):
        r = requests.post(f"{BASE_URL}/api/demo/request", json={"industry": "trades", "email": "a@b.com"})
        assert r.status_code == 400

    def test_valid_request_returns_200_with_request_id(self):
        body = {
            "industry": "healthcare",
            "first_name": "TEST_iter38",
            "last_name": "TestUser",
            "email": "TEST_iter38@example.com",
            "business_name": "TEST_Clinic",
            "phone": "0400000000",
            "role": "Business Owner or Director",
            "staff_count": "16-30",
            "locations": "2-5",
            "current_approach": "paper",
            "challenge": "Testing",
            "best_time": "morning",
        }
        r = requests.post(f"{BASE_URL}/api/demo/request", json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        rid = data.get("request_id", "")
        assert rid.startswith("DMO-"), f"request_id not DMO-*: {rid}"
        assert len(rid) > 6


# ---------- Billing tiers regression ----------

class TestBillingRegression:
    def test_billing_tiers_has_40_entries(self):
        r = requests.get(f"{BASE_URL}/api/billing/tiers")
        assert r.status_code == 200, r.text
        data = r.json()
        tiers = data if isinstance(data, list) else data.get("tiers") or data.get("items") or []
        assert len(tiers) == 40, f"Expected 40 tiers, got {len(tiers)}"

    def test_billing_tiers_includes_key_products(self):
        r = requests.get(f"{BASE_URL}/api/billing/tiers")
        tiers = r.json() if isinstance(r.json(), list) else r.json().get("tiers", [])
        # API uses flat shape {tier, cycle, amount, currency, label} — compose slug
        slugs = {f"{t.get('tier')}_{t.get('cycle')}" for t in tiers}
        assert "health_enterprise_annual" in slugs
        assert "sole_trader_annual" in slugs
        assert "retail_enterprise_annual" in slugs


# ---------- Trades regression (authenticated) ----------

class TestTradesRegression:
    def test_features_me_200(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/features/me", headers=auth_headers)
        assert r.status_code == 200, r.text

    def test_swms_list_200(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/swms", headers=auth_headers)
        assert r.status_code == 200, r.text

    def test_incidents_list_200(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/incidents", headers=auth_headers)
        assert r.status_code == 200, r.text

    def test_workers_list_200(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/workers", headers=auth_headers)
        assert r.status_code == 200, r.text

    def test_compliance_inbox_summary_200(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/compliance-inbox/summary", headers=auth_headers)
        assert r.status_code == 200, r.text


# ---------- Auth gating ----------

class TestAuthGating:
    def test_features_me_unauthenticated_blocked(self):
        r = requests.get(f"{BASE_URL}/api/features/me")
        assert r.status_code in (401, 403), f"expected auth gate, got {r.status_code}"

    def test_demo_request_is_public(self):
        """demo/request is intentionally public (pre-signup form)."""
        r = requests.post(f"{BASE_URL}/api/demo/request", json={"industry": "trades", "first_name": "X", "email": "x@y.com"})
        assert r.status_code == 200
