"""SafeBase — Industry Alert Tile inline-action endpoints (Iter57).

These are the small write endpoints that back the dashboard's IndustryAlertTile
inline buttons. Each writes a record, audit-logs the action and (where
applicable) attempts an email or push notification. Resend may be unconfigured
locally; send_email is best-effort and never throws.

Endpoints:
  POST /api/transport/drivers/{driver_id}/pause
  POST /api/healthcare/ahpra-register/{clinician_id}/remind
  POST /api/licences/{licence_id}/remind
  POST /api/retail/lone-worker/{shift_id}/acknowledge
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request

from routes.email_util import send_email


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def register_inline_action_routes(api_router: APIRouter, *, db, get_current_user_dep,
                                  account_id_for_fn, log_audit_fn, logger):
    """Mount the IndustryAlertTile inline-action routes."""

    # ─────────── Transport: pause a driver after fatigue cap ───────────
    @api_router.post("/transport/drivers/{driver_id}/pause")
    async def pause_driver(driver_id: str, body: dict, request: Request,
                           current_user=Depends(get_current_user_dep)):
        reason = (body.get("reason") or "Paused from dashboard fatigue alert").strip()
        doc = {
            "pause_id": f"pa-{uuid.uuid4().hex[:10]}",
            "driver_id": driver_id,
            "owner_id": current_user.user_id,
            "account_id": account_id_for_fn(current_user),
            "reason": reason,
            "paused_at": _now_iso(),
            "paused_by_user_id": current_user.user_id,
            "active": True,
        }
        await db.driver_pauses.insert_one(doc)
        # Also stamp the driver/worker doc with a paused_until=None marker so
        # scheduling code can pick it up.
        await db.users.update_one(
            {"user_id": driver_id},
            {"$set": {"paused": True, "paused_at": doc["paused_at"], "paused_reason": reason}},
        )
        await log_audit_fn(db, user=current_user, action="pause",
                           record_type="driver", record_id=driver_id, request=request)
        doc.pop("_id", None)
        return {"ok": True, "pause": doc}

    # ─────────── Healthcare: email an AHPRA renewal reminder ───────────
    @api_router.post("/healthcare/ahpra-register/{clinician_id}/remind")
    async def remind_ahpra(clinician_id: str, body: dict, request: Request,
                            current_user=Depends(get_current_user_dep)):
        clin = await db.clinicians.find_one(
            {"clinician_id": clinician_id, "owner_id": current_user.user_id},
            {"_id": 0},
        )
        if not clin:
            raise HTTPException(404, "Clinician not found")
        email = clin.get("email") or clin.get("contact_email")
        name = clin.get("name") or "Clinician"
        reg = clin.get("ahpra_registration") or {}
        expires_on = reg.get("expires_on")
        sent_via = "queued"
        if email:
            html = (
                f"<p>Hi {name},</p>"
                f"<p>This is a friendly reminder from your employer to renew your AHPRA registration "
                f"(<strong>{reg.get('number') or 'AHPRA #'}</strong>) before it expires on "
                f"<strong>{expires_on or 'the recorded date'}</strong>.</p>"
                f"<p>Please complete your renewal at "
                f"<a href='https://www.ahpra.gov.au'>ahpra.gov.au</a> and update your record in "
                f"SafeBase once it's done.</p>"
                f"<p>— Sent via SafeBase</p>"
            )
            result = await send_email(to=email, subject="AHPRA registration renewal reminder", html=html)
            sent_via = "resend" if result.get("ok") else "queued"
        doc = {
            "reminder_id": f"rm-{uuid.uuid4().hex[:10]}",
            "kind": "ahpra_renewal",
            "clinician_id": clinician_id,
            "owner_id": current_user.user_id,
            "account_id": account_id_for_fn(current_user),
            "sent_at": _now_iso(),
            "sent_to": email,
            "sent_via": sent_via,
        }
        await db.reminders.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="remind",
                           record_type="ahpra_registration", record_id=clinician_id, request=request)
        doc.pop("_id", None)
        return {"ok": True, "reminder": doc}

    # ─────────── Trades: email a licence renewal reminder ───────────
    @api_router.post("/licences/{licence_id}/remind")
    async def remind_licence(licence_id: str, body: dict, request: Request,
                              current_user=Depends(get_current_user_dep)):
        lic = await db.licences.find_one(
            {"licence_id": licence_id, "user_id": current_user.user_id},
            {"_id": 0},
        )
        if not lic:
            raise HTTPException(404, "Licence not found")
        worker_id = lic.get("worker_id")
        worker = None
        if worker_id:
            worker = await db.workers.find_one({"worker_id": worker_id}, {"_id": 0}) or None
        email = (worker or {}).get("email")
        name = (worker or {}).get("name") or "Worker"
        sent_via = "queued"
        if email:
            html = (
                f"<p>Hi {name},</p>"
                f"<p>Your <strong>{(lic.get('licence_type') or '').replace('_', ' ').title()}</strong> "
                f"(#{lic.get('licence_number') or '—'}) is approaching expiry on "
                f"<strong>{lic.get('expiry_date') or 'the recorded date'}</strong>.</p>"
                f"<p>Please renew it and upload the new certificate in SafeBase.</p>"
                f"<p>— Sent via SafeBase</p>"
            )
            result = await send_email(to=email, subject="Licence renewal reminder", html=html)
            sent_via = "resend" if result.get("ok") else "queued"
        doc = {
            "reminder_id": f"rm-{uuid.uuid4().hex[:10]}",
            "kind": "licence_renewal",
            "licence_id": licence_id,
            "worker_id": worker_id,
            "owner_id": current_user.user_id,
            "account_id": account_id_for_fn(current_user),
            "sent_at": _now_iso(),
            "sent_to": email,
            "sent_via": sent_via,
        }
        await db.reminders.insert_one(doc)
        await log_audit_fn(db, user=current_user, action="remind",
                           record_type="licence", record_id=licence_id, request=request)
        doc.pop("_id", None)
        return {"ok": True, "reminder": doc}

    # ─────────── Retail: acknowledge a missed lone-worker check-in ───────────
    @api_router.post("/retail/lone-worker/{shift_id}/acknowledge")
    async def acknowledge_lone_worker(shift_id: str, body: dict, request: Request,
                                      current_user=Depends(get_current_user_dep)):
        shift = await db.lone_worker_shifts.find_one(
            {"shift_id": shift_id, "owner_id": current_user.user_id},
            {"_id": 0},
        )
        if not shift:
            raise HTTPException(404, "Shift not found")
        now_iso = _now_iso()
        note = (body.get("note") or "").strip() or None
        await db.lone_worker_shifts.update_one(
            {"shift_id": shift_id, "owner_id": current_user.user_id},
            {"$set": {
                "last_acknowledged_at": now_iso,
                "last_acknowledged_by_user_id": current_user.user_id,
                "last_acknowledged_note": note,
            }},
        )
        await log_audit_fn(db, user=current_user, action="acknowledge",
                           record_type="lone_worker_shift", record_id=shift_id, request=request)
        return {"ok": True, "shift_id": shift_id, "acknowledged_at": now_iso}
