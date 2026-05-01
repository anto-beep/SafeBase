"""
Webhook subscription management — extracted from server.py (iter27).

Mount via register_webhooks_routes(api_router, db=db, get_current_user=...,
                                   webhook_events=WEBHOOK_EVENTS).

Note: This file intentionally does NOT move:
  • POST /webhook/stripe (the inbound Stripe receiver uses billing-internal
    state that belongs in routes/billing.py)
  • _deliver_webhook / _fire_event helpers (stay in server.py since many
    other domains call _fire_event from inside their handlers)
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException


def register_webhooks_routes(api_router: APIRouter, *, db, get_current_user,
                             webhook_events: set[str],
                             deliver_webhook):
    """deliver_webhook is server.py's _deliver_webhook fn (closure over db)."""

    @api_router.get("/webhooks/events")
    async def list_webhook_events(current_user=Depends(get_current_user)):
        return sorted(list(webhook_events))

    @api_router.get("/webhooks/subscriptions")
    async def list_subscriptions(current_user=Depends(get_current_user)):
        rows = await db.webhook_subscriptions.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return rows

    @api_router.post("/webhooks/subscriptions")
    async def create_subscription(body: dict, current_user=Depends(get_current_user)):
        url = body.get("target_url")
        events = body.get("events") or []
        if not url or not url.startswith(("http://", "https://")):
            raise HTTPException(400, "target_url must start with http(s)://")
        invalid = [e for e in events if e not in webhook_events]
        if invalid:
            raise HTTPException(400, f"Unknown events: {invalid}")
        doc = {
            "subscription_id": f"wh_{uuid.uuid4().hex[:10]}",
            "user_id": current_user.user_id,
            "target_url": url,
            "events": events or sorted(list(webhook_events)),
            "label": body.get("label", ""),
            "secret": body.get("secret") or uuid.uuid4().hex,
            "enabled": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_delivered_at": None,
            "delivery_count": 0,
            "failure_count": 0,
        }
        await db.webhook_subscriptions.insert_one({**doc})
        return doc

    @api_router.patch("/webhooks/subscriptions/{sid}")
    async def toggle_subscription(sid: str, body: dict,
                                  current_user=Depends(get_current_user)):
        updates = {k: v for k, v in body.items()
                   if k in ("enabled", "events", "label", "target_url")}
        await db.webhook_subscriptions.update_one(
            {"subscription_id": sid, "user_id": current_user.user_id},
            {"$set": updates},
        )
        doc = await db.webhook_subscriptions.find_one(
            {"subscription_id": sid, "user_id": current_user.user_id}, {"_id": 0}
        )
        if not doc:
            raise HTTPException(404, "Not found")
        return doc

    @api_router.delete("/webhooks/subscriptions/{sid}")
    async def delete_subscription(sid: str, current_user=Depends(get_current_user)):
        res = await db.webhook_subscriptions.delete_one(
            {"subscription_id": sid, "user_id": current_user.user_id}
        )
        return {"deleted": res.deleted_count}

    @api_router.get("/webhooks/deliveries")
    async def list_deliveries(current_user=Depends(get_current_user)):
        rows = await db.webhook_deliveries.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).sort("delivered_at", -1).to_list(100)
        return rows

    @api_router.post("/webhooks/test/{sid}")
    async def test_subscription(sid: str, current_user=Depends(get_current_user)):
        sub = await db.webhook_subscriptions.find_one(
            {"subscription_id": sid, "user_id": current_user.user_id}, {"_id": 0}
        )
        if not sub:
            raise HTTPException(404, "Not found")
        delivery = await deliver_webhook(sub, "test.ping",
                                          {"message": "Hello from SafeBase"})
        return delivery
