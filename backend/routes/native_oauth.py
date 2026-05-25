"""SafeBase — Native OAuth integration flows (Iter57 / P1.2).

Top integration targets per industry:
  • Xero       (trades, all)        — accounting
  • Deputy     (hospitality, retail) — workforce / rostering
  • Teletrac   (transport)           — fleet / EWD
  • AHPRA      (healthcare)          — registration polling
  • Shopify    (retail)              — store data

Architecture
------------
We expose a single set of generic endpoints (`/api/oauth/{provider}/start`,
`.../callback`, `.../disconnect`, `.../status`) that branch by provider via a
small registry. Each provider entry encodes:

    - authorize_url     (where to redirect the user)
    - token_url         (where to swap code for tokens)
    - scopes            (default scope string)
    - client_id_env     (env var name)
    - client_secret_env (env var name)
    - revoke_url        (optional)

Tokens are stored in `account_integration_tokens` with the access + refresh
tokens, expiry, plus a per-provider `metadata` blob. The customer-app
`/integrations` page reads `/oauth/status` to render Connected / Disconnect
buttons per provider.

Important
---------
- Provider keys are read from env (e.g. `XERO_CLIENT_ID`). When the env var
  is missing we still respond 200 to `/status` with `configured=false` so the
  UI can render a clear "Add API keys to connect" state.
- The redirect URI must be registered with each provider EXACTLY as:
    {REACT_APP_BACKEND_URL}/api/oauth/{provider}/callback
- After `/callback`, we redirect the browser to `/dashboard/integrations?
  connected={provider}` so the user lands back on the SafeBase UI.
"""
from __future__ import annotations

import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

logger = logging.getLogger(__name__)


# ───────────────────────── PROVIDER REGISTRY ─────────────────────────
PROVIDERS: dict[str, dict] = {
    "xero": {
        "label": "Xero",
        "industry_tags": ["trades", "hospitality", "transport", "healthcare", "retail"],
        "authorize_url": "https://login.xero.com/identity/connect/authorize",
        "token_url":     "https://identity.xero.com/connect/token",
        "scopes": "openid profile email accounting.transactions accounting.contacts offline_access",
        "client_id_env": "XERO_CLIENT_ID",
        "client_secret_env": "XERO_CLIENT_SECRET",
        "auth_style": "basic",  # client_secret_basic
    },
    "deputy": {
        "label": "Deputy",
        "industry_tags": ["hospitality", "retail"],
        "authorize_url": "https://once.deputy.com/my/oauth/login",
        "token_url":     "https://once.deputy.com/my/oauth/access_token",
        "scopes": "longlife_refresh_token",
        "client_id_env": "DEPUTY_CLIENT_ID",
        "client_secret_env": "DEPUTY_CLIENT_SECRET",
        "auth_style": "post",
    },
    "teletrac": {
        "label": "Teletrac Navman",
        "industry_tags": ["transport"],
        "authorize_url": "https://identity.teletracnavman.com/oauth/authorize",
        "token_url":     "https://identity.teletracnavman.com/oauth/token",
        "scopes": "fleet.read fleet.write driver.read",
        "client_id_env": "TELETRAC_CLIENT_ID",
        "client_secret_env": "TELETRAC_CLIENT_SECRET",
        "auth_style": "basic",
    },
    "ahpra": {
        "label": "AHPRA Registration",
        "industry_tags": ["healthcare"],
        # AHPRA doesn't expose a public OAuth — this entry represents the
        # private partner integration. Until access is granted, status will
        # report configured=false but UI shows "Request access".
        "authorize_url": "https://www.ahpra.gov.au/partner/authorize",
        "token_url":     "https://www.ahpra.gov.au/partner/token",
        "scopes": "registration.read",
        "client_id_env": "AHPRA_PARTNER_ID",
        "client_secret_env": "AHPRA_PARTNER_SECRET",
        "auth_style": "basic",
        "private_partner": True,
    },
    "shopify": {
        "label": "Shopify",
        "industry_tags": ["retail"],
        # Shopify's authorize URL is per-shop, hence the {shop} placeholder.
        # The /start endpoint expects ?shop=mystore.myshopify.com
        "authorize_url": "https://{shop}/admin/oauth/authorize",
        "token_url":     "https://{shop}/admin/oauth/access_token",
        "scopes": "read_orders,read_products,read_customers,read_inventory",
        "client_id_env": "SHOPIFY_CLIENT_ID",
        "client_secret_env": "SHOPIFY_CLIENT_SECRET",
        "auth_style": "post",
        "per_shop_host": True,
    },
}


def _redirect_uri(backend_base: str, provider: str) -> str:
    return f"{backend_base.rstrip('/')}/api/oauth/{provider}/callback"


def _frontend_base() -> str:
    return os.environ.get("FRONTEND_BASE_URL") or os.environ.get("REACT_APP_BACKEND_URL", "")


def _backend_base() -> str:
    # In the Emergent preview env the backend and frontend share the host
    # because the ingress routes /api → 8001. REACT_APP_BACKEND_URL is the
    # external URL we redirect through.
    return os.environ.get("REACT_APP_BACKEND_URL", "")


def _provider_or_404(name: str) -> dict:
    p = PROVIDERS.get(name)
    if not p:
        raise HTTPException(status_code=404, detail=f"Unknown integration provider: {name}")
    return p


