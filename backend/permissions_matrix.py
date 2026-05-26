"""SafeBase — Server-side role × feature permission matrix (Iter58).

This is the SINGLE source of truth for what each role can do. Frontend (web)
and the mobile app both fetch it from `GET /api/auth/permissions` and use it
to gate UI elements. Backend routes can also import `ROLE_PERMISSIONS` directly
to enforce write/read access — see `has_permission(user, feature)` below.

Roles (4):
  owner       — Account owner. Full control including billing + users + delete.
  admin       — Same as owner minus billing + user management. For trusted ops staff.
  supervisor  — Manages day-to-day compliance. Can investigate incidents, run inductions,
                edit risks. Cannot edit billing, users, settings, or delete data.
  worker      — Frontline. Captures lone-worker checkins / temp logs / pre-trips /
                fitness-for-duty / incidents. Sees their own data only. Cannot edit
                anyone else's records.

Feature keys are the same identifiers used by the `require_feature` decorator.
Each role gets a dict of {feature: {read: bool, write: bool, delete: bool}}.
A missing feature defaults to all-false (deny by default).
"""
from __future__ import annotations


# Canonical list of every feature surface. Add new ones here.
ALL_FEATURES = [
    # Cross-industry
    "dashboard", "incidents", "risks", "risk_reviews", "workers", "licences",
    "documents", "swms", "inductions", "safety_inspections", "safety_plant",
    "safety_toolbox_talks", "reports", "notifications", "compliance_inbox",
    "automations", "regulator_pipeline", "competency_matrix", "tradecheck",
    "tradeinduct", "academy",
    # Hospitality
    "hospitality_temperature", "hospitality_haccp", "hospitality_cleaning",
    "hospitality_fss", "hospitality_liquor", "hospitality_allergens",
    "hospitality_suppliers",
    # Transport
    "transport_fatigue", "transport_pretrip", "transport_load_restraint",
    "transport_mass", "transport_nhvr", "transport_vehicles",
    "transport_fitness_for_duty", "transport_cor",
    # Healthcare
    "healthcare_ahpra", "healthcare_care_minutes", "healthcare_acqsc",
    "healthcare_sirs", "healthcare_ndis_reportable", "healthcare_worker_screening",
    # Retail
    "retail_lone_worker", "retail_customer_incidents", "retail_quick_induct",
    "retail_roster_eligibility",
    # Admin surfaces (owner-only)
    "billing", "subscriptions", "team_management", "api_keys", "webhooks",
    "addons", "settings_business", "settings_notifications", "partner_branding",
    "integrations_oauth", "delete_records",
]


def _full(read=True, write=True, delete=False):
    return {"read": read, "write": write, "delete": delete}


def _ro():
    return {"read": True, "write": False, "delete": False}


def _none():
    return {"read": False, "write": False, "delete": False}


# OWNER — full access to everything, including billing + deletes.
_OWNER = {f: _full(read=True, write=True, delete=True) for f in ALL_FEATURES}

# ADMIN — same as owner minus the billing/account-admin surfaces.
_ADMIN = dict(_OWNER)
for f in ("billing", "subscriptions", "team_management", "partner_branding",
          "api_keys", "webhooks", "settings_business", "delete_records"):
    _ADMIN[f] = _ro() if f in ("billing", "subscriptions") else _none()
# Admin can still delete most non-billing records
_ADMIN["delete_records"] = _full(read=True, write=False, delete=False)
# Re-enable delete on records the admin owns operationally
for f in ("incidents", "risks", "workers", "licences", "documents", "swms",
          "inductions", "safety_inspections", "safety_plant", "safety_toolbox_talks",
          "automations", "compliance_inbox"):
    _ADMIN[f] = _full(read=True, write=True, delete=True)

# SUPERVISOR — operational read/write on compliance modules. No deletes.
# No billing, no settings, no user mgmt, no api keys.
_SUPERVISOR = {f: _none() for f in ALL_FEATURES}
_SUPERVISOR["dashboard"] = _ro()
for f in ("incidents", "risks", "risk_reviews", "workers", "licences",
          "documents", "swms", "inductions", "safety_inspections", "safety_plant",
          "safety_toolbox_talks", "reports", "notifications", "compliance_inbox",
          "automations", "regulator_pipeline", "competency_matrix", "tradecheck",
          "tradeinduct", "academy",
          # all industry-specific capture + review surfaces
          "hospitality_temperature", "hospitality_haccp", "hospitality_cleaning",
          "hospitality_fss", "hospitality_liquor", "hospitality_allergens",
          "hospitality_suppliers",
          "transport_fatigue", "transport_pretrip", "transport_load_restraint",
          "transport_mass", "transport_nhvr", "transport_vehicles",
          "transport_fitness_for_duty", "transport_cor",
          "healthcare_ahpra", "healthcare_care_minutes", "healthcare_acqsc",
          "healthcare_sirs", "healthcare_ndis_reportable", "healthcare_worker_screening",
          "retail_lone_worker", "retail_customer_incidents", "retail_quick_induct",
          "retail_roster_eligibility"):
    _SUPERVISOR[f] = _full(read=True, write=True, delete=False)
# Supervisor can read business settings + notifications but not edit
_SUPERVISOR["settings_business"] = _ro()
_SUPERVISOR["settings_notifications"] = _ro()

# WORKER — capture flows + own data only.
_WORKER = {f: _none() for f in ALL_FEATURES}
_WORKER["dashboard"] = _ro()
_WORKER["notifications"] = _full(read=True, write=True, delete=False)  # mark-read
_WORKER["incidents"] = _full(read=True, write=True, delete=False)  # report their own
_WORKER["licences"] = _ro()  # their own only — backend filters by user_id
_WORKER["documents"] = _ro()  # SWMS they need to sign
_WORKER["swms"] = _ro()
_WORKER["inductions"] = _full(read=True, write=True, delete=False)  # complete inductions
_WORKER["academy"] = _full(read=True, write=True, delete=False)  # take courses
# Capture flows
_WORKER["retail_lone_worker"] = _full(read=True, write=True, delete=False)
_WORKER["hospitality_temperature"] = _full(read=True, write=True, delete=False)
_WORKER["hospitality_cleaning"] = _full(read=True, write=True, delete=False)
_WORKER["hospitality_haccp"] = _full(read=True, write=True, delete=False)
_WORKER["transport_pretrip"] = _full(read=True, write=True, delete=False)
_WORKER["transport_fitness_for_duty"] = _full(read=True, write=True, delete=False)
_WORKER["transport_fatigue"] = _full(read=True, write=True, delete=False)
_WORKER["transport_load_restraint"] = _full(read=True, write=True, delete=False)
_WORKER["retail_quick_induct"] = _full(read=True, write=True, delete=False)


ROLE_PERMISSIONS = {
    "owner": _OWNER,
    "admin": _ADMIN,
    "supervisor": _SUPERVISOR,
    "worker": _WORKER,
}


def has_permission(role: str, feature: str, action: str = "read") -> bool:
    """Server-side permission check helper. action ∈ {read, write, delete}."""
    perms = ROLE_PERMISSIONS.get((role or "worker").lower(), {})
    cap = perms.get(feature, {"read": False, "write": False, "delete": False})
    return bool(cap.get(action, False))
