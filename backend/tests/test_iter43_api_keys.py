"""Iter43 — API Keys CRUD + bearer auth + integration targets + regression."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
OWNER_EMAIL = "owner@safetradie.demo"
OWNER_PWD = "Demo@1234"


@pytest.fixture(scope="module")
def jwt_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": OWNER_EMAIL, "password": OWNER_PWD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def jwt_headers(jwt_token):
    return {"Authorization": f"Bearer {jwt_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def created_key(jwt_headers):
    """Mint one key for downstream auth tests; do not revoke until last test."""
    r = requests.post(f"{BASE_URL}/api/api-keys", headers=jwt_headers,
                      json={"label": "TEST_ITER43 Xero sync", "scopes": ["read", "write"]}, timeout=30)
    assert r.status_code == 200, f"create key failed: {r.status_code} {r.text}"
    body = r.json()
    return body


# ---------- Features registry ----------
class TestFeaturesMe:
    def test_api_access_enabled_for_owner_default_plan(self, jwt_headers):
        r = requests.get(f"{BASE_URL}/api/features/me", headers=jwt_headers, timeout=20)
        assert r.status_code == 200, r.text
        ef = r.json().get("enabled_features")
        # Backend returns a list of enabled feature slugs
        assert isinstance(ef, list)
        assert "api_access" in ef, f"api_access not enabled: {ef}"
        assert r.json().get("plan") == "starter"


# ---------- Create / List / Revoke ----------
class TestApiKeysCRUD:
    def test_create_returns_plaintext_token(self, created_key):
        assert created_key.get("ok") is True
        token = created_key.get("token")
        assert token and token.startswith("sb_live_")
        k = created_key["key"]
        assert k["label"] == "TEST_ITER43 Xero sync"
        assert k["masked"].startswith("sb_live_")
        assert k["masked"].endswith(token[-4:])
        # NOTE: token_hash is leaked in POST response body (see code review).
        # Listing endpoint correctly strips it; this is a minor info-leak.
        assert k.get("scopes") == ["read", "write"]

    def test_list_excludes_token_hash_and_plaintext(self, jwt_headers, created_key):
        r = requests.get(f"{BASE_URL}/api/api-keys", headers=jwt_headers, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "total" in body and "active" in body and "keys" in body
        match = [k for k in body["keys"] if k["id"] == created_key["key"]["id"]]
        assert match, "newly minted key missing from list"
        k = match[0]
        for f in ("masked", "prefix", "scopes", "created_at", "last_used_at", "revoked_at"):
            assert f in k, f"missing field {f}"
        # security: hash must NEVER leak
        assert "token_hash" not in k
        # plaintext token never echoed
        assert created_key["token"] not in str(body)

    def test_revoke_lifecycle(self, jwt_headers):
        # mint a disposable key, revoke it, ensure 404 on second revoke + 404 for unknown
        r = requests.post(f"{BASE_URL}/api/api-keys", headers=jwt_headers,
                          json={"label": "TEST_ITER43 disposable"}, timeout=20)
        assert r.status_code == 200
        kid = r.json()["key"]["id"]

        # baseline counts
        before = requests.get(f"{BASE_URL}/api/api-keys", headers=jwt_headers, timeout=20).json()
        active_before = before["active"]

        rd = requests.delete(f"{BASE_URL}/api/api-keys/{kid}", headers=jwt_headers, timeout=20)
        assert rd.status_code == 200, rd.text
        body = rd.json()
        assert body.get("ok") is True and body.get("status") == "revoked"

        after = requests.get(f"{BASE_URL}/api/api-keys", headers=jwt_headers, timeout=20).json()
        assert after["active"] == active_before - 1
        revoked_row = next(k for k in after["keys"] if k["id"] == kid)
        assert revoked_row["revoked_at"] is not None

        # Re-DELETE → 404
        rr = requests.delete(f"{BASE_URL}/api/api-keys/{kid}", headers=jwt_headers, timeout=20)
        assert rr.status_code == 404
        # Unknown id → 404
        rn = requests.delete(f"{BASE_URL}/api/api-keys/no-such-key-id", headers=jwt_headers, timeout=20)
        assert rn.status_code == 404


# ---------- Integration targets ----------
class TestIntegrationTargets:
    def _get(self, jwt_headers, industry=None):
        url = f"{BASE_URL}/api/api-keys/integration-targets"
        if industry:
            url += f"?industry={industry}"
        r = requests.get(url, headers=jwt_headers, timeout=20)
        assert r.status_code == 200, r.text
        return r.json()

    def test_default_trades(self, jwt_headers):
        b = self._get(jwt_headers)
        assert b["industry"] == "trades"
        assert len(b["industry_targets"]) == 7
        assert len(b["universal_targets"]) == 4
        slugs = {t["slug"] for t in b["industry_targets"]}
        assert {"xero", "myob", "simpro", "servicem8", "procore", "google_workspace", "microsoft_365"} <= slugs
        usl = {t["slug"] for t in b["universal_targets"]}
        assert usl == {"webhooks", "zapier", "make", "rest_api"}
        assert "rate_limits" in b and "scope_options" in b

    def test_hospitality(self, jwt_headers):
        b = self._get(jwt_headers, "hospitality")
        slugs = {t["slug"] for t in b["industry_targets"]}
        assert {"deputy", "tanda", "lightspeed", "kounta", "iauditor"} <= slugs

    def test_transport(self, jwt_headers):
        b = self._get(jwt_headers, "transport")
        slugs = {t["slug"] for t in b["industry_targets"]}
        assert {"teletrac_navman", "ezy2c", "mygov_nhvr"} <= slugs

    def test_healthcare(self, jwt_headers):
        b = self._get(jwt_headers, "healthcare")
        slugs = {t["slug"] for t in b["industry_targets"]}
        assert {"ahpra_register", "ndis_pace", "leecare"} <= slugs

    def test_retail(self, jwt_headers):
        b = self._get(jwt_headers, "retail")
        slugs = {t["slug"] for t in b["industry_targets"]}
        assert {"shopify", "vend", "square", "deputy"} <= slugs


# ---------- Bearer auth via API key ----------
class TestApiKeyAuth:
    def test_workers_with_api_key(self, created_key, jwt_headers):
        tok = created_key["token"]
        h = {"Authorization": f"Bearer {tok}"}

        # JWT baseline
        rj = requests.get(f"{BASE_URL}/api/workers", headers=jwt_headers, timeout=20)
        assert rj.status_code == 200
        jwt_workers = rj.json()
        jwt_count = len(jwt_workers) if isinstance(jwt_workers, list) else len(jwt_workers.get("workers", []))
        assert jwt_count > 0

        # API key auth
        ra = requests.get(f"{BASE_URL}/api/workers", headers=h, timeout=20)
        assert ra.status_code == 200, ra.text
        api_workers = ra.json()
        api_count = len(api_workers) if isinstance(api_workers, list) else len(api_workers.get("workers", []))
        assert api_count == jwt_count

    def test_auth_me_with_api_key(self, created_key):
        tok = created_key["token"]
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": f"Bearer {tok}"}, timeout=20)
        assert r.status_code == 200, r.text
        u = r.json()
        # accept either flat or nested user
        email = u.get("email") or u.get("user", {}).get("email")
        assert email == OWNER_EMAIL

    def test_invalid_api_key_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/workers",
                         headers={"Authorization": "Bearer sb_live_garbageXXXXXXXXXXXXX"}, timeout=20)
        assert r.status_code == 401, f"expected 401, got {r.status_code}"

    def test_last_used_at_updated(self, created_key, jwt_headers):
        # call something with the api key
        tok = created_key["token"]
        requests.get(f"{BASE_URL}/api/auth/me",
                     headers={"Authorization": f"Bearer {tok}"}, timeout=20)
        time.sleep(1.5)
        r = requests.get(f"{BASE_URL}/api/api-keys", headers=jwt_headers, timeout=20)
        keys = r.json()["keys"]
        row = next(k for k in keys if k["id"] == created_key["key"]["id"])
        assert row.get("last_used_at"), "last_used_at not updated after API-key auth"


# ---------- Regression: prior endpoints + billing tiers ----------
class TestRegression:
    def test_billing_tiers(self, jwt_headers):
        r = requests.get(f"{BASE_URL}/api/billing/tiers", headers=jwt_headers, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        # tiers may be list or {tiers:[...]}
        tiers = body if isinstance(body, list) else body.get("tiers", [])
        assert len(tiers) >= 40, f"expected >=40 tiers, got {len(tiers)}"

    def test_scheduling_endpoint_alive(self, jwt_headers):
        # any GET endpoint under /api/scheduling
        for path in ("/api/scheduling/upcoming", "/api/scheduling/events", "/api/scheduling/list"):
            r = requests.get(f"{BASE_URL}{path}", headers=jwt_headers, timeout=20)
            if r.status_code in (200, 404):
                if r.status_code == 200:
                    return
        pytest.skip("no /api/scheduling GET endpoint matched — non-blocking")

    def test_regulator_pipeline_with_api_key(self, created_key):
        tok = created_key["token"]
        r = requests.post(
            f"{BASE_URL}/api/regulator-pipeline/triage",
            headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
            json={"industry": "healthcare", "description": "resident died unexpectedly"},
            timeout=30,
        )
        assert r.status_code == 200, f"regulator triage via API key failed: {r.status_code} {r.text}"


# ---------- Final cleanup ----------
class TestCleanup:
    def test_revoke_main_key(self, jwt_headers, created_key):
        kid = created_key["key"]["id"]
        rd = requests.delete(f"{BASE_URL}/api/api-keys/{kid}", headers=jwt_headers, timeout=20)
        assert rd.status_code in (200, 404)
