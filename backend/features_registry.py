"""
SafeBase Feature Registry — single source of truth for industry + role gating.

Every feature in the platform is registered here with:
  - `code`        — stable identifier used by both backend and frontend
  - `industries`  — set of industries the feature exists for ("ALL" → universal)
  - `roles`       — minimum role tiers that may access (lower-tier inclusive)
  - `plan_min`    — optional minimum plan slug ("starter", "professional",
                     "business", "enterprise")
  - `label`       — human-readable
  - `category`    — grouping for UI / nav

Roles ranked lowest → highest privilege:
  WORKER < SUPERVISOR < SAFETY < MANAGER < OWNER

`compute_features_for_user(user, account)` returns the set of enabled codes
for a session, the navigation map, and dashboard widget set for the
intersection of (industry × role × plan).

Anything NOT in the returned set MUST 403 if requested directly. The frontend
loads this set on login and uses it to hide nav items.

Industries: TRADES, HOSPITALITY, TRANSPORT, HEALTHCARE, RETAIL.
"""
from __future__ import annotations
from typing import Iterable

ROLE_RANK = {"worker": 0, "supervisor": 1, "safety_lead": 2, "safety": 2, "manager": 3, "owner": 4}
ALL_INDUSTRIES = {"trades", "hospitality", "transport", "healthcare", "retail"}


def _gte(role_tier: str, minimum: str) -> bool:
    return ROLE_RANK.get(role_tier, -1) >= ROLE_RANK.get(minimum, 99)


