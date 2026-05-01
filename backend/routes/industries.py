"""
Public industry registry + live signal endpoints.

- GET /api/industries             -> list of 5 industries (no auth)
- GET /api/public/industry-signal/{slug} -> live aggregated signal with
                                             fallback to hard-coded copy when
                                             real user count < threshold.

Wire: server.py calls register_industry_routes(api_router, db=db) after auth.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException

from industry_module import INDUSTRIES, VALID_INDUSTRIES

# Thresholds below which we prefer hard-coded copy (so early-stage SafeBase
# doesn't advertise "3 operators this month" when real count is sparse).
MIN_REAL_COUNT = 10


def register_industry_routes(api_router: APIRouter, *, db):

    @api_router.get("/public/safebase-activity/today")
    async def safebase_activity_today():
        """Aggregate live activity counters across the entire SafeBase platform
        for the last 24 hours. Used by the dashboard 'Today's Activity' ticker
        to drive engagement / FOMO. No auth required — counts only, no data.
        """
        now = datetime.now(timezone.utc)
        day_ago = (now - timedelta(days=1)).isoformat()
        week_ago = (now - timedelta(days=7)).isoformat()
        # Each counter is independent — failures fall through to 0.
        async def _safe_count(coll, q):
            try:
                return await db[coll].count_documents(q)
            except Exception:
                return 0
        swms_today = await _safe_count("swms", {"created_at": {"$gte": day_ago}})
        incidents_today = await _safe_count("incidents", {"created_at": {"$gte": day_ago}})
        incidents_workflow_today = await _safe_count("incident_workflow", {"created_at": {"$gte": day_ago}})
        inductions_today = await _safe_count("induction_submissions", {"submitted_at": {"$gte": day_ago}})
        docs_today = await _safe_count("compliance_docs", {"created_at": {"$gte": day_ago}})
        risks_today = await _safe_count("safety_risks", {"created_at": {"$gte": day_ago}})
        toolbox_today = await _safe_count("safety_toolbox_talks", {"created_at": {"$gte": day_ago}})
        new_users_week = await _safe_count("users", {"created_at": {"$gte": week_ago}})
        return {
            "as_of": now.isoformat(),
            "window": "last_24h",
            "swms_generated": swms_today,
            "incidents_logged": incidents_today + incidents_workflow_today,
            "inductions_completed": inductions_today,
            "documents_generated": docs_today,
            "risks_added": risks_today,
            "toolbox_talks_conducted": toolbox_today,
            "new_businesses_this_week": new_users_week,
        }

    @api_router.get("/industries")
    async def list_industries():
        return {"industries": [
            {"slug": v["slug"], "name": v["name"], "nav": v["nav"], "icon": v["icon"]}
            for v in INDUSTRIES.values()
        ]}

    @api_router.get("/public/industry-signal/{slug}")
    async def industry_signal(slug: str):
        if slug not in VALID_INDUSTRIES:
            raise HTTPException(404, "Unknown industry")
        ind = INDUSTRIES[slug]

        # 7-day window aggregate on the users collection.
        now = datetime.now(timezone.utc)
        week_ago = (now - timedelta(days=7)).isoformat()
        month_ago = (now - timedelta(days=30)).isoformat()

        week_count = await db.users.count_documents({
            "industry": slug,
            "created_at": {"$gte": week_ago},
        })
        month_count = await db.users.count_documents({
            "industry": slug,
            "created_at": {"$gte": month_ago},
        })
        total_count = await db.users.count_documents({"industry": slug})

        use_live = (week_count + month_count) >= MIN_REAL_COUNT
        if use_live:
            # Live signal derived from real counts.
            pulse = (f"{week_count} {slug} businesses joined this week · "
                     f"{month_count} this month · {total_count} total on SafeBase")
        else:
            pulse = ind["hero_signal"]["pulse_fallback"]

        return {
            "slug": slug,
            "name": ind["name"],
            "pulse": pulse,
            "featured": ind["hero_signal"]["featured"],
            "live": use_live,
            "counts": {
                "last_7d": week_count,
                "last_30d": month_count,
                "total": total_count,
            },
        }
