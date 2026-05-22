"""SafeBase — Internal Admin: Dashboard + Accounts + Audit Log routes.

All routes prefixed /api/internal-admin/ and require an admin session JWT.
Read-only for support_agent + viewer; mutations require ops_lead+.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(d: datetime) -> str:
    return d.isoformat()


class ExtendTrialIn(BaseModel):
    days: int
    reason: Optional[str] = None


class ApplyCreditIn(BaseModel):
    amount_aud: float
    reason: str


class AddNoteIn(BaseModel):
    body: str
    tags: Optional[list[str]] = None


class DemoStatusIn(BaseModel):
    status: str  # New / Contacted / Booked / Completed / No-Show / Converted
    note: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# Mocked billing (Iter49 / option 4b). Deterministic per account_id so the UI
# behaves consistently. Marked MOCKED in responses so frontend can label it.
# ──────────────────────────────────────────────────────────────────────────────
def _mock_billing_for_user(user_doc: dict) -> dict:
    industry = (user_doc.get("industry") or "trades").lower()
    tier_by_industry = {
        "trades":      ("Solo Tradie",          799,  7990),
        "hospitality": ("Single Venue",       1499, 14990),
        "transport":   ("Owner-Operator",      1499, 14990),
        "healthcare":  ("Solo Practice",      2499, 24990),
        "retail":      ("Single Store",        999,  9990),
    }
    tier_name, monthly, annual = tier_by_industry.get(industry, tier_by_industry["trades"])
    sub_status = user_doc.get("subscription_status") or "trial"
    cycle = user_doc.get("billing_cycle") or "monthly"
    mrr = monthly if cycle == "monthly" else round(annual / 12, 2)
    return {
        "mocked": True,
        "stripe_customer_id": f"cus_mock_{user_doc.get('user_id','')[:10]}",
        "subscription_id": f"sub_mock_{user_doc.get('user_id','')[:10]}",
        "tier_name": tier_name,
        "cycle": cycle,
        "monthly_aud": monthly,
        "annual_aud": annual,
        "mrr_aud": mrr,
        "status": sub_status,
        "current_period_end": _iso(_now() + timedelta(days=18)),
        "payment_method": "•••• 4242 (Visa)",
        "failed_payments_30d": 0,
    }


# ──────────────────────────────────────────────────────────────────────────────
def register_internal_admin_routes(api_router: APIRouter, *, db, deps):
    get_current_admin = deps["get_current_admin"]
    require_rank = deps["require_rank"]
    log_action = deps["log_action"]

    # ─────────────── DASHBOARD ───────────────
    @api_router.get("/internal-admin/dashboard/kpi")
    async def dashboard_kpi(admin: dict = Depends(get_current_admin)):
        total_accounts = await db.users.count_documents({"role": "owner"})
        total_users = await db.users.count_documents({})
        trial_count = await db.users.count_documents({"subscription_status": "trial"})

        # 30-day signups (no _id, just count)
        thirty_days_ago = _iso(_now() - timedelta(days=30))
        new_30d = await db.users.count_documents({"created_at": {"$gte": thirty_days_ago}})
        new_prev = await db.users.count_documents({
            "created_at": {"$gte": _iso(_now() - timedelta(days=60)),
                            "$lt": thirty_days_ago}
        })
        trend_pct = 0 if new_prev == 0 else round(((new_30d - new_prev) / new_prev) * 100, 1)

        # Mocked MRR — sum mocked billing across paid+trial owners
        owners = await db.users.find({"role": "owner"}, {"_id": 0, "industry": 1,
            "subscription_status": 1, "billing_cycle": 1, "user_id": 1}).to_list(2000)
        mrr_total = 0.0
        paid_count = 0
        for o in owners:
            b = _mock_billing_for_user(o)
            if o.get("subscription_status") in ("active", "trialing", "trial"):
                mrr_total += b["mrr_aud"]
            if o.get("subscription_status") == "active":
                paid_count += 1

        trial_conversion = 0
        if paid_count + trial_count > 0:
            trial_conversion = round((paid_count / (paid_count + trial_count)) * 100, 1)

        return {
            "total_active_accounts": total_accounts,
            "total_active_accounts_trend_pct": trend_pct,
            "total_users": total_users,
            "mrr_aud": round(mrr_total, 2),
            "mrr_mocked": True,
            "active_trials": trial_count,
            "trial_to_paid_pct": trial_conversion,
            "open_support_issues": 0,  # placeholder until ticketing exists
            "system_health_status": "green",
            "system_uptime_pct": 99.97,
        }

    @api_router.get("/internal-admin/dashboard/activity-feed")
    async def dashboard_activity(limit: int = 50,
                                 admin: dict = Depends(get_current_admin)):
        # Recent events across the platform — assembled from a few collections.
        events: list[dict] = []

        # 1. Recent signups
        async for u in db.users.find(
            {"created_at": {"$exists": True}},
            {"_id": 0, "user_id": 1, "email": 1, "company_name": 1, "industry": 1, "created_at": 1}
        ).sort("created_at", -1).limit(20):
            events.append({
                "ts": u.get("created_at"),
                "type": "signup",
                "label": f"{u.get('company_name') or u['email']} signed up ({u.get('industry', 'trades').title()})",
                "target_type": "account",
                "target_id": u["user_id"],
            })

        # 2. Recent demo requests
        try:
            async for d in db.demo_requests.find(
                {}, {"_id": 0, "name": 1, "business": 1, "industry": 1, "created_at": 1, "request_id": 1}
            ).sort("created_at", -1).limit(10):
                events.append({
                    "ts": d.get("created_at"),
                    "type": "demo_request",
                    "label": f"Demo requested by {d.get('name')} from {d.get('business')}",
                    "target_type": "demo",
                    "target_id": d.get("request_id"),
                })
        except Exception:
            pass

        # 3. Recent password resets
        async for p in db.password_resets.find(
            {"decoy": {"$ne": True}}, {"_id": 0, "email": 1, "created_at": 1}
        ).sort("created_at", -1).limit(10):
            events.append({
                "ts": p.get("created_at"),
                "type": "password_reset",
                "label": f"Password reset requested: {p.get('email')}",
                "target_type": "user",
                "target_id": None,
            })

        # Sort newest-first and trim
        events.sort(key=lambda e: e.get("ts") or "", reverse=True)
        return {"events": events[:limit]}

    @api_router.get("/internal-admin/dashboard/alerts")
    async def dashboard_alerts(admin: dict = Depends(get_current_admin)):
        # Trials expiring in next 48 hours
        cutoff = _iso(_now() + timedelta(hours=48))
        soon_trials = await db.users.count_documents({
            "subscription_status": "trial",
            "trial_ends_at": {"$lte": cutoff, "$gte": _iso(_now())},
        })
        # Accounts with no login in 30+ days
        inactive = await db.users.count_documents({
            "last_login_at": {"$lt": _iso(_now() - timedelta(days=30))},
        })
        return {
            "trials_expiring_48h": soon_trials,
            "inactive_accounts_30d": inactive,
            "low_compliance_score_count": 0,  # requires compliance score calc
            "failed_payments_7d": 0,  # MOCKED — no real Stripe data yet
        }

    # ─────────────── ACCOUNTS LIST ───────────────
    @api_router.get("/internal-admin/accounts")
    async def list_accounts(
        q: Optional[str] = None,
        industry: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 25,
        admin: dict = Depends(get_current_admin),
    ):
        page_size = max(1, min(page_size, 100))
        page = max(1, page)
        filt: dict = {"role": "owner"}
        if industry:
            filt["industry"] = industry
        if status:
            filt["subscription_status"] = status
        if q:
            qs = q.strip()
            filt["$or"] = [
                {"email": {"$regex": qs, "$options": "i"}},
                {"company_name": {"$regex": qs, "$options": "i"}},
                {"user_id": qs},
            ]
        total = await db.users.count_documents(filt)
        cursor = db.users.find(filt, {"_id": 0, "password_hash": 0}) \
            .sort("created_at", -1) \
            .skip((page - 1) * page_size) \
            .limit(page_size)
        rows: list[dict] = []
        async for u in cursor:
            b = _mock_billing_for_user(u)
            rows.append({
                "account_id": u.get("user_id"),
                "business_name": u.get("company_name") or u.get("name") or u.get("email"),
                "owner_email": u.get("email"),
                "industry": u.get("industry") or "trades",
                "plan": b["tier_name"],
                "cycle": b["cycle"],
                "status": u.get("subscription_status") or "trial",
                "mrr_aud": b["mrr_aud"],
                "state": u.get("state"),
                "created_at": u.get("created_at"),
                "last_login_at": u.get("last_login_at"),
            })
        return {"total": total, "page": page, "page_size": page_size, "rows": rows}

    # ─────────────── ACCOUNT DETAIL ───────────────
    @api_router.get("/internal-admin/accounts/{account_id}")
    async def account_detail(account_id: str, admin: dict = Depends(get_current_admin)):
        u = await db.users.find_one({"user_id": account_id}, {"_id": 0, "password_hash": 0})
        if not u:
            raise HTTPException(404, "Account not found")
        b = _mock_billing_for_user(u)
        return {
            "account_id": account_id,
            "overview": {
                "business_name": u.get("company_name") or u.get("name") or u.get("email"),
                "industry": u.get("industry") or "trades",
                "abn": u.get("abn"),
                "address": u.get("address"),
                "state": u.get("state"),
                "owner_name": u.get("name"),
                "owner_email": u.get("email"),
                "owner_phone": u.get("phone"),
                "subscription_status": u.get("subscription_status") or "trial",
                "trial_started_at": u.get("trial_started_at"),
                "trial_ends_at": u.get("trial_ends_at"),
                "created_at": u.get("created_at"),
                "last_login_at": u.get("last_login_at"),
            },
            "billing": b,
        }

    @api_router.get("/internal-admin/accounts/{account_id}/users")
    async def account_users(account_id: str, admin: dict = Depends(get_current_admin)):
        # The owner doc itself + any users with the same company_name
        owner = await db.users.find_one({"user_id": account_id}, {"_id": 0, "password_hash": 0})
        if not owner:
            raise HTTPException(404, "Account not found")
        users = [owner]
        company = owner.get("company_name")
        if company:
            async for u in db.users.find(
                {"company_name": company, "user_id": {"$ne": account_id}},
                {"_id": 0, "password_hash": 0}
            ).limit(100):
                users.append(u)
        rows = [{
            "user_id": u.get("user_id"),
            "name": u.get("name"),
            "email": u.get("email"),
            "role": u.get("role"),
            "last_login_at": u.get("last_login_at"),
            "is_active": u.get("is_active", True),
        } for u in users]
        return {"users": rows}

    @api_router.get("/internal-admin/accounts/{account_id}/notes")
    async def list_notes(account_id: str, admin: dict = Depends(get_current_admin)):
        notes = []
        async for n in db.internal_admin_notes.find(
            {"account_id": account_id}, {"_id": 0}
        ).sort("created_at", -1).limit(100):
            notes.append(n)
        return {"notes": notes}

    @api_router.get("/internal-admin/accounts/{account_id}/activity-log")
    async def account_activity(account_id: str, admin: dict = Depends(get_current_admin)):
        events: list[dict] = []
        # Login history (uses user_sessions if any record per user_id)
        async for s in db.user_sessions.find(
            {"user_id": account_id}, {"_id": 0}
        ).sort("created_at", -1).limit(20):
            events.append({
                "ts": s.get("created_at"),
                "type": "login",
                "label": "Logged in",
            })
        async for p in db.password_resets.find(
            {"email": {"$exists": True}, "user_id": account_id, "decoy": {"$ne": True}},
            {"_id": 0}
        ).sort("created_at", -1).limit(10):
            events.append({
                "ts": p.get("created_at"),
                "type": "password_reset",
                "label": "Password reset requested",
            })
        events.sort(key=lambda e: e.get("ts") or "", reverse=True)
        return {"events": events[:50]}

    # ─────────────── MUTATIONS (ops_lead+) ───────────────
    @api_router.post("/internal-admin/accounts/{account_id}/extend-trial")
    async def extend_trial(
        account_id: str,
        body: ExtendTrialIn,
        request: Request,
        admin: dict = Depends(require_rank("support_agent")),
    ):
        if body.days < 1 or body.days > 30:
            raise HTTPException(400, "Days must be between 1 and 30")
        u = await db.users.find_one({"user_id": account_id}, {"_id": 0})
        if not u:
            raise HTTPException(404, "Account not found")
        cur_end = u.get("trial_ends_at")
        base_dt = _now()
        if cur_end:
            try:
                base_dt = datetime.fromisoformat(cur_end)
                if base_dt.tzinfo is None:
                    base_dt = base_dt.replace(tzinfo=timezone.utc)
            except Exception:
                base_dt = _now()
        new_end = base_dt + timedelta(days=body.days)
        await db.users.update_one(
            {"user_id": account_id},
            {"$set": {"trial_ends_at": _iso(new_end),
                       "subscription_status": "trial"}},
        )
        await log_action(admin=admin, action="extend_trial", request=request,
                         target_type="account", target_id=account_id,
                         details={"days": body.days, "reason": body.reason,
                                  "new_trial_ends_at": _iso(new_end)})
        return {"trial_ends_at": _iso(new_end), "days_added": body.days}

    @api_router.post("/internal-admin/accounts/{account_id}/apply-credit")
    async def apply_credit(
        account_id: str,
        body: ApplyCreditIn,
        request: Request,
        admin: dict = Depends(require_rank("support_agent")),
    ):
        # Support agent capped at A$500 per spec
        if admin["role"] == "support_agent" and body.amount_aud > 500:
            raise HTTPException(403, "Support agents may only apply credits up to A$500")
        if body.amount_aud <= 0:
            raise HTTPException(400, "Amount must be positive")
        u = await db.users.find_one({"user_id": account_id}, {"_id": 0})
        if not u:
            raise HTTPException(404, "Account not found")
        credit_id = f"credit_{_now().timestamp():.0f}"
        await db.internal_admin_credits.insert_one({
            "credit_id": credit_id,
            "account_id": account_id,
            "amount_aud": body.amount_aud,
            "reason": body.reason,
            "applied_by_admin_id": admin["admin_id"],
            "applied_by_admin_email": admin["email"],
            "stripe_reference": None,  # MOCKED — would call Stripe in production
            "mocked": True,
            "created_at": _iso(_now()),
        })
        await log_action(admin=admin, action="apply_credit", request=request,
                         target_type="account", target_id=account_id,
                         details={"amount_aud": body.amount_aud,
                                  "reason": body.reason,
                                  "credit_id": credit_id})
        return {"credit_id": credit_id, "amount_aud": body.amount_aud, "mocked": True}

    @api_router.post("/internal-admin/accounts/{account_id}/add-note")
    async def add_note(
        account_id: str,
        body: AddNoteIn,
        request: Request,
        admin: dict = Depends(require_rank("support_agent")),
    ):
        if not body.body.strip():
            raise HTTPException(400, "Note body required")
        note_id = f"note_{_now().timestamp():.0f}"
        await db.internal_admin_notes.insert_one({
            "note_id": note_id,
            "account_id": account_id,
            "body": body.body,
            "tags": body.tags or [],
            "author_admin_id": admin["admin_id"],
            "author_admin_email": admin["email"],
            "created_at": _iso(_now()),
        })
        await log_action(admin=admin, action="add_note", request=request,
                         target_type="account", target_id=account_id,
                         details={"note_id": note_id, "tags": body.tags or []})
        return {"note_id": note_id}

    @api_router.post("/internal-admin/users/{user_id}/force-logout")
    async def force_logout_user(
        user_id: str,
        request: Request,
        admin: dict = Depends(require_rank("support_agent")),
    ):
        """Kicks the customer out of ALL sessions:
        - deletes user_sessions records
        - stamps password_changed_at so outstanding customer JWTs are invalidated
          (the customer get_current_user checks JWT iat < password_changed_at).
        """
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 1})
        if not user:
            raise HTTPException(404, "User not found")
        sess_deleted = await db.user_sessions.delete_many({"user_id": user_id})
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"password_changed_at": _iso(_now())}},
        )
        await log_action(
            admin=admin, action="force_logout", request=request,
            target_type="user", target_id=user_id,
            details={"email": user.get("email"), "sessions_killed": sess_deleted.deleted_count},
        )
        return {"success": True, "sessions_killed": sess_deleted.deleted_count}

    # ─────────────── TRIALS + DEMOS + USERS ───────────────
    @api_router.get("/internal-admin/trials")
    async def list_trials(admin: dict = Depends(get_current_admin)):
        cursor = db.users.find(
            {"subscription_status": "trial", "role": "owner"},
            {"_id": 0, "password_hash": 0}
        ).sort("trial_ends_at", 1).limit(200)
        rows = []
        now = _now()
        async for u in cursor:
            end = u.get("trial_ends_at")
            days_remaining: Optional[int] = None
            if end:
                try:
                    end_dt = datetime.fromisoformat(end)
                    if end_dt.tzinfo is None:
                        end_dt = end_dt.replace(tzinfo=timezone.utc)
                    days_remaining = (end_dt - now).days
                except Exception:
                    pass
            rows.append({
                "account_id": u.get("user_id"),
                "business_name": u.get("company_name") or u.get("name") or u.get("email"),
                "industry": u.get("industry") or "trades",
                "trial_started_at": u.get("trial_started_at"),
                "trial_ends_at": end,
                "days_remaining": days_remaining,
                "owner_email": u.get("email"),
            })
        return {"rows": rows, "total": len(rows)}

    @api_router.get("/internal-admin/demos")
    async def list_demos(admin: dict = Depends(get_current_admin)):
        rows = []
        try:
            cursor = db.demo_requests.find({}, {"_id": 0}).sort("created_at", -1).limit(200)
            async for d in cursor:
                rows.append({
                    "request_id": d.get("request_id"),
                    "name": d.get("name"),
                    "business": d.get("business"),
                    "email": d.get("email"),
                    "industry": d.get("industry"),
                    "staff_count": d.get("staff_count"),
                    "status": d.get("status") or "New",
                    "created_at": d.get("created_at"),
                    "note": d.get("note"),
                })
        except Exception:
            pass
        return {"rows": rows, "total": len(rows)}

    @api_router.patch("/internal-admin/demos/{request_id}")
    async def update_demo(
        request_id: str,
        body: DemoStatusIn,
        request: Request,
        admin: dict = Depends(require_rank("support_agent")),
    ):
        await db.demo_requests.update_one(
            {"request_id": request_id},
            {"$set": {"status": body.status, "note": body.note,
                       "updated_at": _iso(_now())}},
        )
        await log_action(admin=admin, action="update_demo_status",
                         request=request, target_type="demo",
                         target_id=request_id,
                         details={"status": body.status})
        return {"success": True}

    @api_router.get("/internal-admin/users")
    async def list_users(
        q: Optional[str] = None,
        page: int = 1,
        page_size: int = 25,
        admin: dict = Depends(get_current_admin),
    ):
        page_size = max(1, min(page_size, 100))
        page = max(1, page)
        filt: dict = {}
        if q:
            qs = q.strip()
            filt["$or"] = [
                {"email": {"$regex": qs, "$options": "i"}},
                {"name": {"$regex": qs, "$options": "i"}},
                {"user_id": qs},
            ]
        total = await db.users.count_documents(filt)
        cursor = db.users.find(filt, {"_id": 0, "password_hash": 0}) \
            .sort("created_at", -1) \
            .skip((page - 1) * page_size).limit(page_size)
        rows = []
        async for u in cursor:
            rows.append({
                "user_id": u.get("user_id"),
                "name": u.get("name"),
                "email": u.get("email"),
                "role": u.get("role"),
                "industry": u.get("industry"),
                "company_name": u.get("company_name"),
                "last_login_at": u.get("last_login_at"),
                "is_active": u.get("is_active", True),
            })
        return {"total": total, "page": page, "page_size": page_size, "rows": rows}

    # ─────────────── AUDIT LOGS ───────────────
    @api_router.get("/internal-admin/audit-logs")
    async def list_audit_logs(
        action: Optional[str] = None,
        admin_id: Optional[str] = None,
        target_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
        admin: dict = Depends(get_current_admin),
    ):
        page_size = max(1, min(page_size, 200))
        page = max(1, page)
        filt: dict = {}
        if action:
            filt["action"] = action
        if admin_id:
            filt["admin_id"] = admin_id
        if target_id:
            filt["target_id"] = target_id
        total = await db.internal_admin_audit_log.count_documents(filt)
        cursor = db.internal_admin_audit_log.find(filt, {"_id": 0}) \
            .sort("created_at", -1) \
            .skip((page - 1) * page_size).limit(page_size)
        rows = [r async for r in cursor]
        return {"total": total, "page": page, "page_size": page_size, "rows": rows}
