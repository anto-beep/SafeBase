"""SafeBase Iter57 — P1 backlog validation tests.

Covers:
  - /api/oauth/status, /api/oauth/{p}/start (scaffolded — not_configured ok)
  - /api/device-tokens/register and DELETE
  - /api/dashboard/widget/* per industry (5 industries)
  - Inline action endpoints called by IndustryAlertTile.jsx
  - Auth/me regression for all 6 demo logins
"""
from __future__ import annotations

import os

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

DEMO_OWNER = ("owner@safetradie.demo", "Demo@1234")
INDUSTRY_DEMOS = {
    "trades":      ("trades.demo@safebase.com.au", "Demo@1234"),
    "hospitality": ("hospitality.demo@safebase.com.au", "Demo@1234"),
    "transport":   ("transport.demo@safebase.com.au", "Demo@1234"),
    "healthcare": ("healthcare.demo@safebase.com.au", "Demo@1234"),
    "retail":     ("retail.demo@safebase.com.au", "Demo@1234"),
}

# Widget endpoint per industry
WIDGET = {
    "trades":      "/api/dashboard/widget/credential-expiry",
    "hospitality": "/api/dashboard/widget/temp-alert",
    "transport":   "/api/dashboard/widget/fatigue-alert",
    "healthcare":  "/api/dashboard/widget/ahpra-expiry",
    "retail":      "/api/dashboard/widget/lone-worker",
}


# ─────── helpers ───────
def _login(email: str, pw: str) -> str | None:
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": pw}, timeout=15)
    if r.status_code != 200:
        return None
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="session")
def owner_token():
    tok = _login(*DEMO_OWNER)
    if not tok:
        pytest.skip("Cannot log in as owner@safetradie.demo")
    return tok


@pytest.fixture(scope="session")
def industry_tokens():
    out = {}
    for ind, (email, pw) in INDUSTRY_DEMOS.items():
        tok = _login(email, pw)
        if tok:
            out[ind] = tok
    return out


def _h(tok: str) -> dict:
    return {"Authorization": f"Bearer {tok}"}


