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

import os
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

    # ============================================================
    # PHASE 2 — Incident analytics (12 chart types) + drill-down
    # ============================================================

    async def _all_incidents(current_user, site_id, start, end):
        """Tenant-isolated incident fetch with legacy fallback. Used by
        every chart computer below so logic stays consistent."""
        flt = {"account_id": account_id_for_fn(current_user)}
        if site_id and site_id != "all":
            flt["site_id"] = site_id
        rows = await db.incidents.find(flt, {"_id": 0}).to_list(5000)
        if not rows:
            rows = await db.incidents.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(5000)

        def _in_period(r):
            if start is None:
                return True
            key = r.get("date_occurred") or r.get("occurred_at") or r.get("created_at") or ""
            try:
                d = datetime.fromisoformat(key.replace("Z", "+00:00")).date()
            except Exception:
                return False
            return (start is None or d >= start) and (d <= end)

        return [r for r in rows if _in_period(r)]

    def _month_key(iso: str) -> str:
        try:
            return datetime.fromisoformat(iso.replace("Z", "+00:00")).date().strftime("%Y-%m")
        except Exception:
            return "unknown"

    def _week_key(iso: str) -> str:
        try:
            d = datetime.fromisoformat(iso.replace("Z", "+00:00")).date()
            iso_year, iso_week, _ = d.isocalendar()
            return f"{iso_year}-W{iso_week:02d}"
        except Exception:
            return "unknown"

    def _bucket_keys(start: Optional[date], end: date, granularity: str) -> list[str]:
        """Return ordered list of week or month keys spanning [start..end]."""
        if start is None:
            start = end - timedelta(days=365)
        keys: list[str] = []
        if granularity == "month":
            cur = date(start.year, start.month, 1)
            while cur <= end:
                keys.append(cur.strftime("%Y-%m"))
                cur = date(cur.year + (1 if cur.month == 12 else 0),
                           1 if cur.month == 12 else cur.month + 1, 1)
        else:  # week
            cur = start - timedelta(days=start.weekday())  # Monday
            while cur <= end:
                iso_year, iso_week, _ = cur.isocalendar()
                keys.append(f"{iso_year}-W{iso_week:02d}")
                cur = cur + timedelta(days=7)
        return keys

    # ---- chart computers ----

    def _volume_over_time(incidents, start, end):
        # Auto-granularity: if range > 120 days use months, else weeks
        rng = (end - (start or (end - timedelta(days=120)))).days
        gran = "month" if rng > 120 else "week"
        keys = _bucket_keys(start, end, gran)
        bucket = {k: {"bucket": k, "incidents": 0, "near_miss": 0} for k in keys}
        for r in incidents:
            k = _month_key(r.get("created_at") or "") if gran == "month" else _week_key(r.get("created_at") or "")
            if k in bucket:
                if (r.get("incident_type") or "") == "near_miss":
                    bucket[k]["near_miss"] += 1
                else:
                    bucket[k]["incidents"] += 1
        return {"granularity": gran, "series": list(bucket.values())}

    def _by_type(incidents):
        counts: dict[str, int] = {}
        for r in incidents:
            t = (r.get("incident_type") or "other").replace("_", " ").title()
            counts[t] = counts.get(t, 0) + 1
        return [{"type": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]

    def _by_severity_stacked(incidents, start, end):
        SEV_ORDER = ["minor", "moderate", "significant", "major", "critical"]
        keys = _bucket_keys(start, end, "month")
        bucket: dict[str, dict] = {k: {"bucket": k, **{s: 0 for s in SEV_ORDER}} for k in keys}
        for r in incidents:
            k = _month_key(r.get("created_at") or "")
            s = (r.get("severity") or "minor").lower()
            if s not in SEV_ORDER:
                # map legacy labels
                s = {"serious": "major", "low": "minor", "medium": "moderate", "high": "major"}.get(s, "minor")
            if k in bucket:
                bucket[k][s] += 1
        return {"severities": SEV_ORDER, "series": list(bucket.values())}

    def _notifiable(incidents):
        notifiable = [r for r in incidents if r.get("notify_regulator") or r.get("notifiable")]
        by_reg: dict[str, int] = {}
        for r in notifiable:
            reg = (r.get("regulator") or r.get("notifiable_category") or "WorkSafe (default)")
            reg = str(reg).split(":")[0]
            by_reg[reg] = by_reg.get(reg, 0) + 1
        return {
            "total": len(notifiable),
            "by_regulator": [{"regulator": k, "count": v} for k, v in sorted(by_reg.items(), key=lambda x: -x[1])],
        }

    async def _time_between_stages(current_user, start, end, site_id):
        # Pull from incident_workflow.stage_timestamps; SLA defaults per spec.
        flt = {"user_id": current_user.user_id}
        rows = await db.incident_workflow.find(flt, {"_id": 0}).to_list(5000)
        SLA_HOURS = {"reported_to_triage": 24, "triage_to_investigation": 72,
                      "investigation_to_actions": 7 * 24,
                      "actions_to_closed": 30 * 24, "lifecycle_total": 45 * 24}
        sums: dict[str, list[float]] = {k: [] for k in SLA_HOURS}
        for r in rows:
            ts = r.get("stage_timestamps") or {}
            def _h(a, b):
                try:
                    ta = datetime.fromisoformat((ts.get(a) or "").replace("Z", "+00:00"))
                    tb = datetime.fromisoformat((ts.get(b) or "").replace("Z", "+00:00"))
                    return (tb - ta).total_seconds() / 3600.0
                except Exception:
                    return None
            for tag, (a, b) in {
                "reported_to_triage": ("reported", "triage"),
                "triage_to_investigation": ("triage", "investigation"),
                "investigation_to_actions": ("investigation", "actions"),
                "actions_to_closed": ("actions", "closed"),
            }.items():
                h = _h(a, b)
                if h is not None and h >= 0:
                    sums[tag].append(h)
        out = []
        for k, v in sums.items():
            if k == "lifecycle_total":
                continue
            avg = (sum(v) / len(v)) if v else 0
            out.append({
                "stage": k.replace("_", " ").replace(" to ", " → ").title(),
                "stage_key": k,
                "avg_hours": round(avg, 1),
                "avg_days": round(avg / 24, 1),
                "sla_hours": SLA_HOURS[k],
                "breached": avg > SLA_HOURS[k] and avg > 0,
                "count": len(v),
            })
        return out

    def _by_site(incidents):
        counts: dict[str, dict[str, int]] = {}
        SEV = ["minor", "moderate", "significant", "major", "critical"]
        for r in incidents:
            s = r.get("site") or r.get("site_id") or "Unassigned"
            if isinstance(s, dict):
                s = s.get("name") or s.get("site_id") or "Unassigned"
            sev = (r.get("severity") or "minor").lower()
            if sev not in SEV:
                sev = {"serious": "major", "low": "minor", "medium": "moderate", "high": "major"}.get(sev, "minor")
            counts.setdefault(s, {x: 0 for x in SEV})
            counts[s][sev] += 1
        return [{"site": k, **v, "total": sum(v.values())} for k, v in sorted(counts.items(), key=lambda x: -sum(x[1].values()))]

    def _bhd_donut(incidents):
        TAGS = ["Bullying", "Harassment (sexual)", "Harassment (non-sexual)",
                 "Discrimination", "Other Psychosocial"]
        counts = {t: 0 for t in TAGS}
        for r in incidents:
            tags = (r.get("tags") or []) + ([r.get("psychosocial_subtype")] if r.get("psychosocial_subtype") else [])
            cat = (r.get("category") or "").lower()
            desc = (r.get("description") or "").lower()
            if "bully" in cat or "bully" in desc:
                counts["Bullying"] += 1
            elif "sexual" in cat or "sexual" in desc:
                counts["Harassment (sexual)"] += 1
            elif "harass" in cat or "harass" in desc:
                counts["Harassment (non-sexual)"] += 1
            elif "discrim" in cat or "discrim" in desc:
                counts["Discrimination"] += 1
            elif "psych" in cat or "psych" in desc or any("psych" in str(t).lower() for t in tags):
                counts["Other Psychosocial"] += 1
        total = sum(counts.values())
        return {"total": total, "segments": [{"label": k, "count": v} for k, v in counts.items() if v > 0]}

    def _mechanism(incidents):
        MECH = {
            "Body stressing (manual handling)": ["manual", "lift", "carry", "push", "pull", "back"],
            "Falls / trips / slips": ["fall", "slip", "trip", "fell"],
            "Hit by moving object": ["hit", "struck", "moving"],
            "Being trapped": ["trap", "crush", "pinch"],
            "Contact with substance": ["chemical", "burn", "acid", "splash"],
            "Vehicle": ["vehicle", "car", "truck", "forklift", "machinery"],
            "Mental stress": ["stress", "psychological", "psych"],
            "Other": [],
        }
        counts = {k: 0 for k in MECH}
        for r in incidents:
            text = f"{r.get('description', '')} {r.get('mechanism', '')} {r.get('category', '')}".lower()
            assigned = False
            for cat, kws in MECH.items():
                if cat == "Other":
                    continue
                if any(k in text for k in kws):
                    counts[cat] += 1
                    assigned = True
                    break
            if not assigned:
                counts["Other"] += 1
        return [{"category": k, "count": v} for k, v in counts.items() if v > 0]

    def _body_part(incidents):
        BODY = ["Head/face", "Neck", "Shoulder/arm", "Hand/wrist/finger",
                 "Trunk/back", "Hip/leg", "Knee", "Ankle/foot", "Multiple",
                 "Psychological", "Not specified"]
        counts = {b: 0 for b in BODY}
        for r in incidents:
            parts = r.get("body_parts") or []
            if not parts:
                counts["Not specified"] += 1
                continue
            if len(parts) > 1:
                counts["Multiple"] += 1
                continue
            p = (parts[0] or "").lower()
            if "head" in p or "face" in p:
                counts["Head/face"] += 1
            elif "neck" in p:
                counts["Neck"] += 1
            elif "shoulder" in p or "arm" in p or "elbow" in p:
                counts["Shoulder/arm"] += 1
            elif "hand" in p or "wrist" in p or "finger" in p:
                counts["Hand/wrist/finger"] += 1
            elif "back" in p or "trunk" in p or "torso" in p or "chest" in p:
                counts["Trunk/back"] += 1
            elif "knee" in p:
                counts["Knee"] += 1
            elif "ankle" in p or "foot" in p:
                counts["Ankle/foot"] += 1
            elif "hip" in p or "leg" in p:
                counts["Hip/leg"] += 1
            elif "psych" in p:
                counts["Psychological"] += 1
            else:
                counts["Not specified"] += 1
        return [{"part": k, "count": v} for k, v in counts.items() if v > 0]

    def _primary_secondary(incidents):
        SECONDARY = ["Lost Time", "Medical Treatment", "No Treatment", "First Aid Only"]
        groups: dict[str, dict] = {}
        for r in incidents:
            cat = (r.get("category") or r.get("incident_type") or "other").replace("_", " ").title()
            sec = (r.get("treatment_given") or r.get("treatment") or "").lower()
            if "lost" in sec or "ltifr" in sec:
                key = "Lost Time"
            elif "medical" in sec or "hospital" in sec:
                key = "Medical Treatment"
            elif "first" in sec or "aid" in sec:
                key = "First Aid Only"
            else:
                key = "No Treatment"
            groups.setdefault(cat, {x: 0 for x in SECONDARY})
            groups[cat][key] += 1
        return {"secondary_options": SECONDARY,
                 "series": [{"category": k, **v} for k, v in sorted(groups.items())]}

    async def _capa_status(current_user, site_id):
        flt = {"account_id": account_id_for_fn(current_user)}
        if site_id and site_id != "all":
            flt["site_id"] = site_id
        rows = await db.corrective_actions.find(flt, {"_id": 0}).to_list(5000)
        if not rows:
            rows = await db.corrective_actions.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(5000)
        today = datetime.now(timezone.utc).date()
        counts = {"Open": 0, "In Progress": 0, "Overdue": 0, "Completed": 0}
        for r in rows:
            st = (r.get("status") or "open").lower()
            due = r.get("due_date") or r.get("target_date") or ""
            try:
                due_d = datetime.fromisoformat(due).date() if due else None
            except Exception:
                due_d = None
            if st in ("closed", "completed", "complete", "done"):
                counts["Completed"] += 1
            elif due_d and due_d < today and st not in ("closed", "completed"):
                counts["Overdue"] += 1
            elif st in ("in_progress", "in-progress", "wip"):
                counts["In Progress"] += 1
            else:
                counts["Open"] += 1
        total = sum(counts.values()) or 1
        return [{"status": k, "count": v, "pct": round(v / total * 100, 1)} for k, v in counts.items()]

    def _root_cause(incidents):
        ROOT = ["Human factors", "Equipment/plant", "Environmental", "Procedural/SOP",
                 "Training gap", "Supervision", "Design", "Communication", "Other"]
        counts = {r: 0 for r in ROOT}
        for r in incidents:
            rc = (r.get("root_cause") or r.get("primary_cause") or "").lower()
            if "human" in rc or "behaviour" in rc:
                counts["Human factors"] += 1
            elif "equip" in rc or "plant" in rc or "machinery" in rc:
                counts["Equipment/plant"] += 1
            elif "environ" in rc or "weather" in rc:
                counts["Environmental"] += 1
            elif "procedure" in rc or "sop" in rc or "process" in rc:
                counts["Procedural/SOP"] += 1
            elif "train" in rc:
                counts["Training gap"] += 1
            elif "superv" in rc:
                counts["Supervision"] += 1
            elif "design" in rc:
                counts["Design"] += 1
            elif "communi" in rc:
                counts["Communication"] += 1
            elif rc:
                counts["Other"] += 1
        return [{"category": k, "count": v} for k, v in counts.items() if v > 0]

    @api_router.get("/analytics/incidents")
    async def incident_analytics(
        chart: str = Query("volume_over_time"),
        period: str = Query("fytd"),
        site_id: Optional[str] = Query(None),
        compare_to: str = Query("off"),
        from_: Optional[str] = Query(None, alias="from"),
        to: Optional[str] = Query(None),
        current_user=Depends(get_current_user_dep),
    ):
        start, end = _resolve_period(period, from_, to)
        incidents = await _all_incidents(current_user, site_id, start, end)

        if chart == "volume_over_time":
            current = _volume_over_time(incidents, start, end)
            previous = None
            if compare_to != "off":
                ps, pe = _previous_period(start, end, compare_to)
                if ps:
                    prev_inc = await _all_incidents(current_user, site_id, ps, pe)
                    previous = _volume_over_time(prev_inc, ps, pe)
            return {"chart": chart, "current": current, "previous": previous}
        if chart == "by_type":
            return {"chart": chart, "data": _by_type(incidents)}
        if chart == "by_severity":
            return {"chart": chart, **_by_severity_stacked(incidents, start, end)}
        if chart == "notifiable":
            return {"chart": chart, **_notifiable(incidents)}
        if chart == "time_between_stages":
            return {"chart": chart, "data": await _time_between_stages(current_user, start, end, site_id)}
        if chart == "by_site":
            return {"chart": chart, "data": _by_site(incidents)}
        if chart == "bhd_donut":
            return {"chart": chart, **_bhd_donut(incidents)}
        if chart == "mechanism":
            return {"chart": chart, "data": _mechanism(incidents)}
        if chart == "body_part":
            return {"chart": chart, "data": _body_part(incidents)}
        if chart == "primary_secondary":
            return {"chart": chart, **_primary_secondary(incidents)}
        if chart == "capa_status":
            return {"chart": chart, "data": await _capa_status(current_user, site_id)}
        if chart == "root_cause":
            return {"chart": chart, "data": _root_cause(incidents)}
        raise HTTPException(400, f"unknown chart '{chart}'")

    @api_router.get("/analytics/incidents/list")
    async def incident_drilldown(
        chart: str = Query(...),
        bucket: str = Query(""),
        period: str = Query("fytd"),
        site_id: Optional[str] = Query(None),
        from_: Optional[str] = Query(None, alias="from"),
        to: Optional[str] = Query(None),
        current_user=Depends(get_current_user_dep),
    ):
        """Drill-down endpoint: returns the underlying incident list for a
        clicked chart bucket. `bucket` semantics are chart-specific:
          volume_over_time → YYYY-MM or YYYY-Www
          by_type          → incident_type string
          by_severity      → "<YYYY-MM>|<severity>" or just "<severity>"
          notifiable       → regulator name (or "all")
          by_site          → site name
          mechanism        → category string
          body_part        → body-part string
          root_cause       → category string
          bhd_donut        → subtype string
          capa_status      → status string (then returns linked CAPA rows)
          time_between_stages → stage_key
        """
        start, end = _resolve_period(period, from_, to)
        incidents = await _all_incidents(current_user, site_id, start, end)

        def _match(r) -> bool:
            sev_norm = lambda s: {"serious": "major", "low": "minor", "medium": "moderate", "high": "major"}.get(s, s)
            if chart == "volume_over_time":
                ck = _month_key(r.get("created_at") or "")
                wk = _week_key(r.get("created_at") or "")
                return bucket in (ck, wk)
            if chart == "by_type":
                return ((r.get("incident_type") or "other").replace("_", " ").title()) == bucket
            if chart == "by_severity":
                if "|" in bucket:
                    bk, sev = bucket.split("|", 1)
                    return _month_key(r.get("created_at") or "") == bk and sev_norm((r.get("severity") or "minor").lower()) == sev
                return sev_norm((r.get("severity") or "minor").lower()) == bucket
            if chart == "notifiable":
                if not (r.get("notify_regulator") or r.get("notifiable")):
                    return False
                if bucket in ("", "all"):
                    return True
                reg = str(r.get("regulator") or r.get("notifiable_category") or "WorkSafe (default)").split(":")[0]
                return reg == bucket
            if chart == "by_site":
                s = r.get("site") or r.get("site_id") or "Unassigned"
                if isinstance(s, dict):
                    s = s.get("name") or s.get("site_id") or "Unassigned"
                return s == bucket
            if chart == "mechanism":
                text = f"{r.get('description', '')} {r.get('mechanism', '')} {r.get('category', '')}".lower()
                MAP = {"Body stressing (manual handling)": ["manual", "lift", "carry", "push", "pull", "back"],
                        "Falls / trips / slips": ["fall", "slip", "trip", "fell"],
                        "Hit by moving object": ["hit", "struck", "moving"],
                        "Being trapped": ["trap", "crush", "pinch"],
                        "Contact with substance": ["chemical", "burn", "acid", "splash"],
                        "Vehicle": ["vehicle", "car", "truck", "forklift", "machinery"],
                        "Mental stress": ["stress", "psychological", "psych"]}
                if bucket in MAP:
                    return any(k in text for k in MAP[bucket])
                if bucket == "Other":
                    return not any(any(k in text for k in v) for v in MAP.values())
                return False
            if chart == "body_part":
                parts = [p.lower() for p in (r.get("body_parts") or [])]
                if bucket == "Not specified":
                    return not parts
                if bucket == "Multiple":
                    return len(parts) > 1
                MAP = {"Head/face": ["head", "face"], "Neck": ["neck"],
                        "Shoulder/arm": ["shoulder", "arm", "elbow"],
                        "Hand/wrist/finger": ["hand", "wrist", "finger"],
                        "Trunk/back": ["back", "trunk", "torso", "chest"],
                        "Hip/leg": ["hip", "leg"], "Knee": ["knee"],
                        "Ankle/foot": ["ankle", "foot"], "Psychological": ["psych"]}
                kws = MAP.get(bucket, [])
                return any(any(k in p for k in kws) for p in parts)
            if chart == "root_cause":
                rc = (r.get("root_cause") or r.get("primary_cause") or "").lower()
                MAP = {"Human factors": ["human", "behaviour"], "Equipment/plant": ["equip", "plant", "machinery"],
                        "Environmental": ["environ", "weather"], "Procedural/SOP": ["procedure", "sop", "process"],
                        "Training gap": ["train"], "Supervision": ["superv"], "Design": ["design"],
                        "Communication": ["communi"]}
                if bucket == "Other":
                    return rc and not any(any(k in rc for k in v) for v in MAP.values())
                return any(k in rc for k in MAP.get(bucket, []))
            if chart == "bhd_donut":
                cat = (r.get("category") or "").lower()
                desc = (r.get("description") or "").lower()
                text = f"{cat} {desc}"
                if bucket == "Bullying":
                    return "bully" in text
                if bucket == "Harassment (sexual)":
                    return "sexual" in text
                if bucket == "Harassment (non-sexual)":
                    return "harass" in text and "sexual" not in text
                if bucket == "Discrimination":
                    return "discrim" in text
                if bucket == "Other Psychosocial":
                    return "psych" in text
                return False
            return True

        matched = [r for r in incidents if _match(r)]
        # Trim each row to a compact list shape for the drawer
        def _slim(r):
            return {
                "incident_id": r.get("incident_id"),
                "title": r.get("title") or r.get("description", "")[:80],
                "severity": r.get("severity"),
                "incident_type": r.get("incident_type"),
                "status": r.get("status"),
                "site": (r.get("site") or {}).get("name") if isinstance(r.get("site"), dict) else r.get("site"),
                "created_at": r.get("created_at"),
                "notifiable": bool(r.get("notify_regulator") or r.get("notifiable")),
            }
        return {"chart": chart, "bucket": bucket, "count": len(matched), "incidents": [_slim(r) for r in matched]}

    # ============================================================
    # PHASE 3 — Credentials / Training / Risk / Docs / Audits /
    # Compliance Score charts (C2–C7)
    # ============================================================

    async def _all_licences(current_user, site_id):
        rows = await db.licences.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(5000)
        if site_id and site_id != "all":
            rows = [r for r in rows if (r.get("site_id") == site_id)]
        return rows

    def _lic_status(lic, today):
        try:
            exp = datetime.fromisoformat((lic.get("expiry_date") or "")).date()
        except Exception:
            return "unknown"
        days = (exp - today).days
        if days < 0:
            return "expired"
        if days <= 30:
            return "expiring_30"
        if days <= 90:
            return "expiring_90"
        return "current"

    @api_router.get("/analytics/credentials")
    async def credential_analytics(
        chart: str = Query("status_overview"),
        period: str = Query("fytd"),
        site_id: Optional[str] = Query(None),
        current_user=Depends(get_current_user_dep),
    ):
        licences = await _all_licences(current_user, site_id)
        today = datetime.now(timezone.utc).date()
        if chart == "status_overview":
            buckets = {"current": 0, "expiring_30": 0, "expiring_90": 0, "expired": 0}
            for lic in licences:
                st = _lic_status(lic, today)
                if st in buckets:
                    buckets[st] += 1
            return {"chart": chart, "data": [
                {"status": "Current", "key": "current", "count": buckets["current"]},
                {"status": "Expiring ≤30d", "key": "expiring_30", "count": buckets["expiring_30"]},
                {"status": "Expiring 31–90d", "key": "expiring_90", "count": buckets["expiring_90"]},
                {"status": "Expired", "key": "expired", "count": buckets["expired"]},
            ]}
        if chart == "by_type":
            by_type: dict[str, dict[str, int]] = {}
            for lic in licences:
                t = (lic.get("licence_type") or "Other").title()
                by_type.setdefault(t, {"current": 0, "expired": 0})
                st = _lic_status(lic, today)
                by_type[t]["expired" if st == "expired" else "current"] += 1
            return {"chart": chart, "data": [{"type": k, **v} for k, v in sorted(by_type.items(), key=lambda x: -(x[1]["current"] + x[1]["expired"]))]}
        if chart == "expiry_forecast":
            keys = []
            cur = date(today.year, today.month, 1)
            for _ in range(6):
                keys.append(cur)
                cur = date(cur.year + (1 if cur.month == 12 else 0), 1 if cur.month == 12 else cur.month + 1, 1)
            buckets = {k.strftime("%Y-%m"): 0 for k in keys}
            for lic in licences:
                try:
                    exp = datetime.fromisoformat((lic.get("expiry_date") or "")).date()
                    k = exp.strftime("%Y-%m")
                    if k in buckets:
                        buckets[k] += 1
                except Exception:
                    pass
            return {"chart": chart, "data": [{"month": k, "expiring": v} for k, v in buckets.items()]}
        if chart == "by_site_heatmap":
            sites = await db.sites.find({"account_id": account_id_for_fn(current_user)}, {"_id": 0}).to_list(200)
            site_names = {s["site_id"]: s["name"] for s in sites}
            grid: dict[str, dict[str, dict]] = {}
            types_seen: set = set()
            for lic in licences:
                sid = lic.get("site_id") or "_unassigned"
                site_name = site_names.get(sid, "Unassigned" if sid == "_unassigned" else sid)
                ltype = (lic.get("licence_type") or "Other").title()
                types_seen.add(ltype)
                grid.setdefault(site_name, {}).setdefault(ltype, {"current": 0, "total": 0})
                grid[site_name][ltype]["total"] += 1
                if _lic_status(lic, today) == "current":
                    grid[site_name][ltype]["current"] += 1
            rows = []
            for s, by_t in grid.items():
                cells = []
                for t in sorted(types_seen):
                    cell = by_t.get(t, {"current": 0, "total": 0})
                    pct = round((cell["current"] / cell["total"]) * 100) if cell["total"] else None
                    cells.append({"type": t, "pct": pct, "current": cell["current"], "total": cell["total"]})
                rows.append({"site": s, "cells": cells})
            return {"chart": chart, "types": sorted(types_seen), "rows": rows}
        raise HTTPException(400, f"unknown chart '{chart}'")

    @api_router.get("/analytics/training")
    async def training_analytics(
        chart: str = Query("module_completion"),
        period: str = Query("fytd"),
        site_id: Optional[str] = Query(None),
        current_user=Depends(get_current_user_dep),
    ):
        rows = await db.academy_progress.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(5000)
        if not rows:
            rows = await db.academy_progress.find({"account_id": account_id_for_fn(current_user)}, {"_id": 0}).to_list(5000)
        if chart == "module_completion":
            by_mod: dict[str, dict[str, int]] = {}
            for r in rows:
                m = r.get("module_title") or r.get("module_id") or "Unknown"
                by_mod.setdefault(m, {"completed": 0, "total": 0})
                by_mod[m]["total"] += 1
                if (r.get("status") or "") == "completed":
                    by_mod[m]["completed"] += 1
            return {"chart": chart, "data": [
                {"module": k, "completed": v["completed"], "total": v["total"],
                 "pct": round((v["completed"] / v["total"]) * 100) if v["total"] else 0}
                for k, v in sorted(by_mod.items(), key=lambda x: -x[1]["completed"])
            ][:25]}
        if chart == "completion_over_time":
            start, end = _resolve_period(period, None, None)
            keys = _bucket_keys(start, end, "month")
            bucket = {k: {"bucket": k, "completed": 0, "cumulative": 0} for k in keys}
            cumulative = 0
            for k in keys:
                for r in rows:
                    iso = r.get("completed_at") or ""
                    if _month_key(iso) == k and (r.get("status") or "") == "completed":
                        bucket[k]["completed"] += 1
                cumulative += bucket[k]["completed"]
                bucket[k]["cumulative"] = cumulative
            return {"chart": chart, "data": list(bucket.values())}
        if chart == "overdue_mandatory":
            today_d = datetime.now(timezone.utc).date()
            overdue = []
            for r in rows:
                if not r.get("mandatory"):
                    continue
                if (r.get("status") or "") == "completed":
                    continue
                due = r.get("due_date") or ""
                try:
                    d = datetime.fromisoformat(due).date()
                    if d < today_d:
                        overdue.append({
                            "worker": r.get("worker_name") or r.get("user_name") or "Unknown",
                            "module": r.get("module_title") or r.get("module_id") or "—",
                            "days_overdue": (today_d - d).days,
                        })
                except Exception:
                    pass
            return {"chart": chart, "count": len(overdue),
                     "rows": sorted(overdue, key=lambda x: -x["days_overdue"])[:50]}
        if chart == "quiz_pass_rates":
            by_mod: dict[str, dict[str, int]] = {}
            for r in rows:
                m = r.get("module_title") or r.get("module_id") or "Unknown"
                attempts = r.get("quiz_attempts") or 0
                pass_score = r.get("quiz_passed")
                if attempts == 0 and pass_score is None:
                    continue
                by_mod.setdefault(m, {"passed": 0, "total": 0, "attempts": 0})
                by_mod[m]["total"] += 1
                by_mod[m]["attempts"] += int(attempts or 0)
                if pass_score:
                    by_mod[m]["passed"] += 1
            return {"chart": chart, "data": [
                {"module": k,
                 "pct": round((v["passed"] / v["total"]) * 100) if v["total"] else 0,
                 "avg_attempts": round(v["attempts"] / v["total"], 1) if v["total"] else 0}
                for k, v in sorted(by_mod.items(), key=lambda x: -((x[1]["passed"] / x[1]["total"]) if x[1]["total"] else 0))
            ][:20]}
        if chart == "hours_per_worker":
            by_worker: dict[str, float] = {}
            for r in rows:
                name = r.get("worker_name") or r.get("user_name") or "Unknown"
                hrs = float(r.get("hours_completed") or r.get("duration_hours") or 0)
                by_worker[name] = by_worker.get(name, 0) + hrs
            return {"chart": chart, "data": [
                {"worker": k, "hours": round(v, 1)}
                for k, v in sorted(by_worker.items(), key=lambda x: -x[1])
            ][:15]}
        raise HTTPException(400, f"unknown chart '{chart}'")

    @api_router.get("/analytics/risks")
    async def risk_analytics(
        chart: str = Query("matrix_heatmap"),
        period: str = Query("fytd"),
        site_id: Optional[str] = Query(None),
        view: str = Query("residual"),
        current_user=Depends(get_current_user_dep),
    ):
        risks = await db.risks.find(
            {"account_id": account_id_for_fn(current_user)}, {"_id": 0}
        ).to_list(5000)
        if site_id and site_id != "all":
            risks = [r for r in risks if r.get("site_id") == site_id]
        if chart == "matrix_heatmap":
            grid = [[0] * 5 for _ in range(5)]
            l_key = "residual_likelihood" if view == "residual" else "inherent_likelihood"
            c_key = "residual_consequence" if view == "residual" else "inherent_consequence"
            for r in risks:
                try:
                    l = int(r.get(l_key) or 0)
                    c = int(r.get(c_key) or 0)
                    if 1 <= l <= 5 and 1 <= c <= 5:
                        grid[5 - l][c - 1] += 1
                except Exception:
                    pass
            return {"chart": chart, "view": view, "grid": grid}
        if chart == "by_rating":
            buckets = {"Low": 0, "Medium": 0, "High": 0, "Extreme": 0}
            for r in risks:
                s = int(r.get("residual_score") or 0)
                if s >= 15:
                    buckets["Extreme"] += 1
                elif s >= 8:
                    buckets["High"] += 1
                elif s >= 4:
                    buckets["Medium"] += 1
                else:
                    buckets["Low"] += 1
            return {"chart": chart, "total": len(risks),
                     "segments": [{"label": k, "count": v} for k, v in buckets.items()]}
        if chart == "by_process":
            by_proc: dict[str, int] = {}
            for r in risks:
                p = r.get("process_name") or r.get("primary_hazard") or "Other"
                by_proc[p] = by_proc.get(p, 0) + 1
            return {"chart": chart, "data": [{"process": k, "count": v}
                     for k, v in sorted(by_proc.items(), key=lambda x: -x[1])][:15]}
        if chart == "overdue_reviews":
            today_d = datetime.now(timezone.utc).date()
            overdue = []
            for r in risks:
                due = r.get("next_review_date") or r.get("review_date") or ""
                try:
                    d = datetime.fromisoformat(due).date()
                    if d < today_d:
                        overdue.append({
                            "risk_id": r.get("risk_id"),
                            "title": r.get("title"),
                            "days_overdue": (today_d - d).days,
                        })
                except Exception:
                    pass
            return {"chart": chart, "count": len(overdue),
                     "rows": sorted(overdue, key=lambda x: -x["days_overdue"])[:50]}
        if chart == "controls_effectiveness":
            rows = []
            for r in risks:
                inh = int(r.get("inherent_score") or 0)
                res = int(r.get("residual_score") or 0)
                if inh >= 8:
                    rows.append({
                        "risk_id": r.get("risk_id"),
                        "title": (r.get("title") or "")[:50],
                        "inherent": inh,
                        "residual": res,
                        "reduction": inh - res,
                    })
            rows.sort(key=lambda x: -x["inherent"])
            return {"chart": chart, "data": rows[:15]}
        raise HTTPException(400, f"unknown chart '{chart}'")

    @api_router.get("/analytics/documents")
    async def document_analytics(
        chart: str = Query("generated_over_time"),
        period: str = Query("fytd"),
        site_id: Optional[str] = Query(None),
        current_user=Depends(get_current_user_dep),
    ):
        docs = await db.documents.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(5000)
        start, end = _resolve_period(period, None, None)
        if chart == "generated_over_time":
            keys = _bucket_keys(start, end, "month")
            bucket = {k: {"bucket": k, "count": 0} for k in keys}
            for d in docs:
                k = _month_key(d.get("created_at") or "")
                if k in bucket:
                    bucket[k]["count"] += 1
            return {"chart": chart, "data": list(bucket.values())}
        if chart == "by_status":
            buckets = {"Draft": 0, "Final": 0, "Archived": 0}
            for d in docs:
                s = (d.get("status") or "final").title()
                if s in buckets:
                    buckets[s] += 1
                else:
                    buckets["Final"] += 1
            return {"chart": chart, "total": sum(buckets.values()),
                     "segments": [{"label": k, "count": v} for k, v in buckets.items()]}
        if chart == "top_types":
            by_t: dict[str, int] = {}
            for d in docs:
                t = (d.get("type") or "Other").upper()
                by_t[t] = by_t.get(t, 0) + 1
            return {"chart": chart, "data": [{"type": k, "count": v}
                     for k, v in sorted(by_t.items(), key=lambda x: -x[1])][:10]}
        if chart == "due_for_review":
            today_d = datetime.now(timezone.utc).date()
            cutoff = today_d - timedelta(days=365)
            overdue = []
            for d in docs:
                last = d.get("last_reviewed_at") or d.get("created_at") or ""
                try:
                    dt = datetime.fromisoformat((last or "").replace("Z", "+00:00")).date()
                    if dt < cutoff:
                        overdue.append({
                            "document_id": d.get("document_id"),
                            "title": d.get("title") or d.get("type"),
                            "last_reviewed": last[:10],
                            "days": (today_d - dt).days,
                        })
                except Exception:
                    pass
            return {"chart": chart, "count": len(overdue),
                     "rows": sorted(overdue, key=lambda x: -x["days"])[:50]}
        raise HTTPException(400, f"unknown chart '{chart}'")

    @api_router.get("/analytics/audits")
    async def audit_analytics(
        chart: str = Query("completion_rate"),
        period: str = Query("fytd"),
        site_id: Optional[str] = Query(None),
        current_user=Depends(get_current_user_dep),
    ):
        audits = await db.audits.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(5000)
        if chart == "completion_rate":
            scheduled = sum(1 for a in audits if a.get("scheduled_at"))
            completed = sum(1 for a in audits if (a.get("status") or "") == "completed")
            pct = round((completed / scheduled) * 100) if scheduled else 0
            return {"chart": chart, "scheduled": scheduled, "completed": completed, "pct": pct}
        if chart == "scores_over_time":
            rows = [{
                "date": (a.get("completed_at") or a.get("created_at") or "")[:10],
                "score": int(a.get("score") or 0),
                "site": a.get("site_name") or a.get("site_id") or "All",
            } for a in audits if a.get("score") is not None]
            rows.sort(key=lambda x: x["date"])
            return {"chart": chart, "data": rows[-40:]}
        if chart == "open_findings":
            findings: dict[str, dict[str, int]] = {}
            for a in audits:
                for f in (a.get("findings") or []):
                    if (f.get("status") or "open") == "closed":
                        continue
                    cat = f.get("category") or "Other"
                    sev = (f.get("severity") or "minor").lower()
                    findings.setdefault(cat, {"minor": 0, "moderate": 0, "major": 0, "critical": 0, "total": 0})
                    if sev in findings[cat]:
                        findings[cat][sev] += 1
                    findings[cat]["total"] += 1
            return {"chart": chart, "data": [{"category": k, **v}
                     for k, v in sorted(findings.items(), key=lambda x: -x[1]["total"])][:20]}
        raise HTTPException(400, f"unknown chart '{chart}'")

    @api_router.get("/analytics/compliance-score")
    async def compliance_analytics(
        chart: str = Query("trend"),
        period: str = Query("fytd"),
        site_id: Optional[str] = Query(None),
        current_user=Depends(get_current_user_dep),
    ):
        if chart == "trend":
            start, end = _resolve_period(period, None, None)
            keys = _bucket_keys(start, end, "month")
            current = await _compliance_score(current_user)
            data = [{"bucket": k, "score": current} for k in keys]
            return {"chart": chart, "data": data, "current": current}
        if chart == "breakdown":
            try:
                workers = await db.workers.count_documents({"user_id": current_user.user_id})
                licences_list = await db.licences.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(1000)
                incidents_list = await db.incidents.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(1000)
                documents = await db.documents.count_documents({"user_id": current_user.user_id})
                today_n = datetime.now(timezone.utc)
                expired = 0
                expiring = 0
                for lic in licences_list:
                    try:
                        exp = datetime.fromisoformat(lic.get("expiry_date") or "")
                        if exp.tzinfo is None:
                            exp = exp.replace(tzinfo=timezone.utc)
                        days = (exp - today_n).days
                        if days < 0:
                            expired += 1
                        elif days <= 30:
                            expiring += 1
                    except Exception:
                        pass
                open_inc = sum(1 for i in incidents_list if i.get("status") == "open")
                serious = sum(1 for i in incidents_list if i.get("severity") in ("serious", "critical"))
                credentials_score = max(0, 100 - expired * 20 - expiring * 8)
                incidents_score = max(0, 100 - open_inc * 8 - serious * 12)
                documents_score = 100 if documents > 0 else 70
                training_score = await _training_completion(current_user, site_id)
                ra_score = 80  # placeholder until risk/audit weighted aggregator lands
                return {"chart": chart, "data": [
                    {"axis": "Credentials", "score": credentials_score},
                    {"axis": "Incidents", "score": incidents_score},
                    {"axis": "Documents", "score": documents_score},
                    {"axis": "Training", "score": training_score},
                    {"axis": "Risk/Audit", "score": ra_score},
                ]}
            except Exception:
                return {"chart": chart, "data": []}
        if chart == "by_site":
            sites = await db.sites.find({"account_id": account_id_for_fn(current_user)}, {"_id": 0}).to_list(200)
            score = await _compliance_score(current_user)
            data = [{"site": s["name"], "score": score} for s in sites]
            if not data:
                data = [{"site": "All Sites", "score": score}]
            data.sort(key=lambda x: -x["score"])
            return {"chart": chart, "data": data}
        raise HTTPException(400, f"unknown chart '{chart}'")

    # ----------- AI "This Week's Headline" -----------
    # Lazy import inside the handler so we don't pay the import cost on every
    # other endpoint. Cached for 24h per (account, industry, site) in a tiny
    # collection so the endpoint can be hit on every page load without burning
    # the LLM key budget.
    @api_router.get("/analytics/headline")
    async def weekly_headline(
        site_id: Optional[str] = Query(None),
        force: bool = Query(False),
        current_user=Depends(get_current_user_dep),
    ):
        cache_key = f"{account_id_for_fn(current_user)}::{site_id or 'all'}"
        if not force:
            cached = await db.analytics_headline_cache.find_one({"_key": cache_key}, {"_id": 0})
            if cached:
                try:
                    age = (datetime.now(timezone.utc) - datetime.fromisoformat(cached["generated_at"].replace("Z", "+00:00"))).total_seconds()
                    if age < 24 * 3600:
                        return {**cached, "cached": True}
                except Exception:
                    pass

        # Gather the deltas this week vs last week — keep this cheap; we only
        # need a few facts for the model to write one sentence.
        today_d = datetime.now(timezone.utc).date()
        week_start = today_d - timedelta(days=7)
        prev_start = today_d - timedelta(days=14)
        cur_inc = await _all_incidents(current_user, site_id, week_start, today_d)
        prv_inc = await _all_incidents(current_user, site_id, prev_start, week_start - timedelta(days=1))
        creds = await _credentials_expiring(current_user, site_id, 30)
        capa = await _open_capa(current_user, site_id)
        industry = await _industry_of(current_user)
        comp = await _compliance_score(current_user)

        def _top_site(rows):
            counts: dict[str, int] = {}
            for r in rows:
                s = r.get("site") or r.get("site_id") or "Unassigned"
                if isinstance(s, dict):
                    s = s.get("name") or "Unassigned"
                counts[s] = counts.get(s, 0) + 1
            return max(counts.items(), key=lambda x: x[1])[0] if counts else None

        facts = {
            "industry": industry,
            "incidents_this_week": len(cur_inc),
            "incidents_last_week": len(prv_inc),
            "delta_pct": (round(((len(cur_inc) - len(prv_inc)) / max(len(prv_inc), 1)) * 100) if prv_inc else None),
            "top_site_this_week": _top_site(cur_inc),
            "credentials_expiring_30d": creds,
            "open_capa": capa,
            "compliance_score": comp,
            "primary_mechanism": None,
        }
        # mechanism keyword scan on this week's data
        text = " ".join((r.get("description") or "") for r in cur_inc).lower()
        for label, kws in [("manual handling", ["manual", "lift", "carry", "back"]),
                            ("falls/trips/slips", ["fall", "slip", "trip"]),
                            ("vehicle", ["vehicle", "truck", "forklift"]),
                            ("psychosocial", ["psych", "stress", "bully"])]:
            if any(k in text for k in kws):
                facts["primary_mechanism"] = label
                break

        # Compose the prompt — single sentence, plain Australian English, no fluff
        prompt = (
            "You are a WHS analyst writing the headline of a weekly compliance brief for an Australian business owner. "
            "Write EXACTLY ONE sentence, plain Australian English, present tense, no jargon, no apologies, no greetings, no markdown. "
            "If facts['incidents_this_week'] is 0 and there are no credential or CAPA issues, congratulate the user on a clean week. "
            "Otherwise lead with the most operationally significant fact (large incident delta, top site, mechanism, credentials risk, or compliance gap). "
            "Aim for 20–35 words. Do NOT prefix with 'Headline:' or any label.\n\n"
            f"Facts: {facts}"
        )
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage  # type: ignore
            chat = LlmChat(
                api_key=os.environ["EMERGENT_LLM_KEY"],
                session_id=f"headline-{cache_key}",
                system_message="You write concise, useful, executive-grade WHS headlines.",
            ).with_model("anthropic", "claude-sonnet-4-5")
            ai_text = await chat.send_message(UserMessage(text=prompt))
        except Exception as e:
            logger.warning(f"headline generation failed: {e}")
            # Deterministic fallback so the strip is never blank
            if facts["incidents_this_week"] == 0 and facts["open_capa"] == 0 and facts["credentials_expiring_30d"] == 0:
                ai_text = "Clean week — no incidents logged, no overdue actions, and no credentials expiring in the next 30 days."
            else:
                bits = []
                if facts["incidents_this_week"]:
                    bits.append(f"{facts['incidents_this_week']} incident(s) this week")
                if facts["top_site_this_week"]:
                    bits.append(f"top site {facts['top_site_this_week']}")
                if facts["primary_mechanism"]:
                    bits.append(f"primarily {facts['primary_mechanism']}")
                if facts["credentials_expiring_30d"]:
                    bits.append(f"{facts['credentials_expiring_30d']} credentials expiring in ≤30 days")
                if facts["open_capa"]:
                    bits.append(f"{facts['open_capa']} open corrective actions")
                ai_text = "; ".join(bits) + "." if bits else "All clear."

        payload = {
            "_key": cache_key,
            "headline": ai_text.strip().strip('"').strip("'"),
            "facts": facts,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.analytics_headline_cache.update_one(
            {"_key": cache_key}, {"$set": payload}, upsert=True,
        )
        return {**payload, "cached": False}
