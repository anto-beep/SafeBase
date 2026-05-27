"""
Risk Register & Library module — SafeTradie

Four flat libraries (process / activity / task / control) plus a full risks
collection with inline controls and a linked risk_reviews collection that
drives the approval workflow.

All AI helpers call Claude Sonnet 4.5 via the Emergent LLM key with graceful
JSON fallback so budget depletion does not break the product.
"""
from __future__ import annotations

import asyncio
import json as _json
import re as _re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

# These imports resolve from server.py when this module is imported into it.
# We intentionally keep this file self-contained (no side effects at import).

risk_router = APIRouter()

LIBRARY_KINDS = {"process", "activity", "task", "control"}

_FAIL_EFF = {"not", "partial"}
_FAIL_CHANGE = {"improve", "replace", "remove", "supplement"}
_FAIL_PLACE = {"no", "partial"}


def _failing_controls(review: dict) -> list[dict]:
    """Return control_reviews rows flagged as failing in a review."""
    out = []
    for c in (review or {}).get("control_reviews", []) or []:
        if (c.get("effectiveness") in _FAIL_EFF
            or c.get("recommended_change") in _FAIL_CHANGE
            or c.get("still_in_place") in _FAIL_PLACE):
            out.append(c)
    return out

HRCW_CATEGORIES = [
    "Risk of a person falling more than 2 metres",
    "Work on a telecommunications tower",
    "Demolition of a load-bearing structure",
    "Likely to involve disturbance of asbestos",
    "Temporary load-bearing support for structural alterations",
    "Work in or near a confined space",
    "Work in or near a shaft or trench deeper than 1.5m",
    "Work in or near a tunnel",
    "Use of explosives",
    "Work on or near pressurised gas mains or piping",
    "Work on or near chemical, fuel or refrigerant lines",
    "Work on or near energised electrical installations or services",
    "Work in an area with contaminated or flammable atmosphere",
    "Tilt-up or precast concrete",
    "Work on or adjacent to roadways used by traffic",
    "Work on or near powered mobile plant",
    "Work in an area with artificial extremes of temperature",
    "Work in or near water or other liquid — risk of drowning",
    "Diving work",
]

# ---------------------------------------------------------------------------
# Pre-seed defaults
# ---------------------------------------------------------------------------

SEED_PROCESSES = [
    # Electrical
    ("Electrical Installation Work", ["Electrical"]),
    ("Electrical Testing and Commissioning", ["Electrical"]),
    ("Solar and Renewable Energy Installation", ["Electrical"]),
    ("Switchboard and Distribution Work", ["Electrical"]),
    ("Underground and Overhead Cable Work", ["Electrical"]),
    ("Maintenance and Fault Finding", ["Electrical"]),
    ("Hazardous Area Electrical Work", ["Electrical"]),
    # Plumbing
    ("Plumbing Installation", ["Plumbing"]),
    ("Drainage and Sewerage Work", ["Plumbing"]),
    ("Gas Fitting and Appliance Work", ["Gas Fitting", "Plumbing"]),
    ("Roof Plumbing and Stormwater", ["Roof Plumbing", "Plumbing"]),
    ("Hot Water System Installation", ["Plumbing"]),
    ("Sanitary Plumbing", ["Plumbing"]),
    ("Maintenance and Repair Work", ["Plumbing"]),
    # General
    ("Working at Heights", ["All Trades"]),
    ("Confined Space Work", ["All Trades"]),
    ("Excavation and Trenching", ["All Trades", "Civil"]),
    ("Plant and Equipment Operation", ["All Trades"]),
    ("Hazardous Substances Handling", ["All Trades"]),
    ("Site Establishment and Housekeeping", ["All Trades"]),
    ("Traffic and Pedestrian Management", ["All Trades"]),
]

# activity name -> parent process name
SEED_ACTIVITIES = {
    "Electrical Installation Work": [
        "Cable pulling and termination",
        "Conduit installation",
        "Outlet and switch installation",
        "Ceiling fan and light fitting installation",
        "Meter box and switchboard wiring",
        "Underground cable laying",
    ],
    "Solar and Renewable Energy Installation": [
        "Rooftop solar panel mounting",
        "Inverter installation",
        "DC isolator installation",
        "Grid connection testing",
        "Battery storage system installation",
    ],
    "Plumbing Installation": [
        "Copper pipe cutting, soldering and joining",
        "PVC pipe installation",
        "Fixture and fitting installation",
        "Pressure testing",
        "Pipe penetrations through walls and floors",
    ],
    "Gas Fitting and Appliance Work": [
        "Gas appliance connection",
        "Gas pipe installation",
        "Gas leak testing",
        "Commissioning of gas systems",
        "Decommissioning of gas systems",
    ],
    "Working at Heights": [
        "Ladder use",
        "Scaffold erection and use",
        "EWP / boom lift operation",
        "Roof access and edge protection",
        "Harness and fall arrest system use",
    ],
}