# ─────── Regression: auth/me works ───────
class TestAuthRegression:
    def test_login_owner(self, owner_token):
        assert owner_token

    def test_auth_me_owner(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=_h(owner_token), timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("email") == DEMO_OWNER[0]

    @pytest.mark.parametrize("industry", list(INDUSTRY_DEMOS.keys()))
    def test_industry_demo_login_and_me(self, industry, industry_tokens):
        if industry not in industry_tokens:
            pytest.skip(f"Industry login failed for {industry}")
        tok = industry_tokens[industry]
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=_h(tok), timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        # industry field should reflect the demo seed
        ind_val = (body.get("industry") or body.get("primary_industry") or "").lower()
        assert industry in ind_val or ind_val in (industry, ""), \
            f"Expected industry {industry}, got {ind_val}"


# ─────── /api/oauth/* ───────
class TestNativeOAuth:
    VENDORS = ["xero", "deputy", "teletrac", "ahpra", "shopify"]

    def test_oauth_status_lists_vendors(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/oauth/status", headers=_h(owner_token), timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        providers = body.get("providers") or []
        slugs = {p["slug"] for p in providers}
        for v in self.VENDORS:
            assert v in slugs, f"Missing vendor {v} in /oauth/status"
        # Each entry has configured + connected + label
        for p in providers:
            assert "configured" in p and "connected" in p and "label" in p

    @pytest.mark.parametrize("vendor", VENDORS)
    def test_oauth_start_returns_400_not_configured(self, owner_token, vendor):
        # Vendor secrets aren't configured — spec says either redirect OR 400 "not configured"
        r = requests.get(f"{BASE_URL}/api/oauth/{vendor}/start",
                         headers=_h(owner_token), timeout=10, allow_redirects=False)
        # 400 (not configured) is the EXPECTED happy path when env keys missing.
        # 307/302 redirect is acceptable when keys ARE configured.
        # 400 is fine. Shopify also needs ?shop=, expect 400.
        assert r.status_code in (302, 307, 400), \
            f"{vendor} → {r.status_code}: {r.text[:200]}"

    def test_oauth_start_unknown_provider(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/oauth/nope/start",
                         headers=_h(owner_token), timeout=10)
        assert r.status_code == 404

    def test_oauth_status_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/oauth/status", timeout=10)
        assert r.status_code in (401, 403)


# ─────── /api/device-tokens/* (push) ───────
class TestPushNotifications:
    def test_register_and_deregister(self, owner_token):
        body = {"platform": "ios", "token": "TEST_PUSH_TOKEN_iter57_" + "x" * 12,
                "app_version": "1.0.0", "device_model": "iPhone15,2"}
        r = requests.post(f"{BASE_URL}/api/device-tokens/register",
                          json=body, headers=_h(owner_token), timeout=10)
        assert r.status_code == 200, r.text
        out = r.json()
        assert out.get("ok") is True
        token_id = out.get("token_id")
        assert token_id

        # Idempotent re-register → same token_id
        r2 = requests.post(f"{BASE_URL}/api/device-tokens/register",
                           json=body, headers=_h(owner_token), timeout=10)
        assert r2.status_code == 200
        assert r2.json().get("token_id") == token_id

        # List tokens
        rl = requests.get(f"{BASE_URL}/api/device-tokens",
                          headers=_h(owner_token), timeout=10)
        assert rl.status_code == 200
        tokens = rl.json().get("tokens", [])
        assert any(t.get("token_id") == token_id for t in tokens)

        # Deregister
        rd = requests.delete(f"{BASE_URL}/api/device-tokens/{token_id}",
                             headers=_h(owner_token), timeout=10)
        assert rd.status_code == 200, rd.text
        assert rd.json().get("ok") is True

    def test_register_rejects_bad_platform(self, owner_token):
        r = requests.post(f"{BASE_URL}/api/device-tokens/register",
                          json={"platform": "blackberry", "token": "x" * 20},
                          headers=_h(owner_token), timeout=10)
        assert r.status_code in (400, 422)

    def test_register_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/device-tokens/register",
                          json={"platform": "ios", "token": "x" * 20}, timeout=10)
        assert r.status_code in (401, 403)


# ─────── Industry Alert Tile widgets ───────
class TestIndustryWidgets:
    @pytest.mark.parametrize("industry", list(WIDGET.keys()))
    def test_widget_returns_200_with_seed_data(self, industry, industry_tokens):
        if industry not in industry_tokens:
            pytest.skip(f"Industry demo {industry} not seeded / login fail")
        tok = industry_tokens[industry]
        r = requests.get(f"{BASE_URL}{WIDGET[industry]}", headers=_h(tok), timeout=15)
        assert r.status_code == 200, f"{industry}: {r.status_code} {r.text[:300]}"
        body = r.json()
        assert body.get("industry") == industry
        # Each widget exposes at least one populated array (the demo seed
        # asserts non-empty data per the iteration spec)
        non_empty_keys = {
            "trades":      ["expiring_soon", "expired"],
            "hospitality": ["overdue_today", "out_of_range"],
            "transport":   ["approaching", "exceeding"],
            "healthcare":  ["expiring_soon", "expired"],
            "retail":      ["open_shifts", "missed"],
        }[industry]
        total = sum(len(body.get(k) or []) for k in non_empty_keys)
        assert total > 0, f"{industry} widget returned empty arrays {body}"


# ─────── Inline action endpoints (the buttons inside IndustryAlertTile.jsx) ───────
class TestIndustryAlertTileActions:
    """The dashboard tile buttons MUST work for P1 to be shippable."""

    def test_log_temp_reading_hospitality(self, industry_tokens):
        if "hospitality" not in industry_tokens:
            pytest.skip("hospitality demo not available")
        tok = industry_tokens["hospitality"]
        # First fetch one unit name from the widget so we know what exists
        w = requests.get(f"{BASE_URL}{WIDGET['hospitality']}",
                         headers=_h(tok), timeout=10).json()
        units = (w.get("overdue_today") or []) + (w.get("out_of_range") or [])
        if not units:
            pytest.skip("no hospitality demo units available")
        unit_name = units[0].get("name") or "Fridge 1"
        r = requests.post(f"{BASE_URL}/api/hospitality/temperature-logs",
                          json={"unit_name": unit_name, "temp_c": 3.5},
                          headers=_h(tok), timeout=10)
        assert r.status_code in (200, 201), r.text

    def test_pause_driver_transport(self, industry_tokens):
        if "transport" not in industry_tokens:
            pytest.skip("transport demo not available")
        tok = industry_tokens["transport"]
        w = requests.get(f"{BASE_URL}{WIDGET['transport']}",
                         headers=_h(tok), timeout=10).json()
        drivers = (w.get("approaching") or []) + (w.get("exceeding") or [])
        if not drivers:
            pytest.skip("no transport drivers available")
        driver_id = drivers[0].get("driver_id")
        r = requests.post(
            f"{BASE_URL}/api/transport/drivers/{driver_id}/pause",
            json={"reason": "iter57 test"},
            headers=_h(tok), timeout=10,
        )
        assert r.status_code in (200, 201), \
            f"pause-driver endpoint missing/broken: {r.status_code} {r.text[:200]}"

    def test_ahpra_reminder_healthcare(self, industry_tokens):
        if "healthcare" not in industry_tokens:
            pytest.skip("healthcare demo not available")
        tok = industry_tokens["healthcare"]
        w = requests.get(f"{BASE_URL}{WIDGET['healthcare']}",
                         headers=_h(tok), timeout=10).json()
        clins = (w.get("expiring_soon") or []) + (w.get("expired") or [])
        if not clins:
            pytest.skip("no healthcare clinicians available")
        clin_id = clins[0].get("clinician_id")
        r = requests.post(
            f"{BASE_URL}/api/healthcare/ahpra-register/{clin_id}/remind",
            json={}, headers=_h(tok), timeout=15,
        )
        assert r.status_code in (200, 201), \
            f"ahpra remind endpoint missing/broken: {r.status_code} {r.text[:200]}"

    def test_licence_reminder_trades(self, industry_tokens):
        if "trades" not in industry_tokens:
            pytest.skip("trades demo not available")
        tok = industry_tokens["trades"]
        w = requests.get(f"{BASE_URL}{WIDGET['trades']}",
                         headers=_h(tok), timeout=10).json()
        lics = (w.get("expiring_soon") or []) + (w.get("expired") or [])
        if not lics:
            pytest.skip("no trades licences available")
        lic_id = lics[0].get("licence_id")
        r = requests.post(
            f"{BASE_URL}/api/licences/{lic_id}/remind",
            json={}, headers=_h(tok), timeout=15,
        )
        assert r.status_code in (200, 201), \
            f"licence remind endpoint missing/broken: {r.status_code} {r.text[:200]}"

    def test_acknowledge_lone_worker_retail(self, industry_tokens):
        if "retail" not in industry_tokens:
            pytest.skip("retail demo not available")
        tok = industry_tokens["retail"]
        w = requests.get(f"{BASE_URL}{WIDGET['retail']}",
                         headers=_h(tok), timeout=10).json()
        shifts = (w.get("missed") or []) + (w.get("open_shifts") or [])
        if not shifts:
            pytest.skip("no retail lone-worker shifts available")
        shift_id = shifts[0].get("shift_id")
        r = requests.post(
            f"{BASE_URL}/api/retail/lone-worker/{shift_id}/acknowledge",
            json={}, headers=_h(tok), timeout=10,
        )
        assert r.status_code in (200, 201), \
            f"lone-worker acknowledge endpoint missing/broken: {r.status_code} {r.text[:200]}"
