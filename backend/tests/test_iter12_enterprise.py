"""Iteration 12 — Enterprise tier rollout backend tests.

Covers:
- GET  /api/billing/tiers   (public)  — returns 8 tier slugs with correct AUD amounts
- GET  /api/billing/my-subscription (JWT) — returns tier/cycle/status
- POST /api/enterprise/demo-request (public) — accepts a demo-request payload
- POST /api/billing/checkout for enterprise_monthly — creates Stripe checkout session
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

OWNER_EMAIL = "owner@safetradie.demo"
OWNER_PASS = "Demo@1234"

EXPECTED_MONTHLY = {
    "sole_trader_monthly": 249.00,
    "small_business_monthly": 499.00,
    "growing_business_monthly": 799.00,
    "enterprise_monthly": 1299.00,
}
EXPECTED_ANNUAL = {
    "sole_trader_annual": 2490.00,
    "small_business_annual": 4990.00,
    "growing_business_annual": 7990.00,
    "enterprise_annual": 12990.00,
}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    r = session.post(f"{API}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASS})
    if r.status_code != 200:
        pytest.skip(f"Owner login failed ({r.status_code}): {r.text}")
    tok = r.json().get("access_token") or r.json().get("token")
    if not tok:
        pytest.skip(f"No token returned: {r.json()}")
    return tok


@pytest.fixture(scope="module")
def auth_session(session, auth_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}",
    })
    return s


# --- /api/billing/tiers ---
class TestBillingTiers:
    def test_tiers_returns_8_entries(self, session):
        r = session.get(f"{API}/billing/tiers")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 8, f"Expected 8 tiers, got {len(data)}: {[t['slug'] for t in data]}"

    def test_tiers_contain_all_expected_slugs(self, session):
        r = session.get(f"{API}/billing/tiers")
        slugs = {t["slug"] for t in r.json()}
        expected = set(EXPECTED_MONTHLY.keys()) | set(EXPECTED_ANNUAL.keys())
        assert slugs == expected, f"Slug mismatch. Missing: {expected - slugs}, Extra: {slugs - expected}"

    def test_monthly_amounts_correct(self, session):
        r = session.get(f"{API}/billing/tiers")
        by_slug = {t["slug"]: t for t in r.json()}
        for slug, expected_amount in EXPECTED_MONTHLY.items():
            assert by_slug[slug]["amount"] == expected_amount, (
                f"{slug}: expected {expected_amount}, got {by_slug[slug]['amount']}"
            )
            assert by_slug[slug]["currency"] == "aud"
            assert by_slug[slug]["cycle"] == "monthly"

    def test_annual_amounts_correct(self, session):
        r = session.get(f"{API}/billing/tiers")
        by_slug = {t["slug"]: t for t in r.json()}
        for slug, expected_amount in EXPECTED_ANNUAL.items():
            assert by_slug[slug]["amount"] == expected_amount, (
                f"{slug}: expected {expected_amount}, got {by_slug[slug]['amount']}"
            )
            assert by_slug[slug]["currency"] == "aud"
            assert by_slug[slug]["cycle"] == "annual"

    def test_enterprise_tier_exists(self, session):
        r = session.get(f"{API}/billing/tiers")
        by_slug = {t["slug"]: t for t in r.json()}
        assert "enterprise_monthly" in by_slug
        assert "enterprise_annual" in by_slug
        assert by_slug["enterprise_monthly"]["tier"] == "enterprise"
        assert by_slug["enterprise_annual"]["tier"] == "enterprise"


# --- /api/billing/my-subscription ---
class TestMySubscription:
    def test_requires_auth(self, session):
        r = session.get(f"{API}/billing/my-subscription")
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"

    def test_authenticated_returns_shape(self, auth_session):
        r = auth_session.get(f"{API}/billing/my-subscription")
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ("tier", "cycle", "status"):
            assert key in data, f"Missing key '{key}': {data}"
        assert "recent_transactions" in data
        assert isinstance(data["recent_transactions"], list)


# --- /api/enterprise/demo-request ---
class TestEnterpriseDemoRequest:
    def test_demo_request_success_no_auth(self, session):
        payload = {
            "name": f"TEST_Iter12 {uuid.uuid4().hex[:6]}",
            "business_name": "TEST_Iter12 Trades Pty Ltd",
            "contact_email": f"test_iter12_{uuid.uuid4().hex[:6]}@example.com",
            "contact_phone": "0400000000",
            "abn": "12345678901",
            "trades": ["electrical"],
            "workers": 50,
            "sites": 10,
            "states": ["NSW"],
            "current_tools": "spreadsheets",
            "challenge": "scaling",
            "best_time": "mornings",
        }
        r = session.post(f"{API}/enterprise/demo-request", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert "request_id" in data and data["request_id"].startswith("edr_")
        assert "message" in data

    def test_demo_request_missing_required_field(self, session):
        r = session.post(f"{API}/enterprise/demo-request", json={"name": "x"})
        assert r.status_code == 400


# --- /api/billing/checkout enterprise_monthly ---
class TestEnterpriseCheckout:
    def test_enterprise_checkout_session_created(self, auth_session):
        r = auth_session.post(
            f"{API}/billing/checkout",
            json={
                "tier_slug": "enterprise_monthly",
                "origin_url": "https://safe-systems.preview.emergentagent.com",
            },
        )
        # Status: 200 expected. Stripe test key should create a session. If it fails due to
        # network/sandbox we'll flag it for main agent but not crash the whole suite.
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        # Response shape: { url, session_id, ... } based on StripeCheckout.create_checkout_session
        assert "url" in data or "session_id" in data or "checkout_url" in data, f"Unexpected shape: {data}"

    def test_invalid_tier_slug_rejected(self, auth_session):
        r = auth_session.post(
            f"{API}/billing/checkout",
            json={"tier_slug": "not_a_tier", "origin_url": "https://example.com"},
        )
        assert r.status_code == 400
