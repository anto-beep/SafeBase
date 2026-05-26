"""SafeBase — Per-industry subscriptions + trial lifecycle (Iter58).

Adds the v2 billing surface alongside the existing single-tier `/billing/*`
routes in `routes/billing.py`. A user can now hold an independent subscription
per industry (trades + hospitality + transport + healthcare + retail). Trials
are scoped per (email, industry) — one free trial per industry per email,
forever (a recurring user paying for trades cannot trial trades again, but
can still trial hospitality).

Mount via `register_subscription_routes(api_router, ...)` from server.py.

Endpoints
─────────
GET    /api/billing/plans?industry=<slug>
GET    /api/billing/my-subscriptions
POST   /api/billing/start-trial             body {industry}
POST   /api/billing/checkout-industry        body {industry, tier, cycle, origin_url}
POST   /api/billing/change                  body {industry, new_tier, new_cycle}
POST   /api/billing/cancel                  body {industry}
GET    /api/auth/permissions
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request

from emergentintegrations.payments.stripe.checkout import (
    CheckoutSessionRequest,
    StripeCheckout,
)

from routes.billing import BILLING_TIERS
from permissions_matrix import ROLE_PERMISSIONS, ALL_FEATURES


SUPPORTED_INDUSTRIES = ("trades", "hospitality", "transport", "healthcare", "retail")
TRIAL_DAYS = 14

# Maps industry → tier prefix used in BILLING_TIERS so we can list per-industry plans.
_INDUSTRY_TIER_PREFIXES = {
    "trades":      ["sole_trader", "small_business", "growing_business", "enterprise"],
    "retail":      ["retail_single", "retail_small", "retail_multi", "retail_enterprise"],
    "hospitality": ["hosp_single", "hosp_small", "hosp_multi", "hosp_enterprise"],
    "transport":   ["transport_single", "transport_small", "transport_multi", "transport_enterprise"],
    "healthcare":  ["health_single", "health_small", "health_multi", "health_enterprise"],
}

# Per-tier soft-cap on worker count — used by the downgrade soft-cap banner.
_TIER_WORKER_CAPS = {
    "sole_trader": 1, "small_business": 5, "growing_business": 20, "enterprise": 50,
    "retail_single": 5, "retail_small": 15, "retail_multi": 30, "retail_enterprise": 50,
    "hosp_single": 3, "hosp_small": 8, "hosp_multi": 20, "hosp_enterprise": 50,
    "transport_single": 3, "transport_small": 10, "transport_multi": 25, "transport_enterprise": 50,
    "health_single": 5, "health_small": 15, "health_multi": 30, "health_enterprise": 60,
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _industry_for_slug(slug: str) -> str | None:
    for ind, prefixes in _INDUSTRY_TIER_PREFIXES.items():
        for p in prefixes:
            if slug.startswith(p + "_"):
                return ind
    return None


def _tier_from_slug(slug: str) -> str | None:
    if slug not in BILLING_TIERS:
        return None
    return BILLING_TIERS[slug]["tier"]


def _build_slug(industry: str, tier: str, cycle: str) -> str | None:
    candidate = f"{tier}_{cycle}"
    if candidate in BILLING_TIERS and BILLING_TIERS[candidate]["tier"] == tier:
        ind = _industry_for_slug(candidate)
        if ind == industry:
            return candidate
    return None


def register_subscription_routes(api_router: APIRouter, *, db, User, get_current_user,
                                  logger, stripe_api_key: str):
    """Mount the per-industry subscription + permissions endpoints."""

    async def _ensure_trial_history_index():
        try:
            await db.trial_history.create_index(
                [("email_lower", 1), ("industry", 1)], unique=True
            )
        except Exception as e:
            logger.info(f"trial_history index already present: {e}")

    async def _ensure_subscription_index():
        try:
            await db.user_subscriptions.create_index(
                [("user_id", 1), ("industry", 1)], unique=True
            )
        except Exception as e:
            logger.info(f"user_subscriptions index already present: {e}")

    # Fire-and-forget index creation
    import asyncio
    asyncio.create_task(_ensure_trial_history_index())
    asyncio.create_task(_ensure_subscription_index())

    # ──────────────── PLANS LISTING ────────────────
    @api_router.get("/billing/plans")
    async def list_industry_plans(industry: str):
        """Public — list every monthly + annual plan for an industry."""
        if industry not in SUPPORTED_INDUSTRIES:
            raise HTTPException(400, "Unknown industry")
        prefixes = _INDUSTRY_TIER_PREFIXES[industry]
        rows = []
        for prefix in prefixes:
            for cycle in ("monthly", "annual"):
                slug = f"{prefix}_{cycle}"
                tier = BILLING_TIERS.get(slug)
                if tier:
                    rows.append({
                        "slug": slug,
                        "tier": tier["tier"],
                        "cycle": tier["cycle"],
                        "amount": tier["amount"],
                        "currency": tier["currency"],
                        "label": tier["label"],
                        "worker_cap": _TIER_WORKER_CAPS.get(tier["tier"]),
                    })
        return {"industry": industry, "trial_days": TRIAL_DAYS, "plans": rows}

    # ──────────────── MY SUBSCRIPTIONS ────────────────
    @api_router.get("/billing/my-subscriptions")
    async def my_subscriptions(current_user=Depends(get_current_user)):
        """Returns one row per industry the user has either trialed or paid for."""
        cursor = db.user_subscriptions.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).sort("industry", 1)
        rows = await cursor.to_list(50)
        # Compute live trial_days_left for each row
        now = datetime.now(timezone.utc)
        for r in rows:
            if r.get("status") == "trial" and r.get("trial_ends_at"):
                try:
                    end_dt = datetime.fromisoformat(r["trial_ends_at"].replace("Z", "+00:00"))
                    if end_dt.tzinfo is None:
                        end_dt = end_dt.replace(tzinfo=timezone.utc)
                    seconds_left = (end_dt - now).total_seconds()
                    r["trial_days_left"] = max(0, int((seconds_left + 86399) // 86400))
                    r["trial_expired"] = seconds_left <= 0
                except Exception:
                    r["trial_days_left"] = TRIAL_DAYS
                    r["trial_expired"] = False
        return {"subscriptions": rows}

    # ──────────────── START TRIAL ────────────────
    @api_router.post("/billing/start-trial")
    async def start_trial(body: dict, current_user=Depends(get_current_user)):
        """Start a 14-day trial for an industry. Email + industry must be unused."""
        industry = (body.get("industry") or "").strip().lower()
        if industry not in SUPPORTED_INDUSTRIES:
            raise HTTPException(400, "Unknown industry")
        email_lower = current_user.email.strip().lower()
        # Block if this email already used a trial for this industry — ever.
        prior = await db.trial_history.find_one(
            {"email_lower": email_lower, "industry": industry}, {"_id": 0}
        )
        if prior:
            raise HTTPException(
                409,
                f"You've already used your free trial for {industry}. "
                f"Choose a paid plan to access this industry.",
            )
        existing = await db.user_subscriptions.find_one(
            {"user_id": current_user.user_id, "industry": industry}, {"_id": 0}
        )
        if existing:
            raise HTTPException(409, f"Subscription already exists for {industry}")
        now_iso = _now_iso()
        trial_end = (datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)).isoformat()
        sub = {
            "sub_id": f"sub_{uuid.uuid4().hex[:12]}",
            "user_id": current_user.user_id,
            "email": current_user.email,
            "email_lower": email_lower,
            "industry": industry,
            "tier": None,
            "cycle": None,
            "tier_slug": None,
            "status": "trial",
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "current_period_end": None,
            "trial_started_at": now_iso,
            "trial_ends_at": trial_end,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        await db.user_subscriptions.insert_one(sub)
        await db.trial_history.insert_one({
            "email_lower": email_lower,
            "industry": industry,
            "user_id": current_user.user_id,
            "started_at": now_iso,
            "ended_at": None,
            "outcome": "ongoing",
        })
        sub.pop("_id", None)
        return {"ok": True, "subscription": sub}

    # ──────────────── CHECKOUT (per-industry paid plan) ────────────────
    @api_router.post("/billing/checkout-industry")
    async def checkout_industry(body: dict, request: Request,
                                current_user=Depends(get_current_user)):
        industry = (body.get("industry") or "").strip().lower()
        tier = (body.get("tier") or "").strip()
        cycle = (body.get("cycle") or "").strip().lower()
        origin_url = body.get("origin_url")
        if industry not in SUPPORTED_INDUSTRIES:
            raise HTTPException(400, "Unknown industry")
        if cycle not in ("monthly", "annual"):
            raise HTTPException(400, "cycle must be monthly or annual")
        if not origin_url:
            raise HTTPException(400, "origin_url is required")
        slug = _build_slug(industry, tier, cycle)
        if not slug:
            raise HTTPException(400, "Invalid tier for this industry")
        tier_def = BILLING_TIERS[slug]
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        success_url = f"{origin_url}/dashboard?billing=success&industry={industry}&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/pricing?billing=cancelled&industry={industry}"
        metadata = {
            "user_id": current_user.user_id,
            "email": current_user.email,
            "industry": industry,
            "tier_slug": slug,
            "tier": tier_def["tier"],
            "cycle": tier_def["cycle"],
            "v2": "1",
        }
        req = CheckoutSessionRequest(
            amount=float(tier_def["amount"]),
            currency=tier_def["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )
        session = await stripe_checkout.create_checkout_session(req)
        await db.payment_transactions.insert_one({
            "session_id": session.session_id,
            "user_id": current_user.user_id,
            "email": current_user.email,
            "industry": industry,
            "amount": float(tier_def["amount"]),
            "currency": tier_def["currency"],
            "tier_slug": slug,
            "tier": tier_def["tier"],
            "cycle": tier_def["cycle"],
            "payment_status": "initiated",
            "status": "open",
            "metadata": metadata,
            "v2": True,
            "created_at": _now_iso(),
        })
        return {"url": session.url, "session_id": session.session_id}

    # ──────────────── CHANGE (upgrade or downgrade) ────────────────
    @api_router.post("/billing/change")
    async def change_plan(body: dict, request: Request,
                           current_user=Depends(get_current_user)):
        """Upgrade or downgrade an active per-industry subscription.

        Routing rules:
          - If the existing sub is still on trial → go to checkout (Stripe).
          - If existing sub is active paid + new tier amount is HIGHER → checkout.
          - If existing sub is active paid + new tier amount is LOWER → soft-downgrade
            (we mark the row pending_change_at_renewal so downgrade applies at end of cycle).
        """
        industry = (body.get("industry") or "").strip().lower()
        new_tier = (body.get("new_tier") or "").strip()
        new_cycle = (body.get("new_cycle") or "").strip().lower()
        origin_url = body.get("origin_url")
        if industry not in SUPPORTED_INDUSTRIES:
            raise HTTPException(400, "Unknown industry")
        if new_cycle not in ("monthly", "annual"):
            raise HTTPException(400, "new_cycle must be monthly or annual")
        existing = await db.user_subscriptions.find_one(
            {"user_id": current_user.user_id, "industry": industry}, {"_id": 0}
        )
        if not existing:
            raise HTTPException(404, "No subscription for this industry — start a trial or checkout first.")
        new_slug = _build_slug(industry, new_tier, new_cycle)
        if not new_slug:
            raise HTTPException(400, "Invalid tier for this industry")
        new_tier_def = BILLING_TIERS[new_slug]
        current_tier_slug = existing.get("tier_slug")
        current_amount = BILLING_TIERS.get(current_tier_slug, {}).get("amount", 0) if current_tier_slug else 0
        going_higher = new_tier_def["amount"] > current_amount
        # Trial OR upgrade → fresh checkout to capture the new (higher) charge
        if existing.get("status") == "trial" or going_higher or not current_tier_slug:
            if not origin_url:
                raise HTTPException(400, "origin_url is required for upgrade/trial conversion")
            return await checkout_industry(
                {"industry": industry, "tier": new_tier, "cycle": new_cycle, "origin_url": origin_url},
                request, current_user
            )
        # Downgrade path — mark pending and apply at current_period_end
        await db.user_subscriptions.update_one(
            {"user_id": current_user.user_id, "industry": industry},
            {"$set": {
                "pending_change": {
                    "tier": new_tier_def["tier"],
                    "cycle": new_tier_def["cycle"],
                    "tier_slug": new_slug,
                    "scheduled_at": existing.get("current_period_end") or _now_iso(),
                    "kind": "downgrade",
                    "requested_at": _now_iso(),
                },
                "updated_at": _now_iso(),
            }},
        )
        return {
            "ok": True,
            "kind": "downgrade_scheduled",
            "applies_at": existing.get("current_period_end"),
            "current_tier": existing.get("tier"),
            "new_tier": new_tier_def["tier"],
            "new_cycle": new_tier_def["cycle"],
        }

    # ──────────────── CANCEL ────────────────
    @api_router.post("/billing/cancel")
    async def cancel_subscription(body: dict, current_user=Depends(get_current_user)):
        industry = (body.get("industry") or "").strip().lower()
        if industry not in SUPPORTED_INDUSTRIES:
            raise HTTPException(400, "Unknown industry")
        existing = await db.user_subscriptions.find_one(
            {"user_id": current_user.user_id, "industry": industry}, {"_id": 0}
        )
        if not existing:
            raise HTTPException(404, "No subscription for this industry")
        # Soft-cancel — keeps access until end of cycle
        await db.user_subscriptions.update_one(
            {"user_id": current_user.user_id, "industry": industry},
            {"$set": {
                "status": "canceling",
                "canceled_at": _now_iso(),
                "ends_at": existing.get("current_period_end") or _now_iso(),
                "updated_at": _now_iso(),
            }},
        )
        if existing.get("status") == "trial":
            # Mark trial history as ended (still blocks future trials for this industry — by design)
            await db.trial_history.update_one(
                {"email_lower": existing["email_lower"], "industry": industry},
                {"$set": {"outcome": "canceled", "ended_at": _now_iso()}},
            )
        return {"ok": True, "status": "canceling", "ends_at": existing.get("current_period_end")}

    # ──────────────── PERMISSIONS ────────────────
    @api_router.get("/auth/permissions")
    async def get_permissions(current_user=Depends(get_current_user)):
        """Returns the role × feature matrix for the logged-in user.

        Frontend + mobile both consume this to gate UI elements server-side.
        """
        role = (current_user.role or "owner").lower()
        if role not in ROLE_PERMISSIONS:
            role = "worker"
        return {
            "role": role,
            "permissions": ROLE_PERMISSIONS[role],
            "all_features": ALL_FEATURES,
        }

    return {
        "supported_industries": SUPPORTED_INDUSTRIES,
        "trial_days": TRIAL_DAYS,
    }
