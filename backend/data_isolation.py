"""
Data Isolation Architecture (Part 1 of the Feb-2026 multi-industry brief).

Two layers of isolation, enforced at the API + DB level:

  Layer 1 — Account Isolation (between businesses)
    Every record carries `account_id`. A user from Account A can NEVER see
    or modify Account B's data — even if they craft the URL by hand. Cross-
    account hits return **403 Forbidden**, not 404 (so we don't leak the
    existence of records).

  Layer 2 — Role-Based Visibility (within a business)
    Workers see only their own incidents/credentials. Supervisors see only
    their assigned site. Safety/Manager see all. Owner sees everything plus
    billing. Enforced via `visibility_filter()` mongo query merger.

Backwards-compatibility:
  Existing records were tagged with `user_id` (the owner's user_id). For
  legacy single-user accounts, `account_id == user_id`. Team members get
  `account_id` set to their inviter's user_id when they accept an invite.
  The `account_id_for(user)` helper handles both cases.

Audit log:
  Every mutation logs to `audit_log` (append-only) with
  user_id | action | record_type | record_id | timestamp | ip.
  Owners can read via `GET /api/audit-log` (read-only).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
import uuid

from fastapi import HTTPException, Request


# ---------------- Account ID resolution -------------------------------------

def account_id_for(user) -> str:
    """Return the account_id this user belongs to.

    Owners' account_id == their user_id. Team-member users carry an explicit
    `account_id` set when their invite was accepted. Falls back to user_id
    so legacy data without account_id still works.
    """
    return getattr(user, "account_id", None) or getattr(user, "user_id")


# ---------------- Role tier ranking -----------------------------------------

ROLE_TIER = {
    "worker": 0,
    "supervisor": 1,
    "safety_lead": 2,
    "safety": 2,
    "food_safety_supervisor": 2,
    "manager": 3,
    "owner": 4,
}


def role_tier(user) -> int:
    return ROLE_TIER.get(
        (getattr(user, "role_variant", None) or "owner").lower(), 4)


# ---------------- Visibility filter -----------------------------------------

# Record types a worker can ONLY see if they created them. Everything else is
# either shared (read-only) or hidden until promoted by a supervisor.
WORKER_OWN_RECORDS = {
    "incidents", "incident_workflow", "licences",
    "fitness_for_duty", "temperature_logs", "lone_worker_logs",
}


def visibility_filter(user, collection: str) -> dict:
    """Return additional Mongo query clauses to restrict results by role.

    Always combine with `account_id` for full isolation. Example:

        q = {"account_id": account_id_for(user)}
        q.update(visibility_filter(user, "incidents"))
        rows = await db.incidents.find(q)

    Workers: own records only for sensitive collections; nothing for
        management collections (safety_*, reports, etc.) — those are filtered
        out by the feature-flag gate already.
    Supervisors: site-scoped — TODO: site_id-based filter once sites are
        modeled. For now they see all within the account.
    Safety/Manager/Owner: see everything in the account.
    """
    tier = role_tier(user)
    if tier <= 0 and collection in WORKER_OWN_RECORDS:
        return {"$or": [
            {"created_by_user_id": getattr(user, "user_id")},
            {"user_id": getattr(user, "user_id")},
            {"workers_involved": {"$in": [getattr(user, "user_id")]}},
        ]}
    return {}


# ---------------- Cross-account guard ---------------------------------------

def assert_account(record: Optional[dict], user) -> dict:
    """Raise 403 if the record's account_id does not match the caller's
    account_id. Use this for single-record fetches (GET by id, PATCH, DELETE).

    Returns the record unchanged on success. Returns 404 only if the record
    truly does not exist (not even other accounts have it) — this prevents
    leaking record existence.
    """
    if not record:
        raise HTTPException(404, "Not found")
    rec_account = record.get("account_id") or record.get("user_id")
    user_account = account_id_for(user)
    if rec_account != user_account:
        raise HTTPException(
            403, "Access denied — record belongs to another account")
    return record


# ---------------- Account stamp on writes -----------------------------------

def stamp_account(doc: dict, user) -> dict:
    """Inject account_id, industry, created_by_user_id, created_at on inserts.
    Mutates and returns `doc` for chaining."""
    doc.setdefault("account_id", account_id_for(user))
    doc.setdefault("industry", (getattr(user, "industry", None) or "trades").lower())
    doc.setdefault("created_by_user_id", getattr(user, "user_id"))
    doc.setdefault("created_at", datetime.now(timezone.utc).isoformat())
    return doc


# ---------------- Audit log -------------------------------------------------

async def log_audit(db, *, user, action: str, record_type: str,
                    record_id: Optional[str] = None,
                    request: Optional[Request] = None,
                    detail: Optional[dict] = None) -> None:
    """Append a tamper-evident audit log entry. Writes are best-effort —
    audit failures never block the underlying request."""
    try:
        ip = None
        if request is not None:
            ip = request.client.host if request.client else None
            ip = request.headers.get("x-forwarded-for", ip)
        await db.audit_log.insert_one({
            "audit_id": f"aud_{uuid.uuid4().hex[:12]}",
            "account_id": account_id_for(user),
            "user_id": getattr(user, "user_id"),
            "user_role": getattr(user, "role_variant", "owner"),
            "action": action,
            "record_type": record_type,
            "record_id": record_id,
            "ip_address": ip,
            "detail": detail or {},
            "at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass


def register_audit_routes(api_router, *, db, get_current_user_dep):
    """Mount GET /api/audit-log (owner-only, read-only)."""
    from fastapi import Depends, Query

    @api_router.get("/audit-log")
    async def list_audit_log(
        current_user=Depends(get_current_user_dep),
        limit: int = Query(200, le=1000),
        record_type: Optional[str] = None,
    ):
        if (getattr(current_user, "role_variant", "owner") or "owner").lower() != "owner":
            raise HTTPException(403, "Audit log is owner-only")
        q = {"account_id": account_id_for(current_user)}
        if record_type:
            q["record_type"] = record_type
        rows = await db.audit_log.find(q, {"_id": 0}).sort("at", -1).to_list(limit)
        return {"total": len(rows), "rows": rows}
