"""
Billing routes — Stripe Checkout (fixed tiers), subscription state, trial
lifecycle, + the inbound Stripe webhook.

Mount via register_billing_routes(api_router, db=db, User=User,
                                  get_current_user=..., logger=...,
                                  stripe_api_key=..., resend_api_key=...,
                                  trial_length_days=14, trial_reminder_day=10).

Also exposes the `/enterprise/demo-request` public capture endpoint since it
lives inside the pricing/billing surface.

Returns an object with helpers that the trial_gate middleware can reuse if it
ever needs to — current middleware duplicates the logic inline to avoid
an extra DB round-trip.
"""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta

import resend
from emergentintegrations.payments.stripe.checkout import (
    CheckoutSessionRequest,
    StripeCheckout,
)
from fastapi import APIRouter, Depends, HTTPException, Request


BILLING_TIERS = {
    # slug: (amount in A$ ex GST, currency, description, tier_name, cycle)
    "sole_trader_monthly":      {"amount": 249.00,   "currency": "aud", "tier": "sole_trader",      "cycle": "monthly", "label": "Sole Trader (monthly)"},
    "small_business_monthly":   {"amount": 499.00,   "currency": "aud", "tier": "small_business",   "cycle": "monthly", "label": "Small Business (monthly)"},
    "growing_business_monthly": {"amount": 799.00,   "currency": "aud", "tier": "growing_business", "cycle": "monthly", "label": "Growing Business (monthly)"},
    "enterprise_monthly":       {"amount": 1299.00,  "currency": "aud", "tier": "enterprise",       "cycle": "monthly", "label": "Enterprise (monthly)"},
    "sole_trader_annual":       {"amount": 2490.00,  "currency": "aud", "tier": "sole_trader",      "cycle": "annual",  "label": "Sole Trader (annual)"},
    "small_business_annual":    {"amount": 4990.00,  "currency": "aud", "tier": "small_business",   "cycle": "annual",  "label": "Small Business (annual)"},
    "growing_business_annual":  {"amount": 7990.00,  "currency": "aud", "tier": "growing_business", "cycle": "annual",  "label": "Growing Business (annual)"},
    "enterprise_annual":        {"amount": 12990.00, "currency": "aud", "tier": "enterprise",       "cycle": "annual",  "label": "Enterprise (annual)"},
}


