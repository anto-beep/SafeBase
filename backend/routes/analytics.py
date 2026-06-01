"""
Analytics API — Phase 1: KPI Strip.

Provides the data shape consumed by the 6-card KPI strip on
/dashboard/reports. Future phases (incidents, credentials, training,
risks, documents, audits, compliance, industry-specific) plug in here.

All endpoints are account- and site-scoped. Each accepts:
  period      = fytd | overall | cal_ytd | last_90d | custom
  from, to    = ISO YYYY-MM-DD (only when period=custom)
  site_id     = optional filter, "all" treated as None
  compare_to  = off | mom | qoq | yoy   (optional)

Industry-specific 6th KPI card varies per the account's industry:
  trades        → Active SWMS Coverage %
  hospitality   → Food Safety Supervisor Shift Coverage %
  transport     → Fleet Availability %
  healthcare    → AHPRA Currency %
  retail        → Lone-Worker Check-in Compliance %
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query


# ---------- Period helpers ----------

def _fy_start(today: date) -> date:
    """Australian FY: Jul 1 – Jun 30. If today < Jul 1 → previous Jul 1."""
    return date(today.year if today.month >= 7 else today.year - 1, 7, 1)


def _resolve_period(period: str, custom_from: Optional[str],
                    custom_to: Optional[str]) -> tuple[Optional[date], date]:
    """Return (start_inclusive, end_inclusive). start=None means 'no lower bound'."""
    today = datetime.now(timezone.utc).date()
    if period == "fytd":
        return _fy_start(today), today
    if period == "cal_ytd":
        return date(today.year, 1, 1), today
    if period == "last_90d":
        return today - timedelta(days=90), today
    if period == "custom":
        try:
            f = date.fromisoformat(custom_from) if custom_from else None
        except Exception:
            f = None
        try:
            t = date.fromisoformat(custom_to) if custom_to else today
        except Exception:
            t = today
        return f, t
    # overall
    return None, today


def _previous_period(start: Optional[date], end: date, compare_to: str) -> tuple[Optional[date], Optional[date]]:
    """Return the previous period that pairs with [start..end]."""
    if compare_to == "off" or start is None:
        return None, None
    if compare_to == "mom":
        # Previous month (same length as the current month-to-date)
        span = (end - start).days
        prev_end = start - timedelta(days=1)
        return prev_end - timedelta(days=span), prev_end
    if compare_to == "qoq":
        span = (end - start).days
        prev_end = start - timedelta(days=1)
        return prev_end - timedelta(days=span), prev_end
    if compare_to == "yoy":
        # Same window one FY ago
        try:
            return start.replace(year=start.year - 1), end.replace(year=end.year - 1)
        except ValueError:
            return start - timedelta(days=365), end - timedelta(days=365)
    return None, None


def _to_iso(d: Optional[date]) -> Optional[str]:
    return d.isoformat() if d else None


def _date_filter(field: str, start: Optional[date], end: date) -> dict:
    if start is None:
        return {field: {"$lte": end.isoformat() + "T23:59:59Z"}}
    return {field: {"$gte": start.isoformat(),
                     "$lte": end.isoformat() + "T23:59:59Z"}}


# ---------- Industry-specific 6th KPI ----------

INDUSTRY_KPI = {
    "trades": {"key": "swms_coverage", "label": "ACTIVE SWMS COVERAGE", "unit": "%"},
    "hospitality": {"key": "fss_coverage", "label": "FSS SHIFT COVERAGE", "unit": "%"},
    "transport": {"key": "fleet_availability", "label": "FLEET AVAILABILITY", "unit": "%"},
    "healthcare": {"key": "ahpra_currency", "label": "AHPRA CURRENCY", "unit": "%"},
    "retail": {"key": "lone_worker_compliance", "label": "LONE WORKER CHECK-IN", "unit": "%"},
}


def register_analytics_routes(api_router: APIRouter, *, db, get_current_user_dep,
                               account_id_for_fn, logger):

    async def _industry_of(current_user) -> str:
        try:
            row = await db.users.find_one({"user_id": current_user.user_id},
                                          {"_id": 0, "industry": 1})
            return (row or {}).get("industry") or "trades"
        except Exception:
            return "trades"

    async def _account_scope(current_user, site_id: Optional[str]) -> dict:
        flt: dict = {"account_id": account_id_for_fn(current_user)}
        if site_id and site_id != "all":
            flt["site_id"] = site_id
        return flt

    async def _legacy_scope(current_user) -> dict:
        """Some old collections key on user_id, not account_id."""
        return {"user_id": current_user.user_id}

    # ---------- Card computers ----------

    async def _incidents_count(current_user, site_id, start, end):
        flt = await _account_scope(current_user, site_id)
        flt.update(_date_filter("date_occurred", start, end))
        # Either modern (account_id) or legacy (user_id) — count both
        c1 = await db.incidents.count_documents(flt)
        if c1 == 0:
            legacy = await _legacy_scope(current_user)
            legacy.update(_date_filter("date_occurred", start, end))
            c1 = await db.incidents.count_documents(legacy)
        return c1

    async def _open_capa(current_user, site_id):
        flt = await _account_scope(current_user, site_id)
        flt["status"] = {"$ne": "closed"}
        c = await db.corrective_actions.count_documents(flt)
        if c == 0:
            legacy = {"user_id": current_user.user_id, "status": {"$ne": "closed"}}
            c = await db.corrective_actions.count_documents(legacy)
        return c

    async def _credentials_expiring(current_user, site_id, window_days=30):
        today = datetime.now(timezone.utc)
        horizon = today + timedelta(days=window_days)
        flt = await _account_scope(current_user, site_id)
        flt.update({
            "expiry_date": {
                "$gte": today.date().isoformat(),
                "$lte": horizon.date().isoformat(),
            }
        })
        c = await db.licences.count_documents(flt)
        if c == 0:
            legacy = {"user_id": current_user.user_id,
                      "expiry_date": {"$gte": today.date().isoformat(),
                                       "$lte": horizon.date().isoformat()}}
            c = await db.licences.count_documents(legacy)
        return c

    async def _training_completion(current_user, site_id):
        try:
            done = await db.academy_progress.count_documents({
                "account_id": account_id_for_fn(current_user),
                "status": "completed",
            })
            assigned = await db.academy_progress.count_documents({
                "account_id": account_id_for_fn(current_user),
            })
            if assigned == 0:
                done = await db.academy_progress.count_documents({
                    "user_id": current_user.user_id, "status": "completed",
                })
                assigned = await db.academy_progress.count_documents({
                    "user_id": current_user.user_id,
                })
            if assigned == 0:
                return 0
            return round((done / assigned) * 100)
        except Exception:
            return 0

    async def _compliance_score(current_user):
        # Reuse the simple formula from /api/compliance/score so the KPI
        # matches what users see elsewhere in the app.
        try:
            workers = await db.workers.count_documents({"user_id": current_user.user_id})
            licences_list = await db.licences.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(1000)
            incidents_list = await db.incidents.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(1000)
            documents = await db.documents.count_documents({"user_id": current_user.user_id})
            now = datetime.now(timezone.utc)
            expired = 0; expiring = 0
            for lic in licences_list:
                try:
                    exp = datetime.fromisoformat(lic.get("expiry_date") or "")
                    if exp.tzinfo is None:
                        exp = exp.replace(tzinfo=timezone.utc)
                    days = (exp - now).days
                    if days < 0:
                        expired += 1
                    elif days <= 30:
                        expiring += 1
                except Exception:
                    pass
            open_inc = sum(1 for i in incidents_list if i.get("status") == "open")
            serious = sum(1 for i in incidents_list if i.get("severity") in ("serious", "critical"))
            score = 100 - expired * 8 - expiring * 3 - open_inc * 4 - serious * 6
            if documents == 0:
                score -= 15
            if workers == 0:
                score -= 10
            return max(0, min(100, score))
        except Exception:
            return 0

    async def _industry_kpi_value(current_user, site_id, industry):
        """Return a single 0-100 percentage for the industry-specific KPI."""
        try:
            if industry == "trades":
                # % of activities that have at least one current (non-archived) SWMS
                activity_total = await db.activities.count_documents({"user_id": current_user.user_id})
                if not activity_total:
                    return 0
                with_swms = await db.documents.count_documents({
                    "user_id": current_user.user_id,
                    "type": {"$in": ["swms", "SWMS"]},
                    "status": {"$ne": "archived"},
                })
                return min(100, round((with_swms / activity_total) * 100))
            if industry == "transport":
                total = await db.vehicles.count_documents({"user_id": current_user.user_id})
                if not total:
                    return 0
                in_service = await db.vehicles.count_documents({
                    "user_id": current_user.user_id,
                    "status": {"$nin": ["out_of_service", "defected", "maintenance"]},
                })
                return round((in_service / total) * 100)
            if industry == "hospitality":
                # FSS shift coverage proxy: % of workers with a current FSS licence
                total = await db.workers.count_documents({"user_id": current_user.user_id})
                if not total:
                    return 0
                fss = await db.licences.count_documents({
                    "user_id": current_user.user_id,
                    "licence_type": {"$regex": "fss|food safety", "$options": "i"},
                    "expiry_date": {"$gte": date.today().isoformat()},
                })
                return min(100, round((fss / max(total, 1)) * 100))
            if industry == "healthcare":
                total = await db.workers.count_documents({"user_id": current_user.user_id})
                if not total:
                    return 0
                ahpra = await db.licences.count_documents({
                    "user_id": current_user.user_id,
                    "licence_type": {"$regex": "ahpra", "$options": "i"},
                    "expiry_date": {"$gte": date.today().isoformat()},
                })
                return min(100, round((ahpra / max(total, 1)) * 100))
            if industry == "retail":
                # Lone-worker check-in compliance — try lone_worker_checkins collection,
                # fallback to 0 if the module isn't seeded.
                try:
                    today_iso = date.today().isoformat()
                    expected = await db.workers.count_documents({"user_id": current_user.user_id, "lone_worker": True})
                    if not expected:
                        return 100  # no lone workers configured
                    checked = await db.lone_worker_checkins.count_documents({
                        "user_id": current_user.user_id,
                        "date": today_iso, "status": "ok",
                    })
                    return min(100, round((checked / expected) * 100))
                except Exception:
                    return 0
        except Exception:
            return 0
        return 0

    async def _sparkline(current_user, site_id, kind: str, days: int = 30) -> list[int]:
        """Cheap 30-day sparkline: count docs per day in the relevant collection."""
        out: list[int] = []
        today = datetime.now(timezone.utc).date()
        try:
            for i in range(days, 0, -1):
                day = today - timedelta(days=i - 1)
                day_start = day.isoformat()
                day_end = (day + timedelta(days=1)).isoformat()
                if kind == "incidents":
                    cnt = await db.incidents.count_documents({
                        "user_id": current_user.user_id,
                        "created_at": {"$gte": day_start, "$lt": day_end},
                    })
                elif kind == "capa":
                    cnt = await db.corrective_actions.count_documents({
                        "user_id": current_user.user_id,
                        "created_at": {"$gte": day_start, "$lt": day_end},
                    })
                elif kind == "credentials":
                    horizon = (day + timedelta(days=30)).isoformat()
                    cnt = await db.licences.count_documents({
                        "user_id": current_user.user_id,
                        "expiry_date": {"$gte": day_start, "$lte": horizon},
                    })
                else:
                    cnt = 0
                out.append(int(cnt))
        except Exception:
            out = [0] * days
        return out

    def _delta_pct(curr: float, prev: float) -> Optional[float]:
        if prev is None:
            return None
        if prev == 0:
            return None if curr == 0 else 100.0
        return round(((curr - prev) / prev) * 100, 1)

    def _trend(delta: Optional[float], lower_is_better: bool) -> str:
        if delta is None:
            return "flat"
        if abs(delta) < 0.5:
            return "flat"
        improving = (delta < 0) if lower_is_better else (delta > 0)
        return "up_good" if (delta > 0 and not lower_is_better) else \
               "down_good" if (delta < 0 and lower_is_better) else \
               "up_bad" if (delta > 0 and lower_is_better) else "down_bad"

    # ---------- ROUTE: KPI strip ----------

    @api_router.get("/analytics/kpi-strip")
    async def kpi_strip(
        period: str = Query("fytd"),
        site_id: Optional[str] = Query(None),
        compare_to: str = Query("off"),
        from_: Optional[str] = Query(None, alias="from"),
        to: Optional[str] = Query(None),
        current_user=Depends(get_current_user_dep),
    ):
        if period not in ("fytd", "overall", "cal_ytd", "last_90d", "custom"):
            raise HTTPException(400, "invalid period")
        start, end = _resolve_period(period, from_, to)
        prev_start, prev_end = _previous_period(start, end, compare_to)
        industry = await _industry_of(current_user)

        # Current values
        compl = await _compliance_score(current_user)
        incidents = await _incidents_count(current_user, site_id, start, end)
        capa = await _open_capa(current_user, site_id)
        creds = await _credentials_expiring(current_user, site_id, 30)
        training = await _training_completion(current_user, site_id)
        industry_pct = await _industry_kpi_value(current_user, site_id, industry)

        # Previous values for comparison (only the metrics that move with the period)
        if prev_start and prev_end:
            prev_incidents = await _incidents_count(current_user, site_id, prev_start, prev_end)
        else:
            prev_incidents = None
        prev_capa = None  # capa is a snapshot of "now"
        prev_compl = None
        prev_creds = None
        prev_training = None
        prev_industry = None

        ind = INDUSTRY_KPI.get(industry, INDUSTRY_KPI["trades"])

        cards = [
            {
                "key": "compliance_score",
                "label": "COMPLIANCE SCORE",
                "value": compl, "unit": "/100",
                "delta_pct": _delta_pct(compl, prev_compl) if prev_compl is not None else None,
                "trend": "flat",
                "tone": ("good" if compl >= 90 else "warn" if compl >= 70 else "bad"),
                "sparkline": [],  # daily-score history is expensive; phase 3 builds the real series
            },
            {
                "key": "total_incidents",
                "label": "TOTAL INCIDENTS",
                "value": incidents, "unit": "",
                "delta_pct": _delta_pct(incidents, prev_incidents),
                "trend": _trend(_delta_pct(incidents, prev_incidents), lower_is_better=True),
                "tone": ("bad" if incidents >= 10 else "warn" if incidents >= 3 else "good"),
                "sparkline": await _sparkline(current_user, site_id, "incidents", 30),
            },
            {
                "key": "open_capa",
                "label": "OPEN ACTIONS / CAPA",
                "value": capa, "unit": "",
                "delta_pct": _delta_pct(capa, prev_capa),
                "trend": _trend(_delta_pct(capa, prev_capa), lower_is_better=True),
                "tone": ("bad" if capa >= 10 else "warn" if capa >= 3 else "good"),
                "sparkline": await _sparkline(current_user, site_id, "capa", 30),
            },
            {
                "key": "credentials_expiring",
                "label": "CREDENTIALS EXPIRING ≤30D",
                "value": creds, "unit": "",
                "delta_pct": _delta_pct(creds, prev_creds),
                "trend": _trend(_delta_pct(creds, prev_creds), lower_is_better=True),
                "tone": ("bad" if creds > 5 else "warn" if creds > 0 else "good"),
                "sparkline": await _sparkline(current_user, site_id, "credentials", 30),
            },
            {
                "key": "training_completion",
                "label": "TRAINING COMPLETION",
                "value": training, "unit": "%",
                "delta_pct": _delta_pct(training, prev_training),
                "trend": _trend(_delta_pct(training, prev_training), lower_is_better=False),
                "tone": ("good" if training >= 80 else "warn" if training >= 50 else "bad"),
                "sparkline": [],
            },
            {
                "key": ind["key"],
                "label": ind["label"],
                "value": industry_pct, "unit": ind["unit"],
                "delta_pct": _delta_pct(industry_pct, prev_industry),
                "trend": _trend(_delta_pct(industry_pct, prev_industry), lower_is_better=False),
                "tone": ("good" if industry_pct >= 80 else "warn" if industry_pct >= 50 else "bad"),
                "sparkline": [],
            },
        ]

        return {
            "industry": industry,
            "period": {
                "type": period,
                "from": _to_iso(start),
                "to": _to_iso(end),
            },
            "previous": {
                "from": _to_iso(prev_start),
                "to": _to_iso(prev_end),
            },
            "compare_to": compare_to,
            "site_id": site_id or "all",
            "cards": cards,
        }
