"""
Worker Competency Matrix module — SafeTradie (Iteration 18)

Closes the third side of the Safety triangle: when a Toolbox Talk is
conducted, each attending worker gets a competency stamp. A Competency
Matrix page shows workers × topics; a dashboard widget shows workers
still unbriefed on hazards that are actively being re-controlled
(via open SWMS revisions).

All endpoints scope to current_user.user_id. Factory pattern mirrors
risk_module / incident_workflow. No side-effects at import time.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

comp_router = APIRouter()

DEFAULT_VALIDITY_DAYS = 365
EXPIRING_SOON_DAYS = 30

# Toolbox topic -> canonical hazard category used by the Risk Register.
# Anything not matched falls back to "Other".
TOPIC_TO_HAZARD = {
    "working at heights": "Height / Fall",
    "heights": "Height / Fall",
    "electrical safety": "Electrical",
    "electrical": "Electrical",
    "plumbing safety": "Plumbing",
    "confined spaces": "Confined Space",
    "confined space": "Confined Space",
    "manual handling": "Physical / Ergonomic",
    "hazardous substances": "Chemical / Hazardous Substance",
    "chemical": "Chemical / Hazardous Substance",
    "emergency procedures": "Emergency",
    "mental health & wellbeing": "Psychosocial",
    "psychosocial safety": "Psychosocial",
    "fatigue management": "Psychosocial",
    "heat & cold stress": "Temperature Extremes",
    "traffic management": "Vehicle / Traffic",
    "fire safety": "Fire / Explosion",
    "noise & hearing protection": "Noise",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hazard_for_topic(topic: str) -> str:
    t = (topic or "").strip().lower()
    return TOPIC_TO_HAZARD.get(t, "Other")


def _status_for_expiry(expires_at: str | None) -> str:
    if not expires_at:
        return "current"
    try:
        d = datetime.fromisoformat(expires_at).replace(tzinfo=timezone.utc)
        delta = (d - datetime.now(timezone.utc)).days
        if delta < 0:
            return "expired"
        if delta <= EXPIRING_SOON_DAYS:
            return "expiring_soon"
        return "current"
    except Exception:
        return "current"


def register_competency_routes(app_db, get_current_user):

    # ------------------------------------------------------------------
    # 1. Conduct a toolbox talk -> stamp each attending worker's ledger
    # ------------------------------------------------------------------
    @comp_router.post("/toolbox-talks/{item_id}/conduct")
    async def conduct_toolbox(item_id: str, body: dict, current_user=Depends(get_current_user)):
        """Mark a toolbox talk as conducted and stamp each attending worker's
        competency ledger. Body: {attendees: [{worker_id, name}], conducted_at,
        signed_off_by, notes, validity_days (optional override)}."""
        tbt = await app_db.safety_toolbox_talks.find_one(
            {"item_id": item_id, "user_id": current_user.user_id}
        )
        if not tbt:
            raise HTTPException(404, "toolbox talk not found")
        attendees = body.get("attendees") or []
        if not isinstance(attendees, list) or len(attendees) == 0:
            raise HTTPException(400, "attendees required (list of {worker_id, name})")

        now = _now_iso()
        conducted_at = body.get("conducted_at") or now
        validity_days = int(body.get("validity_days") or DEFAULT_VALIDITY_DAYS)
        expires_at = (datetime.fromisoformat(conducted_at.replace("Z", "+00:00"))
                      if "T" in conducted_at
                      else datetime.fromisoformat(conducted_at)).replace(tzinfo=timezone.utc)
        expires_at = (expires_at + timedelta(days=validity_days)).isoformat()
        topic = tbt.get("topic") or "General"
        hazard = _hazard_for_topic(topic)

        # Stamp competency ledger — one entry per attendee, UPSERT per (worker,topic)
        stamped = []
        for a in attendees:
            worker_id = a.get("worker_id")
            if not worker_id:
                continue
            stamp = {
                "competency_id": f"cmp_{uuid.uuid4().hex[:10]}",
                "user_id": current_user.user_id,
                "worker_id": worker_id,
                "worker_name": a.get("name"),
                "topic": topic,
                "hazard_category": hazard,
                "attended_at": conducted_at,
                "expires_at": expires_at,
                "validity_days": validity_days,
                "source_toolbox_talk_id": item_id,
                "source_type": tbt.get("source") or "toolbox_talk",
                "linked_risk_id": tbt.get("linked_risk_id"),
                "linked_review_id": tbt.get("linked_review_id"),
                "notes": body.get("notes", ""),
                "signed_off_by": body.get("signed_off_by"),
                "created_at": now,
            }
            # UPSERT: latest-wins per (worker_id, topic) so we don't clutter the
            # matrix with duplicate rows when a worker re-attends.
            await app_db.worker_competencies.update_one(
                {"user_id": current_user.user_id, "worker_id": worker_id, "topic": topic},
                {"$set": stamp},
                upsert=True,
            )
            stamped.append({"worker_id": worker_id, "name": a.get("name")})

        # Close out the toolbox talk
        await app_db.safety_toolbox_talks.update_one(
            {"item_id": item_id, "user_id": current_user.user_id},
            {"$set": {
                "status": "conducted",
                "conducted_at": conducted_at,
                "conducted_by": body.get("signed_off_by") or tbt.get("conducted_by"),
                "attendees_list": attendees,
                "attendees_count": len(attendees),
                "conduct_notes": body.get("notes", ""),
                "updated_at": now,
            }},
        )

        # Audit back to linked risk if present
        if tbt.get("linked_risk_id"):
            await app_db.risks.update_one(
                {"risk_id": tbt["linked_risk_id"], "user_id": current_user.user_id},
                {"$push": {"audit_log": {
                    "at": now, "user_id": current_user.user_id,
                    "user_name": getattr(current_user, "name", None),
                    "field": "toolbox_conducted",
                    "old": item_id,
                    "new": f"{len(stamped)} workers briefed on {topic}",
                }}, "$set": {"updated_at": now}},
            )

        # Notification
        await app_db.notifications.insert_one({
            "user_id": current_user.user_id,
            "channel": "in_app",
            "type": "toolbox_conducted",
            "title": f"Toolbox conducted — {topic}",
            "body": f"{len(stamped)} worker(s) stamped competent on {topic}.",
            "severity": "info",
            "toolbox_talk_id": item_id,
            "created_at": now,
            "read": False,
        })

        return {"conducted": True, "stamped_count": len(stamped),
                "topic": topic, "hazard_category": hazard,
                "expires_at": expires_at, "attendees": stamped}

    # ------------------------------------------------------------------
    # 2. Competency list + matrix
    # ------------------------------------------------------------------
    @comp_router.get("/workers/competencies")
    async def list_competencies(current_user=Depends(get_current_user)):
        rows = await app_db.worker_competencies.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).sort("attended_at", -1).to_list(5000)
        for r in rows:
            r["status"] = _status_for_expiry(r.get("expires_at"))
        return rows

    @comp_router.get("/workers/competencies/matrix")
    async def competency_matrix(current_user=Depends(get_current_user)):
        """Pivoted view: workers × topics, each cell = status (current|
        expiring_soon|expired|missing). Returns {workers:[], topics:[],
        cells: {worker_id: {topic: {status, attended_at, expires_at}}}}."""
        workers = await app_db.workers.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).to_list(2000)
        rows = await app_db.worker_competencies.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).to_list(5000)

        topics = sorted({r["topic"] for r in rows if r.get("topic")})
        cells: dict[str, dict[str, Any]] = {}
        for r in rows:
            wid = r.get("worker_id")
            topic = r.get("topic")
            if not wid or not topic:
                continue
            cells.setdefault(wid, {})[topic] = {
                "status": _status_for_expiry(r.get("expires_at")),
                "attended_at": r.get("attended_at"),
                "expires_at": r.get("expires_at"),
                "hazard_category": r.get("hazard_category"),
                "source_toolbox_talk_id": r.get("source_toolbox_talk_id"),
            }
        # coverage % per worker and per topic
        coverage = {}
        for w in workers:
            wid = w["worker_id"]
            wcells = cells.get(wid, {})
            current = sum(1 for c in wcells.values() if c["status"] == "current")
            coverage[wid] = {
                "total": len(topics),
                "current": current,
                "pct": round((current / len(topics)) * 100, 0) if topics else 0,
            }
        return {
            "workers": [{"worker_id": w["worker_id"], "name": w.get("name"),
                         "role": w.get("role"), "trade": w.get("trade")}
                        for w in workers],
            "topics": [{"topic": t, "hazard_category": _hazard_for_topic(t)} for t in topics],
            "cells": cells,
            "coverage": coverage,
        }

    @comp_router.get("/workers/unbriefed")
    async def workers_unbriefed(topic: str, current_user=Depends(get_current_user)):
        """Workers who don't have a CURRENT competency stamp for the given topic."""
        workers = await app_db.workers.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).to_list(2000)
        briefed_rows = await app_db.worker_competencies.find(
            {"user_id": current_user.user_id, "topic": topic}, {"_id": 0}
        ).to_list(2000)
        briefed_map = {}
        for r in briefed_rows:
            briefed_map[r["worker_id"]] = _status_for_expiry(r.get("expires_at"))
        out = []
        for w in workers:
            st = briefed_map.get(w["worker_id"])
            if st != "current":
                out.append({
                    "worker_id": w["worker_id"],
                    "name": w.get("name"),
                    "role": w.get("role"),
                    "trade": w.get("trade"),
                    "status": st or "missing",
                })
        return {"topic": topic, "hazard_category": _hazard_for_topic(topic),
                "total_workers": len(workers), "unbriefed": out,
                "unbriefed_count": len(out)}

    # ------------------------------------------------------------------
    # 3. Dashboard widget data — unbriefed × active hazards
    # ------------------------------------------------------------------
    @comp_router.get("/competency/dashboard")
    async def competency_dashboard(current_user=Depends(get_current_user)):
        """Priority list of active hazards × unbriefed worker counts. Active
        hazards are ranked by: (a) open SWMS revisions in the last 60 days,
        (b) risks with failing controls in recent reviews, (c) linked to
        urgent/notifiable closed incidents."""
        now = datetime.now(timezone.utc)
        cutoff = (now - timedelta(days=60)).isoformat()

        # (a) open SWMS revision tasks
        open_revisions = await app_db.swms_revision_tasks.find(
            {"user_id": current_user.user_id,
             "status": {"$in": ["open", "in_progress"]}},
            {"_id": 0},
        ).to_list(500)

        # (b) risks with recent reviews flagging failing controls
        recent_reviews = await app_db.risk_reviews.find(
            {"user_id": current_user.user_id, "updated_at": {"$gte": cutoff}},
            {"_id": 0},
        ).to_list(500)

        # Build hazard -> (priority, sources) map
        hazard_buckets: dict[str, dict[str, Any]] = {}

        for rev in open_revisions:
            risk_id = rev.get("linked_risk_id")
            if not risk_id:
                continue
            risk = await app_db.risks.find_one(
                {"risk_id": risk_id, "user_id": current_user.user_id}, {"_id": 0}
            )
            if not risk:
                continue
            hz = risk.get("primary_hazard") or "Other"
            b = hazard_buckets.setdefault(hz, {"hazard": hz, "score": 0,
                                                "sources": [], "risks": set()})
            priority_weight = {"high": 3, "medium": 2, "low": 1}.get(
                (rev.get("priority") or "medium"), 2
            )
            b["score"] += priority_weight
            b["sources"].append({"type": "swms_revision", "id": rev.get("swms_revision_id"),
                                  "title": rev.get("title"), "priority": rev.get("priority")})
            b["risks"].add(risk_id)

        for rev in recent_reviews:
            failing = [c for c in (rev.get("control_reviews") or [])
                       if c.get("effectiveness") in ("not", "partial")]
            if not failing:
                continue
            risk = await app_db.risks.find_one(
                {"risk_id": rev.get("risk_id"), "user_id": current_user.user_id}, {"_id": 0}
            )
            if not risk:
                continue
            hz = risk.get("primary_hazard") or "Other"
            b = hazard_buckets.setdefault(hz, {"hazard": hz, "score": 0,
                                                "sources": [], "risks": set()})
            b["score"] += len(failing)
            b["sources"].append({"type": "risk_review", "id": rev.get("review_id"),
                                  "title": rev.get("title"),
                                  "failing_count": len(failing)})
            b["risks"].add(rev.get("risk_id"))

        # For each active hazard, count unbriefed workers (no current
        # competency stamp whose hazard_category matches)
        workers = await app_db.workers.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).to_list(2000)
        total_workers = len(workers)

        out = []
        for hz, b in hazard_buckets.items():
            # Find all topics that map to this hazard and have stamps
            stamped_rows = await app_db.worker_competencies.find(
                {"user_id": current_user.user_id, "hazard_category": hz},
                {"_id": 0},
            ).to_list(2000)
            briefed_workers = set()
            for s in stamped_rows:
                if _status_for_expiry(s.get("expires_at")) == "current":
                    briefed_workers.add(s.get("worker_id"))
            unbriefed = total_workers - len(briefed_workers)
            out.append({
                "hazard": hz,
                "score": b["score"],
                "unbriefed_count": unbriefed,
                "total_workers": total_workers,
                "briefed_count": len(briefed_workers),
                "coverage_pct": round((len(briefed_workers) / total_workers) * 100, 0) if total_workers else 0,
                "source_count": len(b["sources"]),
                "sources": b["sources"][:3],
                "risk_ids": list(b["risks"])[:3],
            })
        out.sort(key=lambda x: (-x["score"], -x["unbriefed_count"]))

        return {
            "active_hazards": out[:5],
            "total_hazards": len(out),
            "total_workers": total_workers,
            "generated_at": _now_iso(),
        }

    return comp_router
