"""
Authentication routes — register, login, Google session, me, logout.

Factory pattern: call register_auth_routes(api_router, deps) from server.py.
Kept here so server.py doesn't own low-level auth logic.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, EmailStr
from typing import Literal


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    company_name: Optional[str] = None
    role: Literal["owner", "worker"] = "owner"
    industry: Optional[Literal["trades", "hospitality", "transport", "healthcare", "retail"]] = "trades"
    role_title: Optional[str] = None  # e.g. "head_chef" — drives dashboard variant
    role_variant: Optional[Literal["owner", "safety_lead", "supervisor", "worker"]] = "owner"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionIn(BaseModel):
    session_id: str


def register_auth_routes(api_router: APIRouter, *, db, User,
                         get_current_user, hash_password, verify_password,
                         make_jwt, trial_length_days: int = 14):
    """Mount /auth/* routes onto the given api_router."""

    @api_router.post("/auth/register")
    async def register(body: RegisterIn):
        existing = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
        if existing:
            raise HTTPException(400, "Email already registered")
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        doc = {
            "user_id": user_id,
            "email": body.email.lower(),
            "name": body.name,
            "role": body.role,
            "company_name": body.company_name,
            "industry": body.industry or "trades",
            "role_title": body.role_title or "owner",
            "role_variant": body.role_variant or "owner",
            "auth_provider": "email",
            "password_hash": hash_password(body.password),
            "created_at": now.isoformat(),
            "trial_started_at": now.isoformat(),
            "trial_ends_at": (now + timedelta(days=trial_length_days)).isoformat(),
            "subscription_status": "trial",
        }
        await db.users.insert_one(doc)
        token = make_jwt(user_id)
        return {
            "token": token,
            "user": {
                "user_id": user_id,
                "email": body.email.lower(),
                "name": body.name,
                "role": body.role,
                "company_name": body.company_name,
                "industry": body.industry or "trades",
                "role_title": body.role_title or "owner",
                "role_variant": body.role_variant or "owner",
                "auth_provider": "email",
            },
        }

    @api_router.post("/auth/login")
    async def login(body: LoginIn):
        user_doc = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
        if not user_doc or not user_doc.get("password_hash"):
            raise HTTPException(401, "Invalid credentials")
        if not verify_password(body.password, user_doc["password_hash"]):
            raise HTTPException(401, "Invalid credentials")
        token = make_jwt(user_doc["user_id"])
        # Build a lightweight User-shaped object so we can compute feature flags
        from permissions import compute_user_features  # local import
        class _U:
            user_id = user_doc["user_id"]
            industry = user_doc.get("industry") or "trades"
            role_variant = user_doc.get("role_variant") or "owner"
        try:
            enabled = sorted(await compute_user_features(_U(), db))
        except Exception:
            enabled = []
        return {
            "token": token,
            "user": {
                "user_id": user_doc["user_id"],
                "email": user_doc["email"],
                "name": user_doc["name"],
                "role": user_doc.get("role", "owner"),
                "company_name": user_doc.get("company_name"),
                "industry": user_doc.get("industry") or "trades",
                "role_title": user_doc.get("role_title") or "owner",
                "role_variant": user_doc.get("role_variant") or "owner",
                "auth_provider": user_doc.get("auth_provider", "email"),
                "active_industries": user_doc.get("active_industries") or [user_doc.get("industry") or "trades"],
                "primary_industry": user_doc.get("primary_industry") or user_doc.get("industry") or "trades",
                "enabled_features": enabled,
            },
        }

    @api_router.post("/auth/google-session")
    async def google_session(body: GoogleSessionIn, response: Response):
        """Process session_id from Emergent Google OAuth callback."""
        async with httpx.AsyncClient() as cli:
            r = await cli.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": body.session_id},
                timeout=15.0,
            )
        if r.status_code != 200:
            raise HTTPException(401, "Invalid session")
        data = r.json()
        email = data["email"].lower()
        user_doc = await db.users.find_one({"email": email}, {"_id": 0})
        if not user_doc:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            now = datetime.now(timezone.utc)
            user_doc = {
                "user_id": user_id,
                "email": email,
                "name": data.get("name", email.split("@")[0]),
                "picture": data.get("picture"),
                "role": "owner",
                "auth_provider": "google",
                "created_at": now.isoformat(),
                "trial_started_at": now.isoformat(),
                "trial_ends_at": (now + timedelta(days=trial_length_days)).isoformat(),
                "subscription_status": "trial",
            }
            await db.users.insert_one({**user_doc})
        else:
            user_id = user_doc["user_id"]
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"picture": data.get("picture"),
                          "name": data.get("name", user_doc["name"])}},
            )

        session_token = data["session_token"]
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        response.set_cookie(
            key="session_token",
            value=session_token,
            max_age=7 * 24 * 60 * 60,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
        )
        return {
            "user": {
                "user_id": user_id,
                "email": email,
                "name": user_doc.get("name"),
                "picture": data.get("picture"),
                "role": user_doc.get("role", "owner"),
                "auth_provider": "google",
            }
        }

    @api_router.get("/auth/me")
    async def get_me(current_user=Depends(get_current_user)):
        data = current_user.model_dump()
        user_doc = await db.users.find_one(
            {"user_id": current_user.user_id}, {"_id": 0})
        if user_doc:
            data["onboarding_complete"] = user_doc.get("onboarding_complete", False)
            data["industry"] = user_doc.get("industry") or "trades"
            data["role_title"] = user_doc.get("role_title") or "owner"
            data["role_variant"] = user_doc.get("role_variant") or "owner"
            data["active_industries"] = user_doc.get("active_industries") or [data["industry"]]
            data["primary_industry"] = user_doc.get("primary_industry") or data["industry"]
        # Embed the feature flag set so the SPA can hide nav items + cards
        # without an extra round-trip. The 403 hard-block on the API side
        # remains the source of truth.
        try:
            from permissions import compute_user_features  # local import to avoid cycle
            data["enabled_features"] = sorted(await compute_user_features(current_user, db))
        except Exception:
            data["enabled_features"] = []
        return data

    @api_router.get("/features/me")
    async def get_features_me(current_user=Depends(get_current_user)):
        """Returns the full feature/nav payload for the current session.

        Frontend `useFeatureFlags()` uses this to render the sidebar and to
        decide which dashboard cards to show. The 403 hard-block on each
        gated endpoint is the actual security boundary; this endpoint is
        purely a UI hint.
        """
        from permissions import compute_user_session  # local import
        return await compute_user_session(current_user, db)

    @api_router.patch("/auth/me/role")
    async def update_role_title(body: dict, current_user=Depends(get_current_user)):
        """Update role_title + role_variant — used by Settings → My Profile."""
        role_title = body.get("role_title")
        role_variant = body.get("role_variant")
        if not role_title or role_variant not in ("owner", "safety_lead", "supervisor", "worker"):
            raise HTTPException(400, "role_title and role_variant required")
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$set": {"role_title": role_title, "role_variant": role_variant,
                       "role_updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"role_title": role_title, "role_variant": role_variant}

    @api_router.patch("/auth/me/industry")
    async def update_industry(body: dict, current_user=Depends(get_current_user)):
        industry = body.get("industry")
        if industry not in ("trades", "hospitality", "transport", "healthcare", "retail"):
            raise HTTPException(400, "Invalid industry")
        # Also append to active_industries if not already there — switching
        # implicitly adds the industry to the user's roster. Owner/manager can
        # remove it later via /auth/me/industries.
        user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0}) or {}
        active = list(user_doc.get("active_industries") or [user_doc.get("industry") or "trades"])
        if industry not in active:
            active.append(industry)
        primary = user_doc.get("primary_industry") or user_doc.get("industry") or industry
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$set": {"industry": industry,
                       "active_industries": active,
                       "primary_industry": primary,
                       "industry_updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"industry": industry, "active_industries": active, "primary_industry": primary}

    @api_router.get("/auth/me/industries")
    async def get_industries(current_user=Depends(get_current_user)):
        """Returns the user's industry context: active list + primary + current."""
        user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0}) or {}
        current = user_doc.get("industry") or "trades"
        return {
            "current": current,
            "primary_industry": user_doc.get("primary_industry") or current,
            "active_industries": user_doc.get("active_industries") or [current],
        }

    class _IndustriesUpdate(BaseModel):
        active_industries: list[Literal["trades", "hospitality", "transport", "healthcare", "retail"]]
        primary_industry: Optional[Literal["trades", "hospitality", "transport", "healthcare", "retail"]] = None

    @api_router.put("/auth/me/industries")
    async def set_industries(body: _IndustriesUpdate, current_user=Depends(get_current_user)):
        """Owner-level: update the full active_industries roster + primary."""
        if not body.active_industries:
            raise HTTPException(400, "At least one industry required")
        primary = body.primary_industry or body.active_industries[0]
        if primary not in body.active_industries:
            raise HTTPException(400, "primary_industry must be in active_industries")
        # Switch the live `industry` to primary if user is currently on a now-removed industry
        user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0}) or {}
        current = user_doc.get("industry") or primary
        if current not in body.active_industries:
            current = primary
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$set": {
                "active_industries": body.active_industries,
                "primary_industry": primary,
                "industry": current,
                "industries_updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return {"active_industries": body.active_industries,
                "primary_industry": primary,
                "current": current}

    @api_router.post("/auth/logout")
    async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
        if session_token:
            await db.user_sessions.delete_one({"session_token": session_token})
        response.delete_cookie("session_token", path="/")
        return {"success": True}
