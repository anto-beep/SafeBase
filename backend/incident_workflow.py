"""
Incident Workflow Module — SafeTradie

5-stage lifecycle: Reported → Triage → Investigation → Actions → Closed.

SLAs are stored alongside the incident so they remain stable even if the
benchmark changes later. Notifiability detection runs both on explicit flags
set during Triage and on a keyword heuristic over the description supplied at
Submission time (so urgent bells fire immediately).
"""
from __future__ import annotations

import asyncio
import json as _json
import re as _re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

inc_router = APIRouter()

STAGES = ["reported", "triage", "investigation", "actions", "closed"]
STAGE_SLAS = {
    "reported": 24 * 3600,           # -> triage within 24h
    "triage": 48 * 3600,             # -> investigation within 48h
    "investigation": 7 * 24 * 3600,  # -> actions within 7d
    "actions": 30 * 24 * 3600,       # -> closed within 30d
}

URGENT_KEYWORDS = [
    "death", "died", "fatal", "fatality",
    "electric shock", "electrocution",
    "fall from height", "fell from", "fall from",
    "hospital", "hospitalised", "hospitalization", "hospitalized",
    "unconscious", "passed out",
    "amputation", "amputated",
    "serious injury", "serious burn", "serious head",
    "spinal", "broken neck", "broken back",
]