# code -> {industries, min_role, plan_min, label, category, nav_path}
FEATURE_REGISTRY: dict[str, dict] = {
    # === UNIVERSAL (ALL) ===========================================
    "incident_management":      {"industries": "ALL", "min_role": "worker",      "label": "Incidents",                "category": "core",     "nav_path": "/dashboard/incidents"},
    "risk_register":            {"industries": "ALL", "min_role": "supervisor", "label": "Risk Register",            "category": "core",     "nav_path": "/dashboard/risk-register"},
    "compliance_dashboard":     {"industries": "ALL", "min_role": "safety",     "label": "Compliance dashboard",     "category": "core"},
    "audit_pack":               {"industries": "ALL", "min_role": "manager",    "label": "Audit pack generator",     "category": "core"},
    "corrective_actions":       {"industries": "ALL", "min_role": "supervisor", "label": "Corrective actions",       "category": "core"},
    "notifications":            {"industries": "ALL", "min_role": "worker",     "label": "Notifications",            "category": "core",     "nav_path": "/dashboard/notifications"},
    "legislative_alerts":       {"industries": "ALL", "min_role": "manager",    "label": "Legislative alerts",       "category": "core"},

    "workers":                  {"industries": "ALL", "min_role": "supervisor", "label": "Workers / Team",           "category": "people",   "nav_path": "/dashboard/workers"},
    "credential_tracking":      {"industries": "ALL", "min_role": "supervisor", "label": "Credential tracking",      "category": "people",   "nav_path": "/dashboard/licences"},
    "credential_self":          {"industries": "ALL", "min_role": "worker",     "label": "My credentials",           "category": "people"},
    "training":                 {"industries": "ALL", "min_role": "worker",     "label": "Training (Academy)",       "category": "people",   "nav_path": "/dashboard/academy"},
    "ppe_register":             {"industries": "ALL", "min_role": "supervisor", "label": "PPE register",             "category": "people"},
    "first_aid_register":       {"industries": "ALL", "min_role": "supervisor", "label": "First aid register",       "category": "people"},
    "return_to_work":           {"industries": "ALL", "min_role": "manager",    "label": "Return-to-work plan",       "category": "people"},

    "sites":                    {"industries": "ALL", "min_role": "supervisor", "label": "Sites / Locations",        "category": "sites",    "nav_path": "/dashboard/sites"},
    "site_inductions":          {"industries": "ALL", "min_role": "supervisor", "label": "Site inductions",          "category": "sites"},
    "emergency_plan":           {"industries": "ALL", "min_role": "manager",    "label": "Emergency plan generator", "category": "sites"},
    "inspection_checklists":    {"industries": "ALL", "min_role": "supervisor", "label": "Inspection checklists",    "category": "sites"},

    "document_library":         {"industries": "ALL", "min_role": "supervisor", "label": "Document Library",         "category": "documents", "nav_path": "/dashboard/document-library"},
    "document_engine":          {"industries": "ALL", "min_role": "supervisor", "label": "Document generation",      "category": "documents"},
    "document_versioning":      {"industries": "ALL", "min_role": "supervisor", "label": "Document version control", "category": "documents"},
    "document_sharing":         {"industries": "ALL", "min_role": "supervisor", "label": "Secure share links",       "category": "documents"},

    "safebase_academy":         {"industries": "ALL", "min_role": "worker",     "label": "SafeBase Academy",         "category": "addons"},
    "safecheck":                {"industries": "ALL", "min_role": "supervisor", "label": "SafeCheck",                "category": "addons"},
    "safeinduct":               {"industries": "ALL", "min_role": "supervisor", "label": "SafeInduct",               "category": "addons"},

    "psychosocial_register":    {"industries": "ALL", "min_role": "manager",    "label": "Psychosocial risk",        "category": "wellbeing"},
    "anonymous_reporting":      {"industries": "ALL", "min_role": "worker",     "label": "Anonymous reporting",      "category": "wellbeing"},
    "mental_health_resources":  {"industries": "ALL", "min_role": "worker",     "label": "Mental-health resources",  "category": "wellbeing"},

    "reports":                  {"industries": "ALL", "min_role": "manager",    "label": "Reports",                  "category": "reports",  "nav_path": "/dashboard/reports"},
    "data_export":              {"industries": "ALL", "min_role": "manager",    "label": "Data export",              "category": "reports"},

    "settings_business":        {"industries": "ALL", "min_role": "manager",    "label": "Business settings",        "category": "settings"},
    "settings_users":           {"industries": "ALL", "min_role": "manager",    "label": "User management",          "category": "settings"},
    "settings_billing":         {"industries": "ALL", "min_role": "owner",      "label": "Billing & subscription",   "category": "settings"},
    "settings_industries":      {"industries": "ALL", "min_role": "owner",      "label": "Industry management",      "category": "settings"},
    "api_access":               {"industries": "ALL", "min_role": "owner",      "label": "API access",               "category": "settings", "plan_min": "enterprise"},
    "white_label":              {"industries": "ALL", "min_role": "owner",      "label": "White-label config",       "category": "settings", "plan_min": "enterprise"},

    # === TRADES =====================================================
    "swms_generator":           {"industries": {"trades"}, "min_role": "supervisor", "label": "SWMS Generator",            "category": "primary",  "nav_path": "/dashboard/swms"},
    "swms_signoff":             {"industries": {"trades"}, "min_role": "worker",     "label": "Sign SWMS (worker)",        "category": "primary"},
    "jsa_generator":            {"industries": {"trades"}, "min_role": "supervisor", "label": "Job Safety Analysis",       "category": "primary"},
    "site_safety_plan":         {"industries": {"trades"}, "min_role": "manager",    "label": "Site-Specific Safety Plan", "category": "primary"},
    "whs_management_plan":      {"industries": {"trades"}, "min_role": "manager",    "label": "WHS Management Plan ≥$250k","category": "primary"},
    "permits_to_work":          {"industries": {"trades"}, "min_role": "supervisor", "label": "Permits to work",           "category": "primary"},
    "asbestos_register":        {"industries": {"trades"}, "min_role": "manager",    "label": "Asbestos register",         "category": "primary"},
    "traffic_management":       {"industries": {"trades"}, "min_role": "supervisor", "label": "Traffic Management Plan",   "category": "primary"},
    "plant_register":           {"industries": {"trades"}, "min_role": "supervisor", "label": "Plant & Equipment",         "category": "primary"},
    "toolbox_talks":            {"industries": {"trades"}, "min_role": "supervisor", "label": "Toolbox Talks",             "category": "primary"},
    "hazardous_substances":     {"industries": {"trades"}, "min_role": "supervisor", "label": "Hazardous Substances / SDS","category": "primary"},
    "trade_certificates":       {"industries": {"trades"}, "min_role": "supervisor", "label": "Trade certificates",        "category": "primary"},

    # === HOSPITALITY ================================================
    "food_safety_module":       {"industries": {"hospitality"}, "min_role": "worker",     "label": "Food Safety",            "category": "primary",  "nav_path": "/dashboard/food-safety"},
    "haccp_plans":              {"industries": {"hospitality"}, "min_role": "supervisor", "label": "HACCP plans",            "category": "primary"},
    "temperature_log":          {"industries": {"hospitality"}, "min_role": "worker",     "label": "Temperature monitoring", "category": "primary"},
    "allergen_register":        {"industries": {"hospitality"}, "min_role": "supervisor", "label": "Allergen register",      "category": "primary"},
    "cleaning_schedule":        {"industries": {"hospitality"}, "min_role": "supervisor", "label": "Cleaning schedule",      "category": "primary"},
    "supplier_register":        {"industries": {"hospitality"}, "min_role": "manager",    "label": "Supplier management",    "category": "primary"},
    "council_inspection_pack":  {"industries": {"hospitality"}, "min_role": "manager",    "label": "Council inspection pack","category": "primary"},
    "food_safety_program":      {"industries": {"hospitality"}, "min_role": "manager",    "label": "Food Safety Program",    "category": "primary"},

    # === TRANSPORT ==================================================
    "cor_module":               {"industries": {"transport"}, "min_role": "worker",     "label": "Chain of Responsibility", "category": "primary", "nav_path": "/dashboard/cor"},
    "fatigue_management":       {"industries": {"transport"}, "min_role": "supervisor", "label": "Fatigue management",      "category": "primary"},
    "fitness_for_duty":         {"industries": {"transport"}, "min_role": "worker",     "label": "Fitness for duty",        "category": "primary"},
    "driver_work_diary":        {"industries": {"transport"}, "min_role": "worker",     "label": "Driver work diary",       "category": "primary"},
    "cor_management_plan":      {"industries": {"transport"}, "min_role": "manager",    "label": "CoR Management Plan",     "category": "primary"},
    "load_restraint_records":   {"industries": {"transport"}, "min_role": "supervisor", "label": "Load restraint records",  "category": "primary"},
    "fleet_register":           {"industries": {"transport"}, "min_role": "supervisor", "label": "Fleet register",          "category": "primary"},
    "vehicle_pretrip":          {"industries": {"transport"}, "min_role": "worker",     "label": "Vehicle pre-trip",        "category": "primary"},
    "vehicle_maintenance":      {"industries": {"transport"}, "min_role": "supervisor", "label": "Vehicle maintenance",     "category": "primary"},
    "scheduling_compliance":    {"industries": {"transport"}, "min_role": "supervisor", "label": "Scheduling compliance",   "category": "primary"},
    "nhvr_notifications":       {"industries": {"transport"}, "min_role": "manager",    "label": "NHVR notifications",      "category": "primary"},

    # === HEALTHCARE =================================================
    "care_quality_module":      {"industries": {"healthcare"}, "min_role": "worker",     "label": "Care Quality",            "category": "primary", "nav_path": "/dashboard/care-quality"},
    "ahpra_tracking":           {"industries": {"healthcare"}, "min_role": "supervisor", "label": "AHPRA tracking",          "category": "primary"},
    "ndis_practice_standards":  {"industries": {"healthcare"}, "min_role": "manager",    "label": "NDIS Practice Standards", "category": "primary"},
    "acqsc_standards":          {"industries": {"healthcare"}, "min_role": "manager",    "label": "ACQSC 8 Standards",       "category": "primary"},
    "clinical_event_log":       {"industries": {"healthcare"}, "min_role": "worker",     "label": "Clinical / adverse event","category": "primary"},
    "worker_screening":         {"industries": {"healthcare"}, "min_role": "supervisor", "label": "Worker screening",        "category": "primary"},
    "manual_handling_clinical": {"industries": {"healthcare"}, "min_role": "supervisor", "label": "Manual handling assessments", "category": "primary"},
    "sentinel_event_notify":    {"industries": {"healthcare"}, "min_role": "manager",    "label": "Sentinel event notifications", "category": "primary"},

    # === RETAIL =====================================================
    "inductions_module":        {"industries": {"retail"}, "min_role": "worker",     "label": "Inductions",          "category": "primary", "nav_path": "/dashboard/inductions"},
    "quick_induct":             {"industries": {"retail"}, "min_role": "supervisor", "label": "Quick Induct (3-min)", "category": "primary"},
    "bulk_qr_induct":           {"industries": {"retail"}, "min_role": "supervisor", "label": "Bulk QR induction",   "category": "primary"},
    "lone_worker_module":       {"industries": {"retail"}, "min_role": "worker",     "label": "Lone Worker",         "category": "primary"},
    "lone_worker_checkin":      {"industries": {"retail"}, "min_role": "worker",     "label": "Lone worker check-in","category": "primary"},
    "roster_compliance":        {"industries": {"retail"}, "min_role": "supervisor", "label": "Roster compliance",   "category": "primary"},
    "customer_incident_log":    {"industries": {"retail"}, "min_role": "worker",     "label": "Customer incident log","category": "primary"},
}


