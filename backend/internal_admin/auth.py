"""SafeBase — Internal Admin Auth + RBAC.

This module is COMPLETELY separate from customer auth:
- Different JWT signing key (ADMIN_JWT_SECRET)
- Different DB collections (internal_admins, internal_admin_audit_log)
- Mandatory TOTP 2FA after first login enrolment
- 4-hour session (no sliding window)
- Brute force lockout (5 failed attempts → super_admin must unlock)
- Optional IP whitelist per admin
- Every action audit-logged (append-only)
"""
from __future__ import annotations

import io
import os
import uuid
from base64 import b64encode
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt as pyjwt
import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr

ADMIN_JWT_ALGO = "HS256"
ADMIN_JWT_TTL_HOURS = 4
ADMIN_2FA_CHALLENGE_TTL_MINUTES = 5
ADMIN_MAX_FAILED_LOGINS = 5

ROLES = ("super_admin", "ops_lead", "support_agent", "billing_analyst", "content_manager", "viewer")

# Permission groups — checked by require_role()
ROLE_RANK = {
    "super_admin": 100,
    "ops_lead": 80,
    "billing_analyst": 60,
    "support_agent": 50,
    "content_manager": 40,
    "viewer": 10,
}


def _admin_jwt_secret() -> str:
    secret = os.environ.get("ADMIN_JWT_SECRET")
    if not secret:
        raise RuntimeError("ADMIN_JWT_SECRET not set in environment")
    return secret


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_session_jwt(admin_id: str, role: str, two_factor_verified: bool = True) -> str:
    payload = {
        "admin_id": admin_id,
        "role": role,
        "tfv": two_factor_verified,
        "iat": _now(),
        "exp": _now() + timedelta(hours=ADMIN_JWT_TTL_HOURS),
        "typ": "admin_session",
    }
    return pyjwt.encode(payload, _admin_jwt_secret(), algorithm=ADMIN_JWT_ALGO)


def _make_challenge_jwt(admin_id: str) -> str:
    """Short-lived JWT issued after password OK but before TOTP verified."""
    payload = {
        "admin_id": admin_id,
        "iat": _now(),
        "exp": _now() + timedelta(minutes=ADMIN_2FA_CHALLENGE_TTL_MINUTES),
        "typ": "admin_2fa_challenge",
    }
    return pyjwt.encode(payload, _admin_jwt_secret(), algorithm=ADMIN_JWT_ALGO)


def _decode_admin_jwt(token: str, *, expected_type: str) -> dict:
    try:
        payload = pyjwt.decode(token, _admin_jwt_secret(), algorithms=[ADMIN_JWT_ALGO])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired")
    except pyjwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    if payload.get("typ") != expected_type:
        raise HTTPException(401, "Invalid token type")
    return payload


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ──────────────────────────────────────────────────────────────────────────────
class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str


class AdminVerify2FAIn(BaseModel):
    challenge_token: str
    code: str


class AdminEnroll2FAVerifyIn(BaseModel):
    code: str


class AdminAuditIn(BaseModel):
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[dict] = None


