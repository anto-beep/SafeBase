"""Iter50 backend regression tests:
- /api/concierge/chat + /api/concierge/history
- /api/accessibility/preferences GET/PUT (anonymous + authenticated)
- /api/internal-admin/users/{user_id}/force-logout
- Auth regression (login/me/logout)
- Internal admin regression (login/dashboard/accounts/audit-logs)
"""
import os
import time
import pytest
import requests

def _read_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if v:
        return v.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    return ""

BASE_URL = _read_backend_url()
assert BASE_URL, "REACT_APP_BACKEND_URL not configured"
CUSTOMER_EMAIL = "owner@safetradie.demo"
CUSTOMER_PASS = "Demo@1234"
ADMIN_EMAIL = "admin@safebase.internal"
ADMIN_PASS = "AdminDemo@1234"


@pytest.fixture(scope="session")
def customer_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASS}, timeout=20)
    assert r.status_code == 200, f"customer login failed: {r.status_code} {r.text}"
    body = r.json()
    return body.get("access_token") or body.get("token")


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/internal-admin/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    body = r.json()
    return body.get("access_token") or body.get("token")


# ──────────────────── Concierge chat ────────────────────
class TestConciergeChat:
    def test_chat_basic_reply_with_pricing(self):
        r = requests.post(f"{BASE_URL}/api/concierge/chat",
                          json={"message": "What is the price for trades?"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_id" in data and data["session_id"]
        assert "reply" in data and isinstance(data["reply"], str) and len(data["reply"]) > 0
        # Required tokens from system prompt
        assert "A$799" in data["reply"], f"reply missing A$799: {data['reply'][:300]}"
        assert "+ GST" in data["reply"], f"reply missing + GST: {data['reply'][:300]}"
        # Save for next test
        TestConciergeChat.session_id = data["session_id"]

    def test_chat_session_continuation(self):
        sid = getattr(TestConciergeChat, "session_id", None)
        assert sid, "previous test must have set session_id"
        r = requests.post(f"{BASE_URL}/api/concierge/chat",
                          json={"session_id": sid,
                                "message": "And what about hospitality?"},
                          timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert data["session_id"] == sid

    def test_history_chronological(self):
        sid = getattr(TestConciergeChat, "session_id", None)
        assert sid
        r = requests.get(f"{BASE_URL}/api/concierge/history",
                         params={"session_id": sid}, timeout=20)
        assert r.status_code == 200
        msgs = r.json().get("messages", [])
        assert len(msgs) >= 4  # 2 user + 2 assistant
        roles = [m["role"] for m in msgs]
        assert roles[0] == "user" and roles[1] == "assistant"
        # chronological order
        timestamps = [m["created_at"] for m in msgs]
        assert timestamps == sorted(timestamps)


# ──────────────────── Accessibility prefs ────────────────────
class TestAccessibilityPrefs:
    def test_get_anonymous_returns_null(self):
        r = requests.get(f"{BASE_URL}/api/accessibility/preferences", timeout=20)
        assert r.status_code == 200
        assert r.json() == {"preferences": None}

    def test_put_anonymous_not_persisted(self):
        r = requests.put(f"{BASE_URL}/api/accessibility/preferences",
                         json={"preferences": {"high_contrast": True}}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data.get("persisted") is False

    def test_put_authenticated_persists_and_roundtrip(self, customer_token):
        prefs = {"high_contrast": True, "font_scale": 1.3, "dyslexia": False}
        headers = {"Authorization": f"Bearer {customer_token}"}
        r = requests.put(f"{BASE_URL}/api/accessibility/preferences",
                         json={"preferences": prefs}, headers=headers, timeout=20)
        assert r.status_code == 200
        assert r.json().get("persisted") is True

        r2 = requests.get(f"{BASE_URL}/api/accessibility/preferences",
                          headers=headers, timeout=20)
        assert r2.status_code == 200
        body = r2.json()
        assert body.get("preferences") == prefs


# ──────────────────── Force logout ────────────────────
class TestForceLogout:
    def test_force_logout_invalidates_old_jwt(self, admin_token):
        # Acquire a fresh customer token to invalidate
        r0 = requests.post(f"{BASE_URL}/api/auth/login",
                           json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASS},
                           timeout=20)
        assert r0.status_code == 200
        old_token = (r0.json().get("access_token") or r0.json().get("token"))

        # Confirm token works
        me_before = requests.get(f"{BASE_URL}/api/auth/me",
                                 headers={"Authorization": f"Bearer {old_token}"},
                                 timeout=20)
        assert me_before.status_code == 200
        user_id = me_before.json().get("user_id")
        assert user_id

        # Force logout via admin
        time.sleep(1)  # ensure password_changed_at > token iat
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        fr = requests.post(
            f"{BASE_URL}/api/internal-admin/users/{user_id}/force-logout",
            headers=admin_headers, timeout=20)
        assert fr.status_code == 200, fr.text
        fdata = fr.json()
        assert fdata.get("success") is True
        assert "sessions_killed" in fdata

        # Old token now rejected
        time.sleep(1)
        me_after = requests.get(f"{BASE_URL}/api/auth/me",
                                headers={"Authorization": f"Bearer {old_token}"},
                                timeout=20)
        assert me_after.status_code == 401, f"expected 401, got {me_after.status_code}: {me_after.text}"

        # Audit log contains force_logout entry
        al = requests.get(
            f"{BASE_URL}/api/internal-admin/audit-logs",
            params={"action": "force_logout", "target_id": user_id},
            headers=admin_headers, timeout=20)
        assert al.status_code == 200
        rows = al.json().get("rows", [])
        assert any(r.get("action") == "force_logout" and r.get("target_id") == user_id
                   for r in rows), "force_logout audit entry not found"

        # IMPORTANT: restore demo creds with a fresh login so other tests/UI still work
        r_fresh = requests.post(f"{BASE_URL}/api/auth/login",
                                json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASS},
                                timeout=20)
        assert r_fresh.status_code == 200
        fresh_tok = (r_fresh.json().get("access_token") or r_fresh.json().get("token"))
        new_me = requests.get(f"{BASE_URL}/api/auth/me",
                              headers={"Authorization": f"Bearer {fresh_tok}"},
                              timeout=20)
        assert new_me.status_code == 200

    def test_force_logout_user_not_found(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/internal-admin/users/nonexistent_user_id/force-logout",
            headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 404

    def test_force_logout_requires_admin(self):
        r = requests.post(
            f"{BASE_URL}/api/internal-admin/users/anyid/force-logout", timeout=20)
        assert r.status_code in (401, 403)


# ──────────────────── Auth regression ────────────────────
class TestAuthRegression:
    def test_login_me_logout(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASS},
                          timeout=20)
        assert r.status_code == 200
        tok = (r.json().get("access_token") or r.json().get("token"))
        h = {"Authorization": f"Bearer {tok}"}
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=h, timeout=20)
        assert me.status_code == 200
        assert me.json().get("email") == CUSTOMER_EMAIL
        out = requests.post(f"{BASE_URL}/api/auth/logout", headers=h, timeout=20)
        assert out.status_code in (200, 204)

    def test_forgot_password_rate_limited_or_ok(self):
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password",
                          json={"email": "test_iter50_nonexistent@example.com"},
                          timeout=20)
        # Always returns 200 to avoid email enumeration (or 429 if previously rate-limited)
        assert r.status_code in (200, 429)


# ──────────────────── Internal admin regression ────────────────────
class TestAdminRegression:
    def test_dashboard_kpi(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/internal-admin/dashboard/kpi",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_active_accounts", "mrr_aud", "active_trials"):
            assert k in d

    def test_accounts_list(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/internal-admin/accounts",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "rows" in d and "total" in d

    def test_audit_logs(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/internal-admin/audit-logs",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 200
        assert "rows" in r.json()