def _industry_match(spec, industry: str) -> bool:
    return spec == "ALL" or industry in spec


def compute_features(industry: str, role_tier: str, plan_tier: str | None = None) -> set[str]:
    """Return the set of feature codes enabled for this (industry, role, plan)."""
    industry = (industry or "trades").lower()
    role_tier = (role_tier or "owner").lower()
    plan_tier = (plan_tier or "starter").lower()

    plan_rank = {"starter": 0, "professional": 1, "business": 2, "growing_business": 2, "enterprise": 3}
    user_plan = plan_rank.get(plan_tier, 1)

    enabled: set[str] = set()
    for code, spec in FEATURE_REGISTRY.items():
        if not _industry_match(spec["industries"], industry):
            continue
        if not _gte(role_tier, spec.get("min_role", "owner")):
            continue
        plan_min = spec.get("plan_min")
        if plan_min and plan_rank.get(plan_min, 99) > user_plan:
            continue
        enabled.add(code)
    return enabled


def navigation_for(industry: str, role_tier: str, plan_tier: str | None = None) -> list[dict]:
    """Return ordered navigation items for the user's session — only the
    features that have a `nav_path` and pass the gate."""
    enabled = compute_features(industry, role_tier, plan_tier)
    nav = []
    for code, spec in FEATURE_REGISTRY.items():
        if code in enabled and spec.get("nav_path"):
            nav.append({"code": code, "label": spec["label"], "path": spec["nav_path"], "category": spec.get("category", "core")})
    return nav
