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
# Backend is canonical: web + mobile fetch the live catalogue via
# GET /api/pricing/catalogue on boot. Any edit here propagates to both.
PRICING = {
    "trades": {
        "label": "Trades and Construction",
        "accent": "#FFCC00",
        "plan_names": ["Solo Tradie", "Small Team", "Growing Business", "Enterprise"],
        "user_limits": ["1 user", "Up to 5 users", "Up to 20 users", "Up to 50 users"],
        "annual":  [7990,  15990, 24990, 39990],
        "monthly": [799,   1599,  2499,  3999],
        "annual_equivalent_monthly": ["665.83", "1,332.50", "2,082.50", "3,332.50"],
        "annual_saving": [1598, 3198, 4998, 7998],
        "slugs_monthly": ["sole_trader_monthly", "small_business_monthly", "growing_business_monthly", "enterprise_monthly"],
        "slugs_annual":  ["sole_trader_annual",  "small_business_annual",  "growing_business_annual",  "enterprise_annual"],
        "roi_headline": "A$7,990/year + GST. 6.9% of one WorkSafe prosecution.",
        "roi_body": "A WHS consultant charges A$150 to A$300 per hour. A monthly WHS retainer runs A$1,500 to A$3,000 per month. SafeBase generates a compliant SWMS in 60 seconds, tracks every licence on your team, and produces a complete audit pack in under two minutes — continuously, not just when you call someone. SafeBase Solo Tradie at A$7,990/year + GST costs less than three months of a basic WHS retainer. The average WorkSafe prosecution fine is A$116,979. SafeBase represents 6.9 percent of one fine — with compliance running every single day.",
        "value_callout": "Growing Business includes A$1,147/month of add-on value at no extra cost — SafeInduct (A$299), SafeCheck (A$349), SafeBase Academy up to 10 workers (A$499). That is A$13,764 + GST in annual add-on value included.",
        "features": {
            "1": ["Unlimited AI SWMS generation", "Incident and near-miss register", "Up to 10 worker profiles", "Licence and credential tracking", "Compliance dashboard", "Audit prep PDF export", "Mobile app access", "API access + Webhooks", "Email support"],
            "2": ["Everything in tier 1", "Up to 5 users", "Contractor compliance capture", "AI incident pattern detection", "Up to 5 sites", "SafeInduct QR inductions included", "Toolbox Talks", "Plant register", "Priority chat and email"],
            "3": ["Everything in tier 2", "Up to 20 users", "Unlimited sites", "SafeCheck included", "SafeBase Academy (10 workers) included", "Risk register", "Hazardous substances and SDS", "Advanced analytics", "Legislative alerts", "Phone support"],
            "4": ["Everything in tier 3", "Up to 50 users", "Dedicated Account Manager", "Multi-site rollups", "Custom SSO", "SLA support", "Onboarding workshop"],
        },
    },
    "retail": {
        "label": "Retail",
        "accent": "#A855F7",
        "plan_names": ["Single Store", "Small Chain", "Multi-Store", "Enterprise"],
        "user_limits": ["Up to 5 users", "Up to 15 users", "Up to 30 users", "Up to 50 users"],
        "annual":  [9990, 19990, 29990, 49990],
        "monthly": [999,  1999,  2999,  4999],
        "annual_equivalent_monthly": ["832.50", "1,665.83", "2,499.17", "4,165.83"],
        "annual_saving": [1998, 3998, 5998, 9998],
        "slugs_monthly": ["retail_single_monthly", "retail_small_monthly", "retail_multi_monthly", "retail_enterprise_monthly"],
        "slugs_annual":  ["retail_single_annual",  "retail_small_annual",  "retail_multi_annual",  "retail_enterprise_annual"],
        "roi_headline": "Less than one preventable injury claim.",
        "roi_body": "One workers compensation claim from a preventable manual handling injury costs A$15,000 to A$50,000 before legal fees. One customer slip-and-fall with no documented procedure costs A$20,000 to A$100,000 in public liability. One lone worker incident with no check-in system creates direct regulatory liability. SafeBase Single Store at A$9,990/year + GST is less than the minimum excess on most retail public liability policies — and less than the legal costs of one preventable incident.",
        "value_callout": "Multi-Store includes A$1,147/month of add-on value — SafeInduct (A$299), SafeCheck (A$349), SafeBase Academy (A$499). That is A$13,764 + GST in annual add-on value included.",
        "features": {
            "1": ["Unlimited Quick Induct (casuals)", "Lone Worker check-in", "Customer incident log", "Roster compliance", "Hazard register", "Up to 5 users", "Mobile app", "API access + Webhooks", "Email support"],
            "2": ["Everything in tier 1", "Up to 15 users", "Up to 5 stores", "SafeInduct included", "Bulk QR induction", "RSA tracking (bottle shop)", "Forklift licence tracking", "Priority support"],
            "3": ["Everything in tier 2", "Up to 30 users", "Unlimited stores", "SafeCheck included", "SafeBase Academy included", "Multi-store rollups", "Area manager dashboard", "Advanced analytics", "Phone support"],
            "4": ["Everything in tier 3", "Up to 50 users", "Dedicated Account Manager", "Custom franchise templates", "Custom SSO", "SLA support", "Onboarding workshop"],
        },
    },
    "hospitality": {
        "label": "Hospitality",
        "accent": "#0F4C5C",
        "plan_names": ["Single Venue", "Small Group", "Multi-Venue", "Enterprise"],
        "user_limits": ["Up to 3 users", "Up to 8 users", "Up to 20 users", "Up to 50 users"],
        "annual":  [14990, 29990, 44990, 69990],
        "monthly": [1499,  2999,  4499,  6999],
        "annual_equivalent_monthly": ["1,249.17", "2,499.17", "3,749.17", "5,832.50"],
        "annual_saving": [2998, 5998, 8998, 13998],
        "slugs_monthly": ["hosp_single_monthly", "hosp_small_monthly", "hosp_multi_monthly", "hosp_enterprise_monthly"],
        "slugs_annual":  ["hosp_single_annual",  "hosp_small_annual",  "hosp_multi_annual",  "hosp_enterprise_annual"],
        "roi_headline": "Less than five months of a consulting retainer.",
        "roi_body": "A combined food safety and WHS consulting retainer runs A$2,000 to A$4,000 per month. A council food safety prosecution costs A$10,000 to A$50,000. A venue closure from a food safety incident costs weeks of revenue. SafeBase Single Venue at A$14,990/year + GST is less than five months of a combined consulting retainer — delivering HACCP plans, Standard 3.2.2A evidence records, FSS and RSA management, temperature monitoring, allergen registers, council inspection packs, and complete WHS compliance.",
        "value_callout": "Multi-Venue includes A$1,345/month of add-on value — SafeInduct (A$299), SafeCheck (A$349), SafeBase Academy (A$499), Council Inspection Pack (A$99), Liquor and RSA Management (A$149). That is A$16,140 + GST in annual add-on value included.",
        "features": {
            "1": ["Unlimited HACCP plans (AI)", "Temperature monitoring with alerts", "Allergen register", "RSA and Food Handler tracking", "Cleaning schedules", "Council inspection pack", "Up to 3 users", "API access + Webhooks", "Email support"],
            "2": ["Everything in tier 1", "Up to 8 users", "Contractor compliance capture", "AI incident pattern detection", "Up to 5 venues", "SafeInduct included", "Supplier management", "Liquor Approved Manager tracking", "Priority chat and email"],
            "3": ["Everything in tier 2", "Up to 20 users", "Unlimited venues", "SafeCheck included", "SafeBase Academy included", "Council Inspection Pack included", "Liquor and RSA Management included", "Advanced analytics", "Legislative alerts", "Phone support"],
            "4": ["Everything in tier 3", "Up to 50 users", "Dedicated Account Manager", "Multi-region rollups", "Custom SSO", "SLA support", "Onboarding workshop"],
        },
    },
    "transport": {
        "label": "Transport and Logistics",
        "accent": "#0DC4B5",
        "plan_names": ["Owner-Operator", "Small Fleet", "Growing Fleet", "Enterprise"],
        "user_limits": ["Up to 3 users", "Up to 10 users", "Up to 25 users", "Up to 50 users"],
        "annual":  [14990, 27990, 42990, 69990],
        "monthly": [1499,  2799,  4299,  6999],
        "annual_equivalent_monthly": ["1,249.17", "2,332.50", "3,582.50", "5,832.50"],
        "annual_saving": [2998, 5598, 8598, 13998],
        "slugs_monthly": ["trans_owner_monthly", "trans_small_monthly", "trans_growing_monthly", "trans_enterprise_monthly"],
        "slugs_annual":  ["trans_owner_annual",  "trans_small_annual",  "trans_growing_annual",  "trans_enterprise_annual"],
        "roi_headline": "Less than one month of CoR legal fees.",
        "roi_body": "Chain of Responsibility prosecution under the Heavy Vehicle National Law is criminal liability for individuals. One criminal defence costs A$50,000 to A$200,000 in legal fees before any finding. SafeBase Owner-Operator at A$14,990/year + GST is less than one month of legal fees in a CoR prosecution — delivering a complete auditable CoR Management Plan, fatigue compliance records, vehicle inspection history, load restraint documentation, driver credentials, and full WHS compliance.",
        "value_callout": "Growing Fleet includes A$1,296/month of add-on value — SafeInduct (A$299), SafeCheck (A$349), SafeBase Academy (A$499), CoR Audit Pack (A$149). That is A$15,552 + GST in annual add-on value included.",
        "features": {
            "1": ["Unlimited AI CoR plans", "Fitness for Duty (daily)", "Pre-trip inspection records", "Load restraint records", "Heavy vehicle licence tracking", "Up to 3 users", "Mobile app", "API access + Webhooks", "Email support"],
            "2": ["Everything in tier 1", "Up to 10 users", "Up to 5 vehicles and drivers", "Fatigue management module", "SafeInduct included", "Driver work diary summary", "Maintenance log", "Priority support"],
            "3": ["Everything in tier 2", "Up to 25 users", "Unlimited fleet", "SafeCheck included", "SafeBase Academy included", "CoR Audit Pack included", "Scheduling compliance check", "NHVR notification prompts", "Multi-depot rollups", "Phone support"],
            "4": ["Everything in tier 3", "Up to 50 users", "Dedicated Account Manager", "Custom CoR plan templates", "Custom SSO", "SLA support", "Onboarding workshop"],
        },
    },
    "healthcare": {
        "label": "Healthcare and Aged Care",
        "accent": "#2196A6",
        "plan_names": ["Solo Practice", "Small Practice", "Multi-Site", "Enterprise"],
        "user_limits": ["Up to 5 users", "Up to 15 users", "Up to 30 users", "Up to 60 users"],
        "annual":  [24990, 49990, 79990, 179990],
        "monthly": [2499,  4999,  7999,  17999],
        "annual_equivalent_monthly": ["2,082.50", "4,165.83", "6,665.83", "14,999.17"],
        "annual_saving": [4998, 9998, 15998, 35998],
        "slugs_monthly": ["health_solo_monthly", "health_small_monthly", "health_multi_monthly", "health_enterprise_monthly"],
        "slugs_annual":  ["health_solo_annual",  "health_small_annual",  "health_multi_annual",  "health_enterprise_annual"],
        "roi_headline": "Less than two ACQSC audit engagements.",
        "roi_body": "A healthcare governance consultant on retainer costs A$3,000 to A$8,000 per month. ACQSC audit preparation costs A$5,000 to A$15,000 per engagement. NDIS Commission audit preparation costs A$5,000 to A$20,000 per audit cycle. AHPRA investigation costs A$5,000 to A$50,000 in legal fees. SafeBase Solo Practice at A$24,990/year + GST costs less than three ACQSC audit preparation engagements — and eliminates the need for them by maintaining audit-ready evidence every day.",
        "value_callout": "Multi-Site includes A$3,244/month of add-on value — SafeInduct (A$299), SafeCheck (A$349), SafeBase Academy (A$499), AHPRA Monitor (A$449), SIRS and NDIS Engine (A$499), QI Reporting (A$449), ACQSC Audit Packs unlimited (A$999). That is A$38,928 + GST in annual add-on value included.",
        "features": {
            "1": ["AHPRA registration tracking", "Worker screening (NDIS and Aged Care)", "Manual handling assessments", "Vaccination register", "Up to 5 users", "Mobile app", "API access + Webhooks", "Email support"],
            "2": ["Everything in tier 1", "Up to 15 users", "Up to 5 clinics", "SafeInduct included", "Clinical event log", "Patient aggression module", "ACQSC and NDIS evidence pack", "Priority support"],
            "3": ["Everything in tier 2", "Up to 30 users", "Unlimited clinics", "SafeCheck included", "SafeBase Academy included", "AHPRA Monitor included", "SIRS and NDIS Engine included", "QI Reporting included", "ACQSC Audit Packs unlimited", "Multi-site rollups", "Phone support"],
            "4": ["Everything in tier 3", "Up to 60 users", "Dedicated Account Manager", "All add-ons included", "Custom care quality templates", "Custom SSO", "SLA support", "Onboarding workshop"],
        },
    },
}

