"""Iter47 follow-up: verify password reset invalidates active JWT sessions."""
from __future__ import annotations

import asyncio
import os
import httpx
import pytest

API = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
EMAIL = "owner@safetradie.demo"
ORIG_PASSWORD = "Demo@1234"


@pytest.fixture(autouse=True)
def _purge_password_resets():
    import sys
    sys.path.insert(0, "/app/backend")
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")
    from motor.motor_asyncio import AsyncIOMotorClient
    cli = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = cli[os.environ["DB_NAME"]]
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(db.password_resets.delete_many({}))
    cli.close()
    yield


def _post(path, payload, headers=None):
    with httpx.Client(base_url=API, timeout=30.0) as c:
        return c.post(path, json=payload, headers=headers or {})


def _get(path, headers=None):
    with httpx.Client(base_url=API, timeout=30.0) as c:
        return c.get(path, headers=headers or {})


def _request_reset_token():
    r = _post("/api/auth/forgot-password", {"email": EMAIL}, headers={"Origin": API})
    assert r.status_code == 200, r.text
    url = r.json().get("dev_reset_url", "")
    assert url, "EXPOSE_RESET_TOKEN not set"
    return url.rsplit("token=", 1)[-1]


def test_password_reset_invalidates_old_jwt():
    """After resetting the password, the JWT issued BEFORE the reset must be rejected.

    Requirement: "after reset, the old JWT for that user is rejected"
    """
    # 1. Login → get JWT
    r = _post("/api/auth/login", {"email": EMAIL, "password": ORIG_PASSWORD})
    assert r.status_code == 200, r.text
    old_token = r.json()["token"]

    # Verify token works
    me = _get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"})
    assert me.status_code == 200

    # 2. Reset the password
    tok = _request_reset_token()
    NEW = "TempIter47@2026"
    r2 = _post("/api/auth/reset-password", {"token": tok, "new_password": NEW})
    assert r2.status_code == 200, r2.text

    # 3. The OLD JWT must now be rejected
    me_after = _get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"})

    # Restore password before asserting (so we don't leave the demo account broken)
    tok2 = _request_reset_token()
    rrestore = _post("/api/auth/reset-password", {"token": tok2, "new_password": ORIG_PASSWORD})
    assert rrestore.status_code == 200

    assert me_after.status_code == 401, (
        f"Old JWT still valid after password reset (got {me_after.status_code}). "
        f"Spec requires session invalidation on reset."
    )
