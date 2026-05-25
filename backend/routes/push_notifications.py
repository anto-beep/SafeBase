"""SafeBase — Mobile push notifications (Iter57 / P1.4).

Backend hook for the mobile companion app. Mobile clients register their
APNs (iOS) / FCM (Android) token on login. Whenever the platform creates an
in-app notification (server.py push_notification), this module fans the
payload out to every registered device for that user.

Design notes
------------
- We DO NOT bake in a specific provider client here. The default
  `_send_via_provider` is a stub that logs the payload — this keeps tests
  hermetic and lets you wire APNs/FCM with a real client when keys are
  available without touching the calling code.
- Stale tokens (e.g. after app uninstall) are removed on first 410 GONE /
  invalid-registration response so the registry doesn't grow forever.
- We never raise out of this module — push is a best-effort side-channel.
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class DeviceRegistrationIn(BaseModel):
    platform: str = Field(pattern="^(ios|android|web)$")
    token: str = Field(min_length=8, max_length=512)
    app_version: Optional[str] = Field(default=None, max_length=40)
    device_model: Optional[str] = Field(default=None, max_length=80)


async def dispatch_to_devices(db, *, user_id: str, title: str, body: str,
                              data: Optional[dict] = None) -> int:
    """Fan a notification out to every active device for a user.
    Returns the number of devices the push was attempted on.
    """
    if not user_id:
        return 0
    sent = 0
    cursor = db.device_tokens.find(
        {"user_id": user_id, "active": True}, {"_id": 0}
    )
    async for d in cursor:
        ok = await _send_via_provider(
            platform=d.get("platform"),
            token=d.get("token"),
            title=title, body=body, data=data or {},
        )
        if ok:
            sent += 1
        else:
            # Provider rejected the token (uninstalled / re-installed) →
            # mark inactive so we stop pinging it.
            await db.device_tokens.update_one(
                {"token": d.get("token")},
                {"$set": {"active": False, "deactivated_at": _now_iso()}},
            )
    return sent


async def _send_via_provider(*, platform: str, token: str, title: str,
                              body: str, data: dict) -> bool:
    """Send to APNs (iOS) / FCM (Android) / Web Push.

    Current implementation: log and treat as success. Swap the body of this
    function with real provider client calls (`aioapns`, `pyfcm`, etc.) when
    credentials are configured. Return False for permanent failures so the
    caller can deactivate the token.
    """
    provider_env = os.environ.get("PUSH_PROVIDER", "").lower()
    if provider_env in ("", "stub", "none"):
        logger.info("[push:stub] %s → %s  title=%r body=%r data=%s",
                     platform, (token or "")[:12] + "…", title, body, data)
        return True
    # When you add a real provider, branch on `platform` here and call its SDK.
    logger.warning("PUSH_PROVIDER=%s is configured but no client wired", provider_env)
    return True


def register_push_routes(api_router: APIRouter, *, db, get_current_user_dep):
    """Mount the mobile-facing endpoints under /api/device-tokens/."""

    @api_router.post("/device-tokens/register")
    async def register_token(body: DeviceRegistrationIn,
                              user=Depends(get_current_user_dep)):
        """Idempotent — registering the same token twice updates `last_seen`.
        If the same token was previously bound to a different user (rare:
        device re-used), the binding is moved over.
        """
        doc = {
            "user_id": user.user_id,
            "platform": body.platform,
            "token": body.token,
            "app_version": body.app_version,
            "device_model": body.device_model,
            "active": True,
            "last_seen": _now_iso(),
        }
        existing = await db.device_tokens.find_one({"token": body.token}, {"_id": 0})
        if existing:
            await db.device_tokens.update_one({"token": body.token}, {"$set": doc})
            return {"ok": True, "token_id": existing.get("token_id"), "rebound": existing.get("user_id") != user.user_id}
        token_id = f"dev_{uuid.uuid4().hex[:14]}"
        doc["token_id"] = token_id
        doc["created_at"] = _now_iso()
        await db.device_tokens.insert_one(dict(doc))
        return {"ok": True, "token_id": token_id, "rebound": False}

    @api_router.delete("/device-tokens/{token_id}")
    async def deregister_token(token_id: str,
                                user=Depends(get_current_user_dep)):
        """Called on logout / app uninstall (best-effort)."""
        res = await db.device_tokens.update_one(
            {"token_id": token_id, "user_id": user.user_id},
            {"$set": {"active": False, "deactivated_at": _now_iso()}},
        )
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Token not found")
        return {"ok": True}

    @api_router.get("/device-tokens")
    async def list_my_tokens(user=Depends(get_current_user_dep)):
        cursor = db.device_tokens.find(
            {"user_id": user.user_id, "active": True},
            {"_id": 0, "token": 0},  # never echo the raw token back
        )
        return {"tokens": [t async for t in cursor]}