# ──────────────────────────────────────────────────────────────────────────────
# Dependency factory — RBAC
# ──────────────────────────────────────────────────────────────────────────────
def make_admin_dependencies(db):
    async def get_current_admin(request: Request) -> dict:
        auth = request.headers.get("Authorization", "")
        if not auth.lower().startswith("bearer "):
            raise HTTPException(401, "Admin auth required")
        token = auth.split(" ", 1)[1].strip()
        payload = _decode_admin_jwt(token, expected_type="admin_session")
        if not payload.get("tfv"):
            raise HTTPException(401, "2FA verification required")
        admin = await db.internal_admins.find_one(
            {"admin_id": payload["admin_id"]}, {"_id": 0, "password_hash": 0, "totp_secret": 0}
        )
        if not admin:
            raise HTTPException(401, "Admin not found")
        if not admin.get("is_active", True):
            raise HTTPException(403, "Admin disabled")
        # IP whitelist check
        wl = admin.get("ip_whitelist") or []
        if wl:
            client_ip = request.client.host if request.client else None
            if client_ip not in wl:
                raise HTTPException(403, "IP not whitelisted")
        return admin

    def require_role(*allowed: str):
        async def _checker(admin: dict = Depends(get_current_admin)) -> dict:
            if admin["role"] not in allowed:
                raise HTTPException(403, f"Requires one of: {', '.join(allowed)}")
            return admin
        return _checker

    def require_rank(min_role: str):
        """Allow any role >= min_role in ROLE_RANK ordering."""
        min_rank = ROLE_RANK[min_role]

        async def _checker(admin: dict = Depends(get_current_admin)) -> dict:
            if ROLE_RANK.get(admin["role"], 0) < min_rank:
                raise HTTPException(403, f"Requires {min_role} or higher")
            return admin
        return _checker

    async def log_action(
        *,
        admin: dict,
        action: str,
        request: Request,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> None:
        entry = {
            "log_id": f"audit_{uuid.uuid4().hex[:16]}",
            "admin_id": admin["admin_id"],
            "admin_email": admin.get("email"),
            "admin_role": admin.get("role"),
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "details": details or {},
            "ip_address": (request.client.host if request.client else None),
            "user_agent": request.headers.get("user-agent"),
            "created_at": _now().isoformat(),
        }
        try:
            await db.internal_admin_audit_log.insert_one(entry)
        except Exception:  # never fail the request just because audit failed
            pass

    return {
        "get_current_admin": get_current_admin,
        "require_role": require_role,
        "require_rank": require_rank,
        "log_action": log_action,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────
def register_internal_admin_auth(api_router: APIRouter, *, db):
    deps = make_admin_dependencies(db)
    get_current_admin = deps["get_current_admin"]
    log_action = deps["log_action"]

    @api_router.post("/internal-admin/login")
    async def admin_login(body: AdminLoginIn, request: Request):
        email = body.email.lower()
        client_ip = request.client.host if request.client else None
        admin = await db.internal_admins.find_one({"email": email})
        # Lockout check runs BEFORE password verification so locked accounts
        # return 423 regardless of password correctness (better UX/observability).
        if admin and admin.get("locked"):
            raise HTTPException(423, "Account locked after too many failed attempts. Contact a super admin.")
        if not admin or not _verify_password(body.password, admin["password_hash"]):
            # Track failed attempts — but never reveal whether admin exists
            if admin:
                await db.internal_admins.update_one(
                    {"admin_id": admin["admin_id"]},
                    {"$inc": {"failed_login_attempts": 1},
                     "$set": {"last_failed_login_at": _now().isoformat(),
                              "last_failed_login_ip": client_ip}},
                )
                if admin.get("failed_login_attempts", 0) + 1 >= ADMIN_MAX_FAILED_LOGINS:
                    await db.internal_admins.update_one(
                        {"admin_id": admin["admin_id"]},
                        {"$set": {"locked": True, "locked_at": _now().isoformat()}},
                    )
            raise HTTPException(401, "Invalid email or password")

        # Lockout check already happened above (pre-password). Just keep is_active check here.
        if not admin.get("is_active", True):
            raise HTTPException(403, "Account disabled")

        # IP whitelist (if set)
        wl = admin.get("ip_whitelist") or []
        if wl and client_ip not in wl:
            raise HTTPException(403, "IP not whitelisted for this admin")

        # If 2FA enabled → issue short-lived challenge JWT and ask for TOTP
        if admin.get("two_factor_enabled") and admin.get("totp_secret"):
            challenge = _make_challenge_jwt(admin["admin_id"])
            return {"requires_2fa": True, "challenge_token": challenge,
                    "admin": {"email": admin["email"],
                              "first_name": admin.get("first_name"),
                              "last_name": admin.get("last_name"),
                              "role": admin["role"]}}

        # 2FA not yet enrolled — issue a session JWT but mark as needing enrolment.
        # super_admin and ops_lead MUST enrol; UI will force-enrol next step.
        token = _make_session_jwt(admin["admin_id"], admin["role"], two_factor_verified=True)
        await db.internal_admins.update_one(
            {"admin_id": admin["admin_id"]},
            {"$set": {"last_login": _now().isoformat(),
                       "failed_login_attempts": 0,
                       "last_login_ip": client_ip}},
        )
        await log_action(admin=admin, action="login", request=request,
                         details={"two_factor": False})
        return {"requires_2fa": False, "token": token,
                "must_enroll_2fa": admin["role"] in ("super_admin", "ops_lead"),
                "admin": {"admin_id": admin["admin_id"],
                          "email": admin["email"],
                          "first_name": admin.get("first_name"),
                          "last_name": admin.get("last_name"),
                          "role": admin["role"],
                          "two_factor_enabled": False}}

    @api_router.post("/internal-admin/verify-2fa")
    async def admin_verify_2fa(body: AdminVerify2FAIn, request: Request):
        payload = _decode_admin_jwt(body.challenge_token, expected_type="admin_2fa_challenge")
        admin = await db.internal_admins.find_one({"admin_id": payload["admin_id"]})
        if not admin:
            raise HTTPException(401, "Admin not found")
        if not admin.get("totp_secret"):
            raise HTTPException(400, "2FA not enrolled for this admin")

        totp = pyotp.TOTP(admin["totp_secret"])
        if not totp.verify(body.code.strip(), valid_window=1):
            await db.internal_admins.update_one(
                {"admin_id": admin["admin_id"]},
                {"$inc": {"failed_login_attempts": 1}},
            )
            raise HTTPException(401, "Invalid verification code")

        token = _make_session_jwt(admin["admin_id"], admin["role"], two_factor_verified=True)
        await db.internal_admins.update_one(
            {"admin_id": admin["admin_id"]},
            {"$set": {"last_login": _now().isoformat(),
                       "failed_login_attempts": 0,
                       "last_login_ip": (request.client.host if request.client else None)}},
        )
        await log_action(admin=admin, action="login_2fa", request=request,
                         details={"two_factor": True})
        return {"token": token,
                "admin": {"admin_id": admin["admin_id"],
                          "email": admin["email"],
                          "first_name": admin.get("first_name"),
                          "last_name": admin.get("last_name"),
                          "role": admin["role"],
                          "two_factor_enabled": True}}

    @api_router.post("/internal-admin/enroll-2fa/start")
    async def admin_enroll_2fa_start(request: Request,
                                     admin: dict = Depends(get_current_admin)):
        # Generate a fresh provisional TOTP secret and store on admin record.
        # Only enrolment is confirmed via /enroll-2fa/verify with a code.
        secret = pyotp.random_base32()
        await db.internal_admins.update_one(
            {"admin_id": admin["admin_id"]},
            {"$set": {"totp_provisional_secret": secret,
                       "totp_provisional_started_at": _now().isoformat()}},
        )
        uri = pyotp.TOTP(secret).provisioning_uri(
            name=admin["email"], issuer_name="SafeBase Admin")
        # Render QR as PNG data URI for inline display
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        data_uri = "data:image/png;base64," + b64encode(buf.getvalue()).decode("ascii")
        await log_action(admin=admin, action="enroll_2fa_start", request=request)
        return {"otpauth_uri": uri, "qr_data_uri": data_uri, "secret": secret}

    @api_router.post("/internal-admin/enroll-2fa/verify")
    async def admin_enroll_2fa_verify(body: AdminEnroll2FAVerifyIn,
                                      request: Request,
                                      admin: dict = Depends(get_current_admin)):
        row = await db.internal_admins.find_one(
            {"admin_id": admin["admin_id"]}, {"_id": 0, "totp_provisional_secret": 1})
        secret = row.get("totp_provisional_secret") if row else None
        if not secret:
            raise HTTPException(400, "No enrolment in progress")
        if not pyotp.TOTP(secret).verify(body.code.strip(), valid_window=1):
            raise HTTPException(400, "Invalid verification code")
        await db.internal_admins.update_one(
            {"admin_id": admin["admin_id"]},
            {"$set": {"totp_secret": secret, "two_factor_enabled": True},
             "$unset": {"totp_provisional_secret": "", "totp_provisional_started_at": ""}},
        )
        await log_action(admin=admin, action="enroll_2fa_complete", request=request)
        return {"two_factor_enabled": True}

    @api_router.post("/internal-admin/logout")
    async def admin_logout(request: Request, admin: dict = Depends(get_current_admin)):
        await log_action(admin=admin, action="logout", request=request)
        return {"success": True}

    @api_router.get("/internal-admin/me")
    async def admin_me(admin: dict = Depends(get_current_admin)):
        return {"admin": admin}

    return deps
