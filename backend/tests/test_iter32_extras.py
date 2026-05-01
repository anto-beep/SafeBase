"""
Iter32 extras — covers items in the review request not yet asserted by
test_iter32_permission_gate.py:

  - POST /api/auth/login response includes enabled_features
  - PATCH /api/auth/me/industry appends to active_industries + returns updated payload
  - GET  /api/auth/me/industries returns {current, primary_industry, active_industries}
  - PUT  /api/auth/me/industries updates active_industries roster with primary
  - Trades user POST /api/swms succeeds (regression guard)
  - GET  /api/tradeinduct/default-questions returns industry-aware question bank
  - POST /api/tradeinduct/programs auto-applies industry-default questions
  - GET  /api/tradecheck/required-credentials industry-specific
  - POST /api/tradecheck/validate-listing returns coverage_pct + missing_required
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"
EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"


def _login_full():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()


def _login():
    return _login_full()["token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _set_industry(token, industry):
    r = requests.patch(f"{API}/auth/me/industry", json={"industry": industry}, headers=_hdr(token))
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module", autouse=True)
def cleanup_industry():
    yield
    try:
        token = _login()
        _set_industry(token, "trades")
    except Exception:
        pass


# ---- Auth payload contains enabled_features --------------------------------
class TestAuthPayloadFeatures:
    def test_login_includes_enabled_features(self):
        body = _login_full()
        # enabled_features may be on body or nested under user
        ef = body.get("enabled_features") or (body.get("user") or {}).get("enabled_features")
        assert ef is not None, f"login missing enabled_features (top or user). keys={list(body)}"
        assert isinstance(ef, list)
        assert len(ef) > 0

    def test_auth_me_includes_industries_fields(self):
        token = _login()
        _set_industry(token, "trades")
        r = requests.get(f"{API}/auth/me", headers=_hdr(token))
        assert r.status_code == 200
        d = r.json()
        for k in ("enabled_features", "active_industries", "primary_industry"):
            assert k in d, f"missing key in /auth/me: {k}"
        assert d["primary_industry"]
        assert isinstance(d["active_industries"], list)


# ---- Industry switching ----------------------------------------------------
class TestIndustrySwitcher:
    def test_patch_industry_returns_payload_and_appends(self):
        token = _login()
        _set_industry(token, "trades")  # baseline
        # switch to hospitality
        r = requests.patch(f"{API}/auth/me/industry", json={"industry": "hospitality"}, headers=_hdr(token))
        assert r.status_code == 200, r.text
        d = r.json()
        # accept either flat or nested shape
        active = d.get("active_industries") or (d.get("user") or {}).get("active_industries") or []
        assert "hospitality" in active, f"expected hospitality appended; got {active}"
        # Reset
        _set_industry(token, "trades")

    def test_get_industries_endpoint_shape(self):
        token = _login()
        _set_industry(token, "trades")
        r = requests.get(f"{API}/auth/me/industries", headers=_hdr(token))
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("current", "primary_industry", "active_industries"):
            assert k in d, f"missing key: {k}"
        assert d["current"] == "trades"

    def test_put_industries_updates_roster(self):
        token = _login()
        _set_industry(token, "trades")
        payload = {"active_industries": ["trades", "hospitality"], "primary_industry": "trades"}
        r = requests.put(f"{API}/auth/me/industries", json=payload, headers=_hdr(token))
        assert r.status_code == 200, r.text
        d = r.json()
        active = d.get("active_industries") or (d.get("user") or {}).get("active_industries") or []
        assert set(active) >= {"trades", "hospitality"}, f"got {active}"
        # Reset to trades-only
        requests.put(
            f"{API}/auth/me/industries",
            json={"active_industries": ["trades"], "primary_industry": "trades"},
            headers=_hdr(token),
        )


# ---- SWMS regression (trades) ---------------------------------------------
class TestSwmsTradesRegression:
    def test_post_swms_trades(self):
        token = _login()
        _set_industry(token, "trades")
        r = requests.post(
            f"{API}/swms",
            headers=_hdr(token),
            json={
                "company_name": "TEST_Co",
                "activity": "Wiring",
                "work_activity": "Wiring",
                "site_location": "Site A",
                "trade": "electrician",
            },
        )
        # Accept 200/201; not 403/404
        assert r.status_code in (200, 201), f"trades POST /api/swms failed: {r.status_code} {r.text[:300]}"


# ---- SafeInduct industry-aware --------------------------------------------
class TestSafeInductIndustry:
    def test_default_questions_per_industry(self):
        token = _login()
        # Trades
        _set_industry(token, "trades")
        r = requests.get(f"{API}/tradeinduct/default-questions", headers=_hdr(token))
        assert r.status_code == 200, r.text
        trades_blob = r.text.lower()
        assert "white card" in trades_blob or "white_card" in trades_blob
        # Hospitality
        _set_industry(token, "hospitality")
        r = requests.get(f"{API}/tradeinduct/default-questions", headers=_hdr(token))
        assert r.status_code == 200, r.text
        assert "rsa" in r.text.lower()
        # Transport
        _set_industry(token, "transport")
        r = requests.get(f"{API}/tradeinduct/default-questions", headers=_hdr(token))
        assert r.status_code == 200, r.text
        body = r.text.lower()
        assert "fatigue" in body or "hr licence" in body or "hr_licence" in body
        # Healthcare
        _set_industry(token, "healthcare")
        r = requests.get(f"{API}/tradeinduct/default-questions", headers=_hdr(token))
        assert r.status_code == 200, r.text
        body = r.text.lower()
        assert "ahpra" in body or "ndis" in body
        # Retail
        _set_industry(token, "retail")
        r = requests.get(f"{API}/tradeinduct/default-questions", headers=_hdr(token))
        assert r.status_code == 200, r.text
        assert "lone" in r.text.lower()
        # Reset
        _set_industry(token, "trades")

    def test_program_create_applies_industry_defaults(self):
        token = _login()
        _set_industry(token, "trades")
        r = requests.post(
            f"{API}/tradeinduct/programs",
            json={"title": "TEST_AutoQs", "description": "auto-defaults", "trade": "electrician"},
            headers=_hdr(token),
        )
        assert r.status_code in (200, 201), r.text
        d = r.json()
        questions = d.get("questions") or (d.get("program") or {}).get("questions") or []
        assert len(questions) > 0, f"expected default trades questions to be auto-applied; got {d}"


# ---- SafeCheck industry-aware credentials ---------------------------------
class TestSafeCheckCredentials:
    def test_required_credentials_trades(self):
        token = _login()
        _set_industry(token, "trades")
        r = requests.get(f"{API}/tradecheck/required-credentials", headers=_hdr(token))
        assert r.status_code == 200, r.text
        body = r.text.lower()
        # trades creds
        assert "white_card" in body or "white card" in body
        assert "trade_licence" in body or "trade licence" in body or "trade_license" in body
        assert "public_liability" in body or "public liability" in body

    def test_required_credentials_hospitality(self):
        token = _login()
        _set_industry(token, "hospitality")
        r = requests.get(f"{API}/tradecheck/required-credentials", headers=_hdr(token))
        assert r.status_code == 200, r.text
        body = r.text.lower()
        assert "rsa" in body or "food" in body
        _set_industry(token, "trades")

    def test_validate_listing_returns_coverage(self):
        token = _login()
        _set_industry(token, "trades")
        r = requests.post(
            f"{API}/tradecheck/validate-listing",
            json={"credentials": [{"type": "white_card"}]},
            headers=_hdr(token),
        )
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert "coverage_pct" in d, f"missing coverage_pct in {d}"
        assert "missing_required" in d, f"missing missing_required in {d}"
