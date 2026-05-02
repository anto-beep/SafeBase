"""
Cross-industry credential-driven scheduling block.

A worker cannot be rostered / assigned to a shift if any MANDATORY credential
is expired or missing for their industry. This module exposes:

  GET  /api/scheduling/check-eligibility/{worker_id}
         → { can_roster, blockers: [...], warnings: [...], industry }
  POST /api/scheduling/roster-gate         (batch)
         → { results: [ { worker_id, can_roster, blockers } ] }
  POST /api/scheduling/shifts
         → creates a shift doc; returns 409 if any listed worker is blocked

Logic is UNION across industries (healthcare AHPRA, hospitality FSS/RSA,
transport HR/MC, retail Quick Induct, trades white card) plus the generic
`licences` collection which stores all credential expiries.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException


# ----------------------------------------------------------------------
# Industry mandatory-credential matrix
# ----------------------------------------------------------------------
MANDATORY_BY_INDUSTRY = {
    "trades":      ["white_card"],
    "hospitality": ["food_safety_supervisor", "rsa"],
    "transport":   ["hr_licence", "fitness_for_duty"],
    "healthcare":  ["ahpra_registration", "worker_screening"],
    "retail":      ["quick_induct"],
}

# Map internal "kind" → readable label for the blocker list.
LABEL = {
    "white_card": "White Card",
    "food_safety_supervisor": "Food Safety Supervisor",
    "rsa": "Responsible Service of Alcohol",
    "hr_licence": "Heavy Rigid licence",
    "fitness_for_duty": "Fitness for Duty declaration (current day)",
    "ahpra_registration": "AHPRA Registration",
    "worker_screening": "Worker Screening / NDIS clearance",
    "quick_induct": "Quick Induct (90-day)",
    "licence_expired": "Credential expired",
    "licence_expiring": "Credential expiring within 14 days",
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _parse_date(s) -> Optional[datetime]:
    if not s: return None
    if isinstance(s, datetime):
        return s if s.tzinfo else s.replace(tzinfo=timezone.utc)
    try:
        d = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def register_scheduling_routes(api_router: APIRouter, *, db, get_current_user_dep,
                                account_id_for_fn, stamp_account_fn, logger):

    async def _worker_blockers(worker_id: str, account_id: str) -> dict:
        """Returns {can_roster, blockers, warnings, industry, worker}.

        A blocker prevents rostering outright. A warning is surfaced but
        does not block.
        """
        # Load worker doc (scoped to account). Workers use `worker_id` as their key.
        worker = await db.workers.find_one(
            {"$or": [{"worker_id": worker_id}, {"id": worker_id}], "account_id": account_id},
            {"_id": 0},
        )
        if not worker:
            raise HTTPException(404, f"Worker {worker_id} not found in your account")

        industry = worker.get("industry") or "trades"
        mandatory = MANDATORY_BY_INDUSTRY.get(industry, [])
        blockers: list[dict] = []
        warnings: list[dict] = []
        now = _now_utc()
        soon = now + timedelta(days=14)

        # -------- industry-specific credential checks ----------------------
        if "quick_induct" in mandatory:
            induct = await db.quick_induct.find_one(
                {"worker_id": worker_id, "account_id": account_id},
                sort=[("completed_at", -1)],
                projection={"_id": 0},
            )
            if not induct:
                blockers.append({"kind": "quick_induct", "label": LABEL["quick_induct"], "detail": "No Quick Induct record on file"})
            else:
                exp = _parse_date(induct.get("valid_until"))
                if exp and exp < now:
                    blockers.append({"kind": "quick_induct", "label": LABEL["quick_induct"], "detail": "Expired — requires refresh"})

        if "ahpra_registration" in mandatory:
            reg = await db.ahpra_registrations.find_one(
                {"worker_id": worker_id, "account_id": account_id},
                sort=[("expires_at", -1)],
                projection={"_id": 0},
            )
            if not reg:
                blockers.append({"kind": "ahpra_registration", "label": LABEL["ahpra_registration"], "detail": "No AHPRA record"})
            else:
                exp = _parse_date(reg.get("expires_at"))
                status = reg.get("status", "active")
                if status != "active" or (exp and exp < now):
                    blockers.append({"kind": "ahpra_registration", "label": LABEL["ahpra_registration"], "detail": f"Status '{status}'" + (f", expired {exp.date()}" if exp and exp < now else "")})
                elif exp and exp < soon:
                    warnings.append({"kind": "ahpra_registration", "label": LABEL["ahpra_registration"], "detail": f"Expires {exp.date()}"})

        if "worker_screening" in mandatory:
            scr = await db.worker_screening.find_one(
                {"worker_id": worker_id, "account_id": account_id},
                sort=[("expires_at", -1)],
                projection={"_id": 0},
            )
            if not scr:
                blockers.append({"kind": "worker_screening", "label": LABEL["worker_screening"], "detail": "No screening record"})
            else:
                exp = _parse_date(scr.get("expires_at"))
                if exp and exp < now:
                    blockers.append({"kind": "worker_screening", "label": LABEL["worker_screening"], "detail": f"Expired {exp.date()}"})
                elif exp and exp < soon:
                    warnings.append({"kind": "worker_screening", "label": LABEL["worker_screening"], "detail": f"Expires {exp.date()}"})

        if "fitness_for_duty" in mandatory:
            # Must have a fit-for-duty declaration within the last 24 hours.
            cutoff = now - timedelta(hours=24)
            ffd = await db.fitness_for_duty.find_one(
                {"worker_id": worker_id, "account_id": account_id, "declared_at": {"$gte": cutoff.isoformat()}},
                sort=[("declared_at", -1)],
                projection={"_id": 0},
            )
            if not ffd or ffd.get("fit_status") in ("unfit", False):
                blockers.append({"kind": "fitness_for_duty", "label": LABEL["fitness_for_duty"], "detail": "No current fit-for-duty declaration in last 24 hours"})

        # -------- generic licences collection (applies to every industry) --
        # Legacy licences use `user_id`, newer docs use `account_id` — match either.
        lics = await db.licences.find(
            {"worker_id": worker_id, "$or": [{"account_id": account_id}, {"user_id": account_id}]},
            {"_id": 0},
        ).to_list(500)

        required_kinds = {k for k in mandatory if k not in ("quick_induct", "ahpra_registration", "worker_screening", "fitness_for_duty")}
        found_kinds = set()
        for lic in lics:
            lk = (lic.get("kind") or lic.get("type") or lic.get("licence_type") or lic.get("name") or "").lower().replace(" ", "_")
            found_kinds.add(lk)
            exp = _parse_date(lic.get("expires_at") or lic.get("expiry_date"))
            if exp and exp < now:
                blockers.append({"kind": "licence_expired", "label": f"{lic.get('name') or lk} expired", "detail": f"Expired {exp.date()}"})
            elif exp and exp < soon:
                warnings.append({"kind": "licence_expiring", "label": f"{lic.get('name') or lk} expiring", "detail": f"Expires {exp.date()}"})

        # Missing mandatory licence kinds (e.g. white_card, hr_licence)
        for req in required_kinds:
            # consider matched if any found kind contains the required keyword
            if not any(req in fk or req.replace("_", "") in fk.replace("_", "") for fk in found_kinds):
                blockers.append({"kind": req, "label": LABEL.get(req, req), "detail": "Not on file"})

        return {
            "worker_id": worker_id,
            "worker_name": worker.get("name"),
            "industry": industry,
            "can_roster": len(blockers) == 0,
            "blockers": blockers,
            "warnings": warnings,
            "checked_at": now.isoformat(),
        }

    # =============================================================
    # PUBLIC ROUTES
    # =============================================================
    @api_router.get("/scheduling/check-eligibility/{worker_id}")
    async def check_eligibility(worker_id: str, current_user=Depends(get_current_user_dep)):
        account_id = account_id_for_fn(current_user)
        return await _worker_blockers(worker_id, account_id)

    @api_router.post("/scheduling/roster-gate")
    async def roster_gate(body: dict, current_user=Depends(get_current_user_dep)):
        """Batch check. Body: { worker_ids: [...] } → per-worker eligibility."""
        account_id = account_id_for_fn(current_user)
        worker_ids = body.get("worker_ids") or []
        if not isinstance(worker_ids, list):
            raise HTTPException(400, "worker_ids must be a list")
        results = []
        for wid in worker_ids[:200]:
            try:
                results.append(await _worker_blockers(wid, account_id))
            except HTTPException as e:
                results.append({"worker_id": wid, "can_roster": False, "error": e.detail, "blockers": []})
        blocked_count = sum(1 for r in results if not r.get("can_roster"))
        return {
            "total": len(results),
            "blocked_count": blocked_count,
            "clear_count": len(results) - blocked_count,
            "results": results,
        }

    @api_router.post("/scheduling/shifts")
    async def create_shift(body: dict, current_user=Depends(get_current_user_dep)):
        """Create a shift. Returns 409 with blocker details if any assigned
        worker is ineligible — preventing the shift being saved."""
        account_id = account_id_for_fn(current_user)
        worker_ids = body.get("worker_ids") or []
        starts_at = body.get("starts_at")
        ends_at = body.get("ends_at")
        site = body.get("site")
        if not worker_ids or not starts_at:
            raise HTTPException(400, "worker_ids and starts_at are required")

        # Check every worker
        blocked_workers = []
        for wid in worker_ids:
            try:
                res = await _worker_blockers(wid, account_id)
            except HTTPException:
                blocked_workers.append({"worker_id": wid, "blockers": [{"kind": "not_found", "label": "Worker not found"}]})
                continue
            if not res["can_roster"]:
                blocked_workers.append({"worker_id": wid, "worker_name": res.get("worker_name"), "blockers": res["blockers"]})

        if blocked_workers:
            raise HTTPException(status_code=409, detail={
                "error": "scheduling_blocked",
                "message": f"{len(blocked_workers)} of {len(worker_ids)} assigned workers are not eligible to roster.",
                "blocked": blocked_workers,
            })

        # All clear — save shift
        doc = {
            "id": str(uuid4()),
            "worker_ids": worker_ids,
            "starts_at": starts_at,
            "ends_at": ends_at,
            "site": site,
            "notes": body.get("notes"),
            "status": "scheduled",
        }
        stamp_account_fn(doc, current_user)
        doc.setdefault("created_at", _now_utc().isoformat())
        await db.shifts.insert_one(dict(doc))
        doc.pop("_id", None)
        return {"ok": True, "shift": doc}

    @api_router.get("/scheduling/mandatory-credentials")
    async def mandatory_credentials(industry: Optional[str] = None):
        """Public reference: what credentials each industry requires."""
        if industry:
            if industry not in MANDATORY_BY_INDUSTRY:
                raise HTTPException(400, "Unknown industry")
            return {"industry": industry, "mandatory": [{"kind": k, "label": LABEL.get(k, k)} for k in MANDATORY_BY_INDUSTRY[industry]]}
        return {
            "industries": {
                ind: [{"kind": k, "label": LABEL.get(k, k)} for k in kinds]
                for ind, kinds in MANDATORY_BY_INDUSTRY.items()
            }
        }
