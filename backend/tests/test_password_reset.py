"""Tests for the password reset flow (Iter47)."""
from __future__ import annotations

import asyncio
import os
import time
import httpx
import pytest

API = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
EMAIL = "owner@safetradie.demo"
ORIG_PASSWORD = "Demo@1234"


@pytest.fixture(autouse=True)
def _purge_password_resets():
    """Each test gets a clean rate-limit window."""
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


def _post(path: str, payload: dict, headers: dict | None = None) -> httpx.Response:
    with httpx.Client(base_url=API, timeout=30.0) as c:
        return c.post(path, json=payload, headers=headers or {})


def _get(path: str) -> httpx.Response:
    with httpx.Client(base_url=API, timeout=30.0) as c:
        return c.get(path)


def _request_reset_link() -> str:
    """Trigger forgot-password and extract the dev token (requires EXPOSE_RESET_TOKEN=true)."""
    r = _post("/api/auth/forgot-password", {"email": EMAIL}, headers={"Origin": API})
    assert r.status_code == 200, r.text
    data = r.json()
    url = data.get("dev_reset_url", "")
    assert url, "dev_reset_url not exposed — set EXPOSE_RESET_TOKEN=true on the backend"
    return url.rsplit("token=", 1)[-1]


def test_forgot_password_existing_user():
    r = _post("/api/auth/forgot-password", {"email": EMAIL}, headers={"Origin": API})
    assert r.status_code == 200
    body = r.json()
    assert "message" in body
    assert "dev_reset_url" in body  # dev mode flag is on


def test_forgot_password_nonexistent_user_identical_response():
    a = _post("/api/auth/forgot-password", {"email": EMAIL}).json()
    b = _post("/api/auth/forgot-password", {"email": "no-such-user@example.com"}).json()
    assert "message" in a and "message" in b
    assert a["message"] == b["message"]
    # The nonexistent path MUST NOT expose a dev_reset_url
    assert "dev_reset_url" not in b


def test_verify_reset_token_valid_and_invalid():
    token = _request_reset_link()
    r_ok = _get(f"/api/auth/verify-reset-token?token={token}")
    assert r_ok.status_code == 200
    body = r_ok.json()
    assert body["valid"] is True
    assert "@" in body["email_hint"]
    # Bad token
    r_bad = _get("/api/auth/verify-reset-token?token=nope-not-real")
    assert r_bad.status_code == 400


def test_reset_password_weak_password_returns_422():
    token = _request_reset_link()
    r = _post("/api/auth/reset-password", {"token": token, "new_password": "weak"})
    assert r.status_code == 422
    assert "Password must contain" in r.json()["detail"]


def test_reset_password_valid_then_reuse_blocked():
    token = _request_reset_link()
    # Successful reset
    r = _post("/api/auth/reset-password", {"token": token, "new_password": "TempPass@2024"})
    assert r.status_code == 200
    # Reusing the same token must fail
    r2 = _post("/api/auth/reset-password", {"token": token, "new_password": "AnotherPass@2024"})
    assert r2.status_code == 400
    # Login with new password works
    r3 = _post("/api/auth/login", {"email": EMAIL, "password": "TempPass@2024"})
    assert r3.status_code == 200
    # Restore original password
    tok2 = _request_reset_link()
    r4 = _post("/api/auth/reset-password", {"token": tok2, "new_password": ORIG_PASSWORD})
    assert r4.status_code == 200


def test_forgot_password_rate_limit_after_three():
    # Burst 4 requests — 4th must 429. (Note: this leaves rate-limit
    # consumed; subsequent tests must wait an hour or be the last test.)
    test_email = "ratelimit-test@example.com"
    for i in range(3):
        r = _post("/api/auth/forgot-password", {"email": test_email})
        assert r.status_code == 200, f"request {i+1} failed: {r.text}"
    r4 = _post("/api/auth/forgot-password", {"email": test_email})
    assert r4.status_code == 429