SEED_CONTROLS = [
    # (name, hierarchy, description, effectiveness)
    ("Remove live electrical conductors before work commences", "elimination",
     "Physically remove or disconnect conductors so there is no energy source at the work location.", "high"),
    ("De-energise and lock out equipment before maintenance", "elimination",
     "Apply lock-out/tag-out to all isolation points; test for dead before touch.", "high"),
    ("Use pre-fabricated components to avoid on-site cutting", "elimination",
     "Specify pre-cut and pre-drilled components during design to remove on-site exposure.", "high"),
    ("Eliminate working at heights through design", "elimination",
     "Move work to ground level (e.g. lower fitting assembly, use pole-mounted access).", "high"),
    ("Replace solvent-based adhesive with water-based product", "substitution",
     "Source equivalent water-based adhesive — reduces VOC and respiratory exposure.", "medium"),
    ("Use XLPE cable instead of PVC in high-temperature areas", "substitution",
     "Specify XLPE insulation for ambient >60°C runs.", "medium"),
    ("Replace manual trenching with mechanical excavation", "substitution",
     "Use appropriately sized excavator / trencher to reduce manual handling.", "medium"),
    ("Use push-fit fittings instead of soldering", "substitution",
     "Eliminates hot works and associated fire risk for routine plumbing joints.", "medium"),
    ("Install physical barriers around live electrical panels", "isolation",
     "Hard barriers keep workers clear of exposed live parts during concurrent activity.", "high"),
    ("Use interlocked safety guards on rotating equipment", "isolation",
     "Guards that stop the machine when opened.", "high"),
    ("Erect exclusion zones around overhead work areas", "isolation",
     "Hard barricades, signage, spotter to keep ground workers out of drop zone.", "medium"),
    ("Use barricades around open trenches", "isolation",
     "Hard barricades min 1m from edge; signage; lighting at night.", "medium"),
    ("Install residual current devices (RCDs) on circuits", "engineering",
     "30mA RCDs on all final sub-circuits per AS/NZS 3000.", "high"),
    ("Use GFCI protected outlets in wet areas", "engineering",
     "Portable RCDs/GPOs for wet-area work.", "high"),
    ("Install handrails and edge protection on elevated areas", "engineering",
     "Compliant edge protection per AS/NZS 1657 at all open edges over 2m.", "high"),
    ("Use mechanical pipe benders to reduce manual handling", "engineering",
     "Reduces musculoskeletal load and repetitive strain.", "medium"),
    ("Install ventilation in confined work spaces", "engineering",
     "Continuous LEV or forced ventilation to maintain safe atmosphere.", "high"),
    ("Complete SWMS before commencing high-risk work", "administrative",
     "Documented SWMS signed by all workers before start; toolbox covers key controls.", "medium"),
    ("Implement permit-to-work system for live electrical work", "administrative",
     "Authorised-only work under written permit with pre-start check.", "medium"),
    ("Conduct pre-start toolbox talk", "administrative",
     "5-10 minute briefing at shift start covering today's hazards and controls.", "medium"),
    ("Implement two-person buddy system for confined spaces", "administrative",
     "Never enter alone; stand-by attendant with comms and rescue plan.", "medium"),
    ("Schedule work to avoid public access hours", "administrative",
     "Plan noisy / high-risk tasks outside peak pedestrian periods.", "low"),
    ("Conduct daily site inspection before work commences", "administrative",
     "Documented walk-around checklist — housekeeping, access, energies, PPE.", "medium"),
    ("Wear class-1 insulated gloves for electrical work", "ppe",
     "Tested gloves to AS/NZS 2225 for voltage class.", "medium"),
    ("Use full-body harness and lanyard when working at height", "ppe",
     "Full body harness + energy-absorbing lanyard to certified anchor.", "medium"),
    ("Wear safety glasses and face shield during cutting", "ppe",
     "AS/NZS 1337 rated eye + face protection.", "medium"),
    ("Use P2 respirator when cutting silica-containing materials", "ppe",
     "Minimum P2 disposable or half-face; fit-tested.", "medium"),
    ("Wear steel-capped boots on all construction sites", "ppe",
     "AS/NZS 2210.3 rated safety footwear at all times on site.", "low"),
    ("Use knee pads for prolonged floor-level work", "ppe",
     "Reduces bursitis and chronic knee injury risk.", "low"),
]


async def _ensure_seed(db: Any, user_id: str) -> None:
    """Seed the user's libraries on first access. Idempotent."""
    marker = await db.library_seed.find_one({"user_id": user_id})
    if marker:
        return

    now = datetime.now(timezone.utc).isoformat()
    # Processes
    process_id_by_name: dict[str, str] = {}
    proc_docs = []
    for name, trades in SEED_PROCESSES:
        pid = f"proc_{uuid.uuid4().hex[:10]}"
        process_id_by_name[name] = pid
        proc_docs.append({
            "user_id": user_id, "id": pid, "kind": "process",
            "name": name, "description": "", "trade_types": trades,
            "status": "active", "created_at": now, "updated_at": now,
        })
    if proc_docs:
        await db.library_process.insert_many(proc_docs)

    # Activities
    act_docs = []
    for parent_process, activities in SEED_ACTIVITIES.items():
        parent_id = process_id_by_name.get(parent_process)
        if not parent_id:
            continue
        for a in activities:
            act_docs.append({
                "user_id": user_id, "id": f"act_{uuid.uuid4().hex[:10]}", "kind": "activity",
                "name": a, "description": "", "parent_process_id": parent_id,
                "parent_process_name": parent_process, "trade_types": [],
                "status": "active", "created_at": now, "updated_at": now,
            })
    if act_docs:
        await db.library_activity.insert_many(act_docs)

    # Controls
    ctrl_docs = []
    for name, level, desc, eff in SEED_CONTROLS:
        ctrl_docs.append({
            "user_id": user_id, "id": f"ctrl_{uuid.uuid4().hex[:10]}", "kind": "control",
            "name": name, "description": desc, "hierarchy_level": level,
            "trade_types": [], "effectiveness": eff, "status": "active",
            "applicable_activity_id": None, "created_at": now, "updated_at": now,
        })
    if ctrl_docs:
        await db.library_control.insert_many(ctrl_docs)

    await db.library_seed.insert_one({
        "user_id": user_id, "seeded_at": now,
        "counts": {"process": len(proc_docs), "activity": len(act_docs), "control": len(ctrl_docs), "task": 0},
    })


def _coll(db: Any, kind: str):
    if kind not in LIBRARY_KINDS:
        raise HTTPException(400, f"Unknown library kind: {kind}")
    return db[f"library_{kind}"]


# ---------------------------------------------------------------------------
# Generic library CRUD
# ---------------------------------------------------------------------------