def _is_configured(p: dict) -> bool:
    return bool(os.environ.get(p["client_id_env"])) and bool(os.environ.get(p["client_secret_env"]))


def register_native_oauth_routes(api_router: APIRouter, *, db, get_current_user_dep):

    # ─────────────── STATUS — used by the customer /integrations page ───────────────
    @api_router.get("/oauth/status")
    async def oauth_status(user=Depends(get_current_user_dep)):
        out = []
        for slug, p in PROVIDERS.items():
            row = await db.account_integration_tokens.find_one(
                {"owner_id": user.user_id, "provider": slug, "active": True},
                {"_id": 0, "connected_at": 1, "scope": 1, "expires_at": 1},
            )
            out.append({
                "slug": slug,
                "label": p["label"],
                "industries": p["industry_tags"],
                "configured": _is_configured(p),
                "connected": bool(row),
                "connected_at": (row or {}).get("connected_at"),
                "scope": (row or {}).get("scope"),
                "private_partner": p.get("private_partner", False),
            })
        return {"providers": out}

    # ─────────────── START — kicks off the OAuth handshake ───────────────
    @api_router.get("/oauth/{provider}/start")
    async def oauth_start(provider: str, request: Request,
                           user=Depends(get_current_user_dep)):
        p = _provider_or_404(provider)
        if not _is_configured(p):
            raise HTTPException(status_code=400, detail=(
                f"{p['label']} is not configured on this SafeBase deployment. "
                f"Ask an admin to set {p['client_id_env']} and {p['client_secret_env']} in the backend .env."
            ))
        state = secrets.token_urlsafe(24)
        await db.oauth_states.insert_one({
            "state": state,
            "owner_id": user.user_id,
            "provider": provider,
            "shop": request.query_params.get("shop") if p.get("per_shop_host") else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            # State doc TTL: 15 min — long enough for any OAuth roundtrip
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
        })
        authorize_url = p["authorize_url"]
        if p.get("per_shop_host"):
            shop = request.query_params.get("shop")
            if not shop:
                raise HTTPException(status_code=400, detail="Shopify needs ?shop=<store>.myshopify.com")
            authorize_url = authorize_url.replace("{shop}", shop)
        params = {
            "response_type": "code",
            "client_id": os.environ[p["client_id_env"]],
            "redirect_uri": _redirect_uri(_backend_base(), provider),
            "scope": p["scopes"],
            "state": state,
        }
        return RedirectResponse(url=f"{authorize_url}?{urlencode(params)}")

    # ─────────────── CALLBACK — provider sends us the code ───────────────
    @api_router.get("/oauth/{provider}/callback")
    async def oauth_callback(provider: str, request: Request):
        p = _provider_or_404(provider)
        code = request.query_params.get("code")
        state = request.query_params.get("state")
        if not code or not state:
            raise HTTPException(status_code=400, detail="Missing code or state")
        state_doc = await db.oauth_states.find_one({"state": state, "provider": provider}, {"_id": 0})
        if not state_doc:
            raise HTTPException(status_code=400, detail="Invalid or expired state")
        await db.oauth_states.delete_one({"state": state})

        owner_id = state_doc["owner_id"]
        token_url = p["token_url"]
        if p.get("per_shop_host") and state_doc.get("shop"):
            token_url = token_url.replace("{shop}", state_doc["shop"])

        body = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": _redirect_uri(_backend_base(), provider),
        }
        client_id = os.environ[p["client_id_env"]]
        client_secret = os.environ[p["client_secret_env"]]
        headers = {"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"}
        auth = None
        if p["auth_style"] == "basic":
            auth = (client_id, client_secret)
        else:
            body.update({"client_id": client_id, "client_secret": client_secret})

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.post(token_url, data=body, headers=headers, auth=auth)
                r.raise_for_status()
                tok = r.json()
        except Exception as exc:
            logger.exception("OAuth token exchange failed for %s", provider)
            raise HTTPException(status_code=502, detail=f"Token exchange failed for {p['label']}: {exc}") from exc

        now = datetime.now(timezone.utc)
        expires_in = int(tok.get("expires_in") or 3600)
        await db.account_integration_tokens.update_one(
            {"owner_id": owner_id, "provider": provider},
            {"$set": {
                "owner_id": owner_id,
                "provider": provider,
                "access_token": tok.get("access_token"),
                "refresh_token": tok.get("refresh_token"),
                "scope": tok.get("scope") or p["scopes"],
                "token_type": tok.get("token_type", "Bearer"),
                "expires_at": (now + timedelta(seconds=expires_in)).isoformat(),
                "active": True,
                "connected_at": now.isoformat(),
                "metadata": {
                    "shop": state_doc.get("shop"),
                    "raw_keys": list(tok.keys()),
                },
            }},
            upsert=True,
        )
        # Redirect back to the customer Integrations page
        frontend = _frontend_base().rstrip("/")
        return RedirectResponse(url=f"{frontend}/dashboard/integrations?connected={provider}")

    # ─────────────── DISCONNECT ───────────────
    @api_router.post("/oauth/{provider}/disconnect")
    async def oauth_disconnect(provider: str, user=Depends(get_current_user_dep)):
        _provider_or_404(provider)
        await db.account_integration_tokens.update_one(
            {"owner_id": user.user_id, "provider": provider},
            {"$set": {"active": False,
                       "disconnected_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"ok": True, "provider": provider}
