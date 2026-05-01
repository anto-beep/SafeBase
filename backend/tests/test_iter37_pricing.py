"""
Iter37 — Pricing overhaul + retail/healthcare new slugs + checkout amounts +
trades regression. Run via:
    pytest backend/tests/test_iter37_pricing.py -v
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "owner@safetradie.demo", "password": "Demo@1234"}

EXPECTED_SPOTS = {
    "sole_trader_monthly": 399,
    "sole_trader_annual": 3990,
    "small_business_monthly": 799,
    "growing_business_monthly": 1299,
    "enterprise_monthly": 2199,
    "enterprise_annual": 21990,
    "hosp_single_annual": 7990,
    "hosp_enterprise_annual": 37990,
    "trans_owner_annual": 9990,
    "trans_enterprise_annual": 44990,
    "health_solo_annual": 14990,
    "health_small_annual": 27990,
    "health_multi_annual": 44990,
    "health_enterprise_monthly": 13999,
    "health_enterprise_annual": 139990,
    "retail_single_annual": 5490,
    "retail_enterprise_annual": 27990,
}

NEW_SLUG_PREFIXES = ("retail_", "hosp_", "trans_", "health_")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    r = session.post(f"{API}/auth/login", json=OWNER, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"Auth failed: {r.status_code} {r.text[:120]}")
    return r.json().get("token")


@pytest.fixture
def auth(session, auth_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}",
    })
    return s


# ---------- Tiers list ----------
class TestTiers:
    def test_tiers_returns_40(self, session):
        r = session.get(f"{API}/billing/tiers", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 40, f"Expected 40 tiers, got {len(data)}"

    def test_spot_check_amounts(self, session):
        r = session.get(f"{API}/billing/tiers", timeout=15)
        tiers = {t["slug"]: t for t in r.json()}
        wrong = []
        for slug, expected in EXPECTED_SPOTS.items():
            if slug not in tiers:
                wrong.append(f"{slug} missing")
                continue
            actual = tiers[slug]["amount"]
            if float(actual) != float(expected):
                wrong.append(f"{slug}: expected {expected}, got {actual}")
        assert not wrong, "Mismatches: " + "; ".join(wrong)

    def test_new_slug_groups_present(self, session):
        r = session.get(f"{API}/billing/tiers", timeout=15)
        slugs = {t["slug"] for t in r.json()}
        for prefix in NEW_SLUG_PREFIXES:
            count = sum(1 for s in slugs if s.startswith(prefix))
            assert count == 8, f"Expected 8 {prefix}* slugs, got {count}"

    def test_currency_aud(self, session):
        r = session.get(f"{API}/billing/tiers", timeout=15)
        for t in r.json():
            assert t["currency"] == "aud", f"{t['slug']} currency != aud"


# ---------- Checkout ----------
class TestCheckout:
    def test_checkout_sole_trader_annual(self, auth):
        r = auth.post(
            f"{API}/billing/checkout",
            json={"tier_slug": "sole_trader_annual", "origin_url": "https://safebase.com.au"},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        assert "url" in data
        assert "session_id" in data

    def test_checkout_health_enterprise_annual(self, auth):
        r = auth.post(
            f"{API}/billing/checkout",
            json={"tier_slug": "health_enterprise_annual", "origin_url": "https://safebase.com.au"},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        assert "url" in data
        assert "session_id" in data

    def test_checkout_new_retail_slug(self, auth):
        r = auth.post(
            f"{API}/billing/checkout",
            json={"tier_slug": "retail_enterprise_annual", "origin_url": "https://safebase.com.au"},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:200]

    def test_checkout_invalid_slug_400(self, auth):
        r = auth.post(
            f"{API}/billing/checkout",
            json={"tier_slug": "nope_xyz", "origin_url": "https://safebase.com.au"},
            timeout=15,
        )
        assert r.status_code == 400


# ---------- Trades regression ----------
class TestTradesRegression:
    def test_features_me(self, auth):
        r = auth.get(f"{API}/features/me", timeout=15)
        assert r.status_code == 200
        data = r.json()
        # could be set / list / dict — just confirm payload exists
        assert data is not None

    def test_swms(self, auth):
        r = auth.get(f"{API}/swms", timeout=15)
        assert r.status_code == 200

    def test_incidents(self, auth):
        r = auth.get(f"{API}/incidents", timeout=15)
        assert r.status_code == 200

    def test_workers(self, auth):
        r = auth.get(f"{API}/workers", timeout=15)
        assert r.status_code == 200

    def test_compliance_inbox_summary(self, auth):
        r = auth.get(f"{API}/compliance-inbox/summary", timeout=20)
        assert r.status_code == 200
        data = r.json()
        # Expected shape — flat severity counts
        for k in ("critical", "high", "medium"):
            assert k in data, f"Missing key {k} in summary"
