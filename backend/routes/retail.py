"""
Retail industry-specific endpoints.

All routes are hard-blocked to `industry == "retail"` via feature gates.

Endpoints:
  Lone worker check-in / escalation:
    POST /api/retail/lone-worker/checkin
    POST /api/retail/lone-worker/escalate
    GET  /api/retail/lone-worker/active
    GET  /api/retail/lone-worker/logs

  Quick Induct (3-min shift-blocker):
    POST /api/retail/quick-induct
    GET  /api/retail/quick-induct
    GET  /api/retail/quick-induct/{casual_id}/status  — roster block check

  Customer incident log (injury + aggression):
    POST /api/retail/customer-incidents
    GET  /api/retail/customer-incidents

  Credential roster-block helper:
    GET  /api/retail/roster-eligibility/{worker_id}
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query


# A casual cannot roster without an active Quick Induct in the last N days
QUICK_INDUCT_VALID_DAYS = 90
# A lone-worker check-in missed by >N minutes triggers escalation
LONE_WORKER_MAX_OVERDUE_MIN = 30
# Quick induct questions (3-min shift-blocker)
QUICK_INDUCT_QUESTIONS = [
    {"key": "slips_trips", "q": "Where are wet-floor signs kept?"},
    {"key": "manual_handling", "q": "What is the safe lifting rule for heavy stock?"},
    {"key": "emergency_exits", "q": "Which exits do you use in an emergency?"},
    {"key": "lone_worker", "q": "Who do you call if working alone feels unsafe?"},
    {"key": "customer_aggression", "q": "What do you do if a customer becomes aggressive?"},
    {"key": "incidents", "q": "Who do you notify if you are injured on shift?"},
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def register_retail_routes(api_router: APIRouter, *, db, get_current_user_dep,
                            require_feature, account_id_for_fn,
                            stamp_account_fn, visibility_filter_fn,
                            log_audit_fn, logger):

    lw_gate = Depends(require_feature("lone_worker_checkin"))
    lw_mgr_gate = Depends(require_feature("lone_worker_module"))
    qi_gate = Depends(require_feature("quick_induct"))
    roster_gate = Depends(require_feature("roster_compliance"))
    ci_gate = Depends(require_feature("customer_incident_log"))

    @api_router.get("/retail/quick-induct/meta")
    async def quick_induct_meta(current_user=qi_gate):
        return {"questions": QUICK_INDUCT_QUESTIONS, "valid_days": QUICK_INDUCT_VALID_DAYS}

    # -------- Lone worker -----------------------------------------------------
    @api_router.post("/retail/lone-worker/checkin")
    async def lone_worker_checkin(body: dict, request: Request, current_user=lw_gate):
        required = ("worker_name", "location")
        for f in required:
            if not body.get(f):
                raise HTTPException(400, f"{f} is required")
        # Idempotency for offline replay
        from idempotency import idempotency_check, idempotency_store
        cached = await idempotency_check(
            db, current_user, body, endpoint="retail.lone_worker.checkin",
            record_collection="lone_worker_logs", id_field="checkin_id",
        )
        if cached is not None:
            return cached
        next_checkin_min = int(body.get("next_checkin_min") or 60)
        next_due = (_now() + timedelta(minutes=next_checkin_min)).isoformat()
        doc = {
            "checkin_id": f"LW-{uuid.uuid4().hex[:10]}",
            "worker_name": body["worker_name"],
            "worker_id": body.get("worker_id"),
            "location": body["location"],
            "shift_start": body.get("shift_start") or _now_iso(),
            "shift_end": body.get("shift_end"),
            "checked_in_at": _now_iso(),
            "next_checkin_due": next_due,
            "wellbeing": body.get("wellbeing", "ok"),
            "escalated": False,
            "escalation_reason": None,
            "ended": False,
        }
        stamp_account_fn(doc, current_user)
        await db.lone_worker_logs.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="checkin",
                           record_type="lone_worker_log", record_id=doc["checkin_id"], request=request)
        doc.pop("_id", None)
        await idempotency_store(
            db, current_user, body, doc,
            endpoint="retail.lone_worker.checkin", id_field="checkin_id",
        )
        return doc

    @api_router.post("/retail/lone-worker/escalate")
    async def lone_worker_escalate(body: dict, request: Request, current_user=lw_mgr_gate):
        checkin_id = body.get("checkin_id")
        reason = body.get("reason") or "missed_checkin"
        if not checkin_id:
            raise HTTPException(400, "checkin_id is required")
        rec = await db.lone_worker_logs.find_one(
            {"checkin_id": checkin_id, "account_id": account_id_for_fn(current_user)}, {"_id": 0})
        if not rec:
            raise HTTPException(404, "Check-in not found")
        await db.lone_worker_logs.update_one(
            {"checkin_id": checkin_id},
            {"$set": {"escalated": True, "escalation_reason": reason,
                      "escalated_at": _now_iso()}})
        await log_audit_fn(db, user=current_user, action="escalate",
                           record_type="lone_worker_log", record_id=checkin_id,
                           request=request, detail={"reason": reason})
        return {"checkin_id": checkin_id, "escalated": True, "reason": reason}

    @api_router.get("/retail/lone-worker/active")
    async def lone_worker_active(current_user=lw_mgr_gate):
        q = {"account_id": account_id_for_fn(current_user), "ended": False}
        rows = await db.lone_worker_logs.find(q, {"_id": 0}).sort("checked_in_at", -1).to_list(200)
        now = _now()
        out = []
        for r in rows:
            overdue = False
            next_due = r.get("next_checkin_due")
            if next_due:
                try:
                    due_dt = datetime.fromisoformat(next_due.replace("Z", "+00:00"))
                    overdue_min = (now - due_dt).total_seconds() / 60.0
                    r["_overdue_min"] = max(0, int(overdue_min))
                    overdue = overdue_min > 0
                    r["_should_escalate"] = overdue_min > LONE_WORKER_MAX_OVERDUE_MIN
                except Exception:
                    pass
            r["_overdue"] = overdue
            out.append(r)
        return {"rows": out, "total": len(out)}

    @api_router.get("/retail/lone-worker/logs")
    async def lone_worker_logs(current_user=lw_mgr_gate, limit: int = Query(200, le=1000)):
        q = {"account_id": account_id_for_fn(current_user)}
        q.update(visibility_filter_fn(current_user, "lone_worker_logs"))
        rows = await db.lone_worker_logs.find(q, {"_id": 0}).sort("checked_in_at", -1).to_list(limit)
        return {"rows": rows, "total": len(rows)}

    # -------- Quick Induct ----------------------------------------------------
    @api_router.post("/retail/quick-induct")
    async def quick_induct(body: dict, request: Request, current_user=qi_gate):
        required = ("casual_name", "answers")
        for f in required:
            if not body.get(f):
                raise HTTPException(400, f"{f} is required")
        answers = body["answers"]
        if not isinstance(answers, dict):
            raise HTTPException(400, "answers must be an object keyed by question key")
        # Must answer all 6 questions
        missing = [q["key"] for q in QUICK_INDUCT_QUESTIONS if not str(answers.get(q["key"], "")).strip()]
        passed = len(missing) == 0
        expires = (_now() + timedelta(days=QUICK_INDUCT_VALID_DAYS)).isoformat()
        doc = {
            "induct_id": f"QI-{uuid.uuid4().hex[:10]}",
            "casual_name": body["casual_name"],
            "casual_id": body.get("casual_id"),
            "store_location": body.get("store_location"),
            "answers": answers,
            "passed": passed,
            "missing_answers": missing,
            "inducted_at": _now_iso(),
            "expires_at": expires if passed else None,
            "inducted_by": body.get("inducted_by") or getattr(current_user, "full_name", None),
        }
        stamp_account_fn(doc, current_user)
        await db.quick_inducts.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="induct",
                           record_type="quick_induct", record_id=doc["induct_id"],
                           request=request, detail={"passed": passed})
        doc.pop("_id", None)
        return doc

    @api_router.get("/retail/quick-induct")
    async def list_quick_induct(current_user=qi_gate, limit: int = Query(200, le=1000)):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.quick_inducts.find(q, {"_id": 0}).sort("inducted_at", -1).to_list(limit)
        return {"rows": rows, "total": len(rows)}

    @api_router.get("/retail/quick-induct/{casual_id}/status")
    async def induct_status(casual_id: str, current_user=qi_gate):
        """Returns whether this casual can roster right now."""
        q = {"account_id": account_id_for_fn(current_user), "casual_id": casual_id, "passed": True}
        row = await db.quick_inducts.find_one(q, {"_id": 0}, sort=[("inducted_at", -1)])
        if not row:
            return {"casual_id": casual_id, "can_roster": False, "reason": "No valid Quick Induct on file"}
        exp = row.get("expires_at")
        now = _now()
        can = False
        reason = "Expired"
        if exp:
            try:
                exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
                can = exp_dt > now
                reason = "Valid" if can else "Quick Induct expired"
            except Exception:
                pass
        return {"casual_id": casual_id, "can_roster": can, "reason": reason, "induct": row}

    # -------- Customer incidents ---------------------------------------------
    @api_router.post("/retail/customer-incidents")
    async def create_customer_incident(body: dict, request: Request, current_user=ci_gate):
        required = ("incident_type", "summary", "occurred_at")
        for f in required:
            if not body.get(f):
                raise HTTPException(400, f"{f} is required")
        doc = {
            "incident_id": f"CUST-{uuid.uuid4().hex[:10]}",
            "incident_type": body["incident_type"],  # injury / aggression / theft / slip
            "severity": body.get("severity", "minor"),
            "summary": body["summary"],
            "occurred_at": body["occurred_at"],
            "location": body.get("location"),
            "customer_initials": body.get("customer_initials"),
            "staff_involved": body.get("staff_involved"),
            "police_called": bool(body.get("police_called", False)),
            "ambulance_called": bool(body.get("ambulance_called", False)),
            "cctv_ref": body.get("cctv_ref"),
            "follow_up_action": body.get("follow_up_action"),
            "status": "open",
        }
        stamp_account_fn(doc, current_user)
        await db.customer_incidents.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="customer_incident", record_id=doc["incident_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/retail/customer-incidents")
    async def list_customer_incidents(current_user=ci_gate, limit: int = Query(200, le=1000)):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.customer_incidents.find(q, {"_id": 0}).sort("occurred_at", -1).to_list(limit)
        return {"rows": rows, "total": len(rows)}

    # -------- Roster eligibility (credential-driven block) --------------------
    @api_router.get("/retail/roster-eligibility/{worker_id}")
    async def roster_eligibility(worker_id: str, current_user=roster_gate):
        """Stubbed credential-driven shift-block logic.

        A worker cannot be rostered unless: (1) they have a valid Quick Induct,
        AND (2) none of their mandatory credentials are expired.
        """
        account_id = account_id_for_fn(current_user)
        blockers: list[str] = []
        # Quick Induct check
        qi = await db.quick_inducts.find_one(
            {"account_id": account_id, "casual_id": worker_id, "passed": True},
            {"_id": 0}, sort=[("inducted_at", -1)])
        now = _now()
        if not qi:
            blockers.append("No Quick Induct on file")
        else:
            exp = qi.get("expires_at")
            try:
                if exp and datetime.fromisoformat(exp.replace("Z", "+00:00")) < now:
                    blockers.append("Quick Induct has expired")
            except Exception:
                pass
        # Licence expiry check
        try:
            licences = await db.licences.find(
                {"account_id": account_id, "worker_id": worker_id}, {"_id": 0}).to_list(100)
        except Exception:
            licences = []
        for lic in licences:
            exp = lic.get("expires_at") or lic.get("expiry_date")
            if exp:
                try:
                    exp_dt = datetime.fromisoformat(str(exp).replace("Z", "+00:00"))
                    if exp_dt < now:
                        blockers.append(f"Licence '{lic.get('type') or lic.get('name')}' has expired")
                except Exception:
                    continue
        return {
            "worker_id": worker_id,
            "can_roster": len(blockers) == 0,
            "blockers": blockers,
        }
