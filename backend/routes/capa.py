"""
CAPA Register — Corrective & Preventive Actions.

A cross-cutting register that ties remediation actions to any source entity
(risk, control, incident, inspection, review). Used by:
  - Risk Reviews "Accept Remediation" (auto-spawn one CAPA per failing control)
  - Manual creation from /app/capa
  - Future: triggered from Incidents, Inspections, Audit Findings

Data model
----------
capa_items: {
  capa_id, account_id, user_id,
  linked_entity_type ("risk"|"control"|"incident"|"inspection"|"review"|"other"),
  linked_entity_id, linked_entity_label,
  description,
  action_type ("corrective"|"preventive"),
  status ("open"|"in_progress"|"closed"),
  assigned_to (PeoplePicker object),
  due_date,
  priority ("low"|"medium"|"high"|"critical"),
  created_at, updated_at,
  closed_at, closed_by, closure_notes,
}

Endpoints
---------
GET    /api/capa                  — list with optional ?status= & ?action_type=
GET    /api/capa/{capa_id}        — get one
POST   /api/capa                  — create
PATCH  /api/capa/{capa_id}        — update
POST   /api/capa/{capa_id}/close  — close (records closed_at, closed_by, notes)
DELETE /api/capa/{capa_id}        — soft-archive (sets status=archived)
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request


ACTION_TYPES = {"corrective", "preventive"}
STATUSES = {"open", "in_progress", "closed", "archived"}
PRIORITIES = {"low", "medium", "high", "critical"}


def _normalise_assignee(v, current_user=None):
    """Accept either a plain string (legacy) or a PeoplePicker object.

    Server-side "Me" resolution: if the incoming value claims source_type
    'me' (or has no user_id but display_name starts with 'Me'), we resolve
    it against the JWT's current_user — never trust the client.
    """
    if not v:
        return None
    if isinstance(v, dict):
        source_type = (v.get("source_type") or "").lower()
        # Server-side Me resolution
        if source_type == "me" and current_user is not None:
            return {
                "user_id": getattr(current_user, "user_id", None),
                "worker_id": None,
                "display_name": getattr(current_user, "name", "") or "",
                "email": getattr(current_user, "email", "") or "",
                "role": getattr(current_user, "role", "owner") or "",
                "source_type": "user",
            }
        return {
            "user_id": v.get("user_id"),
            "worker_id": v.get("worker_id"),
            "display_name": v.get("display_name") or "",
            "email": v.get("email") or "",
            "role": v.get("role") or "",
            "source_type": v.get("source_type") or "user",
        }
    # legacy string: treat as display_name only
    return {
        "user_id": None, "worker_id": None,
        "display_name": str(v), "email": "", "role": "",
        "source_type": "legacy",
    }


async def create_capa_internal(db, *, current_user, account_id, payload: dict):
    """Used both by the HTTP POST and by accept-remediation auto-spawn."""
    now = datetime.now(timezone.utc).isoformat()
    action_type = (payload.get("action_type") or "corrective").lower()
    if action_type not in ACTION_TYPES:
        action_type = "corrective"
    priority = (payload.get("priority") or "medium").lower()
    if priority not in PRIORITIES:
        priority = "medium"
    doc = {
        "capa_id": f"capa_{uuid.uuid4().hex[:10]}",
        "account_id": account_id,
        "user_id": current_user.user_id,
        "linked_entity_type": payload.get("linked_entity_type") or "other",
        "linked_entity_id": payload.get("linked_entity_id"),
        "linked_entity_label": payload.get("linked_entity_label") or "",
        "description": payload.get("description") or "",
        "action_type": action_type,
        "status": "open",
        "assigned_to": _normalise_assignee(payload.get("assigned_to"), current_user),
        "due_date": payload.get("due_date"),
        "priority": priority,
        "source": payload.get("source") or "manual",
        "created_at": now,
        "updated_at": now,
        "closed_at": None,
        "closed_by": None,
        "closure_notes": None,
    }
    await db.capa_items.insert_one({**doc})
    doc.pop("_id", None)
    return doc


def register_capa_routes(api_router: APIRouter, *, db, get_current_user_dep,
                          account_id_for_fn, log_audit_fn):

    @api_router.get("/capa")
    async def list_capa(
        status: Optional[str] = Query(None),
        action_type: Optional[str] = Query(None),
        linked_entity_type: Optional[str] = Query(None),
        linked_entity_id: Optional[str] = Query(None),
        current_user=Depends(get_current_user_dep),
    ):
        q = {"account_id": account_id_for_fn(current_user)}
        if status:
            q["status"] = status
        if action_type:
            q["action_type"] = action_type
        if linked_entity_type:
            q["linked_entity_type"] = linked_entity_type
        if linked_entity_id:
            q["linked_entity_id"] = linked_entity_id
        rows = await db.capa_items.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
        # Backwards-compat for older tenants without account_id
        if not rows:
            rows = await db.capa_items.find(
                {"user_id": current_user.user_id, **{k: v for k, v in q.items() if k != "account_id"}},
                {"_id": 0},
            ).sort("created_at", -1).to_list(2000)
        return rows

    @api_router.get("/capa/summary")
    async def capa_summary(current_user=Depends(get_current_user_dep)):
        account_id = account_id_for_fn(current_user)
        base = {"account_id": account_id}
        open_count = await db.capa_items.count_documents({**base, "status": "open"})
        in_progress = await db.capa_items.count_documents({**base, "status": "in_progress"})
        closed = await db.capa_items.count_documents({**base, "status": "closed"})
        now_iso = datetime.now(timezone.utc).isoformat()
        overdue = await db.capa_items.count_documents({
            **base,
            "status": {"$in": ["open", "in_progress"]},
            "due_date": {"$lt": now_iso, "$ne": None},
        })
        return {
            "open": open_count, "in_progress": in_progress,
            "closed": closed, "overdue": overdue,
            "total": open_count + in_progress + closed,
        }

    @api_router.get("/capa/{capa_id}")
    async def get_capa(capa_id: str, current_user=Depends(get_current_user_dep)):
        doc = await db.capa_items.find_one(
            {"capa_id": capa_id, "account_id": account_id_for_fn(current_user)},
            {"_id": 0},
        )
        if not doc:
            doc = await db.capa_items.find_one(
                {"capa_id": capa_id, "user_id": current_user.user_id}, {"_id": 0}
            )
        if not doc:
            raise HTTPException(404, "CAPA not found")
        return doc

    @api_router.post("/capa")
    async def create_capa(body: dict, request: Request,
                            current_user=Depends(get_current_user_dep)):
        if not (body.get("description") or "").strip():
            raise HTTPException(400, "description is required")
        doc = await create_capa_internal(
            db, current_user=current_user,
            account_id=account_id_for_fn(current_user), payload=body,
        )
        await log_audit_fn(db, user=current_user, action="create",
                            record_type="capa", record_id=doc["capa_id"],
                            request=request,
                            detail={"action_type": doc["action_type"]})
        return doc

    @api_router.patch("/capa/{capa_id}")
    async def update_capa(capa_id: str, body: dict, request: Request,
                           current_user=Depends(get_current_user_dep)):
        existing = await db.capa_items.find_one(
            {"capa_id": capa_id, "account_id": account_id_for_fn(current_user)}
        )
        if not existing:
            existing = await db.capa_items.find_one(
                {"capa_id": capa_id, "user_id": current_user.user_id}
            )
        if not existing:
            raise HTTPException(404, "CAPA not found")
        body.pop("_id", None)
        body.pop("capa_id", None)
        body.pop("account_id", None)
        if "assigned_to" in body:
            body["assigned_to"] = _normalise_assignee(body["assigned_to"], current_user)
        if "status" in body and body["status"] not in STATUSES:
            raise HTTPException(400, f"status must be one of {sorted(STATUSES)}")
        if "action_type" in body and body["action_type"] not in ACTION_TYPES:
            raise HTTPException(400, f"action_type must be one of {sorted(ACTION_TYPES)}")
        body["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.capa_items.update_one(
            {"capa_id": capa_id}, {"$set": body},
        )
        await log_audit_fn(db, user=current_user, action="update",
                            record_type="capa", record_id=capa_id,
                            request=request, detail={"fields": list(body.keys())})
        doc = {**existing, **body}
        doc.pop("_id", None)
        return doc

    @api_router.post("/capa/{capa_id}/close")
    async def close_capa(capa_id: str, body: dict, request: Request,
                          current_user=Depends(get_current_user_dep)):
        existing = await db.capa_items.find_one(
            {"capa_id": capa_id, "account_id": account_id_for_fn(current_user)}
        )
        if not existing:
            existing = await db.capa_items.find_one(
                {"capa_id": capa_id, "user_id": current_user.user_id}
            )
        if not existing:
            raise HTTPException(404, "CAPA not found")
        if existing.get("status") == "closed":
            raise HTTPException(400, "CAPA already closed")
        now = datetime.now(timezone.utc).isoformat()
        updates = {
            "status": "closed",
            "closed_at": now,
            "closed_by": {
                "user_id": current_user.user_id,
                "display_name": getattr(current_user, "name", "") or "",
                "email": getattr(current_user, "email", "") or "",
            },
            "closure_notes": (body or {}).get("closure_notes", ""),
            "updated_at": now,
        }
        await db.capa_items.update_one({"capa_id": capa_id}, {"$set": updates})
        await log_audit_fn(db, user=current_user, action="close",
                            record_type="capa", record_id=capa_id,
                            request=request, detail={"notes": updates["closure_notes"][:120]})
        merged = {**existing, **updates}
        merged.pop("_id", None)
        return merged

    @api_router.delete("/capa/{capa_id}")
    async def archive_capa(capa_id: str, request: Request,
                            current_user=Depends(get_current_user_dep)):
        res = await db.capa_items.update_one(
            {"capa_id": capa_id, "account_id": account_id_for_fn(current_user)},
            {"$set": {"status": "archived",
                       "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        if not res.matched_count:
            res = await db.capa_items.update_one(
                {"capa_id": capa_id, "user_id": current_user.user_id},
                {"$set": {"status": "archived",
                           "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
        if not res.matched_count:
            raise HTTPException(404, "CAPA not found")
        await log_audit_fn(db, user=current_user, action="archive",
                            record_type="capa", record_id=capa_id, request=request)
        return {"archived": True, "capa_id": capa_id}
