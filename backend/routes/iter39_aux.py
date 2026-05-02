"""
Public + admin aux endpoints for Iter39.

Mounts 3 feature clusters:
  GET /api/plan-rightsizer/recommend — server-side tier recommendation
  GET /api/demo-requests             — owner-only sales-lead list
  PATCH /api/demo-requests/{id}      — owner-only status update
  GET /api/regulatory-digest         — per-industry "what changed" feed
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query


# --------------------------------------------------------------------------
# Plan-right-sizer: mirrors `recommendTier()` in PlanRightsizer.jsx exactly.
# --------------------------------------------------------------------------

# Keep these in sync with /app/frontend/src/data/pricing.config.js
PRICING = {
    "trades": {
        "label": "Trades and Construction",
        "plan_names": ["Solo Tradie", "Small Team", "Growing Business", "Enterprise"],
        "user_limits": ["1 user", "Up to 5 users", "Up to 20 users", "Up to 50 users"],
        "annual":  [5990,  11990, 18990, 29990],
        "monthly": [599,   1199,  1899,  2999],
    },
    "retail": {
        "label": "Retail",
        "plan_names": ["Single Store", "Small Chain", "Multi-Store", "Enterprise"],
        "user_limits": ["Up to 5 users", "Up to 15 users", "Up to 30 users", "Up to 50 users"],
        "annual":  [7990, 15990, 24990, 39990],
        "monthly": [799,  1599,  2499,  3999],
    },
    "hospitality": {
        "label": "Hospitality",
        "plan_names": ["Single Venue", "Small Group", "Multi-Venue", "Enterprise"],
        "user_limits": ["Up to 3 users", "Up to 8 users", "Up to 20 users", "Up to 50 users"],
        "annual":  [11990, 22990, 34990, 54990],
        "monthly": [1199,  2299,  3499,  5499],
    },
    "transport": {
        "label": "Transport and Logistics",
        "plan_names": ["Owner-Operator", "Small Fleet", "Growing Fleet", "Enterprise"],
        "user_limits": ["Up to 3 users", "Up to 10 users", "Up to 25 users", "Up to 50 users"],
        "annual":  [14990, 27990, 42990, 69990],
        "monthly": [1499,  2799,  4299,  6999],
    },
    "healthcare": {
        "label": "Healthcare and Aged Care",
        "plan_names": ["Solo Practice", "Small Practice", "Multi-Site", "Enterprise"],
        "user_limits": ["Up to 5 users", "Up to 15 users", "Up to 30 users", "Up to 60 users"],
        "annual":  [24990, 49990, 79990, 179990],
        "monthly": [2499,  4999,  7999,  17999],
    },
}

RISK_ANCHOR = {
    "trades":      "Average WorkSafe prosecution: A$116,979. SafeBase Solo Tradie is 5.1% of one fine.",
    "retail":      "One manual-handling claim A$15k-50k; one customer slip-and-fall A$20k-100k.",
    "hospitality": "Council prosecution A$10k-50k; a single day of venue closure is unrecoverable revenue.",
    "transport":   "CoR criminal defence A$50k-200k in legal fees. NHVR 24h notification deadlines.",
    "healthcare":  "Governance consultant A$3k-8k/month. ACQSC audit prep A$5k-15k. Loss of registration ends operations.",
}


def _recommend_idx(industry: str, team: int, locations: int) -> int:
    if industry == "trades":
        if team <= 1: return 0
        if team <= 5: return 1
        if team <= 20: return 2
        return 3
    if industry == "retail":
        if locations >= 30 or team > 30: return 3
        if locations >= 6 or team > 15: return 2
        if locations >= 2 or team > 5: return 1
        return 0
    if industry == "hospitality":
        if locations >= 20 or team > 20: return 3
        if locations >= 6 or team > 8: return 2
        if locations >= 2 or team > 3: return 1
        return 0
    if industry == "transport":
        if team > 25 or locations >= 5: return 3
        if team > 10 or locations >= 3: return 2
        if team > 3: return 1
        return 0
    if industry == "healthcare":
        if team > 30 or locations >= 5: return 3
        if team > 15 or locations >= 3: return 2
        if team > 5: return 1
        return 0
    return 0


# --------------------------------------------------------------------------
# Regulatory digest — curated "what changed" items per industry.
# In production this would be an ingest worker; here it is a static list
# refreshed when the app boots.
# --------------------------------------------------------------------------
def _digest_items() -> list[dict]:
    return [
        # Healthcare
        {"industry": "healthcare", "title": "Aged Care Act 2024 — Strengthened Quality Standards commencement",
         "body": "The strengthened Quality Standards take effect July 2026. ACQSC has published updated evidence-pack guidance and the revised Serious Incident Response Scheme (SIRS) classification matrix.",
         "regulator": "ACQSC", "source_url": "https://www.agedcarequality.gov.au", "posted": "2026-02-04", "severity": "high"},
        {"industry": "healthcare", "title": "AHPRA — tightened continuing professional development audits",
         "body": "AHPRA has increased random CPD audits to 5% of registrants in 2026. Practices should verify every registered clinician has documented CPD for the 2025 cycle.",
         "regulator": "AHPRA", "source_url": "https://www.ahpra.gov.au", "posted": "2026-01-28", "severity": "medium"},
        {"industry": "healthcare", "title": "NDIS Commission — reportable incident 24h window clarification",
         "body": "Clarification issued: the 24-hour notification window starts from the time a worker *reasonably became aware*, not the time of the incident itself.",
         "regulator": "NDIS Commission", "source_url": "https://www.ndiscommission.gov.au", "posted": "2026-01-22", "severity": "high"},
        # Transport
        {"industry": "transport", "title": "NHVR — expanded executive due-diligence audit program",
         "body": "NHVR has expanded its s26C executive due-diligence audit program to mid-sized operators (25+ vehicles). Evidence of documented CoR management system is the first item requested.",
         "regulator": "NHVR", "source_url": "https://www.nhvr.gov.au", "posted": "2026-02-08", "severity": "high"},
        {"industry": "transport", "title": "Fatigue rule amendment — BFM record-keeping tightened",
         "body": "From April 2026, BFM-accredited operators must retain fatigue records for 3 years (up from 12 months). Paper-diary backup is no longer acceptable evidence.",
         "regulator": "NHVR", "source_url": "https://www.nhvr.gov.au", "posted": "2026-01-15", "severity": "medium"},
        # Hospitality
        {"industry": "hospitality", "title": "FSANZ Standard 3.2.2A — Food Safety Supervisor transition",
         "body": "All applicable category-1 and category-2 venues must have a certified Food Safety Supervisor on every shift by December 2026. Council inspection packs now include FSS certification as a mandatory evidence item.",
         "regulator": "FSANZ", "source_url": "https://www.foodstandards.gov.au", "posted": "2026-02-01", "severity": "high"},
        {"industry": "hospitality", "title": "NSW Liquor and Gaming — RSA refresher requirement",
         "body": "NSW has confirmed that all RSA certificates issued before 2020 must be refreshed by June 2026. Venues should audit staff RSA dates now.",
         "regulator": "NSW Liquor and Gaming", "source_url": "https://www.liquorandgaming.nsw.gov.au", "posted": "2026-01-20", "severity": "medium"},
        # Retail
        {"industry": "retail", "title": "SafeWork — retail psychosocial hazard Code of Practice",
         "body": "The approved Code of Practice for managing psychosocial hazards in retail workplaces (including customer aggression and lone working) commences 1 March 2026.",
         "regulator": "SafeWork", "source_url": "https://www.safeworkaustralia.gov.au", "posted": "2026-02-10", "severity": "high"},
        {"industry": "retail", "title": "Fair Work — casual conversion rules under revised Fair Work Act",
         "body": "Retail employers with 15+ employees must now issue a written casual conversion offer or notice of denial after 6 months (previously 12).",
         "regulator": "Fair Work Ombudsman", "source_url": "https://www.fairwork.gov.au", "posted": "2026-01-30", "severity": "medium"},
        # Trades
        {"industry": "trades", "title": "WHS Regulations — Silica exposure threshold tightened",
         "body": "The workplace exposure standard for crystalline silica has been reduced to 0.025 mg/m³ (from 0.05). All SWMS involving cutting, grinding, or demolition of engineered stone must be updated.",
         "regulator": "Safe Work Australia", "source_url": "https://www.safeworkaustralia.gov.au", "posted": "2026-02-02", "severity": "high"},
        {"industry": "trades", "title": "NSW SafeWork — Notifiable incident reporting expanded",
         "body": "Any fall from a height of 2m or greater is now a notifiable incident in NSW, regardless of injury. Previously the threshold was 2m with serious injury.",
         "regulator": "SafeWork NSW", "source_url": "https://www.safework.nsw.gov.au", "posted": "2026-01-25", "severity": "medium"},
    ]


def register_iter39_routes(api_router: APIRouter, *, db, get_current_user_dep,
                            account_id_for_fn, logger):

    @api_router.get("/plan-rightsizer/recommend")
    async def plan_rightsizer_recommend(
        industry: str = Query(..., description="trades/hospitality/transport/healthcare/retail"),
        team: int = Query(1, ge=1, le=500),
        locations: int = Query(1, ge=1, le=500),
    ):
        if industry not in PRICING:
            raise HTTPException(400, "Unknown industry. Must be one of: " + ", ".join(PRICING.keys()))
        cfg = PRICING[industry]
        idx = _recommend_idx(industry, team, locations)
        return {
            "industry": industry,
            "industry_label": cfg["label"],
            "team": team,
            "locations": locations,
            "recommended_tier_index": idx,
            "plan_name": cfg["plan_names"][idx],
            "user_limit": cfg["user_limits"][idx],
            "annual_aud_ex_gst": cfg["annual"][idx],
            "monthly_aud_ex_gst": cfg["monthly"][idx],
            "annual_saving_aud": cfg["monthly"][idx] * 12 - cfg["annual"][idx],
            "risk_anchor": RISK_ANCHOR[industry],
            "cta_register_url": f"/register?industry={industry}&tier={idx}&team={team}&locations={locations}",
            "cta_trial_days": 14,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    # ---------- Demo requests (owner-only) ---------------------------------
    def _owner_only(user):
        variant = (getattr(user, "role_variant", "owner") or "owner").lower()
        if variant != "owner":
            raise HTTPException(403, "Owner-only")

    @api_router.get("/demo-requests")
    async def list_demo_requests(current_user=Depends(get_current_user_dep),
                                  status: Optional[str] = None,
                                  industry: Optional[str] = None,
                                  limit: int = Query(200, le=1000)):
        _owner_only(current_user)
        q = {}
        if status: q["status"] = status
        if industry: q["industry"] = industry
        rows = await db.demo_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
        counts = {"new": 0, "contacted": 0, "qualified": 0, "closed": 0}
        for r in rows:
            s = r.get("status") or "new"
            counts[s] = counts.get(s, 0) + 1
        return {"total": len(rows), "rows": rows, "counts": counts}

    @api_router.patch("/demo-requests/{request_id}")
    async def update_demo_request(request_id: str, body: dict,
                                    current_user=Depends(get_current_user_dep)):
        _owner_only(current_user)
        new_status = body.get("status")
        note = body.get("note")
        allowed = {"new", "contacted", "qualified", "closed"}
        if new_status and new_status not in allowed:
            raise HTTPException(400, f"status must be one of: {', '.join(sorted(allowed))}")
        update = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if new_status: update["status"] = new_status
        if note is not None: update["note"] = note
        res = await db.demo_requests.update_one({"request_id": request_id}, {"$set": update})
        if not res.matched_count:
            raise HTTPException(404, "Not found")
        return {"ok": True, "request_id": request_id, "status": new_status or "unchanged"}

    # ---------- Regulatory digest (public, cached in-memory) ---------------
    @api_router.get("/regulatory-digest")
    async def regulatory_digest(industry: Optional[str] = None, limit: int = Query(20, le=100)):
        items = _digest_items()
        if industry:
            items = [i for i in items if i["industry"] == industry]
        items.sort(key=lambda i: (0 if i["severity"] == "high" else 1, i["posted"]), reverse=False)
        items.sort(key=lambda i: i["posted"], reverse=True)
        items = items[:limit]
        return {"total": len(items), "items": items, "generated_at": datetime.now(timezone.utc).isoformat()}
