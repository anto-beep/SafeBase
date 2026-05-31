"""
Site / Location Register — account-wide list of sites that can be attached
to incidents, risks, SWMS, inspections, and toolbox talks.

Each site stores its name, formatted address (from Google Places), lat/lng,
geofence radius (m), site contact, and free-form notes. The account_id field
is used for tenant isolation; visibility is account-wide so any user in the
account can pick the site.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query


def register_sites_routes(api_router: APIRouter, *, db, get_current_user_dep,
                          account_id_for_fn, logger):

    @api_router.get("/sites")
    async def list_sites(active_only: bool = Query(True),
                          current_user=Depends(get_current_user_dep)):
        flt = {"account_id": account_id_for_fn(current_user)}
        if active_only:
            flt["status"] = {"$ne": "archived"}
        rows = await db.sites.find(flt, {"_id": 0}).sort("name", 1).to_list(2000)
        return rows

    @api_router.post("/sites")
    async def create_site(body: dict, current_user=Depends(get_current_user_dep)):
        name = (body.get("name") or "").strip()
        if not name:
            raise HTTPException(400, "name required")
        now = datetime.now(timezone.utc).isoformat()
        site = {
            "site_id": f"site_{uuid.uuid4().hex[:10]}",
            "account_id": account_id_for_fn(current_user),
            "user_id": current_user.user_id,
            "name": name,
            "address": body.get("address") or "",
            "lat": body.get("lat"),
            "lng": body.get("lng"),
            "place_id": body.get("place_id"),
            "geofence_radius_m": int(body.get("geofence_radius_m") or 0),
            "site_contact_name": body.get("site_contact_name") or "",
            "site_contact_phone": body.get("site_contact_phone") or "",
            "site_contact_email": body.get("site_contact_email") or "",
            "notes": body.get("notes") or "",
            "status": "active",
            "created_at": now,
            "updated_at": now,
            "created_by_name": current_user.name,
        }
        await db.sites.insert_one({**site})
        return site

    @api_router.patch("/sites/{site_id}")
    async def update_site(site_id: str, body: dict,
                          current_user=Depends(get_current_user_dep)):
        flt = {"site_id": site_id, "account_id": account_id_for_fn(current_user)}
        existing = await db.sites.find_one(flt)
        if not existing:
            raise HTTPException(404, "site not found")
        body.pop("site_id", None); body.pop("account_id", None)
        body["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.sites.update_one(flt, {"$set": body})
        merged = await db.sites.find_one(flt, {"_id": 0})
        return merged

    @api_router.delete("/sites/{site_id}")
    async def archive_site(site_id: str,
                            current_user=Depends(get_current_user_dep)):
        flt = {"site_id": site_id, "account_id": account_id_for_fn(current_user)}
        res = await db.sites.update_one(
            flt,
            {"$set": {"status": "archived",
                       "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "site not found")
        return {"archived": True}
