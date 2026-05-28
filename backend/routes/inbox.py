"""
"Mentioned me" inbox — single endpoint that aggregates all items in the
account currently assigned to (or owned by) the calling user.

Covers:
  - CAPA items where assigned_to.user_id == me (or worker_id == my worker_id)
  - Risks where risk_owner.user_id == me
  - Risk additional_actions where assigned_to.user_id == me
  - Incidents — corrective_actions / preventive_actions assignee == me
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query


def _is_mine(person_field, user_id: Optional[str], worker_id: Optional[str]) -> bool:
    if not person_field:
        return False
    if isinstance(person_field, dict):
        if user_id and person_field.get("user_id") == user_id:
            return True
        if worker_id and person_field.get("worker_id") == worker_id:
            return True
        return False
    return False


def register_inbox_routes(api_router: APIRouter, *, db, get_current_user_dep,
                          account_id_for_fn):

    @api_router.get("/me/inbox")
    async def my_inbox(
        status: Optional[str] = Query(None),
        limit: int = Query(200, ge=1, le=500),
        current_user=Depends(get_current_user_dep),
    ):
        """Return all items assigned to the current user across CAPA, risks,
        and incidents — newest first. Filter optionally by status."""
        account_id = account_id_for_fn(current_user)
        user_id = getattr(current_user, "user_id", None)

        # Resolve "my" worker_id if a workers row exists for this user.
        me_worker = await db.workers.find_one(
            {"account_id": account_id, "user_id": user_id}, {"_id": 0, "worker_id": 1}
        )
        worker_id = (me_worker or {}).get("worker_id")

        items: list[dict] = []

        # --- CAPA items ---
        capa_q = {
            "account_id": account_id,
            "$or": [
                {"assigned_to.user_id": user_id},
            ],
        }
        if worker_id:
            capa_q["$or"].append({"assigned_to.worker_id": worker_id})
        async for c in db.capa_items.find(capa_q, {"_id": 0}).sort("created_at", -1).limit(limit):
            if status and c.get("status") != status:
                continue
            items.append({
                "kind": "capa",
                "id": c["capa_id"],
                "title": c.get("description") or "CAPA item",
                "status": c.get("status"),
                "priority": c.get("priority"),
                "due_date": c.get("due_date"),
                "linked_entity_type": c.get("linked_entity_type"),
                "linked_entity_label": c.get("linked_entity_label"),
                "assigned_to": c.get("assigned_to"),
                "created_at": c.get("created_at"),
                "open_url": "/dashboard/capa",
            })

        # --- Risks (owner) ---
        risk_q = {
            "$or": [
                {"account_id": account_id, "risk_owner.user_id": user_id},
                {"user_id": user_id, "risk_owner.user_id": user_id},
            ],
        }
        async for r in db.risks.find(risk_q, {"_id": 0}).sort("created_at", -1).limit(limit):
            if status and r.get("status") != status:
                continue
            items.append({
                "kind": "risk_owner",
                "id": r.get("risk_id"),
                "title": r.get("title") or "Risk",
                "status": r.get("status"),
                "priority": (r.get("residual_level") or "").lower() or None,
                "due_date": r.get("next_review_date"),
                "linked_entity_type": "risk",
                "linked_entity_label": r.get("process_name") or "",
                "assigned_to": r.get("risk_owner"),
                "created_at": r.get("created_at"),
                "open_url": f"/dashboard/risk-register/{r.get('risk_id')}",
            })

        # --- Risk additional_actions assigned to me ---
        risk_actions_q = {
            "$or": [
                {"account_id": account_id},
                {"user_id": user_id},
            ],
        }
        async for r in db.risks.find(risk_actions_q, {"_id": 0}).sort("created_at", -1).limit(limit * 2):
            for a in (r.get("additional_actions") or []):
                if _is_mine(a.get("assigned_to"), user_id, worker_id):
                    if status and (a.get("status") or "open") != status:
                        continue
                    items.append({
                        "kind": "risk_action",
                        "id": f"{r.get('risk_id')}::{(a.get('description') or '')[:24]}",
                        "title": a.get("description") or "Risk action",
                        "status": a.get("status") or "open",
                        "priority": a.get("priority"),
                        "due_date": a.get("due_date"),
                        "linked_entity_type": "risk",
                        "linked_entity_label": r.get("title") or "",
                        "assigned_to": a.get("assigned_to"),
                        "created_at": r.get("created_at"),
                        "open_url": f"/dashboard/risk-register/{r.get('risk_id')}",
                    })

        # --- Incidents — corrective_actions + preventive_actions assignees ---
        inc_q = {
            "$or": [
                {"account_id": account_id},
                {"user_id": user_id},
            ],
        }
        async for inc in db.incidents.find(inc_q, {"_id": 0}).sort("occurred_at", -1).limit(limit):
            for bucket in ("corrective_actions_list", "preventive_actions"):
                for a in (inc.get(bucket) or []):
                    if isinstance(a, dict) and _is_mine(a.get("assigned_to"), user_id, worker_id):
                        if status and (a.get("status") or "open") != status:
                            continue
                        items.append({
                            "kind": f"incident_{bucket.split('_')[0]}_action",
                            "id": f"{inc.get('incident_id')}::{(a.get('type') or '')[:24]}",
                            "title": a.get("description") or a.get("type") or "Incident action",
                            "status": a.get("status") or "open",
                            "priority": a.get("priority"),
                            "due_date": a.get("due_date"),
                            "linked_entity_type": "incident",
                            "linked_entity_label": inc.get("title") or inc.get("incident_id"),
                            "assigned_to": a.get("assigned_to"),
                            "created_at": inc.get("occurred_at") or inc.get("created_at"),
                            "open_url": f"/dashboard/incidents/{inc.get('incident_id')}",
                        })

        # Newest first
        items.sort(key=lambda it: it.get("created_at") or "", reverse=True)
        return items[:limit]

    @api_router.get("/me/inbox/summary")
    async def my_inbox_summary(current_user=Depends(get_current_user_dep)):
        """Quick badge counts for the dashboard pill."""
        all_items = await my_inbox(status=None, limit=500, current_user=current_user)  # type: ignore
        by_kind: dict[str, int] = {}
        overdue = 0
        open_count = 0
        now_iso = datetime.now(timezone.utc).isoformat()
        for it in all_items:
            k = it.get("kind") or "other"
            by_kind[k] = by_kind.get(k, 0) + 1
            if (it.get("status") or "open") in ("open", "in_progress", "draft", "submitted"):
                open_count += 1
            if it.get("due_date") and it["due_date"] < now_iso and it.get("status") != "closed":
                overdue += 1
        return {
            "total": len(all_items),
            "open": open_count,
            "overdue": overdue,
            "by_kind": by_kind,
        }
