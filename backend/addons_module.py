"""
Add-on marketplace registry (Part 4 of multi-industry brief).

Per-industry add-ons with pricing tiers + plan inclusion. Consumed by:
  - GET /api/addons/available — industry-filtered list for the marketplace UI
  - GET /api/addons/active    — what this account currently has activated
  - POST /api/addons/{slug}/activate    — flip add-on on (creates billing line)
  - POST /api/addons/{slug}/deactivate  — flip off

Add-ons live in the `account_addons` collection: one doc per (account_id, addon_slug).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request


# Common across industries
_RETAINER = {
    "slug": "whs_consulting_retainer",
    "label": "WHS Consulting Retainer",
    "blurb": "Qualified WHS advisor working inside your SafeBase data",
    "monthly_price_aud": 999,
    "monthly_price_max_aud": 1500,
    "industries": ["trades", "hospitality", "transport", "healthcare", "retail"],
    "included_in_plans": [],
    "category": "consulting",
}

ADDONS = [
    # --- SafeInduct family ---
    {"slug": "safeinduct_trades", "label": "SafeInduct — Trades", "blurb": "QR site inductions for every subcontractor and visitor",
     "monthly_price_aud": 129, "industries": ["trades"], "included_in_plans": ["small_business", "growing_business", "established"], "category": "induction"},
    {"slug": "safeinduct_hospitality", "label": "SafeInduct — Hospitality", "blurb": "QR venue inductions for every contractor, event staff, and casual",
     "monthly_price_aud": 129, "industries": ["hospitality"], "included_in_plans": ["small_group", "multi_venue", "regional_group"], "category": "induction"},
    {"slug": "safeinduct_transport", "label": "SafeInduct — Transport", "blurb": "QR depot and yard inductions for every driver, contractor, and visitor",
     "monthly_price_aud": 129, "industries": ["transport"], "included_in_plans": ["small_fleet", "growing_fleet", "regional_fleet"], "category": "induction"},
    {"slug": "safeinduct_healthcare", "label": "SafeInduct — Healthcare", "blurb": "QR inductions for every agency worker, contractor, and student on placement",
     "monthly_price_aud": 129, "industries": ["healthcare"], "included_in_plans": ["small_practice", "multi_site", "regional_provider"], "category": "induction"},
    {"slug": "safeinduct_retail", "label": "SafeInduct — Retail", "blurb": "QR store inductions for every casual, contractor, and visitor",
     "monthly_price_aud": 129, "industries": ["retail"], "included_in_plans": ["small_chain", "multi_store", "regional_chain"], "category": "induction"},

    # --- SafeCheck family ---
    {"slug": "safecheck_trades", "label": "SafeCheck — Trades", "blurb": "Verify every subcontractor's credentials before they arrive on site",
     "monthly_price_aud": 149, "industries": ["trades"], "included_in_plans": ["growing_business", "established"], "category": "verification"},
    {"slug": "safecheck_hospitality", "label": "SafeCheck — Hospitality", "blurb": "Verify every contractor and supplier before they access your kitchen or venue",
     "monthly_price_aud": 149, "industries": ["hospitality"], "included_in_plans": ["multi_venue", "regional_group"], "category": "verification"},
    {"slug": "safecheck_transport", "label": "SafeCheck — Transport", "blurb": "Verify every contracted driver and carrier before they move your freight",
     "monthly_price_aud": 149, "industries": ["transport"], "included_in_plans": ["growing_fleet", "regional_fleet"], "category": "verification"},
    {"slug": "safecheck_healthcare", "label": "SafeCheck — Healthcare", "blurb": "Verify every agency clinician and contractor before their first shift",
     "monthly_price_aud": 149, "industries": ["healthcare"], "included_in_plans": ["multi_site", "regional_provider"], "category": "verification"},
    {"slug": "safecheck_retail", "label": "SafeCheck — Retail", "blurb": "Verify every contractor before they access your stockroom or service areas",
     "monthly_price_aud": 149, "industries": ["retail"], "included_in_plans": ["multi_store", "regional_chain"], "category": "verification"},

    # --- SafeBase Academy (industry-tagged) ---
    {"slug": "academy_trades", "label": "SafeBase Academy — Trades", "blurb": "Microlearning + full courses for Australian tradespeople",
     "monthly_price_aud": 199, "industries": ["trades"], "included_in_plans": ["growing_business", "established"], "category": "training",
     "tiers": [{"label": "Up to 10 workers", "price": 199}, {"label": "11–30 workers", "price": 299}, {"label": "31–60 workers", "price": 449}]},
    {"slug": "academy_hospitality", "label": "SafeBase Academy — Hospitality", "blurb": "Food handler, FSS, RSA + WHS modules",
     "monthly_price_aud": 199, "industries": ["hospitality"], "included_in_plans": ["multi_venue", "regional_group"], "category": "training",
     "tiers": [{"label": "Up to 10 staff", "price": 199}, {"label": "11–30 staff", "price": 299}, {"label": "31–60 staff", "price": 449}]},
    {"slug": "academy_transport", "label": "SafeBase Academy — Transport", "blurb": "CoR, fatigue, load restraint courses",
     "monthly_price_aud": 199, "industries": ["transport"], "included_in_plans": ["growing_fleet", "regional_fleet"], "category": "training",
     "tiers": [{"label": "Up to 10 drivers", "price": 199}, {"label": "11–30 drivers", "price": 299}, {"label": "31–60 drivers", "price": 449}]},
    {"slug": "academy_healthcare", "label": "SafeBase Academy — Healthcare", "blurb": "Manual handling, infection control, ACQSC, NDIS courses",
     "monthly_price_aud": 199, "industries": ["healthcare"], "included_in_plans": ["multi_site", "regional_provider"], "category": "training",
     "tiers": [{"label": "Up to 10 staff", "price": 199}, {"label": "11–30 staff", "price": 299}, {"label": "31–60 staff", "price": 449}]},
    {"slug": "academy_retail", "label": "SafeBase Academy — Retail", "blurb": "Working alone, manual handling, customer aggression courses",
     "monthly_price_aud": 199, "industries": ["retail"], "included_in_plans": ["multi_store", "regional_chain"], "category": "training",
     "tiers": [{"label": "Up to 10 staff", "price": 199}, {"label": "11–30 staff", "price": 299}, {"label": "31–60 staff", "price": 449}]},

    # --- Industry-unique add-ons ---
    {"slug": "temperature_sensors", "label": "Temperature Sensor Integration", "blurb": "Connect IoT sensors for automated temperature monitoring",
     "monthly_price_aud": 79, "industries": ["hospitality"], "included_in_plans": [], "category": "integration",
     "tiers": [{"label": "Up to 5 sensors", "price": 79}, {"label": "6–20 sensors", "price": 149}],
     "note": "Hardware sold separately. Compatible with standard Bluetooth/WiFi food safety sensors."},
    {"slug": "council_inspection_pack", "label": "Council Inspection Pack", "blurb": "One-click inspection-ready PDF for council food safety inspections",
     "monthly_price_aud": 29, "industries": ["hospitality"], "included_in_plans": ["multi_venue", "regional_group"], "category": "compliance"},
    {"slug": "ewd_integration", "label": "EWD Integration", "blurb": "Connect NHVR-approved EWD for automated fatigue compliance",
     "monthly_price_aud": 99, "industries": ["transport"], "included_in_plans": [], "category": "integration",
     "note": "Requires compatible NHVR-approved EWD."},
    {"slug": "nhvas_support", "label": "NHVAS Accreditation Support Pack", "blurb": "Documentation framework for NHVAS Fatigue/Maintenance/Mass Mgmt accreditation",
     "monthly_price_aud": 0, "one_time_aud": 499, "industries": ["transport"], "included_in_plans": [], "category": "compliance"},
    {"slug": "cor_audit_pack", "label": "CoR Audit Pack", "blurb": "Complete CoR compliance evidence pack for NHVR audit",
     "monthly_price_aud": 49, "industries": ["transport"], "included_in_plans": ["growing_fleet", "regional_fleet"], "category": "compliance"},
    {"slug": "acqsc_audit_pack", "label": "ACQSC Audit Preparation Pack", "blurb": "Compliance evidence pack per Strengthened Quality Standard for ACQSC submission",
     "monthly_price_aud": 99, "industries": ["healthcare"], "included_in_plans": ["multi_site", "regional_provider"], "category": "compliance"},
    {"slug": "ndis_support", "label": "NDIS Registration Support Pack", "blurb": "Evidence framework for NDIS Practice Standards audit and registration",
     "monthly_price_aud": 0, "one_time_aud": 499, "industries": ["healthcare"], "included_in_plans": [], "category": "compliance"},
    {"slug": "ahpra_monitoring", "label": "AHPRA Registration Monitoring", "blurb": "Daily automated check of AHPRA register for all clinicians",
     "monthly_price_aud": 99, "industries": ["healthcare"], "included_in_plans": ["multi_site", "regional_provider"], "category": "verification"},
    {"slug": "franchise_network", "label": "Franchise Compliance Network", "blurb": "Network-level compliance visibility for retail franchise operators",
     "monthly_price_aud": 99, "industries": ["retail"], "included_in_plans": [], "category": "enterprise",
     "tiers": [{"label": "1–49 franchisees", "price": 99}, {"label": "50–199 franchisees", "price": 79}, {"label": "200+ franchisees", "price": 65}]},

    # --- Universal ---
    _RETAINER,
    {"slug": "white_label_partner", "label": "Partner White-Label Program", "blurb": "Manage all your clients from one portal under your own brand",
     "monthly_price_aud": 1299, "industries": ["trades", "hospitality", "transport", "healthcare", "retail"], "included_in_plans": [], "category": "partner"},
]


def register_addons_routes(api_router: APIRouter, *, db, get_current_user_dep,
                            account_id_for_fn, log_audit_fn):
    """Mount the add-on marketplace routes."""

    @api_router.get("/addons/available")
    async def list_available_addons(current_user=Depends(get_current_user_dep)):
        industry = (getattr(current_user, "industry", None) or "trades").lower()
        out = [a for a in ADDONS if industry in a["industries"]]
        return {"industry": industry, "addons": out}

    @api_router.get("/addons/active")
    async def list_active_addons(current_user=Depends(get_current_user_dep)):
        rows = await db.account_addons.find(
            {"account_id": account_id_for_fn(current_user), "active": True},
            {"_id": 0},
        ).to_list(200)
        return {"active": rows}

    @api_router.post("/addons/{slug}/activate")
    async def activate_addon(slug: str, request: Request, body: Optional[dict] = None,
                              current_user=Depends(get_current_user_dep)):
        spec = next((a for a in ADDONS if a["slug"] == slug), None)
        if not spec:
            raise HTTPException(404, "Unknown add-on")
        industry = (getattr(current_user, "industry", None) or "trades").lower()
        if industry not in spec["industries"]:
            raise HTTPException(403, {
                "error": "feature_not_available",
                "message": f"{spec['label']} is not available for {industry}",
                "allowed_industries": spec["industries"],
            })
        # Owner-only
        if (getattr(current_user, "role_variant", "owner") or "owner").lower() != "owner":
            raise HTTPException(403, "Only the account owner can activate add-ons")
        tier = (body or {}).get("tier")  # optional pricing tier label
        now = datetime.now(timezone.utc).isoformat()
        await db.account_addons.update_one(
            {"account_id": account_id_for_fn(current_user), "slug": slug},
            {"$set": {
                "account_id": account_id_for_fn(current_user),
                "slug": slug,
                "label": spec["label"],
                "active": True,
                "tier": tier,
                "monthly_price_aud": spec.get("monthly_price_aud", 0),
                "activated_at": now,
            }},
            upsert=True,
        )
        await log_audit_fn(db, user=current_user, action="activate",
                            record_type="addon", record_id=slug, request=request, detail={"tier": tier})
        return {"slug": slug, "active": True, "tier": tier}

    @api_router.post("/addons/{slug}/deactivate")
    async def deactivate_addon(slug: str, request: Request,
                                current_user=Depends(get_current_user_dep)):
        if (getattr(current_user, "role_variant", "owner") or "owner").lower() != "owner":
            raise HTTPException(403, "Only the account owner can change add-ons")
        await db.account_addons.update_one(
            {"account_id": account_id_for_fn(current_user), "slug": slug},
            {"$set": {"active": False, "deactivated_at": datetime.now(timezone.utc).isoformat()}},
        )
        await log_audit_fn(db, user=current_user, action="deactivate",
                            record_type="addon", record_id=slug, request=request)
        return {"slug": slug, "active": False}
