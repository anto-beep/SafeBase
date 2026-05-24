"""SafeBase — industry-specific dashboard widgets (Iter54).

One endpoint per industry returning the data for that industry's headline
"alert tile" rendered on the owner dashboard. Lazy-computed from existing
collections; falls back to a sensible empty state when there's no data.

All routes require an authenticated user (re-uses the universal auth dependency
that's already pinned to `get_current_user` in server.py — passed in via DI).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso(dt: datetime | None) -> Optional[str]:
    return dt.isoformat() if dt else None


def register_dashboard_widgets(api_router: APIRouter, *, db, get_current_user_dep):
    """Mount /dashboard/widget/* routes."""

    # ─────────────── HOSPITALITY — Temperature alert ───────────────
    @api_router.get("/dashboard/widget/temp-alert")
    async def hospitality_temp_alert(user=Depends(get_current_user_dep)):
        """Hospitality: overdue temperature logs (units that haven't been
        recorded today) + most recent out-of-range reading.
        """
        owner = user.user_id
        # We use the same docs collection most other modules read from. Units
        # are seeded with `unit_type=fridge|freezer|hot_hold|dishwasher` and
        # `temp_target_min`, `temp_target_max`. Last reading is stamped on
        # the unit document for fast reads.
        units = []
        async for u in db.temp_units.find({"owner_id": owner}, {"_id": 0}):
            units.append(u)

        now = _now()
        today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

        overdue = []
        out_of_range = []
        last_reading_at: Optional[datetime] = None
        for u in units:
            last_iso = u.get("last_reading_at")
            last_dt = None
            if last_iso:
                try:
                    last_dt = datetime.fromisoformat(last_iso.replace("Z", "+00:00"))
                except ValueError:
                    last_dt = None
            if last_dt is None or last_dt < today_start:
                overdue.append({"name": u.get("name"), "target": u.get("target_range"),
                                "last_reading_at": last_iso})
            if last_dt and (last_reading_at is None or last_dt > last_reading_at):
                last_reading_at = last_dt
            last_temp = u.get("last_temp_c")
            if last_temp is not None:
                tmin = u.get("temp_target_min")
                tmax = u.get("temp_target_max")
                if (tmin is not None and last_temp < tmin) or (tmax is not None and last_temp > tmax):
                    out_of_range.append({"name": u.get("name"),
                                          "last_temp_c": last_temp,
                                          "target_range": u.get("target_range"),
                                          "last_reading_at": last_iso})
        return {
            "industry": "hospitality",
            "kind": "temp_alert",
            "total_units": len(units),
            "overdue_today": overdue,
            "out_of_range": out_of_range,
            "last_reading_at": _to_iso(last_reading_at),
        }

    # ─────────────── TRANSPORT — Fatigue alert ───────────────
    @api_router.get("/dashboard/widget/fatigue-alert")
    async def transport_fatigue_alert(user=Depends(get_current_user_dep)):
        """Transport: drivers approaching or exceeding their fatigue limits in
        the current cycle. Uses the `driver_work_diary` collection — each row
        is a work/rest segment with `hours_work` already computed at insert.
        """
        owner = user.user_id
        cutoff = _now() - timedelta(hours=24)
        # Aggregate hours-of-work per driver in the trailing 24 hours.
        pipeline = [
            {"$match": {"owner_id": owner, "kind": "work",
                          "started_at": {"$gte": cutoff.isoformat()}}},
            {"$group": {"_id": "$driver_id", "hours_24h": {"$sum": "$hours_work"}}},
        ]
        approaching = []
        exceeding = []
        async for row in db.driver_work_diary.aggregate(pipeline):
            driver_id = row["_id"]
            hours = float(row.get("hours_24h", 0) or 0)
            driver = await db.users.find_one(
                {"user_id": driver_id},
                {"_id": 0, "name": 1, "user_id": 1, "fatigue_scheme": 1},
            ) or {}
            scheme = (driver.get("fatigue_scheme") or "standard").lower()
            # Cap depends on scheme: Standard=12h/24, BFM=14h/24, AFM=15h/24
            cap = {"standard": 12.0, "bfm": 14.0, "afm": 15.0}.get(scheme, 12.0)
            entry = {
                "driver_id": driver_id,
                "name": driver.get("name") or "Driver",
                "hours_24h": round(hours, 1),
                "scheme": scheme.upper(),
                "cap_hours": cap,
                "pct": round((hours / cap) * 100) if cap else 0,
            }
            if hours >= cap:
                exceeding.append(entry)
            elif hours >= (cap * 0.85):
                approaching.append(entry)

        return {
            "industry": "transport",
            "kind": "fatigue_alert",
            "approaching": approaching,
            "exceeding": exceeding,
            "window_hours": 24,
        }

    # ─────────────── TRADES — Credential / SWMS expiry alert ───────────────
    @api_router.get("/dashboard/widget/credential-expiry")
    async def trades_credential_expiry(user=Depends(get_current_user_dep)):
        """Trades: worker licences (White Card, trade licence, first aid, HRWL)
        approaching expiry. Reads from `licences` joined to `workers` for name.
        """
        owner = user.user_id
        now = _now()
        # Pull every licence belonging to this owner's workers OR the owner.
        # The licences collection uses `user_id` (=owner) per server.py L367.
        cursor = db.licences.find({"user_id": owner}, {"_id": 0})
        expiring_soon: list[dict] = []
        expired: list[dict] = []
        soon_cutoff = (now + timedelta(days=60)).date()
        worker_cache: dict[str, str] = {}
        async for lic in cursor:
            exp_raw = lic.get("expiry_date")
            if not exp_raw:
                continue
            try:
                exp_dt = datetime.fromisoformat(exp_raw)
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
            days_left = (exp_dt.date() - now.date()).days
            if days_left > 60:
                continue
            worker_id = lic.get("worker_id")
            if worker_id and worker_id not in worker_cache:
                w = await db.workers.find_one({"worker_id": worker_id}, {"_id": 0, "name": 1}) or {}
                worker_cache[worker_id] = w.get("name") or "Worker"
            entry = {
                "licence_id": lic.get("licence_id"),
                "worker_id": worker_id,
                "worker_name": worker_cache.get(worker_id) or "Self",
                "licence_type": (lic.get("licence_type") or "").replace("_", " ").title(),
                "licence_number": lic.get("licence_number"),
                "expires_on": exp_raw,
                "days_left": days_left,
            }
            if days_left < 0:
                expired.append(entry)
            else:
                expiring_soon.append(entry)
        # sort: most-urgent first
        expired.sort(key=lambda r: r["days_left"])  # most-negative first
        expiring_soon.sort(key=lambda r: r["days_left"])
        return {
            "industry": "trades",
            "kind": "credential_expiry",
            "expiring_soon": expiring_soon,
            "expired": expired,
            "window_days": 60,
        }

    # ─────────────── RETAIL — Lone-worker check-in alert ───────────────
    @api_router.get("/dashboard/widget/lone-worker")
    async def retail_lone_worker(user=Depends(get_current_user_dep)):
        """Retail: open lone-worker shifts and missed check-ins.

        Reads `lone_worker_shifts` documents:
          {shift_id, owner_id, worker_name, store_name, started_at,
           expected_end_at, status: open|closed, last_check_in_at,
           check_in_interval_mins (default 60)}
        A check-in is "missed" if (now - last_check_in_at) >
        check_in_interval_mins + 10 minute grace.
        """
        owner = user.user_id
        now = _now()
        open_shifts: list[dict] = []
        missed: list[dict] = []
        cursor = db.lone_worker_shifts.find(
            {"owner_id": owner, "status": {"$ne": "closed"}}, {"_id": 0}
        )
        async for s in cursor:
            interval_min = int(s.get("check_in_interval_mins") or 60)
            last_iso = s.get("last_check_in_at") or s.get("started_at")
            last_dt: Optional[datetime] = None
            if last_iso:
                try:
                    last_dt = datetime.fromisoformat(last_iso.replace("Z", "+00:00"))
                except ValueError:
                    last_dt = None
            mins_since = None
            if last_dt:
                mins_since = int((now - last_dt).total_seconds() // 60)
            entry = {
                "shift_id": s.get("shift_id"),
                "worker_name": s.get("worker_name") or "Worker",
                "store_name": s.get("store_name") or "Store",
                "started_at": s.get("started_at"),
                "last_check_in_at": last_iso,
                "minutes_since_check_in": mins_since,
                "check_in_interval_mins": interval_min,
                "expected_end_at": s.get("expected_end_at"),
            }
            open_shifts.append(entry)
            # Missed if we've blown past the interval + 10 min grace
            if mins_since is not None and mins_since > (interval_min + 10):
                missed.append(entry)
        # Sort missed by most-overdue first
        missed.sort(key=lambda r: -(r["minutes_since_check_in"] or 0))
        return {
            "industry": "retail",
            "kind": "lone_worker",
            "open_shifts": open_shifts,
            "missed": missed,
            "window_label": "active shifts",
        }

    # ─────────────── HEALTHCARE — AHPRA expiry alert ───────────────
    @api_router.get("/dashboard/widget/ahpra-expiry")
    async def healthcare_ahpra_expiry(user=Depends(get_current_user_dep)):
        """Healthcare: clinicians with AHPRA renewals due in <60 days.

        Pulls from the `clinicians` collection where `ahpra_registration` is
        a sub-doc with `expires_on` (ISO date string).
        """
        owner = user.user_id
        now = _now()
        soon = (now + timedelta(days=60)).date().isoformat()
        cur = db.clinicians.find(
            {"owner_id": owner,
             "ahpra_registration.expires_on": {"$lte": soon}},
            {"_id": 0, "clinician_id": 1, "name": 1, "profession": 1,
             "ahpra_registration": 1},
        ).sort("ahpra_registration.expires_on", 1)

        expiring_soon = []
        expired = []
        async for c in cur:
            reg = c.get("ahpra_registration") or {}
            exp = reg.get("expires_on")
            if not exp:
                continue
            try:
                exp_dt = datetime.fromisoformat(exp).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
            days_left = (exp_dt.date() - now.date()).days
            entry = {
                "clinician_id": c.get("clinician_id"),
                "name": c.get("name") or "Clinician",
                "profession": c.get("profession") or "",
                "registration_number": reg.get("number"),
                "expires_on": exp,
                "days_left": days_left,
            }
            if days_left < 0:
                expired.append(entry)
            else:
                expiring_soon.append(entry)

        return {
            "industry": "healthcare",
            "kind": "ahpra_expiry",
            "expiring_soon": expiring_soon,
            "expired": expired,
            "window_days": 60,
        }