def register_library_routes(app_db, get_current_user):
    """Factory so server.py can register these with its DB + auth dependency."""

    @risk_router.get("/library/{kind}")
    async def list_library(kind: str, current_user=Depends(get_current_user)):
        await _ensure_seed(app_db, current_user.user_id)
        rows = await _coll(app_db, kind).find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).sort("name", 1).to_list(2000)
        return rows

    @risk_router.post("/library/{kind}")
    async def create_library_item(kind: str, body: dict, current_user=Depends(get_current_user)):
        _coll(app_db, kind)
        if not body.get("name"):
            raise HTTPException(400, "name required")
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": f"{kind[:4]}_{uuid.uuid4().hex[:10]}",
            "user_id": current_user.user_id,
            "kind": kind,
            "name": body.get("name"),
            "description": body.get("description", ""),
            "trade_types": body.get("trade_types", []),
            "status": body.get("status", "active"),
            "created_at": now,
            "updated_at": now,
        }
        # kind-specific fields
        if kind == "activity":
            doc["parent_process_id"] = body.get("parent_process_id")
            doc["parent_process_name"] = body.get("parent_process_name")
        elif kind == "task":
            doc["parent_activity_id"] = body.get("parent_activity_id")
            doc["parent_activity_name"] = body.get("parent_activity_name")
            doc["parent_process_id"] = body.get("parent_process_id")
            doc["parent_process_name"] = body.get("parent_process_name")
            doc["duration"] = body.get("duration")  # short / medium / long
            doc["hrcw_trigger"] = bool(body.get("hrcw_trigger"))
            doc["hrcw_categories"] = body.get("hrcw_categories", [])
        elif kind == "control":
            doc["hierarchy_level"] = body.get("hierarchy_level", "administrative")
            doc["effectiveness"] = body.get("effectiveness", "medium")
            doc["applicable_activity_id"] = body.get("applicable_activity_id")
            doc["implementation_guidance"] = body.get("implementation_guidance", "")
        await _coll(app_db, kind).insert_one({**doc})
        return {k: v for k, v in doc.items() if k != "_id"}

    @risk_router.patch("/library/{kind}/{item_id}")
    async def update_library_item(kind: str, item_id: str, body: dict, current_user=Depends(get_current_user)):
        body.pop("_id", None)
        body.pop("user_id", None)
        body.pop("id", None)
        body["updated_at"] = datetime.now(timezone.utc).isoformat()
        res = await _coll(app_db, kind).update_one(
            {"id": item_id, "user_id": current_user.user_id}, {"$set": body},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "not found")
        doc = await _coll(app_db, kind).find_one({"id": item_id, "user_id": current_user.user_id}, {"_id": 0})
        return doc

    @risk_router.delete("/library/{kind}/{item_id}")
    async def delete_library_item(kind: str, item_id: str, current_user=Depends(get_current_user)):
        res = await _coll(app_db, kind).delete_one({"id": item_id, "user_id": current_user.user_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "not found")
        return {"deleted": True}

    # ------------------------------------------------------------------
    # Risk register
    # ------------------------------------------------------------------

    def _risk_level(score: int) -> str:
        if score <= 5: return "low"
        if score <= 11: return "medium"
        if score <= 19: return "high"
        return "extreme"

    def _compute_levels(d: dict) -> dict:
        d = dict(d)
        il = int(d.get("inherent_likelihood") or 0) or 0
        ic = int(d.get("inherent_consequence") or 0) or 0
        rl = int(d.get("residual_likelihood") or 0) or 0
        rc = int(d.get("residual_consequence") or 0) or 0
        d["inherent_score"] = il * ic
        d["residual_score"] = rl * rc
        d["inherent_level"] = _risk_level(d["inherent_score"]) if d["inherent_score"] else None
        d["residual_level"] = _risk_level(d["residual_score"]) if d["residual_score"] else None
        return d

    async def _next_risk_id(user_id: str) -> str:
        # atomic-ish counter using per-user doc
        res = await app_db.risk_counters.find_one_and_update(
            {"user_id": user_id},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        seq = (res or {}).get("seq") or 1
        return f"RISK-{seq:03d}"

    def _parse_review_days(freq: str | None) -> int:
        return {"monthly": 30, "quarterly": 90, "6-monthly": 180, "annually": 365}.get(
            (freq or "").lower(), 90
        )

    @risk_router.get("/risks/summary")
    async def risks_summary(current_user=Depends(get_current_user)):
        rows = await app_db.risks.find({"user_id": current_user.user_id, "status": {"$ne": "archived"}}, {"_id": 0}).to_list(5000)
        counts = {"extreme": 0, "high": 0, "medium": 0, "low": 0}
        total_score = 0
        scored = 0
        now = datetime.now(timezone.utc)
        overdue = 0
        due_30 = 0
        open_actions = 0
        for r in rows:
            lvl = r.get("residual_level") or r.get("inherent_level")
            if lvl in counts:
                counts[lvl] += 1
            if r.get("residual_score"):
                total_score += r["residual_score"]; scored += 1
            nr = r.get("next_review_date")
            if nr:
                try:
                    d = datetime.fromisoformat(nr).replace(tzinfo=timezone.utc)
                    days = (d - now).days
                    if days < 0: overdue += 1
                    elif days <= 30: due_30 += 1
                except Exception:
                    pass
            for a in (r.get("additional_actions") or []):
                if a.get("status") in (None, "open", "in_progress"):
                    open_actions += 1
        return {
            "total": len(rows),
            "by_level": counts,
            "reviews_overdue": overdue,
            "reviews_due_30": due_30,
            "open_actions": open_actions,
            "avg_residual_score": round(total_score / scored, 1) if scored else 0,
        }

    @risk_router.get("/risks")
    async def list_risks(current_user=Depends(get_current_user)):
        rows = await app_db.risks.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).sort("residual_score", -1).to_list(5000)
        return rows

    @risk_router.get("/risks/{risk_id}")
    async def get_risk(risk_id: str, current_user=Depends(get_current_user)):
        doc = await app_db.risks.find_one({"risk_id": risk_id, "user_id": current_user.user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "risk not found")
        return doc

    @risk_router.post("/risks")
    async def create_risk(body: dict, current_user=Depends(get_current_user)):
        now = datetime.now(timezone.utc).isoformat()
        rid = await _next_risk_id(current_user.user_id)
        review_days = _parse_review_days(body.get("review_frequency"))
        next_review = (datetime.now(timezone.utc) + timedelta(days=review_days)).isoformat()
        doc = {
            "user_id": current_user.user_id,
            "risk_id": rid,
            "title": body.get("title", ""),
            "status": body.get("status", "active"),
            "process_id": body.get("process_id"),
            "process_name": body.get("process_name"),
            "activity_id": body.get("activity_id"),
            "activity_name": body.get("activity_name"),
            "task_ids": body.get("task_ids", []),
            "task_names": body.get("task_names", []),
            "primary_hazard": body.get("primary_hazard"),
            "secondary_hazard": body.get("secondary_hazard"),
            "hazard_description": body.get("hazard_description", ""),
            "at_risk": body.get("at_risk", []),
            "description": body.get("description", ""),
            "risk_owner": body.get("risk_owner"),
            "sites": body.get("sites", []),
            "date_identified": body.get("date_identified") or now,
            "source": body.get("source"),
            "linked_incident_ids": body.get("linked_incident_ids", []),
            "linked_swms_ids": body.get("linked_swms_ids", []),
            "linked_inspection_ids": body.get("linked_inspection_ids", []),
            "linked_toolbox_ids": body.get("linked_toolbox_ids", []),
            "inherent_likelihood": body.get("inherent_likelihood"),
            "inherent_consequence": body.get("inherent_consequence"),
            "controls": body.get("controls", []),
            "residual_likelihood": body.get("residual_likelihood"),
            "residual_consequence": body.get("residual_consequence"),
            "residual_acceptable": body.get("residual_acceptable"),
            "residual_conditions": body.get("residual_conditions", ""),
            "additional_actions": body.get("additional_actions", []),
            "review_frequency": body.get("review_frequency", "quarterly"),
            "next_review_date": body.get("next_review_date") or next_review,
            "notify_days_before": body.get("notify_days_before", 14),
            "notify_safety_manager": bool(body.get("notify_safety_manager", True)),
            "triggers": body.get("triggers", {
                "on_new_incident": True, "on_failed_inspection": True,
                "on_swms_update": True, "on_near_miss": True,
            }),
            "last_reviewed_at": None,
            "acknowledged_by": body.get("acknowledged_by"),
            "created_at": now,
            "updated_at": now,
            "audit_log": [
                {"at": now, "user_id": current_user.user_id, "user_name": current_user.name,
                 "field": "__created__", "old": None, "new": body.get("title")}
            ],
        }
        doc = _compute_levels(doc)
        await app_db.risks.insert_one({**doc})
        doc.pop("_id", None)
        return doc

    @risk_router.patch("/risks/{risk_id}")
    async def update_risk(risk_id: str, body: dict, current_user=Depends(get_current_user)):
        existing = await app_db.risks.find_one({"risk_id": risk_id, "user_id": current_user.user_id})
        if not existing:
            raise HTTPException(404, "not found")
        body.pop("_id", None); body.pop("user_id", None); body.pop("risk_id", None); body.pop("audit_log", None)
        body["updated_at"] = datetime.now(timezone.utc).isoformat()
        merged = {**existing, **body}
        merged = _compute_levels(merged)
        # diff for audit
        log_entries = []
        for k, v in body.items():
            if existing.get(k) != v and k not in ("updated_at",):
                log_entries.append({
                    "at": merged["updated_at"], "user_id": current_user.user_id, "user_name": current_user.name,
                    "field": k,
                    "old": str(existing.get(k))[:200] if existing.get(k) is not None else None,
                    "new": str(v)[:200] if v is not None else None,
                })
        if log_entries:
            merged["audit_log"] = (existing.get("audit_log") or []) + log_entries
        merged.pop("_id", None)
        await app_db.risks.update_one({"risk_id": risk_id, "user_id": current_user.user_id}, {"$set": merged})
        return merged

    @risk_router.delete("/risks/{risk_id}")
    async def archive_risk(risk_id: str, current_user=Depends(get_current_user)):
        res = await app_db.risks.update_one(
            {"risk_id": risk_id, "user_id": current_user.user_id},
            {"$set": {"status": "archived", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "not found")
        return {"archived": True}

    @risk_router.get("/risks/{risk_id}/linked")
    async def risk_linked_records(risk_id: str, current_user=Depends(get_current_user)):
        r = await app_db.risks.find_one({"risk_id": risk_id, "user_id": current_user.user_id}, {"_id": 0})
        if not r:
            raise HTTPException(404, "not found")
        # Pull from other collections where IDs were linked on creation
        incidents = []
        if r.get("linked_incident_ids"):
            incidents = await app_db.incidents.find(
                {"user_id": current_user.user_id, "incident_id": {"$in": r["linked_incident_ids"]}}, {"_id": 0}
            ).to_list(100)
        swms = []
        if r.get("linked_swms_ids"):
            swms = await app_db.documents.find(
                {"user_id": current_user.user_id, "document_id": {"$in": r["linked_swms_ids"]}}, {"_id": 0}
            ).to_list(100)
        inspections = await app_db.safety_inspections.find(
            {"user_id": current_user.user_id, "_id": {"$in": [None]}}, {"_id": 0}
        ).to_list(0)  # placeholder — inspections can be linked via safety module separately
        toolbox = await app_db.safety_toolbox_talks.find(
            {"user_id": current_user.user_id, "_id": {"$in": [None]}}, {"_id": 0}
        ).to_list(0)
        return {"incidents": incidents, "swms": swms, "inspections": inspections, "toolbox": toolbox}

    # ------------------------------------------------------------------
    # Risk Reviews
    # ------------------------------------------------------------------

    @risk_router.get("/risk-reviews/summary")
    async def reviews_summary(current_user=Depends(get_current_user)):
        rows = await app_db.risk_reviews.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(5000)
        now = datetime.now(timezone.utc)
        overdue = due = completed_ytd = 0
        completion_days = []
        year = now.year
        for r in rows:
            st = r.get("status")
            due_date = r.get("target_completion_date")
            if st in ("in_progress", "pending_approval", "draft"):
                try:
                    if due_date:
                        d = datetime.fromisoformat(due_date).replace(tzinfo=timezone.utc)
                        if d < now: overdue += 1
                        elif (d - now).days <= 30: due += 1
                except Exception:
                    pass
            if st == "approved" and r.get("approved_at"):
                try:
                    ad = datetime.fromisoformat(r["approved_at"]).replace(tzinfo=timezone.utc)
                    if ad.year == year:
                        completed_ytd += 1
                        sd = r.get("start_date")
                        if sd:
                            sd_dt = datetime.fromisoformat(sd).replace(tzinfo=timezone.utc)
                            completion_days.append((ad - sd_dt).days)
                except Exception:
                    pass
        avg = round(sum(completion_days) / len(completion_days), 1) if completion_days else 0
        return {"overdue": overdue, "due_this_month": due, "completed_ytd": completed_ytd, "avg_days": avg}

    @risk_router.get("/risk-reviews")
    async def list_reviews(current_user=Depends(get_current_user)):
        rows = await app_db.risk_reviews.find({"user_id": current_user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(2000)
        return rows

    @risk_router.get("/risk-reviews/{review_id}")
    async def get_review(review_id: str, current_user=Depends(get_current_user)):
        r = await app_db.risk_reviews.find_one({"review_id": review_id, "user_id": current_user.user_id}, {"_id": 0})
        if not r:
            raise HTTPException(404, "not found")
        return r

    @risk_router.post("/risk-reviews")
    async def create_review(body: dict, current_user=Depends(get_current_user)):
        if not body.get("risk_id"):
            raise HTTPException(400, "risk_id required")
        risk = await app_db.risks.find_one({"risk_id": body["risk_id"], "user_id": current_user.user_id}, {"_id": 0})
        if not risk:
            raise HTTPException(404, "risk not found")
        now = datetime.now(timezone.utc).isoformat()
        target = body.get("target_completion_date") or (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
        doc = {
            "user_id": current_user.user_id,
            "review_id": f"RR-{uuid.uuid4().hex[:8].upper()}",
            "risk_id": body["risk_id"],
            "risk_title": risk.get("title"),
            "title": body.get("title") or f"Review of {risk.get('title')} — {datetime.now().strftime('%b %Y')}",
            "reasons": body.get("reasons", []),
            "reason_detail": body.get("reason_detail", ""),
            "start_date": body.get("start_date") or now,
            "target_completion_date": target,
            "assigned_to": body.get("assigned_to") or risk.get("risk_owner"),
            "review_team": body.get("review_team", []),
            "evidence_attachments": body.get("evidence_attachments", []),
            "control_reviews": body.get("control_reviews", []),
            "observations": body.get("observations", ""),
            "risk_nature_changed": body.get("risk_nature_changed"),
            "risk_change_description": body.get("risk_change_description", ""),
            "work_changed": body.get("work_changed"),
            "updated_likelihood": body.get("updated_likelihood"),
            "updated_consequence": body.get("updated_consequence"),
            "immediate_action": body.get("immediate_action", ""),
            "new_actions": body.get("new_actions", []),
            "conclusion": body.get("conclusion"),
            "summary": body.get("summary", ""),
            "status": "in_progress",
            "submitted_at": None,
            "approved_at": None,
            "approved_by": None,
            "created_at": now,
            "updated_at": now,
        }
        await app_db.risk_reviews.insert_one({**doc})
        doc.pop("_id", None)
        return doc

    @risk_router.patch("/risk-reviews/{review_id}")
    async def update_review(review_id: str, body: dict, current_user=Depends(get_current_user)):
        body.pop("_id", None); body.pop("user_id", None); body.pop("review_id", None)
        body["updated_at"] = datetime.now(timezone.utc).isoformat()
        res = await app_db.risk_reviews.update_one(
            {"review_id": review_id, "user_id": current_user.user_id}, {"$set": body}
        )
        if res.matched_count == 0:
            raise HTTPException(404, "not found")
        r = await app_db.risk_reviews.find_one({"review_id": review_id, "user_id": current_user.user_id}, {"_id": 0})
        return r

    @risk_router.post("/risk-reviews/{review_id}/accept-remediation")
    async def accept_remediation(review_id: str, body: dict, current_user=Depends(get_current_user)):
        """Create a Toolbox Talk, SWMS Revision Task, and/or CAPA items from the
        AI-drafted remediation payload. Links everything back onto the review +
        risk record and emits a notification. Used when a Risk Review has flagged
        failing controls and the Safety Manager accepts the reverse-loop draft.

        CAPA auto-creation rule (per product spec): only on this explicit
        Accept-Remediation gate — never auto on failing-control detection.
        Body shape for CAPA: {"capa_items": [{description, action_type, assigned_to, due_date, priority, linked_control_id?}, ...]}
        """
        review = await app_db.risk_reviews.find_one(
            {"review_id": review_id, "user_id": current_user.user_id}, {"_id": 0}
        )
        if not review:
            raise HTTPException(404, "review not found")
        now = datetime.now(timezone.utc).isoformat()
        created = {}

        # 1) Toolbox Talk  → inserts into safety_toolbox_talks (generic module)
        tbt = body.get("toolbox_talk") or None
        if tbt and tbt.get("topic"):
            tbt_id = f"tbt_{uuid.uuid4().hex[:10]}"
            notes_parts = []
            if tbt.get("objective"):
                notes_parts.append(f"Objective: {tbt['objective']}")
            if tbt.get("key_points"):
                notes_parts.append("Key points:\n- " + "\n- ".join(tbt["key_points"]))
            if tbt.get("worker_questions"):
                notes_parts.append("Worker questions:\n- " + "\n- ".join(tbt["worker_questions"]))
            if tbt.get("sign_off_prompt"):
                notes_parts.append(f"Sign-off: {tbt['sign_off_prompt']}")
            scheduled = tbt.get("scheduled_at") or (
                datetime.now(timezone.utc) + timedelta(days=7)
            ).isoformat()
            tbt_doc = {
                "item_id": tbt_id,
                "user_id": current_user.user_id,
                "module": "toolbox_talks",
                "topic": tbt["topic"],
                "site": tbt.get("site", ""),
                "scheduled_at": scheduled,
                "conducted_by": tbt.get("conducted_by", ""),
                "status": "scheduled",
                "attendees_count": tbt.get("attendees_count"),
                "notes": "\n\n".join(notes_parts),
                "source": "risk_review_remediation",
                "linked_review_id": review_id,
                "linked_risk_id": review.get("risk_id"),
                "created_at": now,
                "updated_at": now,
            }
            await app_db.safety_toolbox_talks.insert_one({**tbt_doc})
            created["toolbox_talk_id"] = tbt_id
            created["toolbox_talk_topic"] = tbt["topic"]

        # 2) SWMS Revision Task → dedicated collection
        swms = body.get("swms_revision") or None
        if swms and swms.get("title"):
            swr_id = f"swr_{uuid.uuid4().hex[:10]}"
            swr_doc = {
                "swms_revision_id": swr_id,
                "user_id": current_user.user_id,
                "title": swms["title"],
                "summary": swms.get("summary", ""),
                "changes": swms.get("changes", []),
                "priority": swms.get("priority", "medium"),
                "target_swms": swms.get("target_swms", ""),
                "status": "open",
                "assigned_to": swms.get("assigned_to", review.get("assigned_to", "")),
                "due_date": swms.get("due_date") or (
                    datetime.now(timezone.utc) + timedelta(days=14)
                ).isoformat(),
                "linked_review_id": review_id,
                "linked_risk_id": review.get("risk_id"),
                "linked_risk_title": review.get("risk_title"),
                "created_at": now,
                "updated_at": now,
                "completed_at": None,
            }
            await app_db.swms_revision_tasks.insert_one({**swr_doc})
            created["swms_revision_id"] = swr_id
            created["swms_revision_title"] = swms["title"]

        # 3) CAPA items — one row per failing control the user accepted.
        capa_items_in = body.get("capa_items") or []
        capa_ids: list[str] = []
        if capa_items_in:
            from routes.capa import create_capa_internal  # local import to avoid cycle
            # Resolve account_id from the risk owner if possible, else caller.
            account_id = current_user.user_id
            try:
                user_doc = await app_db.users.find_one(
                    {"user_id": current_user.user_id}, {"_id": 0, "account_id": 1}
                ) or {}
                account_id = user_doc.get("account_id") or current_user.user_id
            except Exception:
                pass
            for item in capa_items_in:
                payload = {
                    "description": item.get("description") or "",
                    "action_type": item.get("action_type") or "corrective",
                    "assigned_to": item.get("assigned_to"),
                    "due_date": item.get("due_date"),
                    "priority": item.get("priority") or "medium",
                    "linked_entity_type": "review",
                    "linked_entity_id": review_id,
                    "linked_entity_label": review.get("risk_title") or review_id,
                    "source": "risk_review_remediation",
                }
                doc = await create_capa_internal(
                    app_db, current_user=current_user,
                    account_id=account_id, payload=payload,
                )
                capa_ids.append(doc["capa_id"])
            created["capa_ids"] = capa_ids
            created["capa_count"] = len(capa_ids)

        if not created:
            raise HTTPException(400, "Provide toolbox_talk, swms_revision, and/or capa_items payload")

        # Link onto the review
        remediation = (review.get("remediation") or {}).copy()
        remediation.update({
            "drafted_at": remediation.get("drafted_at") or now,
            "accepted_at": now,
            **created,
        })
        await app_db.risk_reviews.update_one(
            {"review_id": review_id, "user_id": current_user.user_id},
            {"$set": {"remediation": remediation, "updated_at": now}},
        )

        # Link onto the risk (audit trail so the RiskDetail page can show it)
        if review.get("risk_id"):
            risk_audit = {
                "at": now, "user_id": current_user.user_id, "user_name": current_user.name,
                "field": "remediation_created",
                "old": review_id,
                "new": _json.dumps({k: v for k, v in created.items() if k.endswith("_id")}),
            }
            await app_db.risks.update_one(
                {"risk_id": review["risk_id"], "user_id": current_user.user_id},
                {"$push": {"audit_log": risk_audit}, "$set": {"updated_at": now}},
            )

        # In-app notification
        await app_db.notifications.insert_one({
            "user_id": current_user.user_id,
            "channel": "in_app",
            "type": "risk_remediation_created",
            "title": f"Remediation drafted from review {review_id}",
            "body": (
                (f"Toolbox Talk '{created.get('toolbox_talk_topic')}' scheduled · "
                 if created.get("toolbox_talk_topic") else "")
                + (f"SWMS revision '{created.get('swms_revision_title')}' raised"
                   if created.get("swms_revision_title") else "")
            ).strip(" ·"),
            "severity": "info",
            "review_id": review_id,
            "risk_id": review.get("risk_id"),
            "created_at": now,
            "read": False,
        })

        return {"created": True, **created, "remediation": remediation}

    # ---------------- SWMS Revision Tasks (reverse loop) ----------------
    @risk_router.get("/swms-revisions")
    async def list_swms_revisions(current_user=Depends(get_current_user)):
        rows = await app_db.swms_revision_tasks.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
        return rows

    @risk_router.patch("/swms-revisions/{swms_revision_id}")
    async def update_swms_revision(swms_revision_id: str, body: dict,
                                    current_user=Depends(get_current_user)):
        body.pop("_id", None); body.pop("user_id", None); body.pop("swms_revision_id", None)
        body["updated_at"] = datetime.now(timezone.utc).isoformat()
        if body.get("status") == "completed" and not body.get("completed_at"):
            body["completed_at"] = body["updated_at"]
        res = await app_db.swms_revision_tasks.update_one(
            {"swms_revision_id": swms_revision_id, "user_id": current_user.user_id},
            {"$set": body},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "not found")
        doc = await app_db.swms_revision_tasks.find_one(
            {"swms_revision_id": swms_revision_id, "user_id": current_user.user_id}, {"_id": 0}
        )
        return doc

    @risk_router.post("/risk-reviews/{review_id}/submit")
    async def submit_review(review_id: str, current_user=Depends(get_current_user)):
        now = datetime.now(timezone.utc).isoformat()
        res = await app_db.risk_reviews.update_one(
            {"review_id": review_id, "user_id": current_user.user_id},
            {"$set": {"status": "pending_approval", "submitted_at": now, "updated_at": now}},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "not found")
        return {"submitted": True}

    @risk_router.post("/risk-reviews/{review_id}/approve")
    async def approve_review(review_id: str, body: dict = None, current_user=Depends(get_current_user)):
        body = body or {}
        decision = body.get("decision", "approve")  # approve | request_changes | reject
        now = datetime.now(timezone.utc).isoformat()
        r = await app_db.risk_reviews.find_one({"review_id": review_id, "user_id": current_user.user_id})
        if not r:
            raise HTTPException(404, "not found")
        if decision == "approve":
            # Write updated likelihood/consequence back onto the risk record
            updates = {
                "status": "approved",
                "approved_at": now,
                "approved_by": current_user.name,
                "approver_comment": body.get("comment", ""),
                "updated_at": now,
            }
            await app_db.risk_reviews.update_one({"review_id": review_id, "user_id": current_user.user_id}, {"$set": updates})
            risk = await app_db.risks.find_one({"risk_id": r["risk_id"], "user_id": current_user.user_id})
            if risk:
                ul = r.get("updated_likelihood") or risk.get("residual_likelihood")
                uc = r.get("updated_consequence") or risk.get("residual_consequence")
                freq_days = _parse_review_days(risk.get("review_frequency"))
                next_review = (datetime.now(timezone.utc) + timedelta(days=freq_days)).isoformat()
                rmerged = {
                    **risk,
                    "residual_likelihood": ul,
                    "residual_consequence": uc,
                    "last_reviewed_at": now,
                    "next_review_date": next_review,
                    "updated_at": now,
                }
                rmerged = _compute_levels(rmerged)
                rmerged.setdefault("audit_log", []).append({
                    "at": now, "user_id": current_user.user_id, "user_name": current_user.name,
                    "field": "review_approved", "old": review_id, "new": "approved",
                })
                rmerged.pop("_id", None)
                await app_db.risks.update_one(
                    {"risk_id": r["risk_id"], "user_id": current_user.user_id}, {"$set": rmerged}
                )
            return {"approved": True}
        elif decision == "request_changes":
            await app_db.risk_reviews.update_one(
                {"review_id": review_id, "user_id": current_user.user_id},
                {"$set": {"status": "in_progress", "approver_comment": body.get("comment", ""), "updated_at": now}},
            )
            return {"changes_requested": True}
        else:  # reject
            await app_db.risk_reviews.update_one(
                {"review_id": review_id, "user_id": current_user.user_id},
                {"$set": {"status": "rejected", "approver_comment": body.get("comment", ""), "updated_at": now}},
            )
            return {"rejected": True}

    # ------------------------------------------------------------------
    # AI helpers
    # ------------------------------------------------------------------

    async def _call_claude(system: str, prompt: str, fallback: dict, llm_chat_cls, user_message_cls, llm_key: str):
        try:
            chat = llm_chat_cls(
                api_key=llm_key,
                session_id=f"risk_{uuid.uuid4().hex[:8]}",
                system_message=system,
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")

            def _run():
                return asyncio.run(chat.send_message(user_message_cls(text=prompt)))

            raw = await asyncio.wait_for(asyncio.to_thread(_run), timeout=45.0)
            try:
                return _json.loads(raw)
            except Exception:
                m = _re.search(r"\{[\s\S]*\}", raw or "")
                if m:
                    return _json.loads(m.group(0))
                raise
        except Exception:
            return {**fallback, "fallback": True}

    def register_ai_routes(llm_chat_cls, user_message_cls, llm_key: str):

        @risk_router.post("/risks/ai/suggest")
        async def ai_suggest_risks(body: dict, current_user=Depends(get_current_user)):
            """Given {process_name, activity_name, trade_type?}, return a list of common risks."""
            fallback = {"risks": [
                {"title": "Electrocution from contact with live conductors", "hazard_category": "Electrical",
                 "likelihood": 3, "consequence": 5,
                 "description": "Workers exposed to energised parts during installation or termination work."},
                {"title": "Fall from height during installation", "hazard_category": "Height / Fall",
                 "likelihood": 3, "consequence": 4, "description": "Work at elevation without adequate fall protection."},
                {"title": "Manual handling injury from heavy components", "hazard_category": "Physical / Ergonomic",
                 "likelihood": 3, "consequence": 2, "description": "Strain injuries from lifting, carrying, awkward postures."},
            ]}
            sys = ("You are a senior Australian WHS risk assessor. Return practical, trade-specific risks aligned to "
                   "the WHS Act/Regulations. Keep titles short and specific.")
            prompt = (
                f"Process: {body.get('process_name')}\nActivity: {body.get('activity_name')}\n"
                f"Trade: {body.get('trade_type', 'General')}\n\n"
                "Return JSON: {risks: [{title, hazard_category, likelihood (1-5), consequence (1-5), description}]}. "
                "Provide 4-6 risks. No prose outside JSON."
            )
            res = await _call_claude(sys, prompt, fallback, llm_chat_cls, user_message_cls, llm_key)
            return res

        @risk_router.post("/risks/ai/suggest-controls")
        async def ai_suggest_controls(body: dict, current_user=Depends(get_current_user)):
            """Given {hazard_description, activity_name?, trade_type?}, return controls spanning the hierarchy."""
            fallback = {"controls": [
                {"name": "De-energise and lock out before work", "hierarchy_level": "elimination",
                 "description": "Apply LOTO, test for dead before touch.", "effectiveness": "high"},
                {"name": "Install physical barriers around live panels", "hierarchy_level": "isolation",
                 "description": "Hard barriers prevent inadvertent contact.", "effectiveness": "high"},
                {"name": "Use RCD-protected circuits", "hierarchy_level": "engineering",
                 "description": "30mA RCD on all final sub-circuits.", "effectiveness": "high"},
                {"name": "Permit-to-work for live electrical work", "hierarchy_level": "administrative",
                 "description": "Authorised-only under written permit.", "effectiveness": "medium"},
                {"name": "Class-1 insulated gloves", "hierarchy_level": "ppe",
                 "description": "AS/NZS 2225 tested gloves.", "effectiveness": "medium"},
            ]}
            sys = ("You are a senior Australian WHS controls specialist. Return controls across the full hierarchy "
                   "(elimination, substitution, isolation, engineering, administrative, ppe). Favour higher-level controls.")
            prompt = (
                f"Hazard: {body.get('hazard_description')}\n"
                f"Activity: {body.get('activity_name', 'N/A')}\nTrade: {body.get('trade_type', 'General')}\n\n"
                "Return JSON: {controls: [{name, hierarchy_level (one of elimination|substitution|isolation|engineering|administrative|ppe), description, effectiveness (high|medium|low)}]}. "
                "Provide 4-8 controls with variety across levels. No prose outside JSON."
            )
            res = await _call_claude(sys, prompt, fallback, llm_chat_cls, user_message_cls, llm_key)
            return res

        @risk_router.post("/risk-reviews/ai/evidence")
        async def ai_evidence_summary(body: dict, current_user=Depends(get_current_user)):
            """Summarise evidence across incidents / inspections / SWMS / toolbox for a given risk."""
            risk_id = body.get("risk_id")
            if not risk_id:
                raise HTTPException(400, "risk_id required")
            risk = await app_db.risks.find_one({"risk_id": risk_id, "user_id": current_user.user_id}, {"_id": 0})
            if not risk:
                raise HTTPException(404, "risk not found")
            linked_incidents = await app_db.incidents.find(
                {"user_id": current_user.user_id, "incident_id": {"$in": risk.get("linked_incident_ids", [])}}, {"_id": 0}
            ).to_list(50)
            payload = {
                "risk_title": risk.get("title"),
                "activity": risk.get("activity_name"),
                "incidents_count": len(linked_incidents),
                "controls_count": len(risk.get("controls", [])),
                "last_reviewed_at": risk.get("last_reviewed_at"),
            }
            fallback = {
                "summary": (f"This risk has {payload['incidents_count']} linked incidents and "
                            f"{payload['controls_count']} controls. Review each control's real-world effectiveness, "
                            "close out any failed inspection findings, and confirm workers performing the activity "
                            "have completed the latest toolbox talk. If incidents have recurred, consider escalating "
                            "to higher-level controls (elimination/substitution/engineering)."),
                "points": [
                    f"{payload['incidents_count']} incident(s) linked since creation",
                    f"{payload['controls_count']} controls currently in place",
                    "Verify control implementation on-site before concluding review",
                ],
            }
            sys = "You are a WHS review facilitator. Summarise evidence clearly for a risk review."
            prompt = (
                f"Risk: {payload['risk_title']}\nActivity: {payload['activity']}\n"
                f"Linked incidents: {payload['incidents_count']} · Controls: {payload['controls_count']}\n"
                f"Last reviewed: {payload['last_reviewed_at'] or 'never'}\n\n"
                "Return JSON: {summary: string, points: [3-5 bullet points the reviewer should consider]}. "
                "No prose outside JSON."
            )
            res = await _call_claude(sys, prompt, fallback, llm_chat_cls, user_message_cls, llm_key)
            return res

        @risk_router.post("/risk-reviews/ai/review-summary")
        async def ai_review_summary(body: dict, current_user=Depends(get_current_user)):
            """Given review payload, produce the final human-readable summary paragraph."""
            fallback = {"summary": (
                "This review was conducted on schedule. Evidence across linked incidents, inspections and training "
                "records was considered. Existing controls remain in place and no material change to the risk "
                "profile was identified. Minor improvements to documentation and refresher toolbox briefings are "
                "recommended. Residual risk remains within acceptable tolerance."
            )}
            sys = "You are a WHS review writer. Produce a plain-English, specific summary in 4-6 sentences."
            prompt = (
                f"Review data: {_json.dumps(body)[:4000]}\n\n"
                "Return JSON: {summary: string (4-6 sentences)}. No prose outside JSON."
            )
            res = await _call_claude(sys, prompt, fallback, llm_chat_cls, user_message_cls, llm_key)
            return res

        @risk_router.post("/risk-reviews/{review_id}/ai/draft-remediation")
        async def ai_draft_remediation(review_id: str, current_user=Depends(get_current_user)):
            """Given a risk review, identify failing controls and AI-draft a
            Toolbox Talk + SWMS Revision Task so the learning flows from the
            risk register back to the workers on the ground."""
            review = await app_db.risk_reviews.find_one(
                {"review_id": review_id, "user_id": current_user.user_id}, {"_id": 0}
            )
            if not review:
                raise HTTPException(404, "review not found")
            failing = _failing_controls(review)
            risk = await app_db.risks.find_one(
                {"risk_id": review.get("risk_id"), "user_id": current_user.user_id}, {"_id": 0}
            ) or {}

            fallback_topic = f"Review of failing controls — {risk.get('title') or review.get('risk_title') or 'Risk review'}"
            fallback_points = [
                (f"Control '{c.get('name')}' rated as {c.get('effectiveness') or 'needs review'}. "
                 f"{c.get('evidence_text') or 'Re-brief workers on correct application.'}")
                for c in (failing or [])[:6]
            ] or [
                "Review current controls and reinforce correct use on site.",
                "Invite worker feedback on barriers to correct application.",
            ]
            fallback = {
                "failing_controls": failing,
                "toolbox_talk": {
                    "topic": fallback_topic[:80],
                    "duration_mins": 10,
                    "objective": f"Reinforce effective application of controls for '{risk.get('title') or 'this risk'}'.",
                    "key_points": fallback_points,
                    "worker_questions": [
                        "Which controls do you find hardest to apply consistently?",
                        "Have you encountered any situations where the control didn't work?",
                        "What would help you apply this control reliably?",
                    ],
                    "sign_off_prompt": "Confirm attendees understand revised controls and their application.",
                },
                "swms_revision": {
                    "title": f"Revise SWMS for {risk.get('title') or review.get('risk_title') or 'failing risk controls'}",
                    "summary": "Update SWMS hazard + controls sections to reflect findings from the risk review.",
                    "changes": [
                        f"Update control '{c.get('name')}' based on observed effectiveness ({c.get('effectiveness')})."
                        for c in (failing or [])[:6]
                    ] or ["Re-examine control set against recent site evidence."],
                    "priority": "high" if any(c.get("effectiveness") == "not" for c in failing) else "medium",
                    "target_swms": "",
                },
                "fallback": True,
            }

            if not failing:
                # Nothing failing; return safe default w/ informational flag so UI can skip
                return {**fallback, "no_failing": True}

            sys = (
                "You are a senior WHS safety trainer for Australian tradie businesses. "
                "Your job is to translate a risk review's failing controls into (1) a punchy "
                "pre-start Toolbox Talk workers will actually engage with, and (2) a SWMS "
                "revision task list that a supervisor can action the same week. Keep the "
                "language direct, plain-English, and action-oriented."
            )
            payload = {
                "risk_title": risk.get("title") or review.get("risk_title"),
                "primary_hazard": risk.get("primary_hazard"),
                "activity": risk.get("activity_name"),
                "residual_score": risk.get("residual_score"),
                "review_observations": review.get("observations"),
                "review_summary": review.get("summary"),
                "failing_controls": [{
                    "name": c.get("name"),
                    "hierarchy_level": c.get("hierarchy_level"),
                    "effectiveness": c.get("effectiveness"),
                    "still_in_place": c.get("still_in_place"),
                    "recommended_change": c.get("recommended_change"),
                    "evidence": c.get("evidence_text"),
                } for c in failing],
            }
            prompt = (
                f"Review data: {_json.dumps(payload)[:4000]}\n\n"
                "Return JSON: {\n"
                "  toolbox_talk: {topic (<=80 chars), duration_mins (5-15), objective "
                "(one sentence), key_points: [5-7 short bullets referencing specific failing "
                "controls], worker_questions: [3 open questions], sign_off_prompt (one sentence)},\n"
                "  swms_revision: {title (<=80 chars), summary (one short paragraph), "
                "changes: [4-7 concrete edits to make to the SWMS], priority (low|medium|high), "
                "target_swms (activity name if inferable else empty string)}\n"
                "}. No prose outside JSON."
            )
            res = await _call_claude(sys, prompt, fallback, llm_chat_cls, user_message_cls, llm_key)
            res["failing_controls"] = failing
            return res

        @risk_router.post("/risks/ai/from-incident")
        async def ai_risk_from_incident(body: dict, current_user=Depends(get_current_user)):
            """Given an incident_id, propose a draft risk record the user can accept into their register."""
            incident_id = body.get("incident_id")
            if not incident_id:
                raise HTTPException(400, "incident_id required")
            inc = await app_db.incidents.find_one(
                {"incident_id": incident_id, "user_id": current_user.user_id}, {"_id": 0}
            )
            if not inc:
                raise HTTPException(404, "incident not found")
            fallback = {
                "title": f"Risk derived from {inc.get('title')}",
                "hazard_category": "Other",
                "description": f"Auto-drafted from incident {incident_id}. Review before saving.",
                "likelihood": 3,
                "consequence": max(2, min(5, {"near_miss": 2, "minor": 2, "moderate": 3, "serious": 4, "critical": 5}.get(inc.get("severity"), 3))),
                "suggested_controls": [],
            }
            sys = "You are a WHS analyst drafting a risk register entry from an incident."
            prompt = (
                f"Incident title: {inc.get('title')}\nIncident description: {inc.get('description','')}\n"
                f"Severity: {inc.get('severity')}\nSite: {inc.get('site','')}\n\n"
                "Return JSON: {title, hazard_category, description, likelihood (1-5), consequence (1-5), "
                "suggested_controls: [{name, hierarchy_level, description}]}. No prose outside JSON."
            )
            res = await _call_claude(sys, prompt, fallback, llm_chat_cls, user_message_cls, llm_key)
            return res

        @risk_router.get("/risks/ai/intelligence")
        async def ai_risk_intelligence(current_user=Depends(get_current_user)):
            """Derived insights used on the Risk Register dashboard — fast, non-LLM."""
            risks = await app_db.risks.find(
                {"user_id": current_user.user_id, "status": {"$ne": "archived"}}, {"_id": 0}
            ).to_list(2000)
            incidents = await app_db.incidents.find(
                {"user_id": current_user.user_id}, {"_id": 0}
            ).sort("created_at", -1).to_list(1000)

            # incidents per activity in last 90 days
            cutoff = datetime.now(timezone.utc) - timedelta(days=90)
            per_activity: dict[str, int] = {}
            for i in incidents:
                try:
                    c = datetime.fromisoformat(i.get("created_at","")).replace(tzinfo=timezone.utc)
                    if c >= cutoff:
                        key = (i.get("activity") or i.get("incident_type") or "Unclassified").lower()
                        per_activity[key] = per_activity.get(key, 0) + 1
                except Exception:
                    pass

            # risks with increasing incident rate: risks whose activity_name matches a high-incident key
            trending = []
            for r in risks:
                key = (r.get("activity_name") or "").lower()
                if key and per_activity.get(key, 0) >= 2:
                    trending.append({"risk_id": r["risk_id"], "title": r.get("title"),
                                     "incident_count_90d": per_activity[key]})

            # controls flagged not effective
            control_flags: dict[str, int] = {}
            for r in risks:
                for c in r.get("controls") or []:
                    if (c.get("effectiveness") == "low") or (c.get("status") == "not_effective"):
                        control_flags[c.get("name", "unnamed")] = control_flags.get(c.get("name", "unnamed"), 0) + 1
            not_effective = [{"control": k, "risks_flagged": v} for k, v in sorted(
                control_flags.items(), key=lambda kv: kv[1], reverse=True
            )[:5]]

            # activities with incidents but no risk
            risk_activities = {(r.get("activity_name") or "").lower() for r in risks}
            gap_activities = []
            for key, count in per_activity.items():
                if key not in risk_activities and key != "unclassified":
                    gap_activities.append({"activity": key, "incident_count_90d": count})
            gap_activities = sorted(gap_activities, key=lambda x: x["incident_count_90d"], reverse=True)[:5]

            # overdue with recent activity
            now = datetime.now(timezone.utc)
            overdue_with_activity = []
            for r in risks:
                nr = r.get("next_review_date")
                if not nr: continue
                try:
                    d = datetime.fromisoformat(nr).replace(tzinfo=timezone.utc)
                    if d < now:
                        key = (r.get("activity_name") or "").lower()
                        if per_activity.get(key, 0) > 0:
                            overdue_with_activity.append({"risk_id": r["risk_id"], "title": r.get("title"),
                                                          "days_overdue": (now - d).days})
                except Exception:
                    pass

            # simple anon benchmarking
            high_ext = sum(1 for r in risks if r.get("residual_level") in ("high", "extreme"))
            benchmarks = {"your_high_or_extreme": high_ext, "peer_typical": max(2, len(risks) // 4),
                          "signal": "elevated" if high_ext > max(2, len(risks) // 4) else "typical"}

            return {
                "trending": trending[:5],
                "not_effective": not_effective,
                "gap_activities": gap_activities,
                "overdue_with_activity": overdue_with_activity[:5],
                "benchmarks": benchmarks,
            }

    return risk_router, register_ai_routes, HRCW_CATEGORIES
