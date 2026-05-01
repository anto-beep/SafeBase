"""
Compliance Inbox — cross-industry aggregator of open deadlines and breaches.

Pulls from every industry-specific collection (and universal ones) and
returns a single prioritised, severity-scored list so the owner sees the
most urgent item from any industry in one place.

Endpoints:
  GET /api/compliance-inbox                 — full list (paginated-ish, up to 200)
  GET /api/compliance-inbox/summary         — counts only (for dashboard widget)

Items are returned in the shape:
  {
    item_id, kind, severity (critical|high|medium|info),
    industry, title, subtitle, due_at, cta_path, source_id,
    minutes_overdue_or_remaining, icon_hint,
  }

Severity ranking:
  critical = overdue OR ≤4h remaining on regulator-mandated deadline
  high     = ≤24h remaining
  medium   = ≤30 days remaining
  info     = acknowledgement items (recent OK logs etc.)
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query


CRIT_HOURS = 4
HIGH_HOURS = 24
MED_DAYS = 30


def _now():
    return datetime.now(timezone.utc)


def _parse(iso: str | None):
    if not iso:
        return None
    try:
        return datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
    except Exception:
        return None


def _delta_min(target):
    """Minutes between target and now (positive = future, negative = overdue)."""
    if not target:
        return None
    return int((target - _now()).total_seconds() / 60)


def _classify(due_at, regulatory: bool = False):
    """Return (severity, minutes_remaining) for a due_at."""
    if not due_at:
        return ("medium", None)
    minutes = _delta_min(due_at)
    if minutes is None:
        return ("medium", None)
    # Overdue
    if minutes < 0:
        return ("critical", minutes)
    hours = minutes / 60
    if regulatory and hours <= CRIT_HOURS:
        return ("critical", minutes)
    if hours <= HIGH_HOURS:
        return ("high", minutes)
    days = hours / 24
    if days <= MED_DAYS:
        return ("medium", minutes)
    return ("info", minutes)


SEVERITY_RANK = {"critical": 0, "high": 1, "medium": 2, "info": 3}


def register_compliance_inbox_routes(api_router: APIRouter, *, db, get_current_user_dep,
                                      account_id_for_fn, logger):

    async def _collect(user) -> list[dict]:
        items: list[dict] = []
        account_id = account_id_for_fn(user)
        q = {"account_id": account_id}
        now = _now()

        # -------- HEALTHCARE -------------------------------------------------
        # SIRS pending — P1 (24h) and P2 (30d)
        try:
            sirs = await db.sirs_incidents.find({**q, "status": {"$ne": "submitted"}}, {"_id": 0}).to_list(200)
            for r in sirs:
                is_p1 = r.get("priority") == "one"
                due = _parse(r.get("notify_by_24h") if is_p1 else r.get("notify_by_30d"))
                sev, mins = _classify(due, regulatory=is_p1)
                items.append({
                    "item_id": f"inbox_sirs_{r['incident_id']}",
                    "kind": "sirs_notify",
                    "severity": sev,
                    "industry": "healthcare",
                    "title": f"SIRS {'P1 (24h)' if is_p1 else 'P2 (30d)'} — {r.get('category', '').replace('_', ' ').title()}",
                    "subtitle": (r.get("summary") or "")[:140],
                    "due_at": (r.get("notify_by_24h") if is_p1 else r.get("notify_by_30d")),
                    "cta_path": "/dashboard/care-quality",
                    "source_id": r["incident_id"],
                    "minutes_remaining": mins,
                    "icon_hint": "alert",
                })
        except Exception:
            logger.exception("inbox: sirs collect failed")

        # NDIS reportable pending
        try:
            ndis = await db.ndis_reportable.find({**q, "status": {"$ne": "submitted"}}, {"_id": 0}).to_list(200)
            for r in ndis:
                due = _parse(r.get("notify_commission_by"))
                sev, mins = _classify(due, regulatory=bool(r.get("is_high_risk")))
                items.append({
                    "item_id": f"inbox_ndis_{r['incident_id']}",
                    "kind": "ndis_notify",
                    "severity": sev,
                    "industry": "healthcare",
                    "title": f"NDIS reportable — {r.get('category', '').replace('_', ' ').title()}",
                    "subtitle": (r.get("summary") or "")[:140],
                    "due_at": r.get("notify_commission_by"),
                    "cta_path": "/dashboard/care-quality",
                    "source_id": r["incident_id"],
                    "minutes_remaining": mins,
                    "icon_hint": "alert",
                })
        except Exception:
            logger.exception("inbox: ndis collect failed")

        # AHPRA expiring / expired (30d window)
        try:
            ahpra = await db.ahpra_register.find(q, {"_id": 0}).to_list(500)
            for r in ahpra:
                exp = _parse(r.get("expires_at"))
                if not exp:
                    continue
                mins = _delta_min(exp)
                days = mins / 1440 if mins is not None else None
                if days is None or days > MED_DAYS:
                    continue
                sev = "critical" if days < 0 else ("high" if days <= 7 else "medium")
                items.append({
                    "item_id": f"inbox_ahpra_{r['reg_id']}",
                    "kind": "ahpra_expiry",
                    "severity": sev,
                    "industry": "healthcare",
                    "title": ("AHPRA EXPIRED — " if days < 0 else "AHPRA expiring — ") + (r.get("worker_name") or ""),
                    "subtitle": f"{r.get('profession')} · reg {r.get('registration_number')}",
                    "due_at": r.get("expires_at"),
                    "cta_path": "/dashboard/care-quality",
                    "source_id": r.get("reg_id"),
                    "minutes_remaining": mins,
                    "icon_hint": "badge",
                })
        except Exception:
            logger.exception("inbox: ahpra collect failed")

        # -------- TRANSPORT --------------------------------------------------
        # NHVR Notifiable Occurrences pending
        try:
            nhvr = await db.nhvr_occurrences.find({**q, "status": {"$ne": "submitted"}, "nhvr_notified_at": None}, {"_id": 0}).to_list(200)
            for r in nhvr:
                due = _parse(r.get("notify_nhvr_by"))
                sev, mins = _classify(due, regulatory=True)
                items.append({
                    "item_id": f"inbox_nhvr_{r['occurrence_id']}",
                    "kind": "nhvr_notify",
                    "severity": sev,
                    "industry": "transport",
                    "title": f"NHVR 24h — {r.get('occurrence_type', '').replace('_', ' ').title()}",
                    "subtitle": (r.get("summary") or "")[:140],
                    "due_at": r.get("notify_nhvr_by"),
                    "cta_path": "/dashboard/cor",
                    "source_id": r["occurrence_id"],
                    "minutes_remaining": mins,
                    "icon_hint": "truck",
                })
        except Exception:
            logger.exception("inbox: nhvr collect failed")

        # Fatigue breaches (last 7 days, unresolved)
        try:
            seven_ago = (now - timedelta(days=7)).isoformat()
            fbreach = await db.fatigue_logs.find({**q, "breach": True, "day_date": {"$gte": seven_ago[:10]}}, {"_id": 0}).to_list(100)
            for r in fbreach:
                items.append({
                    "item_id": f"inbox_fatigue_{r['log_id']}",
                    "kind": "fatigue_breach",
                    "severity": "high",
                    "industry": "transport",
                    "title": f"Fatigue breach — {r.get('driver_name')}",
                    "subtitle": "; ".join(r.get("breach_reasons", [])),
                    "due_at": None,
                    "cta_path": "/dashboard/cor",
                    "source_id": r["log_id"],
                    "minutes_remaining": None,
                    "icon_hint": "clock",
                })
        except Exception:
            logger.exception("inbox: fatigue collect failed")

        # -------- RETAIL -----------------------------------------------------
        # Lone-worker overdue/should-escalate
        try:
            active = await db.lone_worker_logs.find({**q, "ended": False, "escalated": False}, {"_id": 0}).to_list(200)
            for r in active:
                due = _parse(r.get("next_checkin_due"))
                mins = _delta_min(due) if due else None
                if mins is None or mins > 60:  # only surface when <=1h remaining
                    continue
                sev = "critical" if mins <= -30 else ("high" if mins <= 0 else "medium")
                items.append({
                    "item_id": f"inbox_lw_{r['checkin_id']}",
                    "kind": "lone_worker_overdue",
                    "severity": sev,
                    "industry": "retail",
                    "title": ("Lone worker OVERDUE — " if mins <= 0 else "Lone worker check-in soon — ") + (r.get("worker_name") or ""),
                    "subtitle": r.get("location") or "",
                    "due_at": r.get("next_checkin_due"),
                    "cta_path": "/dashboard/inductions",
                    "source_id": r["checkin_id"],
                    "minutes_remaining": mins,
                    "icon_hint": "user",
                })
        except Exception:
            logger.exception("inbox: lone worker collect failed")

        # -------- HOSPITALITY ------------------------------------------------
        # Temperature breaches last 24h
        try:
            day_ago = (now - timedelta(hours=24)).isoformat()
            breaches = await db.temperature_logs.find({**q, "in_range": False, "taken_at": {"$gte": day_ago}}, {"_id": 0}).to_list(100)
            for r in breaches:
                items.append({
                    "item_id": f"inbox_temp_{r['log_id']}",
                    "kind": "temp_breach",
                    "severity": "high",
                    "industry": "hospitality",
                    "title": f"Temperature breach — {r.get('equipment')}",
                    "subtitle": f"{r.get('temp_c')}°C · {r.get('out_of_range_reason')}",
                    "due_at": r.get("taken_at"),
                    "cta_path": "/dashboard/food-safety",
                    "source_id": r["log_id"],
                    "minutes_remaining": None,
                    "icon_hint": "thermometer",
                })
        except Exception:
            logger.exception("inbox: temp collect failed")

        # HACCP CCP breaches last 7 days
        try:
            seven_ago = (now - timedelta(days=7)).isoformat()
            haccp = await db.haccp_ccp_log.find({**q, "within_limit": False, "recorded_at": {"$gte": seven_ago}}, {"_id": 0}).to_list(100)
            for r in haccp:
                items.append({
                    "item_id": f"inbox_ccp_{r['ccp_id']}",
                    "kind": "haccp_breach",
                    "severity": "high",
                    "industry": "hospitality",
                    "title": f"HACCP CCP breach — {r.get('ccp_step')}",
                    "subtitle": f"Measured {r.get('measured_value')} · limit {r.get('critical_limit')}",
                    "due_at": r.get("recorded_at"),
                    "cta_path": "/dashboard/food-safety",
                    "source_id": r["ccp_id"],
                    "minutes_remaining": None,
                    "icon_hint": "alert",
                })
        except Exception:
            logger.exception("inbox: haccp collect failed")

        # FSS / Liquor cert expiring
        try:
            fss = await db.fss_register.find(q, {"_id": 0}).to_list(500)
            liq = await db.liquor_certs.find(q, {"_id": 0}).to_list(500)
            for source, kind, label in [(fss, "fss_expiry", "FSS cert"), (liq, "liquor_expiry", "Liquor cert")]:
                for r in source:
                    exp = _parse(r.get("expires_at"))
                    if not exp:
                        continue
                    mins = _delta_min(exp)
                    days = mins / 1440 if mins is not None else None
                    if days is None or days > MED_DAYS:
                        continue
                    sev = "critical" if days < 0 else ("high" if days <= 7 else "medium")
                    items.append({
                        "item_id": f"inbox_{kind}_{r.get('fss_id') or r.get('cert_id')}",
                        "kind": kind,
                        "severity": sev,
                        "industry": "hospitality",
                        "title": f"{label} — {r.get('worker_name')}",
                        "subtitle": r.get("certificate_type") or r.get("issuing_rto") or "",
                        "due_at": r.get("expires_at"),
                        "cta_path": "/dashboard/food-safety",
                        "source_id": r.get("fss_id") or r.get("cert_id"),
                        "minutes_remaining": mins,
                        "icon_hint": "badge",
                    })
        except Exception:
            logger.exception("inbox: fss/liquor collect failed")

        # -------- UNIVERSAL: Open incidents > 7 days old --------------------
        try:
            rec_ago = (now - timedelta(days=7)).isoformat()
            incidents = await db.incidents.find({**q, "status": {"$nin": ["closed", "resolved"]},
                                                 "created_at": {"$lte": rec_ago}}, {"_id": 0}).to_list(100)
            for r in incidents:
                items.append({
                    "item_id": f"inbox_inc_{r.get('incident_id') or r.get('id') or ''}",
                    "kind": "incident_open_long",
                    "severity": "medium",
                    "industry": (r.get("industry") or getattr(user, "industry", None) or "trades"),
                    "title": f"Incident open >7 days — {r.get('reference') or r.get('incident_id', '')[:12]}",
                    "subtitle": (r.get("description") or r.get("summary") or "")[:140],
                    "due_at": r.get("created_at"),
                    "cta_path": "/dashboard/incidents",
                    "source_id": r.get("incident_id") or r.get("id"),
                    "minutes_remaining": None,
                    "icon_hint": "alert",
                })
        except Exception:
            pass

        # Sort: severity asc, then due_at asc (earliest deadline first)
        def _sort_key(i):
            return (SEVERITY_RANK.get(i["severity"], 9),
                    i.get("minutes_remaining") if i.get("minutes_remaining") is not None else 10**9,
                    i.get("due_at") or "z")

        items.sort(key=_sort_key)
        return items

    @api_router.get("/compliance-inbox")
    async def compliance_inbox(current_user=Depends(get_current_user_dep),
                                limit: int = Query(100, le=500),
                                severity: Optional[str] = None,
                                industry: Optional[str] = None):
        items = await _collect(current_user)
        if severity:
            items = [i for i in items if i["severity"] == severity]
        if industry:
            items = [i for i in items if i["industry"] == industry]
        items = items[:limit]
        return {
            "total": len(items),
            "counts_by_severity": {
                s: sum(1 for i in items if i["severity"] == s)
                for s in ("critical", "high", "medium", "info")
            },
            "items": items,
            "generated_at": _now().isoformat(),
        }

    @api_router.get("/compliance-inbox/summary")
    async def compliance_inbox_summary(current_user=Depends(get_current_user_dep)):
        items = await _collect(current_user)
        return {
            "total": len(items),
            "critical": sum(1 for i in items if i["severity"] == "critical"),
            "high": sum(1 for i in items if i["severity"] == "high"),
            "medium": sum(1 for i in items if i["severity"] == "medium"),
            "top_3": items[:3],
            "generated_at": _now().isoformat(),
        }
