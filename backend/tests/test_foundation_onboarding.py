"""Iteration 4: Foundation + Onboarding endpoints test suite.
Covers: /settings/business, /team, /settings/notifications, /notifications, /onboarding, /auth/me update.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _mk_user():
    email = f"foundation_{uuid.uuid4().hex[:10]}@safetradie.demo"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Demo@1234", "name": "Foundation Test", "company_name": "FTCo"
    }, timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    return email, tok, {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def auth():
    email, tok, hdr = _mk_user()
    return {"email": email, "token": tok, "headers": hdr}


@pytest.fixture(scope="module")
def auth2():
    # second user for isolation checks
    email, tok, hdr = _mk_user()
    return {"email": email, "token": tok, "headers": hdr}


# ---------- /auth/me onboarding_complete ----------
class TestAuthMe:
    def test_me_has_onboarding_complete_field(self, auth):
        r = requests.get(f"{API}/auth/me", headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "onboarding_complete" in data
        assert data["onboarding_complete"] is False  # fresh user


# ---------- /settings/business ----------
class TestBusinessProfile:
    def test_get_business_empty(self, auth):
        r = requests.get(f"{API}/settings/business", headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("user_id")

    def test_put_business_and_persist(self, auth):
        payload = {
            "company_name": "TEST_FT Trade Co",
            "abn": "12345678901",
            "trade_type": "plumbing",
            "primary_state": "NSW",
            "worker_count_band": "5-10",
            "primary_contact_phone": "0400000000",
        }
        r = requests.put(f"{API}/settings/business", headers=auth["headers"], json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["company_name"] == "TEST_FT Trade Co"
        assert data["abn"] == "12345678901"

        # GET verify persistence
        r2 = requests.get(f"{API}/settings/business", headers=auth["headers"], timeout=15)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["trade_type"] == "plumbing"
        assert d2["primary_state"] == "NSW"


# ---------- /team ----------
class TestTeam:
    def test_list_team_empty(self, auth):
        r = requests.get(f"{API}/team", headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_invite_and_persist(self, auth):
        invite_email = f"TEST_invite_{uuid.uuid4().hex[:6]}@safetradie.demo"
        r = requests.post(f"{API}/team/invite", headers=auth["headers"], json={
            "email": invite_email, "role": "supervisor", "name": "Test Invitee"
        }, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"] == invite_email.lower()
        invite_email = invite_email.lower()
        assert d["role"] == "supervisor"
        assert d["status"] == "pending"
        invite_id = d["invite_id"]

        # duplicate
        r2 = requests.post(f"{API}/team/invite", headers=auth["headers"], json={
            "email": invite_email, "role": "supervisor"
        }, timeout=15)
        assert r2.status_code == 400

        # list
        r3 = requests.get(f"{API}/team", headers=auth["headers"], timeout=15)
        emails = [m["email"] for m in r3.json()]
        assert invite_email in emails

        # PATCH role
        r4 = requests.patch(f"{API}/team/{invite_id}", headers=auth["headers"], json={"role": "admin"}, timeout=15)
        assert r4.status_code == 200

        r5 = requests.get(f"{API}/team", headers=auth["headers"], timeout=15)
        target = [m for m in r5.json() if m["invite_id"] == invite_id][0]
        assert target["role"] == "admin"

        # DELETE
        r6 = requests.delete(f"{API}/team/{invite_id}", headers=auth["headers"], timeout=15)
        assert r6.status_code == 200

        r7 = requests.get(f"{API}/team", headers=auth["headers"], timeout=15)
        assert invite_id not in [m["invite_id"] for m in r7.json()]


# ---------- /settings/notifications ----------
class TestNotifPrefs:
    def test_get_defaults(self, auth):
        r = requests.get(f"{API}/settings/notifications", headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "credential_expiry_days" in d or "user_id" in d  # defaults or saved

    def test_put_and_persist(self, auth):
        payload = {
            "credential_expiry_days": [30, 14],
            "credential_delivery": "email",
            "incident_score_threshold": 80,
            "weekly_summary": False,
            "legislative_digest": "monthly",
        }
        r = requests.put(f"{API}/settings/notifications", headers=auth["headers"], json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["credential_delivery"] == "email"
        assert d["weekly_summary"] is False

        r2 = requests.get(f"{API}/settings/notifications", headers=auth["headers"], timeout=15)
        d2 = r2.json()
        assert d2["legislative_digest"] == "monthly"
        assert d2["incident_score_threshold"] == 80


# ---------- /notifications ----------
class TestNotifications:
    def test_empty_list_for_new_user(self, auth2):
        r = requests.get(f"{API}/notifications", headers=auth2["headers"], timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_synth_from_licence_expiry(self, auth2):
        # Create worker and expired licence to trigger synth
        w = requests.post(f"{API}/workers", headers=auth2["headers"], json={
            "name": "TEST Worker", "role": "tradie", "trade": "electrical"
        }, timeout=15)
        assert w.status_code == 200
        worker_id = w.json()["worker_id"]

        # Expired licence
        lic = requests.post(f"{API}/licences", headers=auth2["headers"], json={
            "worker_id": worker_id,
            "licence_type": "white_card",
            "licence_number": "WC123",
            "expiry_date": "2024-01-01",
        }, timeout=15)
        assert lic.status_code == 200

        r = requests.get(f"{API}/notifications", headers=auth2["headers"], timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        # Must have at least one synthesized critical notification
        critical = [n for n in data if n.get("tone") == "critical"]
        assert len(critical) >= 1

    def test_mark_all_read(self, auth2):
        r = requests.post(f"{API}/notifications/read-all", headers=auth2["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json().get("success") is True


# ---------- /onboarding ----------
class TestOnboarding:
    def test_get_default(self, auth):
        r = requests.get(f"{API}/onboarding", headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("step", 1) >= 1
        assert d.get("completed") in (False, None)

    def test_update_step(self, auth):
        r = requests.put(f"{API}/onboarding", headers=auth["headers"], json={
            "step": 3, "data": {"biz_name": "TEST Biz"}, "completed": False
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["step"] == 3
        assert d["data"]["biz_name"] == "TEST Biz"

        r2 = requests.get(f"{API}/onboarding", headers=auth["headers"], timeout=15)
        assert r2.json()["step"] == 3

    def test_complete_updates_user(self, auth):
        r = requests.put(f"{API}/onboarding", headers=auth["headers"], json={
            "step": 6, "data": {}, "completed": True
        }, timeout=15)
        assert r.status_code == 200

        me = requests.get(f"{API}/auth/me", headers=auth["headers"], timeout=15)
        assert me.status_code == 200
        assert me.json()["onboarding_complete"] is True


# ---------- Isolation ----------
class TestIsolation:
    def test_team_isolation(self, auth, auth2):
        # auth invited one earlier (now deleted), invite a fresh one
        em = f"TEST_iso_{uuid.uuid4().hex[:6]}@safetradie.demo"
        requests.post(f"{API}/team/invite", headers=auth["headers"], json={"email": em, "role": "worker"}, timeout=15)
        r2 = requests.get(f"{API}/team", headers=auth2["headers"], timeout=15)
        assert em not in [m["email"] for m in r2.json()]

    def test_business_isolation(self, auth, auth2):
        r2 = requests.get(f"{API}/settings/business", headers=auth2["headers"], timeout=15)
        d = r2.json()
        # auth2 should NOT see auth's business profile
        assert d.get("company_name") != "TEST_FT Trade Co"

    def test_auth_required(self):
        for ep in ["/settings/business", "/team", "/settings/notifications", "/notifications", "/onboarding"]:
            r = requests.get(f"{API}{ep}", timeout=15)
            assert r.status_code in (401, 403), f"{ep} did not require auth: {r.status_code}"
