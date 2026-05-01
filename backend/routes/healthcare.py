"""
Healthcare / Aged Care / NDIS / Allied Health industry-specific endpoints.

All routes are hard-blocked to `industry == "healthcare"` via feature gates.

Endpoints:
  AHPRA registration tracker:
    POST /api/healthcare/ahpra-register
    GET  /api/healthcare/ahpra-register
    GET  /api/healthcare/ahpra-register/expiring  — <= 30 day window

  Worker screening (NDIS / Aged Care clearance):
    POST /api/healthcare/worker-screening
    GET  /api/healthcare/worker-screening

  SIRS incidents (ACQSC 24h + 30d deadlines):
    POST /api/healthcare/sirs-incidents
    GET  /api/healthcare/sirs-incidents
    POST /api/healthcare/sirs-incidents/{incident_id}/submit  — marks submitted

  NDIS reportable incidents (NDIS Commission):
    POST /api/healthcare/ndis-reportable
    GET  /api/healthcare/ndis-reportable

  ACQSC Quality Standards evidence (1-8):
    POST /api/healthcare/acqsc-evidence
    GET  /api/healthcare/acqsc-evidence

  Care minutes log (direct care time):
    POST /api/healthcare/care-minutes
    GET  /api/healthcare/care-minutes
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query


SIRS_PRIORITY_ONE = {
    "unreasonable_use_of_force", "unlawful_sexual_contact", "psychological_abuse",
    "neglect_with_serious_harm", "theft_financial_coercion", "unexpected_death",
    "inappropriate_restraint",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def register_healthcare_routes(api_router: APIRouter, *, db, get_current_user_dep,
                               require_feature, account_id_for_fn,
                               stamp_account_fn, visibility_filter_fn,
                               log_audit_fn, logger):

    ahpra_gate = Depends(require_feature("ahpra_tracking"))
    screen_gate = Depends(require_feature("worker_screening"))
    sirs_gate = Depends(require_feature("sentinel_event_notify"))
    ndis_gate = Depends(require_feature("ndis_practice_standards"))
    acqsc_gate = Depends(require_feature("acqsc_standards"))
    care_gate = Depends(require_feature("care_quality_module"))

    # -------- AHPRA register --------------------------------------------------
    @api_router.post("/healthcare/ahpra-register")
    async def create_ahpra(body: dict, request: Request, current_user=ahpra_gate):
        required = ("worker_name", "profession", "registration_number")
        for f in required:
            if not body.get(f):
                raise HTTPException(400, f"{f} is required")
        doc = {
            "reg_id": f"AHP-{uuid.uuid4().hex[:10]}",
            "worker_name": body["worker_name"],
            "worker_id": body.get("worker_id"),
            "profession": body["profession"],  # RN, EN, Medical, Physio, OT, etc.
            "registration_number": body["registration_number"],
            "registration_type": body.get("registration_type", "General"),
            "conditions": body.get("conditions", []),
            "issued_at": body.get("issued_at"),
            "expires_at": body.get("expires_at"),
            "last_checked_at": _now_iso(),
            "status": body.get("status", "active"),
        }
        stamp_account_fn(doc, current_user)
        await db.ahpra_register.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="ahpra_registration", record_id=doc["reg_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/healthcare/ahpra-register")
    async def list_ahpra(current_user=ahpra_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.ahpra_register.find(q, {"_id": 0}).sort("worker_name", 1).to_list(500)
        today = datetime.now(timezone.utc).date()
        for r in rows:
            exp = r.get("expires_at")
            if exp:
                try:
                    d = datetime.fromisoformat(exp.replace("Z", "+00:00")).date()
                    days = (d - today).days
                    r["_days_to_expiry"] = days
                    r["_expiring_soon"] = 0 <= days <= 30
                    r["_expired"] = days < 0
                except Exception:
                    pass
        return {"rows": rows, "total": len(rows)}

    @api_router.get("/healthcare/ahpra-register/expiring")
    async def list_ahpra_expiring(current_user=ahpra_gate, days: int = Query(30, le=180)):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.ahpra_register.find(q, {"_id": 0}).to_list(1000)
        today = datetime.now(timezone.utc).date()
        out = []
        for r in rows:
            exp = r.get("expires_at")
            if not exp:
                continue
            try:
                d = datetime.fromisoformat(exp.replace("Z", "+00:00")).date()
                delta = (d - today).days
                if delta <= days:
                    r["_days_to_expiry"] = delta
                    out.append(r)
            except Exception:
                continue
        return {"rows": out, "total": len(out)}

    # -------- Worker screening ------------------------------------------------
    @api_router.post("/healthcare/worker-screening")
    async def create_worker_screen(body: dict, request: Request, current_user=screen_gate):
        required = ("worker_name", "screening_type")
        for f in required:
            if not body.get(f):
                raise HTTPException(400, f"{f} is required")
        doc = {
            "screen_id": f"WS-{uuid.uuid4().hex[:10]}",
            "worker_name": body["worker_name"],
            "worker_id": body.get("worker_id"),
            "screening_type": body["screening_type"],  # ndis / aged_care / wwcc
            "clearance_number": body.get("clearance_number"),
            "jurisdiction": body.get("jurisdiction", "NSW"),
            "issued_at": body.get("issued_at"),
            "expires_at": body.get("expires_at"),
            "outcome": body.get("outcome", "cleared"),
            "notes": body.get("notes"),
        }
        stamp_account_fn(doc, current_user)
        await db.worker_screening.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="worker_screening", record_id=doc["screen_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/healthcare/worker-screening")
    async def list_worker_screen(current_user=screen_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.worker_screening.find(q, {"_id": 0}).sort("worker_name", 1).to_list(500)
        today = datetime.now(timezone.utc).date()
        for r in rows:
            exp = r.get("expires_at")
            if exp:
                try:
                    d = datetime.fromisoformat(exp.replace("Z", "+00:00")).date()
                    r["_days_to_expiry"] = (d - today).days
                    r["_expired"] = (d - today).days < 0
                except Exception:
                    pass
        return {"rows": rows, "total": len(rows)}

    # -------- SIRS incidents --------------------------------------------------
    @api_router.post("/healthcare/sirs-incidents")
    async def create_sirs(body: dict, request: Request, current_user=sirs_gate):
        required = ("category", "summary", "occurred_at")
        for f in required:
            if not body.get(f):
                raise HTTPException(400, f"{f} is required")
        occurred = body["occurred_at"]
        try:
            occ_dt = datetime.fromisoformat(occurred.replace("Z", "+00:00"))
        except Exception:
            occ_dt = datetime.now(timezone.utc)
        # Priority determination
        category = body["category"]
        priority = "one" if category in SIRS_PRIORITY_ONE else "two"
        p1_deadline = (occ_dt + timedelta(hours=24)).isoformat()
        p2_deadline = (occ_dt + timedelta(days=30)).isoformat()
        doc = {
            "incident_id": f"SIRS-{uuid.uuid4().hex[:10]}",
            "category": category,
            "priority": priority,
            "summary": body["summary"],
            "occurred_at": occurred,
            "consumer_initials": body.get("consumer_initials"),
            "service_code": body.get("service_code"),
            "notify_by_24h": p1_deadline,
            "notify_by_30d": p2_deadline,
            "acqsc_submitted_at": None,
            "status": "pending",
        }
        stamp_account_fn(doc, current_user)
        await db.sirs_incidents.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="sirs_incident", record_id=doc["incident_id"],
                           request=request, detail={"priority": priority})
        doc.pop("_id", None)
        return doc

    @api_router.get("/healthcare/sirs-incidents")
    async def list_sirs(current_user=sirs_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.sirs_incidents.find(q, {"_id": 0}).sort("occurred_at", -1).to_list(500)
        return {"rows": rows, "total": len(rows)}

    @api_router.post("/healthcare/sirs-incidents/{incident_id}/submit")
    async def submit_sirs(incident_id: str, body: dict, request: Request, current_user=sirs_gate):
        rec = await db.sirs_incidents.find_one(
            {"incident_id": incident_id, "account_id": account_id_for_fn(current_user)}, {"_id": 0})
        if not rec:
            raise HTTPException(404, "Incident not found")
        await db.sirs_incidents.update_one(
            {"incident_id": incident_id},
            {"$set": {"acqsc_submitted_at": _now_iso(), "status": "submitted",
                      "submission_reference": body.get("submission_reference")}})
        await log_audit_fn(db, user=current_user, action="submit",
                           record_type="sirs_incident", record_id=incident_id, request=request)
        return {"incident_id": incident_id, "status": "submitted"}

    # -------- NDIS reportable -------------------------------------------------
    @api_router.post("/healthcare/ndis-reportable")
    async def create_ndis_rep(body: dict, request: Request, current_user=ndis_gate):
        required = ("category", "summary", "occurred_at")
        for f in required:
            if not body.get(f):
                raise HTTPException(400, f"{f} is required")
        occurred = body["occurred_at"]
        try:
            occ_dt = datetime.fromisoformat(occurred.replace("Z", "+00:00"))
        except Exception:
            occ_dt = datetime.now(timezone.utc)
        # NDIS: serious categories (death/sexual misconduct/unauthorised restraint) → 24h
        high_risk = body["category"] in {
            "death", "serious_injury", "sexual_misconduct",
            "unauthorised_restraint", "abuse_neglect",
        }
        deadline = (occ_dt + timedelta(hours=24 if high_risk else 5*24)).isoformat()
        doc = {
            "incident_id": f"NDIS-{uuid.uuid4().hex[:10]}",
            "category": body["category"],
            "summary": body["summary"],
            "occurred_at": occurred,
            "participant_initials": body.get("participant_initials"),
            "is_high_risk": high_risk,
            "notify_commission_by": deadline,
            "commission_submitted_at": None,
            "status": "pending",
        }
        stamp_account_fn(doc, current_user)
        await db.ndis_reportable.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="ndis_reportable", record_id=doc["incident_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/healthcare/ndis-reportable")
    async def list_ndis_rep(current_user=ndis_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.ndis_reportable.find(q, {"_id": 0}).sort("occurred_at", -1).to_list(500)
        return {"rows": rows, "total": len(rows)}

    # -------- ACQSC evidence --------------------------------------------------
    @api_router.post("/healthcare/acqsc-evidence")
    async def create_acqsc_ev(body: dict, request: Request, current_user=acqsc_gate):
        std = body.get("standard")
        if std not in list(range(1, 9)):
            raise HTTPException(400, "standard must be 1-8 (ACQSC Quality Standards)")
        if not body.get("title"):
            raise HTTPException(400, "title is required")
        doc = {
            "evidence_id": f"ACQSC-{uuid.uuid4().hex[:10]}",
            "standard": std,
            "title": body["title"],
            "description": body.get("description"),
            "evidence_type": body.get("evidence_type"),  # policy / procedure / record / training
            "linked_doc_ref": body.get("linked_doc_ref"),
            "next_review_at": body.get("next_review_at"),
        }
        stamp_account_fn(doc, current_user)
        await db.acqsc_evidence.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="acqsc_evidence", record_id=doc["evidence_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/healthcare/acqsc-evidence")
    async def list_acqsc_ev(current_user=acqsc_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.acqsc_evidence.find(q, {"_id": 0}).sort("standard", 1).to_list(500)
        # Coverage summary per standard
        coverage = {str(i): 0 for i in range(1, 9)}
        for r in rows:
            coverage[str(r.get("standard"))] = coverage.get(str(r.get("standard")), 0) + 1
        return {"rows": rows, "total": len(rows), "coverage": coverage}

    # -------- Care minutes ----------------------------------------------------
    @api_router.post("/healthcare/care-minutes")
    async def create_care_minutes(body: dict, request: Request, current_user=care_gate):
        required = ("consumer_initials", "minutes", "care_type")
        for f in required:
            if not body.get(f):
                raise HTTPException(400, f"{f} is required")
        doc = {
            "log_id": f"CM-{uuid.uuid4().hex[:10]}",
            "consumer_initials": body["consumer_initials"],
            "minutes": int(body["minutes"]),
            "care_type": body["care_type"],  # rn / direct_care / allied_health
            "clinician": body.get("clinician") or getattr(current_user, "full_name", None),
            "date": body.get("date") or datetime.now(timezone.utc).date().isoformat(),
            "notes": body.get("notes"),
        }
        stamp_account_fn(doc, current_user)
        await db.care_minutes.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="care_minutes", record_id=doc["log_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/healthcare/care-minutes")
    async def list_care_minutes(current_user=care_gate, limit: int = Query(500, le=2000)):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.care_minutes.find(q, {"_id": 0}).sort("date", -1).to_list(limit)
        total_minutes = sum(int(r.get("minutes", 0)) for r in rows)
        return {"rows": rows, "total": len(rows), "total_minutes": total_minutes}
