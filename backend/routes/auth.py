"""
Authentication routes — register, login, Google session, me, logout.

Factory pattern: call register_auth_routes(api_router, deps) from server.py.
Kept here so server.py doesn't own low-level auth logic.
"""
from __future__ import annotations

import uuid
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
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


class IndustriesUpdate(BaseModel):
    """Owner-level: replace the user's `active_industries` roster + primary.

    Defined at module scope so Pydantic can resolve the Literal annotations
    (under `from __future__ import annotations`, function-local classes have
    forward refs that Pydantic v2 can't resolve without a namespace hint).
    """
    active_industries: list[Literal["trades", "hospitality", "transport", "healthcare", "retail"]]
    primary_industry: Optional[Literal["trades", "hospitality", "transport", "healthcare", "retail"]] = None


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str


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

    @api_router.put("/auth/me/industries")
    async def set_industries(body: IndustriesUpdate, current_user=Depends(get_current_user)):
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

    # ─────────────────────────────────────────────────────────────────────
    # Password reset (Iter47)
    # POST /auth/forgot-password  → always 200, never reveals enumeration
    # GET  /auth/verify-reset-token?token=…  → validity + masked email
    # POST /auth/reset-password   → atomic reset + session invalidation
    # ─────────────────────────────────────────────────────────────────────
    import hashlib  # noqa: E402
    import re  # noqa: E402
    import secrets as _secrets  # noqa: E402

    from routes.email_util import send_email, password_reset_html  # noqa: E402

    def _hash_token(tok: str) -> str:
        return hashlib.sha256(tok.encode("utf-8")).hexdigest()

    def _mask_email(addr: str) -> str:
        local, _, domain = addr.partition("@")
        if not local:
            return addr
        if len(local) <= 2:
            masked = local[0] + "*"
        else:
            masked = local[0] + "*" * (len(local) - 1)
        return f"{masked}@{domain}"

    def _validate_password(pw: str) -> list[str]:
        errors: list[str] = []
        if len(pw) < 8:
            errors.append("at least 8 characters")
        if not re.search(r"[A-Z]", pw):
            errors.append("one uppercase letter")
        if not re.search(r"[a-z]", pw):
            errors.append("one lowercase letter")
        if not re.search(r"\d", pw):
            errors.append("one number")
        return errors

    @api_router.post("/auth/forgot-password")
    async def forgot_password(body: ForgotIn, request: Request):
        email = body.email.lower()
        now = datetime.now(timezone.utc)
        # Rate-limit: max 3 requests per email per rolling hour. We track
        # EVERY attempt (existing or not) so an attacker can't bypass the
        # limit by spamming non-existent emails.
        one_hour_ago = (now - timedelta(hours=1)).isoformat()
        recent = await db.password_resets.count_documents({
            "email": email,
            "created_at": {"$gte": one_hour_ago},
        })
        if recent >= 3:
            raise HTTPException(429, "Too many reset requests. Please wait before trying again.")

        user_doc = await db.users.find_one({"email": email}, {"_id": 0})
        dev_url: Optional[str] = None
        if user_doc:
            raw_token = _secrets.token_urlsafe(32)
            token_hash = _hash_token(raw_token)
            await db.password_resets.insert_one({
                "user_id": user_doc["user_id"],
                "token_hash": token_hash,
                "email": email,
                "created_at": now.isoformat(),
                "expires_at": (now + timedelta(hours=1)).isoformat(),
                "used": False,
                "ip_address": (request.client.host if request.client else None),
            })
            # Build the reset URL — frontend route is /reset-password?token=...
            origin = request.headers.get("origin") or ""
            origin = origin.rstrip("/")
            reset_url = f"{origin}/reset-password?token={raw_token}" if origin else f"/reset-password?token={raw_token}"
            dev_url = reset_url
            import logging as _logging
            _logging.getLogger(__name__).info("[forgot_password] Reset link: %s", reset_url)
            # Fire-and-forget email — never block the response
            try:
                await send_email(
                    to=email,
                    subject="Reset your SafeBase password",
                    html=password_reset_html(reset_url=reset_url, name=user_doc.get("name")),
                )
            except Exception:
                pass  # always succeed for the user
        else:
            # Insert a no-op record so the rate limit applies even to
            # non-existent emails. Has user_id=None so it can never be
            # honoured by the reset endpoint.
            await db.password_resets.insert_one({
                "user_id": None,
                "token_hash": None,
                "email": email,
                "created_at": now.isoformat(),
                "expires_at": (now + timedelta(hours=1)).isoformat(),
                "used": True,
                "decoy": True,
                "ip_address": (request.client.host if request.client else None),
            })

        # Always 200, never reveal whether the email exists
        payload = {"message": "If an account exists with that email, a password reset link has been sent."}
        if dev_url and os.environ.get("EXPOSE_RESET_TOKEN", "").lower() in ("1", "true", "yes"):
            payload["dev_reset_url"] = dev_url
        return payload

    @api_router.get("/auth/verify-reset-token")
    async def verify_reset_token(token: str):
        if not token:
            raise HTTPException(400, "Token required")
        token_hash = _hash_token(token)
        now = datetime.now(timezone.utc).isoformat()
        rec = await db.password_resets.find_one(
            {"token_hash": token_hash, "used": False, "expires_at": {"$gt": now}},
            {"_id": 0, "email": 1},
        )
        if not rec:
            raise HTTPException(400, "This reset link is invalid or has expired. Please request a new one.")
        return {"valid": True, "email_hint": _mask_email(rec["email"])}

    @api_router.post("/auth/reset-password")
    async def reset_password(body: ResetIn):
        if not body.token:
            raise HTTPException(400, "Token required")
        token_hash = _hash_token(body.token)
        now = datetime.now(timezone.utc)
        rec = await db.password_resets.find_one(
            {"token_hash": token_hash, "used": False, "expires_at": {"$gt": now.isoformat()}},
            {"_id": 0},
        )
        if not rec:
            raise HTTPException(400, "This reset link is invalid or has expired. Please request a new one.")

        errors = _validate_password(body.new_password)
        if errors:
            raise HTTPException(422, "Password must contain: " + ", ".join(errors))

        user_doc = await db.users.find_one({"user_id": rec["user_id"]}, {"_id": 0})
        if not user_doc:
            raise HTTPException(400, "This reset link is invalid or has expired. Please request a new one.")

        # Reject reuse of the same password if one exists
        try:
            if user_doc.get("password_hash") and verify_password(body.new_password, user_doc["password_hash"]):
                raise HTTPException(422, "New password must be different from your current password.")
        except HTTPException:
            raise
        except Exception:
            pass

        new_hash = hash_password(body.new_password)
        await db.users.update_one(
            {"user_id": user_doc["user_id"]},
            {"$set": {"password_hash": new_hash,
                       "password_changed_at": now.isoformat()}},
        )
        # Mark this token used + invalidate any other active tokens for the user
        await db.password_resets.update_one(
            {"token_hash": token_hash},
            {"$set": {"used": True, "used_at": now.isoformat()}},
        )
        await db.password_resets.update_many(
            {"user_id": user_doc["user_id"], "used": False},
            {"$set": {"used": True, "used_at": now.isoformat(), "invalidated": True}},
        )
        # Invalidate all active sessions for this user
        try:
            await db.user_sessions.delete_many({"user_id": user_doc["user_id"]})
        except Exception:
            pass

        return {"message": "Password has been reset successfully. Please log in with your new password."}
