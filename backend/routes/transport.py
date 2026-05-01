"""
Transport & Logistics industry-specific endpoints.

All routes are hard-blocked to `industry == "transport"` via feature gates.

Endpoints:
  Fleet vehicles:
    POST /api/transport/vehicles
    GET  /api/transport/vehicles

  Pre-trip inspections (daily):
    POST /api/transport/pretrip-inspections
    GET  /api/transport/pretrip-inspections

  Fatigue / work-rest logs (HVNL BFM/AFM):
    POST /api/transport/fatigue-logs
    GET  /api/transport/fatigue-logs
    GET  /api/transport/fatigue-logs/breaches  — automated standard-hours check

  Fitness-for-duty declarations:
    POST /api/transport/fitness-for-duty
    GET  /api/transport/fitness-for-duty

  Load restraint records:
    POST /api/transport/load-restraint
    GET  /api/transport/load-restraint

  Mass management declarations:
    POST /api/transport/mass-declarations
    GET  /api/transport/mass-declarations

  CoR executive due-diligence log (Section 26C):
    POST /api/transport/cor-due-diligence
    GET  /api/transport/cor-due-diligence

  NHVR Notifiable Occurrence report (HVNL s 596A):
    POST /api/transport/nhvr-occurrences
    GET  /api/transport/nhvr-occurrences
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query


# HVNL Standard Hours limits (simplified — Standard Solo Driver)
STANDARD_MAX_WORK_IN_DAY_HRS = 12.0
STANDARD_MIN_CONT_REST_IN_DAY_HRS = 7.0
STANDARD_MAX_WORK_14D_HRS = 144.0


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def register_transport_routes(api_router: APIRouter, *, db, get_current_user_dep,
                              require_feature, account_id_for_fn,
                              stamp_account_fn, visibility_filter_fn,
                              log_audit_fn, logger):

    fleet_gate = Depends(require_feature("fleet_register"))
    pretrip_gate = Depends(require_feature("vehicle_pretrip"))
    fatigue_gate = Depends(require_feature("fatigue_management"))
    ffd_gate = Depends(require_feature("fitness_for_duty"))
    restraint_gate = Depends(require_feature("load_restraint_records"))
    mass_gate = Depends(require_feature("load_restraint_records"))  # re-use same tier
    cor_gate = Depends(require_feature("cor_module"))
    nhvr_gate = Depends(require_feature("nhvr_notifications"))

    # -------- Fleet vehicles --------------------------------------------------
    @api_router.post("/transport/vehicles")
    async def create_vehicle(body: dict, request: Request, current_user=fleet_gate):
        if not body.get("rego"):
            raise HTTPException(400, "rego is required")
        doc = {
            "vehicle_id": f"VH-{uuid.uuid4().hex[:10]}",
            "rego": body["rego"].upper(),
            "make": body.get("make"),
            "model": body.get("model"),
            "vehicle_class": body.get("vehicle_class"),  # HR/HC/MC/B-Double
            "gvm_kg": body.get("gvm_kg"),
            "combo_gcm_kg": body.get("combo_gcm_kg"),
            "last_service_at": body.get("last_service_at"),
            "next_service_due": body.get("next_service_due"),
            "rego_expires_at": body.get("rego_expires_at"),
            "nhvr_accreditation": body.get("nhvr_accreditation", []),
        }
        stamp_account_fn(doc, current_user)
        await db.fleet_vehicles.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="fleet_vehicle", record_id=doc["vehicle_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/transport/vehicles")
    async def list_vehicles(current_user=fleet_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.fleet_vehicles.find(q, {"_id": 0}).sort("rego", 1).to_list(500)
        return {"rows": rows, "total": len(rows)}

    # -------- Pre-trip inspections --------------------------------------------
    @api_router.post("/transport/pretrip-inspections")
    async def create_pretrip(body: dict, request: Request, current_user=pretrip_gate):
        required = ("vehicle_rego", "driver_name")
        for f in required:
            if not body.get(f):
                raise HTTPException(400, f"{f} is required")
        # Checklist items (passed=True if safe to drive)
        checklist = body.get("checklist") or {}
        defects = [k for k, v in checklist.items() if v is False]
        fit_to_drive = len(defects) == 0
        doc = {
            "inspection_id": f"PRE-{uuid.uuid4().hex[:10]}",
            "vehicle_rego": body["vehicle_rego"].upper(),
            "driver_name": body["driver_name"],
            "driver_id": body.get("driver_id"),
            "checklist": checklist,
            "defects": defects,
            "fit_to_drive": fit_to_drive,
            "notes": body.get("notes"),
            "odometer_km": body.get("odometer_km"),
            "inspected_at": body.get("inspected_at") or _now_iso(),
        }
        stamp_account_fn(doc, current_user)
        await db.pretrip_inspections.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="pretrip_inspection", record_id=doc["inspection_id"],
                           request=request, detail={"defects": defects})
        doc.pop("_id", None)
        return doc

    @api_router.get("/transport/pretrip-inspections")
    async def list_pretrip(current_user=pretrip_gate, limit: int = Query(200, le=1000)):
        q = {"account_id": account_id_for_fn(current_user)}
        q.update(visibility_filter_fn(current_user, "pretrip_inspections"))
        rows = await db.pretrip_inspections.find(q, {"_id": 0}).sort("inspected_at", -1).to_list(limit)
        return {"rows": rows, "total": len(rows)}

    # -------- Fatigue / EWD logs ----------------------------------------------
    @api_router.post("/transport/fatigue-logs")
    async def create_fatigue_log(body: dict, request: Request, current_user=fatigue_gate):
        if not body.get("driver_name") or body.get("work_hours") is None:
            raise HTTPException(400, "driver_name and work_hours are required")
        work = float(body.get("work_hours") or 0)
        rest = float(body.get("continuous_rest_hours") or 0)
        breach = False
        breaches = []
        if work > STANDARD_MAX_WORK_IN_DAY_HRS:
            breach = True
            breaches.append(f"Worked {work}h in day > {STANDARD_MAX_WORK_IN_DAY_HRS}h std limit")
        if rest < STANDARD_MIN_CONT_REST_IN_DAY_HRS:
            breach = True
            breaches.append(f"Continuous rest {rest}h < {STANDARD_MIN_CONT_REST_IN_DAY_HRS}h std minimum")
        doc = {
            "log_id": f"FT-{uuid.uuid4().hex[:10]}",
            "driver_name": body["driver_name"],
            "driver_id": body.get("driver_id"),
            "vehicle_rego": (body.get("vehicle_rego") or "").upper(),
            "work_hours": work,
            "continuous_rest_hours": rest,
            "standard": body.get("standard", "standard"),  # standard / bfm / afm
            "day_date": body.get("day_date") or datetime.now(timezone.utc).date().isoformat(),
            "breach": breach,
            "breach_reasons": breaches,
            "source": body.get("source", "manual"),  # manual / ewd
        }
        stamp_account_fn(doc, current_user)
        await db.fatigue_logs.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="fatigue_log", record_id=doc["log_id"],
                           request=request, detail={"breach": breach})
        doc.pop("_id", None)
        return doc

    @api_router.get("/transport/fatigue-logs")
    async def list_fatigue_logs(current_user=fatigue_gate, limit: int = Query(200, le=1000)):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.fatigue_logs.find(q, {"_id": 0}).sort("day_date", -1).to_list(limit)
        return {"rows": rows, "total": len(rows)}

    @api_router.get("/transport/fatigue-logs/breaches")
    async def list_fatigue_breaches(current_user=fatigue_gate):
        q = {"account_id": account_id_for_fn(current_user), "breach": True}
        rows = await db.fatigue_logs.find(q, {"_id": 0}).sort("day_date", -1).to_list(200)
        return {"rows": rows, "total": len(rows)}

    # -------- Fitness-for-duty ------------------------------------------------
    @api_router.post("/transport/fitness-for-duty")
    async def create_ffd(body: dict, request: Request, current_user=ffd_gate):
        if not body.get("driver_name"):
            raise HTTPException(400, "driver_name is required")
        hours = float(body.get("hours_slept_24h") or 0)
        fit = bool(body.get("fit_to_drive", True)) and hours >= 5.0 and not body.get("on_medication_affecting")
        doc = {
            "declaration_id": f"FFD-{uuid.uuid4().hex[:10]}",
            "driver_name": body["driver_name"],
            "driver_id": body.get("driver_id"),
            "hours_slept_24h": hours,
            "alcohol_last_8h": bool(body.get("alcohol_last_8h", False)),
            "on_medication_affecting": bool(body.get("on_medication_affecting", False)),
            "unwell": bool(body.get("unwell", False)),
            "fit_to_drive": fit,
            "declared_at": _now_iso(),
        }
        stamp_account_fn(doc, current_user)
        await db.fitness_for_duty.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="declare",
                           record_type="fitness_for_duty", record_id=doc["declaration_id"],
                           request=request, detail={"fit": fit})
        doc.pop("_id", None)
        return doc

    @api_router.get("/transport/fitness-for-duty")
    async def list_ffd(current_user=ffd_gate, limit: int = Query(200, le=1000)):
        q = {"account_id": account_id_for_fn(current_user)}
        q.update(visibility_filter_fn(current_user, "fitness_for_duty"))
        rows = await db.fitness_for_duty.find(q, {"_id": 0}).sort("declared_at", -1).to_list(limit)
        return {"rows": rows, "total": len(rows)}

    # -------- Load restraint --------------------------------------------------
    @api_router.post("/transport/load-restraint")
    async def create_load_restraint(body: dict, request: Request, current_user=restraint_gate):
        if not body.get("vehicle_rego") or not body.get("load_description"):
            raise HTTPException(400, "vehicle_rego and load_description are required")
        doc = {
            "record_id": f"LR-{uuid.uuid4().hex[:10]}",
            "vehicle_rego": body["vehicle_rego"].upper(),
            "load_description": body["load_description"],
            "load_weight_kg": body.get("load_weight_kg"),
            "restraint_method": body.get("restraint_method"),  # tie-down / direct / blocking
            "number_of_straps": body.get("number_of_straps"),
            "friction_modifier": body.get("friction_modifier"),
            "performance_standard_met": bool(body.get("performance_standard_met", True)),
            "checked_by": body.get("checked_by") or getattr(current_user, "full_name", None),
            "created_at": _now_iso(),
        }
        stamp_account_fn(doc, current_user)
        await db.load_restraint.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="load_restraint", record_id=doc["record_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/transport/load-restraint")
    async def list_load_restraint(current_user=restraint_gate, limit: int = Query(200, le=1000)):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.load_restraint.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
        return {"rows": rows, "total": len(rows)}

    # -------- Mass management -------------------------------------------------
    @api_router.post("/transport/mass-declarations")
    async def create_mass_decl(body: dict, request: Request, current_user=mass_gate):
        if not body.get("vehicle_rego") or body.get("declared_mass_kg") is None:
            raise HTTPException(400, "vehicle_rego and declared_mass_kg are required")
        declared = float(body["declared_mass_kg"])
        allowed = float(body.get("allowed_mass_kg") or 0)
        overweight = allowed > 0 and declared > allowed
        doc = {
            "decl_id": f"MM-{uuid.uuid4().hex[:10]}",
            "vehicle_rego": body["vehicle_rego"].upper(),
            "scheme": body.get("scheme", "GML"),  # GML / CML / HML / PBS
            "declared_mass_kg": declared,
            "allowed_mass_kg": allowed,
            "overweight": overweight,
            "route": body.get("route"),
            "consigner": body.get("consigner"),
            "created_at": _now_iso(),
        }
        stamp_account_fn(doc, current_user)
        await db.mass_declarations.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="mass_declaration", record_id=doc["decl_id"],
                           request=request, detail={"overweight": overweight})
        doc.pop("_id", None)
        return doc

    @api_router.get("/transport/mass-declarations")
    async def list_mass_decl(current_user=mass_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.mass_declarations.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
        return {"rows": rows, "total": len(rows)}

    # -------- CoR executive due-diligence log ---------------------------------
    @api_router.post("/transport/cor-due-diligence")
    async def create_cor_dd(body: dict, request: Request, current_user=cor_gate):
        if not body.get("party") or not body.get("action"):
            raise HTTPException(400, "party and action are required")
        doc = {
            "entry_id": f"DD-{uuid.uuid4().hex[:10]}",
            "party": body["party"],  # Consigner / Packer / Loader / Driver / Scheduler / Operator
            "hazard": body.get("hazard"),
            "action": body["action"],
            "evidence_link": body.get("evidence_link"),
            "reviewed_by": body.get("reviewed_by") or getattr(current_user, "full_name", None),
            "next_review_at": body.get("next_review_at"),
            "created_at": _now_iso(),
        }
        stamp_account_fn(doc, current_user)
        await db.cor_due_diligence.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="cor_due_diligence", record_id=doc["entry_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/transport/cor-due-diligence")
    async def list_cor_dd(current_user=cor_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.cor_due_diligence.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
        return {"rows": rows, "total": len(rows)}

    # -------- NHVR Notifiable Occurrence --------------------------------------
    @api_router.post("/transport/nhvr-occurrences")
    async def create_nhvr_occurrence(body: dict, request: Request, current_user=nhvr_gate):
        required = ("occurrence_type", "summary", "occurred_at")
        for f in required:
            if not body.get(f):
                raise HTTPException(400, f"{f} is required")
        # HVNL: serious/critical occurrences must be reported to NHVR in 24h
        occurred = body["occurred_at"]
        try:
            occ_dt = datetime.fromisoformat(occurred.replace("Z", "+00:00"))
        except Exception:
            occ_dt = datetime.now(timezone.utc)
        deadline = (occ_dt + timedelta(hours=24)).isoformat()
        doc = {
            "occurrence_id": f"NHVR-{uuid.uuid4().hex[:10]}",
            "occurrence_type": body["occurrence_type"],  # death / serious injury / rollover / load loss
            "summary": body["summary"],
            "vehicle_rego": (body.get("vehicle_rego") or "").upper(),
            "driver_name": body.get("driver_name"),
            "occurred_at": occurred,
            "location": body.get("location"),
            "notify_nhvr_by": deadline,
            "nhvr_notified_at": None,
            "status": "pending",
        }
        stamp_account_fn(doc, current_user)
        await db.nhvr_occurrences.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="nhvr_occurrence", record_id=doc["occurrence_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/transport/nhvr-occurrences")
    async def list_nhvr_occurrence(current_user=nhvr_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.nhvr_occurrences.find(q, {"_id": 0}).sort("occurred_at", -1).to_list(500)
        return {"rows": rows, "total": len(rows)}
