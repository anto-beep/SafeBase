"""Iter49 extended tests: cross-auth isolation, lockout, TOTP, lists, filters."""
from __future__ import annotations

import os
import asyncio
import httpx
import pytest
import pyotp
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")

API = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("INTERNAL_ADMIN_SEED_EMAIL", "admin@safebase.internal")
ADMIN_PASSWORD = os.environ.get("INTERNAL_ADMIN_SEED_PASSWORD", "AdminDemo@1234")
CUST_EMAIL = "owner@safetradie.demo"
CUST_PASSWORD = "Demo@1234"


@pytest.fixture(autouse=True)
def _unlock_admin():
    """Reset the admin lock state before each test."""
    from motor.motor_asyncio import AsyncIOMotorClient
    cli = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = cli[os.environ["DB_NAME"]]
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(
        db.internal_admins.update_one(
            {"email": ADMIN_EMAIL.lower()},
            {"$set": {"locked": False, "failed_login_attempts": 0, "is_active": True, "two_factor_enabled": False, "totp_secret": None}},
        )
    )
    cli.close()
    yield


def _admin_login():
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.post("/api/internal-admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _hdr(t): return {"Authorization": f"Bearer {t}"}


def _customer_login():
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.post("/api/auth/login", json={"email": CUST_EMAIL, "password": CUST_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Customer login failed {r.status_code}: {r.text}")
    return r.json().get("access_token") or r.json().get("token")


# ---- Cross-auth isolation ----
def test_admin_me_rejects_customer_token():
    cust_t = _customer_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/me", headers=_hdr(cust_t))
    assert r.status_code == 401, f"customer JWT should NOT pass admin auth, got {r.status_code}"


def test_customer_me_rejects_admin_token():
    adm_t = _admin_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/auth/me", headers=_hdr(adm_t))
    assert r.status_code == 401, f"admin JWT should NOT pass customer auth, got {r.status_code}"


# ---- Lockout after 5 failed logins ----
def test_brute_force_lockout_after_5():
    with httpx.Client(base_url=API, timeout=30.0) as c:
        for _ in range(5):
            r = c.post("/api/internal-admin/login", json={"email": ADMIN_EMAIL, "password": "WRONG"})
            assert r.status_code == 401
        # After 5 wrong attempts the admin is locked.
        # NOTE: the lock check sits AFTER password verification, so wrong-pw still
        # returns 401 even when locked. Submitting the CORRECT password reveals 423.
        rc = c.post("/api/internal-admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert rc.status_code == 423, f"correct pw on locked acct should yield 423, got {rc.status_code}: {rc.text}"


# ---- Dashboard activity + alerts ----
def test_activity_feed():
    t = _admin_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/dashboard/activity-feed", headers=_hdr(t))
    assert r.status_code == 200
    d = r.json()
    assert "events" in d
    if d["events"]:
        for e in d["events"][:3]:
            assert "ts" in e and "type" in e and "label" in e


def test_alerts():
    t = _admin_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/dashboard/alerts", headers=_hdr(t))
    assert r.status_code == 200
    d = r.json()
    for k in ("trials_expiring_48h", "inactive_accounts_30d", "low_compliance_score_count", "failed_payments_7d"):
        assert k in d, f"missing {k} in alerts"


# ---- Accounts search filters ----
def test_accounts_search_filters():
    t = _admin_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        for params in ("q=safetradie", "industry=trades", "status=trial"):
            r = c.get(f"/api/internal-admin/accounts?{params}&page=1&page_size=5", headers=_hdr(t))
            assert r.status_code == 200, f"filter {params} -> {r.status_code}: {r.text}"
            assert "rows" in r.json()


# ---- Extend trial validation cap (>30 days) ----
def test_extend_trial_caps_at_30():
    t = _admin_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/accounts?page=1&page_size=1", headers=_hdr(t))
        acc_id = r.json()["rows"][0]["account_id"]
        r2 = c.post(f"/api/internal-admin/accounts/{acc_id}/extend-trial",
                    json={"days": 60, "reason": "test cap"}, headers=_hdr(t))
        assert r2.status_code == 400, f"expected 400 cap exceeded, got {r2.status_code}: {r2.text}"


# ---- Apply credit (super_admin succeeds, no cap) ----
def test_apply_credit_super_admin_succeeds():
    t = _admin_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/accounts?page=1&page_size=1", headers=_hdr(t))
        acc_id = r.json()["rows"][0]["account_id"]
        r2 = c.post(f"/api/internal-admin/accounts/{acc_id}/apply-credit",
                    json={"amount_aud": 1000, "reason": "goodwill"}, headers=_hdr(t))
        assert r2.status_code == 200, f"super_admin not capped at A$500, got {r2.status_code}: {r2.text}"
        d = r2.json()
        assert d.get("mocked") is True
        assert "credit_id" in d


# ---- Lists: trials / demos / users ----
def test_trials_list():
    t = _admin_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/trials", headers=_hdr(t))
    assert r.status_code == 200
    d = r.json()
    assert "rows" in d and "total" in d
    if d["rows"]:
        assert "days_remaining" in d["rows"][0]


def test_demos_list():
    t = _admin_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/demos", headers=_hdr(t))
    assert r.status_code == 200
    assert "rows" in r.json()


def test_users_search():
    t = _admin_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/users?q=owner", headers=_hdr(t))
    assert r.status_code == 200
    assert "rows" in r.json() or "users" in r.json()


def test_audit_log_filter():
    t = _admin_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/audit-logs?action=extend_trial", headers=_hdr(t))
    assert r.status_code == 200
    d = r.json()
    assert "rows" in d
    for row in d["rows"]:
        assert row.get("action") == "extend_trial"


# ---- TOTP enrolment flow ----
def test_totp_enroll_start_returns_qr():
    t = _admin_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.post("/api/internal-admin/enroll-2fa/start", headers=_hdr(t))
    assert r.status_code == 200, r.text
    d = r.json()
    assert "secret" in d and len(d["secret"]) >= 16
    assert "otpauth_uri" in d and d["otpauth_uri"].startswith("otpauth://")
    assert d["qr_data_uri"].startswith("data:image/png;base64,")


def test_totp_enroll_verify_and_2fa_login():
    t = _admin_login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.post("/api/internal-admin/enroll-2fa/start", headers=_hdr(t))
        secret = r.json()["secret"]
        code = pyotp.TOTP(secret).now()
        v = c.post("/api/internal-admin/enroll-2fa/verify", json={"code": code}, headers=_hdr(t))
        assert v.status_code == 200, v.text
        assert v.json().get("two_factor_enabled") is True
        # Now login should require 2fa
        lr = c.post("/api/internal-admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert lr.status_code == 200
        ld = lr.json()
        assert ld.get("requires_2fa") is True
        assert "challenge_token" in ld
        # Verify 2FA
        code2 = pyotp.TOTP(secret).now()
        vr = c.post("/api/internal-admin/verify-2fa",
                    json={"challenge_token": ld["challenge_token"], "code": code2})
        assert vr.status_code == 200, vr.text
        assert vr.json().get("token")
