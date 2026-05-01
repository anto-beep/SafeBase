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
        return {
            "token": token,
            "user": {
                "user_id": user_doc["user_id"],
                "email": user_doc["email"],
                "name": user_doc["name"],
                "role": user_doc.get("role", "owner"),
                "company_name": user_doc.get("company_name"),
                "auth_provider": user_doc.get("auth_provider", "email"),
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
        return data

    @api_router.post("/auth/logout")
    async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
        if session_token:
            await db.user_sessions.delete_one({"session_token": session_token})
        response.delete_cookie("session_token", path="/")
        return {"success": True}
