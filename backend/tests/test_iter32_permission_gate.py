"""
Iter32 — Industry × Role × Plan permission architecture (P0).

Tests:
  1. /api/features/me returns enabled_features + navigation for the user.
  2. Trades user receives `swms_generator` in their feature set.
  3. After PATCH /api/auth/me/industry to healthcare, swms_generator drops out
     and care_quality_module + ahpra_tracking appear.
  4. Healthcare user POST /api/swms returns 403 with descriptive payload.
  5. Healthcare user POST /api/docs/haccp_plan (hospitality-only) → 403.
  6. Hospitality user POST /api/docs/haccp_plan succeeds (200/201 or
     201-ish — at minimum, NOT 403/404).
  7. Trades user GET /api/swms still works (regression).
"""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"
EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"


def _login():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _set_industry(token, industry):
    r = requests.patch(
        f"{API}/auth/me/industry",
        json={"industry": industry},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text


class TestFeatureFlags:
    def test_features_me_endpoint_shape(self):
        token = _login()
        _set_industry(token, "trades")
        r = requests.get(f"{API}/features/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        d = r.json()
        for key in ("industry", "role_variant", "plan", "enabled_features", "navigation"):
            assert key in d, f"missing key: {key}"
        assert d["industry"] == "trades"
        assert "swms_generator" in d["enabled_features"]
        assert any(n["code"] == "swms_generator" for n in d["navigation"])

    def test_features_change_with_industry_switch(self):
        token = _login()
        # Trades baseline
        _set_industry(token, "trades")
        r = requests.get(f"{API}/features/me", headers={"Authorization": f"Bearer {token}"})
        trades_features = set(r.json()["enabled_features"])
        assert "swms_generator" in trades_features
        assert "care_quality_module" not in trades_features
        # Switch to healthcare
        _set_industry(token, "healthcare")
        r = requests.get(f"{API}/features/me", headers={"Authorization": f"Bearer {token}"})
        hc_features = set(r.json()["enabled_features"])
        assert "swms_generator" not in hc_features
        assert "care_quality_module" in hc_features
        assert "ahpra_tracking" in hc_features
        # Reset
        _set_industry(token, "trades")


class TestHardBlock403:
    def test_swms_blocked_for_healthcare(self):
        token = _login()
        _set_industry(token, "healthcare")
        try:
            r = requests.post(
                f"{API}/swms",
                headers={"Authorization": f"Bearer {token}"},
                json={"company_name": "x", "work_activity": "y", "site_location": "z", "trade": "electrician"},
            )
            assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
            d = r.json()["detail"]
            assert d["error"] == "feature_not_available"
            assert d["code"] == "swms_generator"
            assert d["industry"] == "healthcare"
        finally:
            _set_industry(token, "trades")

    def test_industry_gated_doc_blocked(self):
        token = _login()
        _set_industry(token, "healthcare")
        try:
            r = requests.post(
                f"{API}/docs/haccp_plan",
                headers={"Authorization": f"Bearer {token}"},
                json={"facility_name": "Test"},
            )
            assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
            d = r.json()["detail"]
            assert d["error"] == "feature_not_available"
            assert d["code"] == "doc_type:haccp_plan"
        finally:
            _set_industry(token, "trades")

    def test_swms_allowed_for_trades(self):
        """Regression — trades user can still GET /api/swms (200)."""
        token = _login()
        _set_industry(token, "trades")
        r = requests.get(f"{API}/swms", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_hospitality_can_create_haccp(self):
        token = _login()
        _set_industry(token, "hospitality")
        try:
            r = requests.post(
                f"{API}/docs/haccp_plan",
                headers={"Authorization": f"Bearer {token}"},
                json={"facility_name": "Test Cafe"},
            )
            # Should NOT be 403. May be 200/201 or 422 if fields incomplete.
            assert r.status_code != 403, f"Should not be blocked: {r.text}"
            assert r.status_code != 404, f"Doc type should be visible: {r.text}"
        finally:
            _set_industry(token, "trades")


class TestEnabledFeaturesInAuthMe:
    def test_auth_me_includes_features(self):
        token = _login()
        _set_industry(token, "trades")
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        d = r.json()
        assert "enabled_features" in d
        assert "swms_generator" in d["enabled_features"]
        assert d.get("active_industries")
        assert d.get("primary_industry")