def register_billing_routes(api_router: APIRouter, *, db, User, get_current_user,
                            logger, stripe_api_key: str, resend_api_key: str,
                            trial_length_days: int = 14,
                            trial_reminder_day: int = 10):
    """Mount /billing/*, /enterprise/demo-request, /webhook/stripe onto api_router."""

    # --------- helpers ---------
    async def _ensure_trial_fields(user: dict) -> dict:
        """Lazy-backfill trial_started_at + trial_ends_at on legacy users so the
        countdown works for accounts created before the trial system existed."""
        if user.get("trial_ends_at"):
            return user
        started = user.get("trial_started_at") or user.get("created_at") or datetime.now(timezone.utc).isoformat()
        try:
            start_dt = datetime.fromisoformat(started.replace("Z", "+00:00")).replace(tzinfo=timezone.utc)
        except Exception:
            start_dt = datetime.now(timezone.utc)
        ends_at = (start_dt + timedelta(days=trial_length_days)).isoformat()
        update = {"trial_started_at": start_dt.isoformat(), "trial_ends_at": ends_at}
        if not user.get("subscription_status"):
            update["subscription_status"] = "trial"
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
        user.update(update)
        return user

    def _compute_trial(user: dict) -> dict:
        has_active_sub = user.get("subscription_tier") and user.get("subscription_status") == "active"
        if has_active_sub:
            return {"on_trial": False, "trial_days_left": None,
                    "trial_expired": False, "read_only": False}
        ends = user.get("trial_ends_at")
        if not ends:
            return {"on_trial": True, "trial_days_left": trial_length_days,
                    "trial_expired": False, "read_only": False}
        try:
            end_dt = datetime.fromisoformat(ends.replace("Z", "+00:00")).replace(tzinfo=timezone.utc)
        except Exception:
            return {"on_trial": True, "trial_days_left": trial_length_days,
                    "trial_expired": False, "read_only": False}
        now = datetime.now(timezone.utc)
        seconds_left = (end_dt - now).total_seconds()
        days_left = max(0, int((seconds_left + 86399) // 86400))  # ceil
        expired = seconds_left <= 0
        return {"on_trial": True, "trial_days_left": days_left,
                "trial_expired": expired, "read_only": expired}

    async def _maybe_send_trial_reminder(user: dict, trial_info: dict):
        """Day-10 (~4 days remaining) reminder. Idempotent."""
        if not trial_info.get("on_trial") or trial_info.get("trial_expired"):
            return
        days_left = trial_info.get("trial_days_left") or 0
        if days_left > (trial_length_days - trial_reminder_day):
            return
        if user.get("trial_reminder_sent_at"):
            return
        now_iso = datetime.now(timezone.utc).isoformat()
        subject = f"Your SafeBase free trial ends in {days_left} day{'s' if days_left != 1 else ''}"
        html = (
            "<div style=\"font-family:system-ui,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;\">"
            "<div style=\"background:#0A0A0A;color:#FFCC00;padding:16px;font-weight:900;letter-spacing:-.02em;font-size:20px;\">SafeBase</div>"
            f"<h1 style=\"font-size:22px;margin:20px 0 12px;\">G'day {user.get('name','there').split(' ')[0]} — your trial ends in {days_left} day{'s' if days_left != 1 else ''}.</h1>"
            "<p style=\"color:#444;line-height:1.6;font-size:14px;\">You've been getting full access to every SafeBase module — SWMS, incidents, risk register, toolbox talks, TradeInduct, TradeCheck, Academy, automations and the worker PWA. To keep going past your trial, pick a plan now and lock in your data.</p>"
            "<a href=\"https://safebase.com.au/dashboard/settings?tab=billing\" style=\"display:inline-block;background:#0A0A0A;color:#FFCC00;padding:12px 24px;text-decoration:none;font-weight:900;letter-spacing:.04em;margin-top:12px;\">CHOOSE A PLAN →</a>"
            "<p style=\"color:#888;font-size:12px;margin-top:24px;\">If you do nothing, your account will move to read-only on the trial end date so nothing is lost — you can still view all your records and reactivate by upgrading.</p>"
            "</div>"
        )
        delivered = False
        detail = "no_resend_key"
        if resend_api_key:
            try:
                resend.api_key = resend_api_key

                def _send():
                    return resend.Emails.send({
                        "from": "SafeBase <noreply@safebase.com.au>",
                        "to": [user["email"]],
                        "subject": subject,
                        "html": html,
                    })

                res = await asyncio.wait_for(asyncio.to_thread(_send), timeout=15.0)
                delivered = True
                detail = f"email_id={(res or {}).get('id')}"
            except Exception as e:
                detail = f"send_failed: {str(e)[:200]}"
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"trial_reminder_sent_at": now_iso, "trial_reminder_status": detail}},
        )
        await db.notifications.insert_one({
            "user_id": user["user_id"],
            "channel": "in_app",
            "type": "trial_ending_soon",
            "title": subject,
            "body": f"Your free trial ends in {days_left} day{'s' if days_left != 1 else ''}. Choose a plan from Settings → Billing to keep your access.",
            "severity": "warning",
            "delivered_via": "email" if delivered else "in_app_only",
            "created_at": now_iso,
            "read": False,
        })

    # --------- routes ---------
    @api_router.get("/billing/tiers")
    async def list_billing_tiers():
        """Public — list subscription tiers the UI can render."""
        return [{"slug": k, **v} for k, v in BILLING_TIERS.items()]

    @api_router.post("/enterprise/demo-request")
    async def enterprise_demo_request(body: dict):
        """Public — capture an Enterprise demo request. No auth required."""
        required = ["name", "business_name", "contact_email"]
        for k in required:
            if not body.get(k):
                raise HTTPException(400, f"{k} is required")
        doc = {
            "request_id": f"edr_{uuid.uuid4().hex[:10]}",
            "name": body.get("name"),
            "business_name": body.get("business_name"),
            "abn": body.get("abn", ""),
            "contact_email": body.get("contact_email"),
            "contact_phone": body.get("contact_phone", ""),
            "trades": body.get("trades", []),
            "workers": body.get("workers", 0),
            "sites": body.get("sites", 0),
            "states": body.get("states", []),
            "current_tools": body.get("current_tools", ""),
            "challenge": body.get("challenge", ""),
            "best_time": body.get("best_time", ""),
            "status": "new",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.enterprise_requests.insert_one({**doc})
        return {"ok": True, "request_id": doc["request_id"],
                "message": "We will respond within 4 business hours."}

    @api_router.post("/billing/checkout")
    async def billing_checkout(body: dict, request: Request,
                               current_user: User = Depends(get_current_user)):
        """Creates a Stripe Checkout session for the chosen tier."""
        slug = body.get("tier_slug")
        origin = body.get("origin_url")
        if slug not in BILLING_TIERS:
            raise HTTPException(400, "Invalid tier_slug")
        if not origin:
            raise HTTPException(400, "origin_url is required")
        tier = BILLING_TIERS[slug]
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        success_url = f"{origin}/dashboard?billing=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin}/pricing?billing=cancelled"
        metadata = {
            "user_id": current_user.user_id,
            "email": current_user.email,
            "tier_slug": slug,
            "tier": tier["tier"],
            "cycle": tier["cycle"],
        }
        req = CheckoutSessionRequest(
            amount=float(tier["amount"]),
            currency=tier["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )
        session = await stripe_checkout.create_checkout_session(req)

        await db.payment_transactions.insert_one({
            "session_id": session.session_id,
            "user_id": current_user.user_id,
            "email": current_user.email,
            "amount": float(tier["amount"]),
            "currency": tier["currency"],
            "tier_slug": slug,
            "tier": tier["tier"],
            "cycle": tier["cycle"],
            "payment_status": "initiated",
            "status": "open",
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        return {"url": session.url, "session_id": session.session_id}

    @api_router.get("/billing/status/{session_id}")
    async def billing_status(session_id: str, request: Request,
                             current_user: User = Depends(get_current_user)):
        """Polled by frontend after Stripe redirect. Idempotent."""
        txn = await db.payment_transactions.find_one(
            {"session_id": session_id, "user_id": current_user.user_id}, {"_id": 0}
        )
        if not txn:
            raise HTTPException(404, "Transaction not found")

        if txn.get("payment_status") == "paid":
            return txn

        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        try:
            status = await stripe_checkout.get_checkout_status(session_id)
        except Exception as e:
            logger.info(f"billing_status: stripe lookup returned {type(e).__name__}: {str(e)[:120]}")
            txn["last_checked_at"] = datetime.now(timezone.utc).isoformat()
            txn["pending"] = True
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"last_checked_at": txn["last_checked_at"]}},
            )
            return txn

        updates = {
            "payment_status": status.payment_status,
            "status": status.status,
            "last_checked_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": updates})

        if status.payment_status == "paid" and txn.get("payment_status") != "paid":
            renewal = "1 year" if txn["cycle"] == "annual" else "1 month"
            await db.users.update_one(
                {"user_id": current_user.user_id},
                {"$set": {
                    "subscription_tier": txn["tier"],
                    "subscription_cycle": txn["cycle"],
                    "subscription_status": "active",
                    "subscription_renews": renewal,
                    "subscription_started_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
        txn.update(updates)
        return txn

    @api_router.get("/billing/my-subscription")
    async def my_subscription(current_user: User = Depends(get_current_user)):
        user = await db.users.find_one(
            {"user_id": current_user.user_id}, {"_id": 0, "password_hash": 0}
        )
        if not user:
            raise HTTPException(404, "User not found")
        user = await _ensure_trial_fields(user)
        info = _compute_trial(user)
        try:
            await _maybe_send_trial_reminder(user, info)
        except Exception:
            pass
        recent = await db.payment_transactions.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(10)
        return {
            "tier": user.get("subscription_tier"),
            "cycle": user.get("subscription_cycle"),
            "status": user.get("subscription_status", "trial"),
            "renews": user.get("subscription_renews"),
            "started_at": user.get("subscription_started_at"),
            "trial_started_at": user.get("trial_started_at"),
            "trial_ends_at": user.get("trial_ends_at"),
            "trial_days_left": info["trial_days_left"],
            "trial_expired": info["trial_expired"],
            "read_only": info["read_only"],
            "on_trial": info["on_trial"],
            "trial_reminder_sent_at": user.get("trial_reminder_sent_at"),
            "recent_transactions": recent,
        }

    @api_router.post("/webhook/stripe")
    async def stripe_webhook(request: Request):
        """Stripe webhook endpoint — updates transaction + subscription on paid."""
        body = await request.body()
        signature = request.headers.get("Stripe-Signature", "")
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        try:
            event = await stripe_checkout.handle_webhook(body, signature)
        except Exception as e:
            logger.exception("Stripe webhook parse failed")
            raise HTTPException(400, f"Invalid webhook: {str(e)[:150]}")

        sess_id = getattr(event, "session_id", None)
        if sess_id:
            txn = await db.payment_transactions.find_one({"session_id": sess_id}, {"_id": 0})
            if txn:
                updates = {
                    "payment_status": getattr(event, "payment_status", txn.get("payment_status")),
                    "last_event": getattr(event, "event_type", None),
                    "webhook_received_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.payment_transactions.update_one(
                    {"session_id": sess_id}, {"$set": updates}
                )
                if updates["payment_status"] == "paid" and txn.get("payment_status") != "paid":
                    renewal = "1 year" if txn.get("cycle") == "annual" else "1 month"
                    await db.users.update_one(
                        {"user_id": txn["user_id"]},
                        {"$set": {
                            "subscription_tier": txn.get("tier"),
                            "subscription_cycle": txn.get("cycle"),
                            "subscription_status": "active",
                            "subscription_renews": renewal,
                            "subscription_started_at": datetime.now(timezone.utc).isoformat(),
                        }},
                    )
        return {"ok": True}

    return {
        "ensure_trial_fields": _ensure_trial_fields,
        "compute_trial": _compute_trial,
    }
