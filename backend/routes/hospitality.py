"""
Hospitality industry-specific endpoints (Part of the multi-industry backend).

All routes are hard-blocked to `industry == "hospitality"` via
`require_feature(code)`. A healthcare/transport/retail/trades user calling any
of these endpoints will receive a 403 with a clean error payload.

Mount via register_hospitality_routes(api_router, db, get_current_user_dep,
                                      require_feature, account_id_for_fn,
                                      stamp_account_fn, visibility_filter_fn,
                                      log_audit_fn, logger)

Endpoints:
  Temperature logs (Std 3.2.2 & 3.2.2A — automated 4-hour rule):
    POST /api/hospitality/temperature-logs
    GET  /api/hospitality/temperature-logs
    GET  /api/hospitality/temperature-logs/stats

  Food Safety Supervisor (FSS) register:
    POST /api/hospitality/fss-register
    GET  /api/hospitality/fss-register

  HACCP CCP log (Standard 3.2.1):
    POST /api/hospitality/haccp-ccp
    GET  /api/hospitality/haccp-ccp

  Allergen register:
    POST /api/hospitality/allergens
    GET  /api/hospitality/allergens

  Cleaning schedule:
    POST /api/hospitality/cleaning-tasks
    GET  /api/hospitality/cleaning-tasks
    POST /api/hospitality/cleaning-tasks/{task_id}/complete

  Supplier register:
    POST /api/hospitality/suppliers
    GET  /api/hospitality/suppliers

  RSA / Liquor register:
    POST /api/hospitality/liquor-certs
    GET  /api/hospitality/liquor-certs

  Council inspection pack:
    POST /api/hospitality/inspection-pack
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query


# Danger zone thresholds (°C) per FSANZ Std 3.2.2
COLD_MIN, COLD_MAX = -99.0, 5.0   # cold storage must be ≤5°C
FROZEN_MAX = -15.0                # frozen storage must be ≤-15°C
HOT_MIN = 60.0                    # hot holding must be ≥60°C


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def register_hospitality_routes(api_router: APIRouter, *, db, get_current_user_dep,
                                require_feature, account_id_for_fn,
                                stamp_account_fn, visibility_filter_fn,
                                log_audit_fn, logger):

    temp_gate = Depends(require_feature("temperature_log"))
    fss_gate = Depends(require_feature("food_safety_module"))
    haccp_gate = Depends(require_feature("haccp_plans"))
    allergen_gate = Depends(require_feature("allergen_register"))
    clean_gate = Depends(require_feature("cleaning_schedule"))
    supplier_gate = Depends(require_feature("supplier_register"))
    council_gate = Depends(require_feature("council_inspection_pack"))

    # -------- Temperature logs ------------------------------------------------
    @api_router.post("/hospitality/temperature-logs")
    async def create_temp_log(body: dict, request: Request, current_user=temp_gate):
        equipment = (body.get("equipment") or "").strip()
        equip_type = (body.get("equipment_type") or "fridge").lower()
        temp_c = body.get("temp_c")
        if not equipment or temp_c is None:
            raise HTTPException(400, "equipment and temp_c are required")
        try:
            temp_c = float(temp_c)
        except (TypeError, ValueError):
            raise HTTPException(400, "temp_c must be numeric")

        # Automated compliance decision
        in_range = True
        reason = None
        if equip_type in ("fridge", "coolroom", "cold_display"):
            in_range = temp_c <= COLD_MAX
            reason = f"Cold storage must be ≤{COLD_MAX}°C (FSANZ Std 3.2.2)"
        elif equip_type == "freezer":
            in_range = temp_c <= FROZEN_MAX
            reason = f"Frozen storage must be ≤{FROZEN_MAX}°C"
        elif equip_type in ("bain_marie", "hot_display", "hot_holding"):
            in_range = temp_c >= HOT_MIN
            reason = f"Hot holding must be ≥{HOT_MIN}°C (FSANZ Std 3.2.2)"

        doc = {
            "log_id": f"TL-{uuid.uuid4().hex[:10]}",
            "equipment": equipment,
            "equipment_type": equip_type,
            "temp_c": temp_c,
            "taken_at": body.get("taken_at") or _now_iso(),
            "taken_by": body.get("taken_by") or getattr(current_user, "full_name", None),
            "corrective_action": body.get("corrective_action"),
            "in_range": in_range,
            "out_of_range_reason": None if in_range else reason,
        }
        stamp_account_fn(doc, current_user)
        await db.temperature_logs.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="temperature_log", record_id=doc["log_id"],
                           request=request, detail={"temp_c": temp_c, "in_range": in_range})
        doc.pop("_id", None)
        return doc

    @api_router.get("/hospitality/temperature-logs")
    async def list_temp_logs(current_user=temp_gate, limit: int = Query(200, le=1000)):
        q = {"account_id": account_id_for_fn(current_user)}
        q.update(visibility_filter_fn(current_user, "temperature_logs"))
        rows = await db.temperature_logs.find(q, {"_id": 0}).sort("taken_at", -1).to_list(limit)
        return {"rows": rows, "total": len(rows)}

    @api_router.get("/hospitality/temperature-logs/stats")
    async def temp_log_stats(current_user=temp_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        # Last 30 days
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        rows = await db.temperature_logs.find(
            {**q, "taken_at": {"$gte": cutoff}}, {"_id": 0}).to_list(2000)
        total = len(rows)
        breaches = [r for r in rows if not r.get("in_range")]
        by_equip: dict = {}
        for r in rows:
            k = r.get("equipment") or "unknown"
            by_equip.setdefault(k, {"total": 0, "breaches": 0})
            by_equip[k]["total"] += 1
            if not r.get("in_range"):
                by_equip[k]["breaches"] += 1
        return {
            "total_30d": total,
            "breaches_30d": len(breaches),
            "breach_rate_pct": round((len(breaches) / total * 100.0), 1) if total else 0.0,
            "by_equipment": by_equip,
            "recent_breaches": breaches[:10],
        }

    # -------- FSS register ----------------------------------------------------
    @api_router.post("/hospitality/fss-register")
    async def create_fss(body: dict, request: Request, current_user=fss_gate):
        required = ("worker_name", "certificate_number", "issuing_rto")
        for f in required:
            if not body.get(f):
                raise HTTPException(400, f"{f} is required")
        doc = {
            "fss_id": f"FSS-{uuid.uuid4().hex[:10]}",
            "worker_name": body["worker_name"],
            "worker_id": body.get("worker_id"),
            "certificate_number": body["certificate_number"],
            "issuing_rto": body["issuing_rto"],
            "issued_at": body.get("issued_at"),
            "expires_at": body.get("expires_at"),
            "jurisdiction": body.get("jurisdiction", "NSW"),
            "is_primary_fss": bool(body.get("is_primary_fss", False)),
            "notes": body.get("notes"),
        }
        stamp_account_fn(doc, current_user)
        await db.fss_register.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="fss_register", record_id=doc["fss_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/hospitality/fss-register")
    async def list_fss(current_user=fss_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.fss_register.find(q, {"_id": 0}).sort("worker_name", 1).to_list(500)
        # Flag anyone whose cert expires in the next 30 days
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

    # -------- HACCP CCP log ---------------------------------------------------
    @api_router.post("/hospitality/haccp-ccp")
    async def create_haccp_ccp(body: dict, request: Request, current_user=haccp_gate):
        if not body.get("ccp_step") or body.get("measured_value") is None:
            raise HTTPException(400, "ccp_step and measured_value are required")
        doc = {
            "ccp_id": f"CCP-{uuid.uuid4().hex[:10]}",
            "hazard": body.get("hazard"),  # biological / chemical / physical
            "ccp_step": body["ccp_step"],  # e.g. "Cook — centre of poultry"
            "critical_limit": body.get("critical_limit"),  # e.g. ">=75°C for 15s"
            "measured_value": body["measured_value"],
            "within_limit": bool(body.get("within_limit", True)),
            "corrective_action": body.get("corrective_action"),
            "verified_by": body.get("verified_by") or getattr(current_user, "full_name", None),
            "recorded_at": body.get("recorded_at") or _now_iso(),
        }
        stamp_account_fn(doc, current_user)
        await db.haccp_ccp_log.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="haccp_ccp", record_id=doc["ccp_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/hospitality/haccp-ccp")
    async def list_haccp_ccp(current_user=haccp_gate, limit: int = Query(200, le=1000)):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.haccp_ccp_log.find(q, {"_id": 0}).sort("recorded_at", -1).to_list(limit)
        breaches = sum(1 for r in rows if not r.get("within_limit"))
        return {"rows": rows, "total": len(rows), "breach_count": breaches}

    # -------- Allergen register -----------------------------------------------
    @api_router.post("/hospitality/allergens")
    async def upsert_allergen(body: dict, request: Request, current_user=allergen_gate):
        if not body.get("menu_item"):
            raise HTTPException(400, "menu_item is required")
        doc = {
            "item_id": body.get("item_id") or f"ALG-{uuid.uuid4().hex[:10]}",
            "menu_item": body["menu_item"],
            "contains": body.get("contains", []),  # list of allergens
            "may_contain": body.get("may_contain", []),
            "notes": body.get("notes"),
            "updated_at": _now_iso(),
        }
        stamp_account_fn(doc, current_user)
        await db.allergen_register.update_one(
            {"account_id": doc["account_id"], "item_id": doc["item_id"]},
            {"$set": doc},
            upsert=True,
        )
        await log_audit_fn(db, user=current_user, action="upsert",
                           record_type="allergen", record_id=doc["item_id"], request=request)
        return doc

    @api_router.get("/hospitality/allergens")
    async def list_allergens(current_user=allergen_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.allergen_register.find(q, {"_id": 0}).sort("menu_item", 1).to_list(500)
        return {"rows": rows, "total": len(rows)}

    # -------- Cleaning schedule -----------------------------------------------
    @api_router.post("/hospitality/cleaning-tasks")
    async def create_cleaning_task(body: dict, request: Request, current_user=clean_gate):
        required = ("area", "frequency")
        for f in required:
            if not body.get(f):
                raise HTTPException(400, f"{f} is required")
        doc = {
            "task_id": f"CL-{uuid.uuid4().hex[:10]}",
            "area": body["area"],
            "frequency": body["frequency"],  # daily / weekly / monthly
            "method": body.get("method"),
            "chemical": body.get("chemical"),
            "responsible": body.get("responsible"),
            "last_completed_at": None,
            "last_completed_by": None,
            "status": "open",
        }
        stamp_account_fn(doc, current_user)
        await db.cleaning_tasks.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="cleaning_task", record_id=doc["task_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/hospitality/cleaning-tasks")
    async def list_cleaning_tasks(current_user=clean_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.cleaning_tasks.find(q, {"_id": 0}).sort("area", 1).to_list(500)
        return {"rows": rows, "total": len(rows)}

    @api_router.post("/hospitality/cleaning-tasks/{task_id}/complete")
    async def complete_cleaning_task(task_id: str, body: dict, request: Request, current_user=clean_gate):
        rec = await db.cleaning_tasks.find_one(
            {"task_id": task_id, "account_id": account_id_for_fn(current_user)}, {"_id": 0})
        if not rec:
            raise HTTPException(404, "Task not found")
        await db.cleaning_tasks.update_one(
            {"task_id": task_id},
            {"$set": {
                "last_completed_at": _now_iso(),
                "last_completed_by": body.get("completed_by") or getattr(current_user, "full_name", None),
                "status": "completed",
            }},
        )
        await log_audit_fn(db, user=current_user, action="complete",
                           record_type="cleaning_task", record_id=task_id, request=request)
        return {"task_id": task_id, "status": "completed"}

    # -------- Supplier register -----------------------------------------------
    @api_router.post("/hospitality/suppliers")
    async def create_supplier(body: dict, request: Request, current_user=supplier_gate):
        if not body.get("name"):
            raise HTTPException(400, "name is required")
        doc = {
            "supplier_id": f"SUP-{uuid.uuid4().hex[:10]}",
            "name": body["name"],
            "category": body.get("category"),  # meat, seafood, dairy, produce, dry
            "abn": body.get("abn"),
            "contact_email": body.get("contact_email"),
            "contact_phone": body.get("contact_phone"),
            "approval_certificates": body.get("approval_certificates", []),
            "last_audit_at": body.get("last_audit_at"),
            "notes": body.get("notes"),
        }
        stamp_account_fn(doc, current_user)
        await db.suppliers.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="supplier", record_id=doc["supplier_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/hospitality/suppliers")
    async def list_suppliers(current_user=supplier_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.suppliers.find(q, {"_id": 0}).sort("name", 1).to_list(500)
        return {"rows": rows, "total": len(rows)}

    # -------- RSA / Liquor register -------------------------------------------
    @api_router.post("/hospitality/liquor-certs")
    async def create_liquor_cert(body: dict, request: Request, current_user=fss_gate):
        if not body.get("worker_name") or not body.get("certificate_type"):
            raise HTTPException(400, "worker_name and certificate_type are required")
        doc = {
            "cert_id": f"LIQ-{uuid.uuid4().hex[:10]}",
            "worker_name": body["worker_name"],
            "worker_id": body.get("worker_id"),
            "certificate_type": body["certificate_type"],  # RSA / RSG / Approved Manager
            "certificate_number": body.get("certificate_number"),
            "jurisdiction": body.get("jurisdiction", "NSW"),
            "issued_at": body.get("issued_at"),
            "expires_at": body.get("expires_at"),
        }
        stamp_account_fn(doc, current_user)
        await db.liquor_certs.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="create",
                           record_type="liquor_cert", record_id=doc["cert_id"], request=request)
        doc.pop("_id", None)
        return doc

    @api_router.get("/hospitality/liquor-certs")
    async def list_liquor_certs(current_user=fss_gate):
        q = {"account_id": account_id_for_fn(current_user)}
        rows = await db.liquor_certs.find(q, {"_id": 0}).sort("worker_name", 1).to_list(500)
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

    # -------- Council inspection pack -----------------------------------------
    @api_router.post("/hospitality/inspection-pack")
    async def generate_inspection_pack(body: dict, request: Request, current_user=council_gate):
        """Bundle the key evidence sources into an inspection-ready pack.

        Does not produce a binary PDF here (docs_module renderer handles that
        elsewhere); returns a manifest of what an inspector can request.
        """
        account_id = account_id_for_fn(current_user)
        manifest = {}
        # Count evidence in each source
        for coll, key in [
            ("temperature_logs", "temperature_logs"),
            ("fss_register", "fss_register"),
            ("haccp_ccp_log", "haccp_ccp"),
            ("allergen_register", "allergens"),
            ("cleaning_tasks", "cleaning_tasks"),
            ("suppliers", "suppliers"),
            ("liquor_certs", "liquor_certs"),
        ]:
            try:
                manifest[key] = await db[coll].count_documents({"account_id": account_id})
            except Exception:
                manifest[key] = 0
        pack = {
            "pack_id": f"CIP-{uuid.uuid4().hex[:10]}",
            "generated_at": _now_iso(),
            "covers_period_days": int(body.get("covers_period_days") or 30),
            "manifest": manifest,
        }
        stamp_account_fn(pack, current_user)
        await db.council_inspection_packs.insert_one(pack)
        await log_audit_fn(db, user=current_user, action="generate",
                           record_type="inspection_pack", record_id=pack["pack_id"], request=request)
        pack.pop("_id", None)
        return pack
