"""
API Keys — Iter43.

API access is now standard on EVERY plan. Owners can generate long-lived
bearer tokens, list them, revoke them. The token itself is shown ONCE at
creation time; afterwards only the prefix + last-4 are stored.

Tokens are scoped to the issuing user's account_id and inherit the user's
permissions. Authentication accepts either:

  Authorization: Bearer <jwt>            (existing user session)
  Authorization: Bearer sb_live_xxxxx... (new long-lived API key)

The verification step happens in `auth.get_current_user` via a thin
`resolve_api_key()` hook that looks up the token in `api_keys` and
returns the owning user record.

Endpoints:
  POST   /api/api-keys                    — generate (owner only)
  GET    /api/api-keys                    — list (owner only) — masked
  DELETE /api/api-keys/{key_id}           — revoke
  GET    /api/api-keys/integration-targets — public list of supported
                                            integration systems per industry
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException


# ---------------------------------------------------------------------
# Integration targets — what each industry typically connects to.
# Surfaces in the Settings → API panel as a connection wizard.
# ---------------------------------------------------------------------
INTEGRATION_TARGETS = {
    "trades": [
        {"slug": "xero",              "label": "Xero (job costing + payroll)",          "category": "Accounting"},
        {"slug": "myob",              "label": "MYOB",                                  "category": "Accounting"},
        {"slug": "simpro",            "label": "simPRO (job + workforce mgmt)",         "category": "Field service"},
        {"slug": "servicem8",         "label": "ServiceM8",                             "category": "Field service"},
        {"slug": "procore",           "label": "Procore (construction PM)",             "category": "Project mgmt"},
        {"slug": "google_workspace",  "label": "Google Workspace SSO",                  "category": "Identity"},
        {"slug": "microsoft_365",     "label": "Microsoft 365 SSO",                     "category": "Identity"},
    ],
    "hospitality": [
        {"slug": "deputy",            "label": "Deputy (rostering)",                    "category": "Workforce"},
        {"slug": "tanda",             "label": "Tanda",                                 "category": "Workforce"},
        {"slug": "lightspeed",        "label": "Lightspeed POS",                        "category": "POS"},
        {"slug": "kounta",            "label": "Kounta / Lightspeed Restaurant",        "category": "POS"},
        {"slug": "xero",              "label": "Xero",                                  "category": "Accounting"},
        {"slug": "iauditor",          "label": "iAuditor (food-safety inspections)",   "category": "Compliance"},
        {"slug": "google_workspace",  "label": "Google Workspace SSO",                  "category": "Identity"},
    ],
    "transport": [
        {"slug": "teletrac_navman",   "label": "Teletrac Navman (telematics + EWD)",   "category": "Telematics"},
        {"slug": "ezy2c",             "label": "EZY2C / Geotab",                        "category": "Telematics"},
        {"slug": "ifleet",            "label": "iFleet",                                "category": "Fleet"},
        {"slug": "transvirtual",      "label": "TransVirtual",                          "category": "Logistics"},
        {"slug": "mygov_nhvr",        "label": "NHVR portal (export-only)",             "category": "Regulator"},
        {"slug": "xero",              "label": "Xero",                                  "category": "Accounting"},
        {"slug": "microsoft_365",     "label": "Microsoft 365 SSO",                     "category": "Identity"},
    ],
    "healthcare": [
        {"slug": "epi_connect",       "label": "Epicare / Epi-Connect",                 "category": "Clinical"},
        {"slug": "leecare",           "label": "Leecare Platinum",                      "category": "Aged-care EHR"},
        {"slug": "ahpra_register",    "label": "AHPRA public register",                 "category": "Regulator"},
        {"slug": "ndis_pace",         "label": "NDIS PACE",                             "category": "Regulator"},
        {"slug": "humanforce",        "label": "Humanforce (rostering)",                "category": "Workforce"},
        {"slug": "xero",              "label": "Xero",                                  "category": "Accounting"},
        {"slug": "microsoft_365",     "label": "Microsoft 365 SSO",                     "category": "Identity"},
    ],
    "retail": [
        {"slug": "deputy",            "label": "Deputy (rostering)",                    "category": "Workforce"},
        {"slug": "shopify",           "label": "Shopify",                               "category": "Commerce"},
        {"slug": "vend",              "label": "Lightspeed Retail (Vend)",              "category": "POS"},
        {"slug": "square",            "label": "Square",                                "category": "POS"},
        {"slug": "xero",              "label": "Xero",                                  "category": "Accounting"},
        {"slug": "google_workspace",  "label": "Google Workspace SSO",                  "category": "Identity"},
    ],
}

# Universal — visible to every industry.
UNIVERSAL_TARGETS = [
    {"slug": "webhooks",   "label": "Outbound webhooks (any HTTPS endpoint)", "category": "Real-time"},
    {"slug": "zapier",     "label": "Zapier (3,000+ apps)",                   "category": "Automation"},
    {"slug": "make",       "label": "Make.com",                               "category": "Automation"},
    {"slug": "rest_api",   "label": "Direct REST API (build your own)",       "category": "Custom"},
]


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _mask(token: str) -> str:
    """Show prefix + last-4 only."""
    if len(token) <= 12:
        return token[:4] + "…"
    return token[:8] + "…" + token[-4:]


async def resolve_api_key(token: str, db) -> dict | None:
    """Given an `sb_live_*` bearer token, return the owning user record
    (with `account_id` populated) or None. Updates `last_used_at` on hit."""
    if not token or not token.startswith("sb_live_"):
        return None
    h = _hash_token(token)
    rec = await db.api_keys.find_one({"token_hash": h, "revoked_at": None}, {"_id": 0})
    if not rec:
        return None
    # users collection uses `user_id` as primary identifier
    user = await db.users.find_one(
        {"$or": [{"user_id": rec["user_id"]}, {"id": rec["user_id"]}]},
        {"_id": 0, "password_hash": 0},
    )
    if not user:
        return None
    # Touch last_used_at (fire-and-forget)
    await db.api_keys.update_one({"id": rec["id"]}, {"$set": {"last_used_at": _now_utc().isoformat()}})
    return user


def register_api_keys_routes(api_router: APIRouter, *, db, get_current_user_dep,
                              account_id_for_fn, stamp_account_fn, logger):

    # ----------------------------------------------------------------
    @api_router.post("/api-keys")
    async def create_key(body: dict, current_user=Depends(get_current_user_dep)):
        # Owner-only — creating tokens grants account-wide read/write.
        cu = current_user.dict() if hasattr(current_user, "dict") else current_user.__dict__ if hasattr(current_user, "__dict__") else dict(current_user)
        role = cu.get("role_variant") or cu.get("role") or "owner"
        if role not in ("owner", "admin"):
            raise HTTPException(403, {"error": "owner_only", "message": "Only the account owner can mint API keys."})

        label = (body.get("label") or "Untitled key").strip()[:80]
        scopes = body.get("scopes") or ["read", "write"]
        if not isinstance(scopes, list):
            raise HTTPException(400, "scopes must be a list")

        # 32-char URL-safe token, prefix `sb_live_`.
        raw = "sb_live_" + secrets.token_urlsafe(24)
        token_hash = _hash_token(raw)

        doc = {
            "id": str(uuid4()),
            "user_id": cu.get("user_id") or cu.get("id"),
            "label": label,
            "scopes": scopes,
            "token_hash": token_hash,
            "prefix": raw[:8],
            "masked": _mask(raw),
            "created_at": _now_utc().isoformat(),
            "last_used_at": None,
            "revoked_at": None,
        }
        stamp_account_fn(doc, current_user)
        await db.api_keys.insert_one(dict(doc))
        doc.pop("_id", None)

        # Plaintext token returned ONCE — caller MUST store it.
        return {"ok": True, "key": doc, "token": raw, "warning": "Store this token now — it will not be shown again."}

    # ----------------------------------------------------------------
    @api_router.get("/api-keys")
    async def list_keys(current_user=Depends(get_current_user_dep)):
        account_id = account_id_for_fn(current_user)
        cursor = db.api_keys.find(
            {"account_id": account_id},
            {"_id": 0, "token_hash": 0},
        ).sort("created_at", -1)
        keys = await cursor.to_list(200)
        active = [k for k in keys if not k.get("revoked_at")]
        return {"total": len(keys), "active": len(active), "keys": keys}

    # ----------------------------------------------------------------
    @api_router.delete("/api-keys/{key_id}")
    async def revoke_key(key_id: str, current_user=Depends(get_current_user_dep)):
        account_id = account_id_for_fn(current_user)
        result = await db.api_keys.update_one(
            {"id": key_id, "account_id": account_id, "revoked_at": None},
            {"$set": {"revoked_at": _now_utc().isoformat()}},
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Key not found or already revoked")
        return {"ok": True, "key_id": key_id, "status": "revoked"}

    # ----------------------------------------------------------------
    @api_router.get("/api-keys/integration-targets")
    async def integration_targets(industry: str | None = None,
                                   current_user=Depends(get_current_user_dep)):
        cu = current_user.dict() if hasattr(current_user, "dict") else current_user.__dict__ if hasattr(current_user, "__dict__") else dict(current_user)
        ind = (industry or cu.get("industry") or "trades").lower()
        targets = INTEGRATION_TARGETS.get(ind, INTEGRATION_TARGETS["trades"]).copy()
        return {
            "industry": ind,
            "industry_targets": targets,
            "universal_targets": UNIVERSAL_TARGETS,
            "docs_url": "/integrations",
            "auth_header_example": "Authorization: Bearer sb_live_xxxxxxxxxxxxxxxxxxxxxxxx",
            "rate_limits": {"per_minute": 120, "per_hour": 5000, "burst": 200},
            "scope_options": [
                {"slug": "read",     "label": "Read all account data"},
                {"slug": "write",    "label": "Create / update records"},
                {"slug": "webhook",  "label": "Manage webhook subscriptions"},
            ],
        }
