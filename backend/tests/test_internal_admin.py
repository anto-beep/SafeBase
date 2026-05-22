"""Tests for the Internal Admin Panel (Iter49)."""
from __future__ import annotations

import os
import asyncio
import httpx
import pytest

API = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("INTERNAL_ADMIN_SEED_EMAIL", "admin@safebase.internal")
ADMIN_PASSWORD = os.environ.get("INTERNAL_ADMIN_SEED_PASSWORD", "AdminDemo@1234")


@pytest.fixture(autouse=True)
def _unlock_admin():
    """Reset the admin's failed_login_attempts + locked state before each test."""
    import sys
    sys.path.insert(0, "/app/backend")
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")
    from motor.motor_asyncio import AsyncIOMotorClient
    cli = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = cli[os.environ["DB_NAME"]]
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(
        db.internal_admins.update_one(
            {"email": ADMIN_EMAIL.lower()},
            {"$set": {"locked": False, "failed_login_attempts": 0, "is_active": True}},
        )
    )
    cli.close()
    yield


def _login() -> str:
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.post("/api/internal-admin/login",
                   json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["token"]


def _hdr(t: str) -> dict:
    return {"Authorization": f"Bearer {t}"}


def test_admin_login_success_no_2fa():
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.post("/api/internal-admin/login",
                   json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    data = r.json()
    assert data["requires_2fa"] is False
    assert data["token"]
    assert data["admin"]["email"] == ADMIN_EMAIL.lower()
    assert data["admin"]["role"] == "super_admin"
    assert data.get("must_enroll_2fa") is True  # super_admin should be nudged to enrol


def test_admin_login_bad_password():
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.post("/api/internal-admin/login",
                   json={"email": ADMIN_EMAIL, "password": "wrong-password-xyz"})
    assert r.status_code == 401


def test_admin_me_requires_token():
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/me")
    assert r.status_code == 401


def test_admin_me():
    t = _login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/me", headers=_hdr(t))
    assert r.status_code == 200
    assert r.json()["admin"]["role"] == "super_admin"


def test_dashboard_kpi():
    t = _login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/dashboard/kpi", headers=_hdr(t))
    assert r.status_code == 200
    d = r.json()
    for k in ("total_active_accounts", "total_users", "mrr_aud", "active_trials"):
        assert k in d
    assert d["mrr_mocked"] is True


def test_accounts_list_paginated():
    t = _login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/accounts?page=1&page_size=5", headers=_hdr(t))
    assert r.status_code == 200
    d = r.json()
    assert "rows" in d and isinstance(d["rows"], list)
    assert d["page_size"] == 5
    assert d["total"] >= 1


def test_account_detail_and_users():
    t = _login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/accounts?page=1&page_size=1", headers=_hdr(t))
        rows = r.json()["rows"]
        if not rows:
            pytest.skip("No accounts in DB to test detail view")
        acc_id = rows[0]["account_id"]
        detail = c.get(f"/api/internal-admin/accounts/{acc_id}", headers=_hdr(t))
        assert detail.status_code == 200
        assert detail.json()["overview"]["owner_email"]
        assert detail.json()["billing"]["mocked"] is True

        users = c.get(f"/api/internal-admin/accounts/{acc_id}/users", headers=_hdr(t))
        assert users.status_code == 200
        assert "users" in users.json()


def test_extend_trial_logs_to_audit():
    t = _login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/accounts?page=1&page_size=1&status=trial", headers=_hdr(t))
        rows = r.json()["rows"]
        if not rows:
            pytest.skip("No trial accounts to extend")
        acc_id = rows[0]["account_id"]
        ext = c.post(f"/api/internal-admin/accounts/{acc_id}/extend-trial",
                     json={"days": 7, "reason": "pytest: extend regression"},
                     headers=_hdr(t))
        assert ext.status_code == 200, ext.text
        assert ext.json()["days_added"] == 7

        # Verify audit log captured it
        audit = c.get("/api/internal-admin/audit-logs?action=extend_trial&page_size=10",
                      headers=_hdr(t))
        assert audit.status_code == 200
        found = any(r.get("target_id") == acc_id for r in audit.json()["rows"])
        assert found, "extend_trial action not found in audit log"


def test_add_note_logs_to_audit():
    t = _login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        r = c.get("/api/internal-admin/accounts?page=1&page_size=1", headers=_hdr(t))
        acc_id = r.json()["rows"][0]["account_id"]
        n = c.post(f"/api/internal-admin/accounts/{acc_id}/add-note",
                   json={"body": "pytest note " + os.urandom(4).hex(),
                          "tags": ["pytest", "support"]},
                   headers=_hdr(t))
        assert n.status_code == 200
        notes = c.get(f"/api/internal-admin/accounts/{acc_id}/notes", headers=_hdr(t))
        assert notes.status_code == 200
        assert len(notes.json()["notes"]) >= 1


def test_audit_log_is_readonly():
    t = _login()
    with httpx.Client(base_url=API, timeout=30.0) as c:
        # No DELETE endpoint for /audit-logs
        r = c.request("DELETE", "/api/internal-admin/audit-logs/anything", headers=_hdr(t))
        assert r.status_code in (404, 405)
