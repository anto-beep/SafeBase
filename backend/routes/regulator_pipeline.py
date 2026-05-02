"""
Regulator Pipeline Automation — P0 Iter41.

Given an incident / event description, decide WHICH regulator must be
notified, by WHEN, and produce a pre-filled notification payload.

Three main regulator pipelines:

  SIRS   (Serious Incident Response Scheme) — Aged Care Quality & Safety
         Commission. Priority-1 incidents require notification within
         24 hours; Priority-2 within 30 days.

  NDIS   Reportable Incidents — NDIS Quality & Safeguards Commission.
         Immediate (24 hrs) for deaths, serious injury, abuse/neglect,
         unlawful sexual/physical contact, unauthorised restrictive
         practice. 5 business days for all others.

  NHVR   Notifiable Occurrences — Heavy Vehicle National Law. Any fatality,
         serious injury, dangerous incident on a heavy vehicle or involving
         a heavy vehicle operator. Notification within 24 hours + written
         report within 48 hours.

Endpoints:
  POST /api/regulator-pipeline/triage   — decide which pipeline(s) + deadlines
  POST /api/regulator-pipeline/draft    — generate pre-filled notification
  GET  /api/regulator-pipeline/pending  — list cases awaiting submission
  POST /api/regulator-pipeline/mark-submitted/{id} — mark a case submitted
  GET  /api/regulator-pipeline/matrices — public reference (all decision rules)
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException


# ----------------------------------------------------------------------
# DECISION MATRICES (SIRS / NDIS / NHVR)
# ----------------------------------------------------------------------

# SIRS Priority 1 (24h) — aged care. Keyword triggers ANY → Priority 1.
SIRS_P1_KEYWORDS = [
    "death", "died", "suicide", "allegedly caused",
    "serious injury", "hospital", "fractured", "unconscious",
    "sexual assault", "sexual misconduct", "rape",
    "physical assault", "assault with injury",
    "unexpected absence", "missing", "wandering off",
    "unauthorised restrictive practice", "unauthorised restraint",
    "psychological abuse with harm",
]

# SIRS Priority 2 (30 days) — aged care.
SIRS_P2_KEYWORDS = [
    "neglect", "financial coercion", "inappropriate use of restrictive",
    "unreasonable use of force", "psychological abuse",
    "stealing", "theft", "fraud",
]

# NDIS Reportable — immediate notification (24h).
NDIS_IMMEDIATE_KEYWORDS = [
    "death", "died", "deceased",
    "serious injury", "hospitalisation", "hospitalised",
    "abuse", "neglect",
    "unlawful sexual", "unlawful physical",
    "unauthorised restrictive practice", "unauthorised restraint",
    "chemical restraint", "seclusion",
]

# NDIS 5-business-day reportable.
NDIS_5DAY_KEYWORDS = [
    "injury requiring medical", "medical treatment",
    "assault", "verbal abuse",
    "financial abuse", "exploitation",
    "alleged misconduct",
]

# NHVR Notifiable Occurrence triggers.
NHVR_IMMEDIATE_KEYWORDS = [
    "fatality", "fatal", "death on a road",
    "serious injury", "hospitalised driver",
    "dangerous incident", "rollover", "collision",
    "fatigue incident", "brake failure", "load shift",
    "dangerous goods spill",
]


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _match_any(text: str, keywords: list[str]) -> list[str]:
    t = (text or "").lower()
    return [k for k in keywords if k in t]


def _triage(incident_type: str, description: str, industry: str) -> list[dict]:
    """Evaluate all pipelines and return matches with deadline + priority."""
    hay = f"{incident_type} {description}".lower()
    now = _now_utc()
    matches: list[dict] = []

    # ---------- SIRS (healthcare / aged care only) ----------
    if industry == "healthcare":
        p1 = _match_any(hay, SIRS_P1_KEYWORDS)
        p2 = _match_any(hay, SIRS_P2_KEYWORDS)
        if p1:
            matches.append({
                "pipeline": "SIRS",
                "regulator": "Aged Care Quality and Safety Commission",
                "priority": "Priority 1",
                "deadline_hours": 24,
                "deadline_at": (now + timedelta(hours=24)).isoformat(),
                "channel": "https://agedcarequality.gov.au/providers/sirs",
                "triggered_by": p1,
                "statutory_basis": "Aged Care Act 1997 s54-3 · SIRS Rule 2021",
                "pre_submission_checklist": [
                    "Immediate medical care confirmed",
                    "Family / substitute decision-maker notified",
                    "Police notified if criminal conduct suspected",
                    "Scene preserved (photos, witness contacts)",
                    "ACQSC notification form drafted",
                ],
            })
        elif p2:
            matches.append({
                "pipeline": "SIRS",
                "regulator": "Aged Care Quality and Safety Commission",
                "priority": "Priority 2",
                "deadline_hours": 24 * 30,
                "deadline_at": (now + timedelta(days=30)).isoformat(),
                "channel": "https://agedcarequality.gov.au/providers/sirs",
                "triggered_by": p2,
                "statutory_basis": "Aged Care Act 1997 s54-3 · SIRS Rule 2021",
                "pre_submission_checklist": [
                    "Internal investigation commenced",
                    "Risk assessment updated",
                    "Corrective actions identified",
                    "ACQSC notification form drafted",
                ],
            })

    # ---------- NDIS Reportable Incidents ----------
    if industry == "healthcare":
        imm = _match_any(hay, NDIS_IMMEDIATE_KEYWORDS)
        fiveday = _match_any(hay, NDIS_5DAY_KEYWORDS)
        if imm:
            matches.append({
                "pipeline": "NDIS",
                "regulator": "NDIS Quality and Safeguards Commission",
                "priority": "Immediate",
                "deadline_hours": 24,
                "deadline_at": (now + timedelta(hours=24)).isoformat(),
                "channel": "https://www.ndiscommission.gov.au/providers/reportable-incidents",
                "triggered_by": imm,
                "statutory_basis": "NDIS Act 2013 s73Z · NDIS (Incident Management & Reportable Incidents) Rules 2018",
                "pre_submission_checklist": [
                    "Participant safety confirmed",
                    "Next of kin notified",
                    "Police notified if applicable",
                    "Staff member stood down pending investigation if involved",
                    "NDIS Form 1 (immediate notification) drafted",
                    "24-hour clock: deadline " + (now + timedelta(hours=24)).isoformat(),
                ],
            })
        elif fiveday:
            matches.append({
                "pipeline": "NDIS",
                "regulator": "NDIS Quality and Safeguards Commission",
                "priority": "5 business days",
                "deadline_hours": 24 * 7,  # 5 business days ≈ 7 calendar
                "deadline_at": (now + timedelta(days=7)).isoformat(),
                "channel": "https://www.ndiscommission.gov.au/providers/reportable-incidents",
                "triggered_by": fiveday,
                "statutory_basis": "NDIS Act 2013 s73Z · Incident Management Rules 2018",
                "pre_submission_checklist": [
                    "Full investigation plan in place",
                    "Participant support plan updated",
                    "NDIS Form 2 (5-business-day report) drafted",
                ],
            })

    # ---------- NHVR Notifiable Occurrences ----------
    if industry == "transport":
        nhvr = _match_any(hay, NHVR_IMMEDIATE_KEYWORDS)
        if nhvr:
            matches.append({
                "pipeline": "NHVR",
                "regulator": "National Heavy Vehicle Regulator",
                "priority": "Immediate",
                "deadline_hours": 24,
                "deadline_at": (now + timedelta(hours=24)).isoformat(),
                "written_report_deadline_at": (now + timedelta(hours=48)).isoformat(),
                "channel": "https://www.nhvr.gov.au/safety-accreditation-compliance/notifiable-occurrences",
                "triggered_by": nhvr,
                "statutory_basis": "Heavy Vehicle National Law s618-620 · NHVAS Standards",
                "pre_submission_checklist": [
                    "Driver welfare confirmed",
                    "Scene documented (photos, witnesses, GPS)",
                    "Vehicle and work diary data preserved",
                    "Police / road-authority notified if fatality / serious injury",
                    "NHVR Notifiable Occurrence Report (NOR) drafted (48h)",
                ],
            })

    return matches


def register_regulator_pipeline_routes(api_router: APIRouter, *, db,
                                         get_current_user_dep,
                                         account_id_for_fn, stamp_account_fn,
                                         logger):

    # -----------------------------------------------------------------
    @api_router.post("/regulator-pipeline/triage")
    async def triage(body: dict, current_user=Depends(get_current_user_dep)):
        _ = account_id_for_fn(current_user)  # auth-gate only
        industry = body.get("industry") or "trades"
        incident_type = body.get("incident_type") or ""
        description = body.get("description") or ""
        if not description and not incident_type:
            raise HTTPException(400, "Provide incident_type and/or description")
        matches = _triage(incident_type, description, industry)
        return {
            "industry": industry,
            "evaluated_at": _now_utc().isoformat(),
            "matches": matches,
            "match_count": len(matches),
            "requires_regulator_notification": len(matches) > 0,
        }

    # -----------------------------------------------------------------
    @api_router.post("/regulator-pipeline/draft")
    async def draft(body: dict, current_user=Depends(get_current_user_dep)):
        """Create a regulator-notification draft record. Pre-fills the payload
        with incident data + participant/worker details. Returns the draft
        which should be reviewed by the provider before submission."""
        _ = account_id_for_fn(current_user)  # auth-gate only; stamp_account_fn attaches account_id
        industry = body.get("industry") or "trades"
        incident_type = body.get("incident_type") or ""
        description = body.get("description") or ""
        participant = body.get("participant") or {}
        worker = body.get("worker") or {}
        incident_id = body.get("incident_id")

        matches = _triage(incident_type, description, industry)
        if not matches:
            raise HTTPException(400, "No regulator pipeline triggered for this event")

        doc = {
            "id": str(uuid4()),
            "industry": industry,
            "incident_id": incident_id,
            "incident_type": incident_type,
            "description": description,
            "participant": participant,
            "worker": worker,
            "matches": matches,
            "status": "draft",
            "created_at": _now_utc().isoformat(),
        }
        stamp_account_fn(doc, current_user)
        await db.regulator_cases.insert_one(dict(doc))
        doc.pop("_id", None)
        return {"ok": True, "case": doc}

    # -----------------------------------------------------------------
    @api_router.get("/regulator-pipeline/pending")
    async def pending(current_user=Depends(get_current_user_dep)):
        """List regulator cases for this account still awaiting submission."""
        account_id = account_id_for_fn(current_user)
        cursor = db.regulator_cases.find(
            {"account_id": account_id, "status": {"$in": ["draft", "ready"]}},
            {"_id": 0},
        ).sort("created_at", -1).limit(200)
        cases = await cursor.to_list(200)
        now = _now_utc()
        for c in cases:
            # Find earliest deadline across matches
            earliest = None
            for m in c.get("matches", []):
                dl = m.get("deadline_at")
                if dl:
                    try:
                        d = datetime.fromisoformat(dl.replace("Z", "+00:00"))
                        if earliest is None or d < earliest:
                            earliest = d
                    except Exception:
                        pass
            c["earliest_deadline_at"] = earliest.isoformat() if earliest else None
            c["overdue"] = bool(earliest and earliest < now)
            c["hours_remaining"] = round(((earliest - now).total_seconds() / 3600), 1) if earliest else None
        return {"total": len(cases), "cases": cases}

    # -----------------------------------------------------------------
    @api_router.post("/regulator-pipeline/mark-submitted/{case_id}")
    async def mark_submitted(case_id: str, body: dict,
                              current_user=Depends(get_current_user_dep)):
        account_id = account_id_for_fn(current_user)
        ref = body.get("reference_number") or ""
        pipeline = body.get("pipeline") or ""
        result = await db.regulator_cases.update_one(
            {"id": case_id, "account_id": account_id},
            {"$set": {
                "status": "submitted",
                "submitted_at": _now_utc().isoformat(),
                "submitted_to": pipeline,
                "reference_number": ref,
            }},
        )
        if result.matched_count == 0:
            raise HTTPException(404, f"Case {case_id} not found")
        return {"ok": True, "case_id": case_id, "status": "submitted"}

    # -----------------------------------------------------------------
    @api_router.get("/regulator-pipeline/matrices")
    async def matrices():
        """Public reference — which keywords trigger each pipeline."""
        return {
            "SIRS": {
                "regulator": "Aged Care Quality and Safety Commission",
                "industry": "healthcare",
                "priority_1": {"deadline_hours": 24, "triggers": SIRS_P1_KEYWORDS},
                "priority_2": {"deadline_hours": 720, "triggers": SIRS_P2_KEYWORDS},
                "channel": "https://agedcarequality.gov.au/providers/sirs",
                "statutory_basis": "Aged Care Act 1997 s54-3 · SIRS Rule 2021",
            },
            "NDIS": {
                "regulator": "NDIS Quality and Safeguards Commission",
                "industry": "healthcare",
                "immediate": {"deadline_hours": 24, "triggers": NDIS_IMMEDIATE_KEYWORDS},
                "five_business_day": {"deadline_hours": 168, "triggers": NDIS_5DAY_KEYWORDS},
                "channel": "https://www.ndiscommission.gov.au/providers/reportable-incidents",
                "statutory_basis": "NDIS Act 2013 s73Z",
            },
            "NHVR": {
                "regulator": "National Heavy Vehicle Regulator",
                "industry": "transport",
                "immediate": {"deadline_hours": 24, "written_report_hours": 48, "triggers": NHVR_IMMEDIATE_KEYWORDS},
                "channel": "https://www.nhvr.gov.au/safety-accreditation-compliance/notifiable-occurrences",
                "statutory_basis": "Heavy Vehicle National Law s618-620",
            },
        }
