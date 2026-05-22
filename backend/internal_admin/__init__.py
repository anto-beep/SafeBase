"""Mount the Internal Admin sub-router under /api."""
from __future__ import annotations

from fastapi import APIRouter

from .auth import register_internal_admin_auth
from .routes import register_internal_admin_routes


def mount_internal_admin(api_router: APIRouter, *, db) -> None:
    deps = register_internal_admin_auth(api_router, db=db)
    register_internal_admin_routes(api_router, db=db, deps=deps)