INDUSTRY_LIST = ["trades", "hospitality", "transport", "healthcare", "retail"]

INDUSTRY_ENTRY_PRICES = [
    {"slug": "trades",      "label": "Trades and Construction", "annual": "7,990",  "monthly": "799",   "note": "6.9% of one WorkSafe prosecution."},
    {"slug": "retail",      "label": "Retail",                  "annual": "9,990",  "monthly": "999",   "note": "Less than one preventable injury claim."},
    {"slug": "hospitality", "label": "Hospitality",             "annual": "14,990", "monthly": "1,499", "note": "Less than five months of a consulting retainer."},
    {"slug": "transport",   "label": "Transport and Logistics", "annual": "14,990", "monthly": "1,499", "note": "Less than one month of CoR legal fees."},
    {"slug": "healthcare",  "label": "Healthcare and Aged Care", "annual": "24,990", "monthly": "2,499", "note": "Less than two ACQSC engagements."},
]

ADDON_PRICING = {
    "safeinduct": 299,
    "safecheck": 349,
    "academy_10": 499,
    "academy_30": 799,
    "academy_60": 1099,
    "white_label_partner": 2999,
    "consulting_retainer_min": 2500,
    "consulting_retainer_max": 4500,
}

RISK_ANCHOR = {
    "trades":      "Average WorkSafe prosecution: A$116,979. SafeBase Solo Tradie is 6.9% of one fine.",
    "retail":      "One manual-handling claim A$15k-50k; one customer slip-and-fall A$20k-100k.",
    "hospitality": "Combined food-safety + WHS consulting retainer A$2k-4k/month. A single day of venue closure is unrecoverable revenue.",
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

    @api_router.get("/pricing/catalogue")
    async def pricing_catalogue():
        """
        Public catalogue endpoint — single source of truth for plans, prices,
        features, and ROI copy across the web app, mobile app and any future
        client. No auth required so marketing pages render on first paint.
        Edit `PRICING` in /app/backend/routes/iter39_aux.py and both apps
        automatically reflect the change on next page load.
        """
        return {
            "version": "iter67",
            "currency": "AUD",
            "tax_note": "All prices ex-GST",
            "trial_days": 14,
            "industries": INDUSTRY_LIST,
            "entry_prices": INDUSTRY_ENTRY_PRICES,
            "addons": ADDON_PRICING,
            "risk_anchors": RISK_ANCHOR,
            "plans": PRICING,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

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
