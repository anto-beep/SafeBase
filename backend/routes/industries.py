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
