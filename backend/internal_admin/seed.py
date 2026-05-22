"""Seed initial super_admin for /internal-admin login.

Called once on backend startup. Uses INTERNAL_ADMIN_SEED_EMAIL and
INTERNAL_ADMIN_SEED_PASSWORD from .env. Idempotent — if the admin exists
and the password matches, no-op; if email exists with different password,
rotate the hash.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone

import bcrypt


async def seed_super_admin(db) -> None:
    email = (os.environ.get("INTERNAL_ADMIN_SEED_EMAIL") or "admin@safebase.internal").lower()
    password = os.environ.get("INTERNAL_ADMIN_SEED_PASSWORD") or "AdminDemo@1234"
    existing = await db.internal_admins.find_one({"email": email})
    if existing:
        # Ensure password is current (rotation if env changed)
        if not bcrypt.checkpw(password.encode("utf-8"), existing["password_hash"].encode("utf-8")):
            await db.internal_admins.update_one(
                {"admin_id": existing["admin_id"]},
                {"$set": {"password_hash": bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
                           "password_rotated_at": datetime.now(timezone.utc).isoformat()}},
            )
        # Ensure account is unlocked + active in case prior tests locked it
        await db.internal_admins.update_one(
            {"admin_id": existing["admin_id"]},
            {"$set": {"is_active": True, "locked": False, "failed_login_attempts": 0}},
        )
        return

    await db.internal_admins.insert_one({
        "admin_id": f"adm_{uuid.uuid4().hex[:12]}",
        "email": email,
        "password_hash": bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        "first_name": "SafeBase",
        "last_name": "Super Admin",
        "role": "super_admin",
        "two_factor_enabled": False,  # enrol on first login
        "totp_secret": None,
        "is_active": True,
        "locked": False,
        "failed_login_attempts": 0,
        "ip_whitelist": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
