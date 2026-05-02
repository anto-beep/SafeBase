"""Iter44 regression: backend is unchanged per spec.
Tests:
- /api/billing/tiers returns 40 tier slugs (Iter41 shape unchanged)
- /api/regulator-pipeline/matrices returns 200
- /api/scheduling/mandatory-credentials returns 200
- /api/api-keys/integration-targets returns 200 (auth-gated)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
TEST_EMAIL = "owner@safetradie.demo"
TEST_PW = "Demo@1234"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PW})
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text[:200]}")
    return r.json().get("access_token") or r.json().get("token")


# ---------- Billing tiers regression ----------
def test_billing_tiers_returns_40_slugs(session):
    r = session.get(f"{BASE_URL}/api/billing/tiers")
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    # Normalise shape: may be a dict { tiers: [...] } or a list
    tiers = data.get("tiers") if isinstance(data, dict) else data
    assert isinstance(tiers, list), f"Unexpected shape: {type(tiers)}"
    # Collect unique slugs
    slugs = {t.get("slug") for t in tiers if t.get("slug")}
    assert len(slugs) == 40, f"Expected 40 unique slugs, got {len(slugs)}: {sorted(slugs)[:5]}..."
    # Spot check a few monthly/annual slugs exist (slugs use plan_monthly / plan_annual naming)
    assert any("_monthly" in s for s in slugs)
    assert any("_annual" in s for s in slugs)


def test_billing_tiers_prices_present(session):
    r = session.get(f"{BASE_URL}/api/billing/tiers")
    assert r.status_code == 200
    data = r.json()
    tiers = data.get("tiers") if isinstance(data, dict) else data
    # Verify first tier has an amount > 0
    sample = tiers[0]
    amount_field = None
    for k in ("amount", "price", "amount_aud", "price_aud", "unit_amount"):
        if k in sample:
            amount_field = k
            break
    assert amount_field is not None, f"No price field found. Keys: {list(sample.keys())}"
    assert isinstance(sample[amount_field], (int, float)) and sample[amount_field] > 0


# ---------- Regulator pipeline matrices ----------
def test_regulator_pipeline_matrices(session, auth_token):
    h = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
    r = session.get(f"{BASE_URL}/api/regulator-pipeline/matrices", headers=h)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert isinstance(data, (dict, list))


# ---------- Scheduling mandatory credentials ----------
def test_scheduling_mandatory_credentials(session, auth_token):
    h = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
    r = session.get(f"{BASE_URL}/api/scheduling/mandatory-credentials", headers=h)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert isinstance(data, (dict, list))


# ---------- API keys integration targets ----------
def test_api_keys_integration_targets(session, auth_token):
    h = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
    r = session.get(f"{BASE_URL}/api/api-keys/integration-targets", headers=h)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    # Expect a list or object containing targets
    if isinstance(data, dict):
        targets = data.get("targets") or data.get("integration_targets") or list(data.values())
    else:
        targets = data
    assert targets, "No integration targets returned"