REGULATOR_BY_STATE = {
    "NSW": {"name": "SafeWork NSW", "phone": "131050"},
    "VIC": {"name": "WorkSafe Victoria", "phone": "132360"},
    "QLD": {"name": "Workplace Health and Safety QLD", "phone": "1300362128"},
    "WA":  {"name": "WorkSafe WA", "phone": "1300307877"},
    "SA":  {"name": "SafeWork SA", "phone": "1300365255"},
    "TAS": {"name": "WorkSafe Tasmania", "phone": "1300366322"},
    "NT":  {"name": "NT WorkSafe", "phone": "1800019115"},
    "ACT": {"name": "WorkSafe ACT", "phone": "0262073000"},
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _detect_urgent(text: str) -> list[str]:
    t = (text or "").lower()
    return [k for k in URGENT_KEYWORDS if k in t]


def _compute_lifecycle(doc: dict) -> dict:
    """Adds lifecycle metadata used by the UI tracker. Pure function."""
    stages_done = doc.get("stages_done") or []
    current = doc.get("stage") or "reported"
    timestamps = doc.get("stage_timestamps") or {}
    # Days between consecutive stages and total elapsed
    nodes = []
    prev_ts = None
    now = datetime.now(timezone.utc)
    for s in STAGES:
        ts = timestamps.get(s)
        node = {"stage": s, "ts": ts, "status": "future"}
        if s in stages_done and s != current:
            node["status"] = "done"
        if s == current:
            node["status"] = "current"
        if ts and prev_ts:
            try:
                dt1 = datetime.fromisoformat(prev_ts).replace(tzinfo=timezone.utc)
                dt2 = datetime.fromisoformat(ts).replace(tzinfo=timezone.utc)
                node["days_from_prev"] = max(0, round((dt2 - dt1).total_seconds() / 86400, 1))
            except Exception:
                node["days_from_prev"] = None
        if ts:
            prev_ts = ts
        nodes.append(node)
    # SLA overdue for current stage
    overdue = False
    sla_seconds = STAGE_SLAS.get(current)
    current_ts = timestamps.get(current) or doc.get("created_at")
    if current != "closed" and current_ts and sla_seconds:
        try:
            start = datetime.fromisoformat(current_ts).replace(tzinfo=timezone.utc)
            if (now - start).total_seconds() > sla_seconds:
                overdue = True
        except Exception:
            pass
    # total elapsed
    try:
        start = datetime.fromisoformat(doc.get("created_at")).replace(tzinfo=timezone.utc)
        end_ts = timestamps.get("closed") or _now_iso()
        end = datetime.fromisoformat(end_ts).replace(tzinfo=timezone.utc)
        total_days = max(0, round((end - start).total_seconds() / 86400, 1))
    except Exception:
        total_days = None
    doc["lifecycle"] = {"nodes": nodes, "current": current, "overdue": overdue, "total_days": total_days}
    return doc


def _next_incident_ref(user_id: str, db) -> str:
    # Uses a per-user counter doc. Year-prefixed for readability.
    async def _inner():
        year = datetime.now(timezone.utc).year
        res = await db.incident_counters.find_one_and_update(
            {"user_id": user_id, "year": year},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        seq = (res or {}).get("seq") or 1
        return f"INC-{year}-{seq:04d}"
    return _inner


def _audit_entry(user, field, old, new):
    return {
        "at": _now_iso(),
        "user_id": user.user_id,
        "user_name": getattr(user, "name", None),
        "field": field,
        "old": str(old)[:300] if old is not None else None,
        "new": str(new)[:300] if new is not None else None,
    }


async def _notify(db, user_id: str, payload: dict):
    """Log an in-app notification. Hooks for real SMS/email dispatch are in
    place in other modules; this module records the event so dashboards and
    the Communications tab on the incident detail page can render them."""
    await db.notifications.insert_one({
        "user_id": user_id,
        "channel": payload.get("channel", "in_app"),
        "type": payload.get("type"),
        "title": payload.get("title"),
        "body": payload.get("body"),
        "severity": payload.get("severity", "info"),
        "incident_id": payload.get("incident_id"),
        "created_at": _now_iso(),
        "read": False,
    })


def register_incident_workflow(app_db, get_current_user):
    """Mount the module onto the app's DB + auth dependency. Returns the
    router ready to include under /api and an AI-route registrar."""

    nxt = _next_incident_ref(None, app_db)  # curry later via closure

    # ---------------------- REGISTER & STATS ----------------------

    @inc_router.get("/incident-workflow/stats")
    async def incident_stats(current_user=Depends(get_current_user)):
        rows = await app_db.incident_workflow.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).to_list(5000)
        year = datetime.now(timezone.utc).year
        kinds = {"near_miss": 0, "first_aid": 0, "medical_treatment": 0, "lost_time": 0, "other": 0}
        notifiable = 0
        total_ytd = 0
        close_days = []
        open_over_30 = 0
        now = datetime.now(timezone.utc)
        for r in rows:
            try:
                created = datetime.fromisoformat(r.get("created_at", "")).replace(tzinfo=timezone.utc)
                if created.year == year:
                    total_ytd += 1
            except Exception:
                pass
            if r.get("notifiable"):
                notifiable += 1
            t = (r.get("incident_type") or "").lower()
            if t in ("near_miss", "near miss"): kinds["near_miss"] += 1
            elif t == "first_aid_injury": kinds["first_aid"] += 1
            elif t == "medical_treatment_injury": kinds["medical_treatment"] += 1
            elif t == "lost_time_injury": kinds["lost_time"] += 1
            else: kinds["other"] += 1
            if r.get("stage") == "closed":
                try:
                    start = datetime.fromisoformat(r.get("created_at", "")).replace(tzinfo=timezone.utc)
                    end = datetime.fromisoformat((r.get("stage_timestamps") or {}).get("closed", "")).replace(tzinfo=timezone.utc)
                    close_days.append((end - start).days)
                except Exception:
                    pass
            else:
                try:
                    start = datetime.fromisoformat(r.get("created_at", "")).replace(tzinfo=timezone.utc)
                    if (now - start).days > 30:
                        open_over_30 += 1
                except Exception:
                    pass
        return {
            "total_ytd": total_ytd,
            "notifiable": notifiable,
            "lost_time": kinds["lost_time"],
            "medical_treatment": kinds["medical_treatment"],
            "near_miss": kinds["near_miss"],
            "first_aid": kinds["first_aid"],
            "avg_close_days": round(sum(close_days) / len(close_days), 1) if close_days else 0,
            "open_over_30": open_over_30,
            "total_open": len([r for r in rows if r.get("stage") != "closed"]),
        }

    @inc_router.get("/incident-workflow")
    async def list_incidents(current_user=Depends(get_current_user)):
        rows = await app_db.incident_workflow.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(5000)
        for r in rows:
            _compute_lifecycle(r)
        return rows

    @inc_router.get("/incident-workflow/{incident_id}")
    async def get_incident(incident_id: str, current_user=Depends(get_current_user)):
        doc = await app_db.incident_workflow.find_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}, {"_id": 0}
        )
        if not doc:
            raise HTTPException(404, "not found")
        _compute_lifecycle(doc)
        return doc

    # ---------------------- STAGE 1: SUBMISSION ----------------------

    @inc_router.post("/incident-workflow")
    async def create_incident(body: dict, current_user=Depends(get_current_user)):
        # body: submission payload from the 6-step form
        now = _now_iso()
        # assign INC-YYYY-#### ref
        year = datetime.now(timezone.utc).year
        res = await app_db.incident_counters.find_one_and_update(
            {"user_id": current_user.user_id, "year": year},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        seq = (res or {}).get("seq") or 1
        ref = f"INC-{year}-{seq:04d}"
        incident_id = f"inc_{uuid.uuid4().hex[:10]}"

        desc = (body.get("submission", {}) or {}).get("description", "") or body.get("description", "")
        urgent_hits = _detect_urgent(desc)
        urgent = len(urgent_hits) > 0

        doc = {
            "user_id": current_user.user_id,
            "incident_id": incident_id,
            "reference": ref,
            "title": (body.get("title") or desc[:80] or "Untitled incident").strip() or "Untitled incident",
            "stage": "reported",
            "stages_done": [],
            "stage_timestamps": {"reported": now},
            "created_at": now,
            "created_by": current_user.user_id,
            "created_by_name": getattr(current_user, "name", None),
            "urgent": urgent,
            "urgent_keywords": urgent_hits,
            "submission": body.get("submission", {}),
            "triage": None,
            "investigation": None,
            "actions": {"short_term": [], "long_term": [], "risk_register": None, "internal_comments": "",
                        "worker_communication": "", "worker_consulted": None},
            "close_out": None,
            "severity": None,  # set at triage
            "incident_type": body.get("incident_type"),
            "notifiable": False,
            "notifiable_category": None,
            "site": (body.get("submission", {}) or {}).get("site"),
            "state": (body.get("submission", {}) or {}).get("state"),
            "audit_log": [_audit_entry(current_user, "__created__", None, ref)],
            "linked_risk_id": None,
            "linked_swms_ids": [],
            "linked_toolbox_ids": [],
            "linked_inspection_ids": [],
            "reopened": False,
        }
        await app_db.incident_workflow.insert_one({**doc})

        # Fire urgent + triage notifications. We record them against the
        # owner user so the bell reflects the action item.
        await _notify(app_db, current_user.user_id, {
            "channel": "in_app", "type": "incident_reported",
            "title": f"New incident reported — {ref}",
            "body": f"{doc['title']} — triage required within 24 hours.",
            "severity": "warning", "incident_id": incident_id,
        })
        if urgent:
            await _notify(app_db, current_user.user_id, {
                "channel": "in_app", "type": "incident_urgent",
                "title": f"URGENT — potential notifiable incident {ref}",
                "body": "Description contains keywords suggesting a notifiable incident. Call the WHS regulator immediately if applicable.",
                "severity": "urgent", "incident_id": incident_id,
            })
        doc.pop("_id", None)
        _compute_lifecycle(doc)
        return doc

    # ---------------------- STAGE 2: TRIAGE ----------------------

    @inc_router.patch("/incident-workflow/{incident_id}/triage")
    async def submit_triage(incident_id: str, body: dict, current_user=Depends(get_current_user)):
        existing = await app_db.incident_workflow.find_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}
        )
        if not existing:
            raise HTTPException(404, "not found")

        # Notifiable determination: any of the three signals
        notifiable = bool(
            body.get("resulted_in_death")
            or body.get("serious_injury_items")
            or body.get("dangerous_occurrence_items")
        )
        category = body.get("notifiable_category")
        if notifiable and not category:
            if body.get("resulted_in_death"):
                category = "death"
            elif body.get("serious_injury_items"):
                category = "serious_injury"
            elif body.get("dangerous_occurrence_items"):
                category = "dangerous_incident"

        now = _now_iso()
        save_draft = body.pop("draft", False)
        triage_doc = {
            **(existing.get("triage") or {}),
            **body,
            "notifiable": notifiable,
            "category": category,
        }

        update = {"triage": triage_doc, "updated_at": now,
                  "notifiable": notifiable, "notifiable_category": category,
                  "severity": body.get("severity"),
                  "incident_type": body.get("incident_type")}

        if not save_draft and body.get("signed_off_by"):
            # Advance stage to investigation
            stage_timestamps = existing.get("stage_timestamps") or {}
            stages_done = existing.get("stages_done") or []
            stages_done = list(set(stages_done + ["reported", "triage"]))
            stage_timestamps["triage"] = stage_timestamps.get("triage", now)
            update.update({
                "stage": "investigation",
                "stages_done": stages_done,
                "stage_timestamps": {**stage_timestamps, "investigation": now},
            })
            await _notify(app_db, current_user.user_id, {
                "channel": "in_app", "type": "incident_triaged",
                "title": f"Incident triaged — {existing['reference']}",
                "body": f"Investigation started. Severity {body.get('severity') or '?'} · Notifiable: {notifiable}.",
                "severity": "info", "incident_id": incident_id,
            })

        # Audit log
        audit = existing.get("audit_log") or []
        audit.append(_audit_entry(current_user, "triage", None, "submitted" if not save_draft else "draft"))
        update["audit_log"] = audit

        await app_db.incident_workflow.update_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}, {"$set": update}
        )
        doc = await app_db.incident_workflow.find_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}, {"_id": 0}
        )
        _compute_lifecycle(doc)
        return doc

    # ---------------------- STAGE 3: INVESTIGATION ----------------------

    @inc_router.patch("/incident-workflow/{incident_id}/investigation")
    async def submit_investigation(incident_id: str, body: dict, current_user=Depends(get_current_user)):
        existing = await app_db.incident_workflow.find_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}
        )
        if not existing:
            raise HTTPException(404, "not found")
        now = _now_iso()
        save_draft = body.pop("draft", False)
        inv = {**(existing.get("investigation") or {}), **body}
        update = {"investigation": inv, "updated_at": now}
        if not save_draft and body.get("completed"):
            stage_timestamps = existing.get("stage_timestamps") or {}
            stages_done = list(set((existing.get("stages_done") or []) + ["investigation"]))
            stage_timestamps["actions"] = now
            update.update({
                "stage": "actions",
                "stages_done": stages_done,
                "stage_timestamps": stage_timestamps,
            })
            await _notify(app_db, current_user.user_id, {
                "channel": "in_app", "type": "incident_investigated",
                "title": f"Investigation complete — {existing['reference']}",
                "body": "Corrective actions required. Assign and close out.",
                "incident_id": incident_id,
            })
        audit = existing.get("audit_log") or []
        audit.append(_audit_entry(current_user, "investigation", None, "submitted" if not save_draft else "draft"))
        update["audit_log"] = audit
        await app_db.incident_workflow.update_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}, {"$set": update}
        )
        doc = await app_db.incident_workflow.find_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}, {"_id": 0}
        )
        _compute_lifecycle(doc)
        return doc

    # ---------------------- STAGE 4: ACTIONS ----------------------

    @inc_router.patch("/incident-workflow/{incident_id}/actions")
    async def submit_actions(incident_id: str, body: dict, current_user=Depends(get_current_user)):
        existing = await app_db.incident_workflow.find_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}
        )
        if not existing:
            raise HTTPException(404, "not found")
        now = _now_iso()
        save_draft = body.pop("draft", False)
        actions = {**(existing.get("actions") or {}), **body}
        update = {"actions": actions, "updated_at": now}
        # "linked_risk_id" can be set during Actions
        if body.get("linked_risk_id"):
            update["linked_risk_id"] = body["linked_risk_id"]
        if not save_draft and body.get("completed"):
            stage_timestamps = existing.get("stage_timestamps") or {}
            stages_done = list(set((existing.get("stages_done") or []) + ["actions"]))
            # move into close_out stage but NOT closed yet
            stage_timestamps["actions_complete"] = now
            update.update({"stages_done": stages_done, "stage_timestamps": stage_timestamps})
        audit = existing.get("audit_log") or []
        audit.append(_audit_entry(current_user, "actions", None, "saved"))
        update["audit_log"] = audit
        await app_db.incident_workflow.update_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}, {"$set": update}
        )
        doc = await app_db.incident_workflow.find_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}, {"_id": 0}
        )
        _compute_lifecycle(doc)
        return doc

    # ---------------------- STAGE 5: CLOSE-OUT ----------------------

    @inc_router.patch("/incident-workflow/{incident_id}/close-out")
    async def submit_close_out(incident_id: str, body: dict, current_user=Depends(get_current_user)):
        existing = await app_db.incident_workflow.find_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}
        )
        if not existing:
            raise HTTPException(404, "not found")
        if not body.get("lessons_learned"):
            raise HTTPException(400, "lessons_learned required to close out")
        if not body.get("signed_off_by"):
            raise HTTPException(400, "signed_off_by required to close out")
        now = _now_iso()
        close_out = {
            "checklist": body.get("checklist", {}),
            "lessons_learned": body.get("lessons_learned"),
            "signed_off_by": body.get("signed_off_by"),
            "signed_role": body.get("signed_role"),
            "signed_at": now,
            "secondary_sign_off": body.get("secondary_sign_off"),
            "incomplete_items": body.get("incomplete_items", []),
        }
        stage_timestamps = existing.get("stage_timestamps") or {}
        stages_done = list(set((existing.get("stages_done") or []) + ["actions", "closed"]))
        stage_timestamps["closed"] = now
        update = {
            "close_out": close_out,
            "stage": "closed",
            "stages_done": stages_done,
            "stage_timestamps": stage_timestamps,
            "updated_at": now,
        }
        audit = existing.get("audit_log") or []
        audit.append(_audit_entry(current_user, "close_out", None, "closed"))
        update["audit_log"] = audit
        await app_db.incident_workflow.update_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}, {"$set": update}
        )
        await _notify(app_db, current_user.user_id, {
            "channel": "in_app", "type": "incident_closed",
            "title": f"Incident closed — {existing['reference']}",
            "body": "Record locked. Reopen requires Admin.",
            "incident_id": incident_id,
        })
        doc = await app_db.incident_workflow.find_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}, {"_id": 0}
        )
        _compute_lifecycle(doc)
        return doc

    @inc_router.post("/incident-workflow/{incident_id}/reopen")
    async def reopen_incident(incident_id: str, body: dict, current_user=Depends(get_current_user)):
        reason = (body or {}).get("reason")
        if not reason:
            raise HTTPException(400, "reason required")
        existing = await app_db.incident_workflow.find_one(
            {"incident_id": incident_id, "user_id": current_user.user_id}
        )
        if not existing:
            raise HTTPException(404, "not found")
        audit = existing.get("audit_log") or []
        audit.append(_audit_entry(current_user, "reopen", None, reason))
        await app_db.incident_workflow.update_one(
            {"incident_id": incident_id, "user_id": current_user.user_id},
            {"$set": {"stage": "actions", "reopened": True, "audit_log": audit}},
        )
        return {"reopened": True}

    # ---------------------- AI ----------------------

    async def _call_claude(system, prompt, fallback, LlmChat, UserMessage, key):
        try:
            chat = LlmChat(api_key=key, session_id=f"inc_{uuid.uuid4().hex[:8]}",
                           system_message=system).with_model("anthropic", "claude-sonnet-4-5-20250929")

            def _run():
                return asyncio.run(chat.send_message(UserMessage(text=prompt)))

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

    def register_ai_routes(LlmChat, UserMessage, llm_key):

        @inc_router.post("/incident-workflow/ai/categorise")
        async def ai_categorise(body: dict, current_user=Depends(get_current_user)):
            """Given a worker description, suggest incident category + severity."""
            fallback = {"category": "Near Miss", "severity": 2, "rationale":
                        "No injury mentioned — defaulting to Near Miss (severity 2)."}
            sys = ("You are a WHS triage assistant for Australian tradie businesses. "
                   "Classify the incident into one of: Near Miss, First Aid Injury, "
                   "Medical Treatment Injury, Lost Time Injury, Property Damage, "
                   "Environmental, Dangerous Incident, Other. Severity on 1-6 scale.")
            prompt = (f"Worker description: {body.get('description', '')}\n\n"
                      "Return JSON: {category, severity (1-6), rationale}. No prose outside JSON.")
            return await _call_claude(sys, prompt, fallback, LlmChat, UserMessage, llm_key)

        @inc_router.post("/incident-workflow/ai/root-cause")
        async def ai_root_cause(body: dict, current_user=Depends(get_current_user)):
            """Propose root cause from contributing factors selected."""
            factors = body.get("factors", {})
            fallback = {
                "primary": "Inadequate hazard identification before work commenced.",
                "systemic": "System-level gap in pre-start risk review for this activity type.",
                "pattern": "Management system / planning factors",
            }
            sys = "You are a senior WHS investigator. Identify root causes using the 5-whys pattern."
            prompt = (f"Selected contributing factors (yes=positive, others=null):\n"
                      f"{_json.dumps(factors)[:3500]}\n\n"
                      "Return JSON: {primary, systemic, pattern (one of 'human factors'|"
                      "'management system'|'environment'|'equipment'|'training')}. No prose outside JSON.")
            return await _call_claude(sys, prompt, fallback, LlmChat, UserMessage, llm_key)

        @inc_router.post("/incident-workflow/ai/summary")
        async def ai_summary(body: dict, current_user=Depends(get_current_user)):
            incident_id = body.get("incident_id")
            doc = await app_db.incident_workflow.find_one(
                {"incident_id": incident_id, "user_id": current_user.user_id}, {"_id": 0})
            if not doc:
                raise HTTPException(404, "incident not found")
            fallback = {"summary": (
                f"Incident {doc.get('reference')} — {doc.get('title')} · "
                f"Stage {doc.get('stage')} · Severity {doc.get('severity') or 'TBD'}. "
                "See tabs for full record.")}
            sys = "You are a WHS documentation assistant. Produce a plain-English 4-6 sentence summary."
            prompt = (f"Incident data: {_json.dumps(doc)[:4000]}\n\n"
                      "Return JSON: {summary}. No prose outside JSON.")
            return await _call_claude(sys, prompt, fallback, LlmChat, UserMessage, llm_key)

        @inc_router.post("/incident-workflow/ai/lessons-learned")
        async def ai_lessons(body: dict, current_user=Depends(get_current_user)):
            fallback = {"lessons_learned": (
                "Strengthen pre-start risk assessment for this activity. Ensure current "
                "SWMS is available at the work front, reinforce via toolbox talk, and "
                "update the risk register so controls are consistently applied.")}
            sys = "You are a WHS learning-and-development writer. 2-3 sentences."
            prompt = (f"Incident context: {_json.dumps(body)[:3500]}\n\n"
                      "Return JSON: {lessons_learned}. No prose outside JSON.")
            return await _call_claude(sys, prompt, fallback, LlmChat, UserMessage, llm_key)

    return inc_router, register_ai_routes, REGULATOR_BY_STATE
