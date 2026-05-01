"""
Permission enforcement layer for SafeBase.

Wraps `features_registry.compute_features()` and serves it as:
  - `compute_user_features(user, db)` — async helper that resolves the user's
    plan from `subscriptions` and returns the set of enabled feature codes.
  - `make_require_feature(get_current_user, db)` — factory that returns a
    `require_feature(code: str) -> dependency` builder. The dependency hard-
    blocks the request with **403 Forbidden** if the feature is not enabled
    for the user's (industry, role, plan) intersection.

Usage in server.py:

    from permissions import make_require_feature
    require_feature = make_require_feature(get_current_user, db)
    swms_gate = require_feature("swms_generator")
    # Then either pass `swms_gate` into a module factory or use it directly:
    @api_router.post("/swms", dependencies=[swms_gate])
"""
from __future__ import annotations

from typing import Callable

from fastapi import Depends, HTTPException

from features_registry import (
    FEATURE_REGISTRY,
    compute_features,
    navigation_for,
)


async def _resolve_plan_tier(user_id: str, db) -> str:
    """Look up the user's active plan slug. Falls back to `starter`.

    Subscriptions may store either `plan` or `tier`; both are mapped to the
    plan-rank in `features_registry.compute_features`.
    """
    sub = await db.subscriptions.find_one(
        {"user_id": user_id},
        {"_id": 0, "plan": 1, "tier": 1, "status": 1},
    )
    if not sub:
        return "starter"
    if (sub.get("status") or "").lower() not in ("active", "trialing", "trial", ""):
        # cancelled / unpaid → fall through to starter limits
        return "starter"
    return (sub.get("plan") or sub.get("tier") or "starter").lower()


async def compute_user_features(user, db) -> set[str]:
    """Return the set of feature codes enabled for `user` right now."""
    industry = (getattr(user, "industry", None) or "trades").lower()
    role_variant = (getattr(user, "role_variant", None) or "owner").lower()
    plan_tier = await _resolve_plan_tier(getattr(user, "user_id"), db)
    return compute_features(industry, role_variant, plan_tier)


async def compute_user_session(user, db) -> dict:
    """Returns `{industry, role_variant, plan, enabled_features[], navigation[]}`
    — the payload returned by `GET /api/features/me`.
    """
    industry = (getattr(user, "industry", None) or "trades").lower()
    role_variant = (getattr(user, "role_variant", None) or "owner").lower()
    plan_tier = await _resolve_plan_tier(getattr(user, "user_id"), db)
    enabled = compute_features(industry, role_variant, plan_tier)
    nav = navigation_for(industry, role_variant, plan_tier)
    return {
        "industry": industry,
        "role_variant": role_variant,
        "plan": plan_tier,
        "enabled_features": sorted(enabled),
        "navigation": nav,
    }


def make_require_feature(get_current_user_dep: Callable, db):
    """Returns a `require_feature(code)` builder bound to this app's auth+db.

    The returned builder produces a FastAPI dependency that:
      1. Resolves `current_user` via `get_current_user_dep`.
      2. Computes the enabled feature set for that user.
      3. Raises **403 Forbidden** with `{error, code, industry, role_variant}`
         if `code` is not enabled. Also returns the user object on success so
         routes can use it directly.

    The returned dependency is a callable (not yet wrapped in `Depends(...)`),
    so call sites can use it as: `current_user = Depends(swms_gate)` or as a
    router-level dependency: `dependencies=[Depends(swms_gate)]`.
    """

    def require_feature(code: str):
        if code not in FEATURE_REGISTRY:
            # Fail fast at registration so typos blow up at startup, not in prod
            raise RuntimeError(f"Unknown feature code: {code!r}")

        async def _dep(current_user=Depends(get_current_user_dep)):
            enabled = await compute_user_features(current_user, db)
            if code not in enabled:
                spec = FEATURE_REGISTRY[code]
                industry = (getattr(current_user, "industry", None) or "trades").lower()
                role_variant = (getattr(current_user, "role_variant", None) or "owner").lower()
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "feature_not_available",
                        "code": code,
                        "label": spec.get("label", code),
                        "industry": industry,
                        "role_variant": role_variant,
                        "message": (
                            f"This feature ({spec.get('label', code)}) is not available "
                            f"for your industry/role combination."
                        ),
                    },
                )
            return current_user

        # Set a stable name for FastAPI's debug output
        _dep.__name__ = f"require_feature_{code}"
        return _dep

    return require_feature
