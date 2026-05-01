"""
Industry integration stubs — endpoints the user (or a 3rd party) can POST to
in order to feed external data into SafeBase. Wired as proper routers but
with thin implementations that just write to the same collections the main
industry pages read from. Later can be replaced with proper SDKs / polling
workers without breaking contracts.

Endpoints:
  POST /api/integrations/iot/temperature   — IoT sensor webhook (hospitality)
  POST /api/integrations/ewd/fatigue       — EWD provider webhook (transport)
  POST /api/integrations/ahpra/poll        — manual AHPRA refresh trigger (healthcare)
  POST /api/integrations/ahpra/webhook     — receive AHPRA change notification
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Request


# Very lightweight auth — a shared secret header. In production each account
# would have its own secret stored in `account_integration_tokens`.
INTEGRATION_HEADER = "x-safebase-integration-token"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def register_integration_routes(api_router: APIRouter, *, db, get_current_user_dep,
                                 account_id_for_fn, stamp_account_fn, log_audit_fn, logger):

    async def _resolve_account(token: str | None, x_account_id: str | None):
        """Resolve account from integration token OR account header.

        For now, integration tokens are stored in `account_integration_tokens`:
        {account_id, token, created_at}. If token is missing, fall back to
        `x-safebase-account` header (used for local testing). Raises 401 on
        unknown token.
        """
        if token:
            row = await db.account_integration_tokens.find_one({"token": token}, {"_id": 0, "account_id": 1})
            if row:
                return row["account_id"]
        if x_account_id:
            # Accept header-only for internal testing; production should require token
            return x_account_id
        raise HTTPException(401, "Missing integration token")

    # -------- IoT Temperature sensor webhook ---------------------------------
    @api_router.post("/integrations/iot/temperature")
    async def iot_temperature(body: dict, request: Request,
                              x_safebase_integration_token: Optional[str] = Header(None, alias=INTEGRATION_HEADER),
                              x_safebase_account: Optional[str] = Header(None)):
        account_id = await _resolve_account(x_safebase_integration_token, x_safebase_account)
        equipment = (body.get("equipment") or body.get("sensor_id") or "").strip()
        temp_c = body.get("temp_c")
        equip_type = (body.get("equipment_type") or "fridge").lower()
        if not equipment or temp_c is None:
            raise HTTPException(400, "equipment and temp_c are required")
        try:
            temp_c = float(temp_c)
        except Exception:
            raise HTTPException(400, "temp_c must be numeric")

        # Apply the same compliance check the hospitality router uses
        from routes.hospitality import COLD_MAX, FROZEN_MAX, HOT_MIN
        in_range = True
        reason = None
        if equip_type in ("fridge", "coolroom", "cold_display"):
            in_range = temp_c <= COLD_MAX
            reason = f"Cold storage must be ≤{COLD_MAX}°C (FSANZ Std 3.2.2)"
        elif equip_type == "freezer":
            in_range = temp_c <= FROZEN_MAX
            reason = f"Frozen storage must be ≤{FROZEN_MAX}°C"
        elif equip_type in ("bain_marie", "hot_holding", "hot_display"):
            in_range = temp_c >= HOT_MIN
            reason = f"Hot holding must be ≥{HOT_MIN}°C"

        doc = {
            "log_id": f"TL-{uuid.uuid4().hex[:10]}",
            "equipment": equipment,
            "equipment_type": equip_type,
            "temp_c": temp_c,
            "taken_at": body.get("taken_at") or _now_iso(),
            "taken_by": body.get("taken_by") or "iot_sensor",
            "in_range": in_range,
            "out_of_range_reason": None if in_range else reason,
            "source": "iot",
            "sensor_id": body.get("sensor_id"),
            "account_id": account_id,
            "industry": "hospitality",
            "created_at": _now_iso(),
        }
        await db.temperature_logs.insert_one(doc)
        doc.pop("_id", None)
        return {"ok": True, "log_id": doc["log_id"], "in_range": in_range}

    # -------- EWD fatigue webhook --------------------------------------------
    @api_router.post("/integrations/ewd/fatigue")
    async def ewd_fatigue(body: dict,
                           x_safebase_integration_token: Optional[str] = Header(None, alias=INTEGRATION_HEADER),
                           x_safebase_account: Optional[str] = Header(None)):
        account_id = await _resolve_account(x_safebase_integration_token, x_safebase_account)
        if not body.get("driver_name") or body.get("work_hours") is None:
            raise HTTPException(400, "driver_name and work_hours are required")
        work = float(body.get("work_hours") or 0)
        rest = float(body.get("continuous_rest_hours") or 0)
        breach = work > 12.0 or rest < 7.0
        reasons = []
        if work > 12.0:
            reasons.append(f"Worked {work}h in day > 12h std limit")
        if rest < 7.0:
            reasons.append(f"Continuous rest {rest}h < 7h std minimum")
        doc = {
            "log_id": f"FT-{uuid.uuid4().hex[:10]}",
            "driver_name": body["driver_name"],
            "driver_id": body.get("driver_id"),
            "vehicle_rego": (body.get("vehicle_rego") or "").upper(),
            "work_hours": work,
            "continuous_rest_hours": rest,
            "standard": body.get("standard", "standard"),
            "day_date": body.get("day_date") or datetime.now(timezone.utc).date().isoformat(),
            "breach": breach,
            "breach_reasons": reasons,
            "source": "ewd",
            "ewd_provider": body.get("provider"),
            "account_id": account_id,
            "industry": "transport",
            "created_at": _now_iso(),
        }
        await db.fatigue_logs.insert_one(doc)
        doc.pop("_id", None)
        return {"ok": True, "log_id": doc["log_id"], "breach": breach}

    # -------- AHPRA polling --------------------------------------------------
    @api_router.post("/integrations/ahpra/poll")
    async def ahpra_poll(request: Request, current_user=Depends(get_current_user_dep)):
        """Manually trigger an AHPRA 'refresh' for this account.

        In production, a worker would call the AHPRA Public Register API for
        each registered clinician. Here we stamp `last_checked_at` on every
        record so the UI reflects a fresh poll. Owner-only.
        """
        if (getattr(current_user, "role_variant", "owner") or "owner").lower() != "owner":
            raise HTTPException(403, "Owner-only")
        account_id = account_id_for_fn(current_user)
        result = await db.ahpra_register.update_many(
            {"account_id": account_id},
            {"$set": {"last_checked_at": _now_iso()}},
        )
        await log_audit_fn(db, user=current_user, action="ahpra_poll",
                           record_type="ahpra_register", record_id="all", request=request,
                           detail={"matched": result.matched_count})
        return {"ok": True, "polled": result.matched_count, "at": _now_iso()}

    @api_router.post("/integrations/ahpra/webhook")
    async def ahpra_webhook(body: dict,
                             x_safebase_integration_token: Optional[str] = Header(None, alias=INTEGRATION_HEADER),
                             x_safebase_account: Optional[str] = Header(None)):
        """Receive a change notification for a clinician (e.g. status change).

        Body: {registration_number, status, conditions?, expires_at?}.
        Upserts onto the existing row if found.
        """
        account_id = await _resolve_account(x_safebase_integration_token, x_safebase_account)
        reg_no = body.get("registration_number")
        if not reg_no:
            raise HTTPException(400, "registration_number is required")
        update = {k: body[k] for k in ("status", "conditions", "expires_at") if k in body}
        update["last_checked_at"] = _now_iso()
        res = await db.ahpra_register.update_one(
            {"account_id": account_id, "registration_number": reg_no},
            {"$set": update},
        )
        return {"ok": True, "matched": res.matched_count, "modified": res.modified_count}
