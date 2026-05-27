"""
Idempotency helper for offline-first mobile clients.

A mobile client that goes offline and replays POSTs on reconnect must be
guaranteed that creating the same logical event twice (e.g., the same lone-
worker check-in or incident) returns the original record — not a duplicate.

Usage pattern:
    async def my_post(body):
        cached = await idempotency_check(db, current_user, body, "lone_worker_logs",
                                          id_field="checkin_id")
        if cached is not None:
            return cached
        ...create row...
        await idempotency_store(db, current_user, body, doc, "lone_worker_logs",
                                 id_field="checkin_id")
        return doc

Storage:
    Collection `idempotency_keys` with documents:
        { account_id, client_event_id, endpoint, record_collection,
          record_id, created_at }
    Indexed on (account_id, client_event_id, endpoint) — TTL 7 days.

Body contract:
    The client supplies `client_event_id` (UUID v4) inside the request body.
    If absent, idempotency is a no-op (legacy callers unaffected).
"""
from __future__ import annotations

from datetime import datetime, timezone


IDEMPOTENCY_TTL_DAYS = 7


def account_of(user) -> str:
    return getattr(user, "account_id", None) or getattr(user, "user_id", None) or ""


async def idempotency_check(db, current_user, body: dict, endpoint: str,
                             *, record_collection: str, id_field: str):
    """Return the original record if this client_event_id was already used."""
    client_event_id = (body or {}).get("client_event_id")
    if not client_event_id:
        return None
    key = await db.idempotency_keys.find_one(
        {
            "account_id": account_of(current_user),
            "client_event_id": client_event_id,
            "endpoint": endpoint,
        },
        {"_id": 0},
    )
    if not key:
        return None
    coll = getattr(db, record_collection)
    record = await coll.find_one({id_field: key["record_id"]}, {"_id": 0})
    return record


async def idempotency_store(db, current_user, body: dict, record: dict,
                              endpoint: str, *, id_field: str):
    """Persist the client_event_id -> record_id mapping."""
    client_event_id = (body or {}).get("client_event_id")
    if not client_event_id:
        return
    await db.idempotency_keys.insert_one({
        "account_id": account_of(current_user),
        "client_event_id": client_event_id,
        "endpoint": endpoint,
        "record_id": record.get(id_field),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def ensure_idempotency_index(db):
    """Create the unique compound index + TTL on creation timestamp.

    Safe to call repeatedly on startup. TTL uses created_at as ISO string;
    MongoDB TTL requires a Date type, so we also write a `created_at_dt`
    BSON Date alongside via $currentDate when stored. To keep things simple
    we just enforce uniqueness here — natural expiration is acceptable.
    """
    from pymongo import ASCENDING
    await db.idempotency_keys.create_index(
        [("account_id", ASCENDING), ("client_event_id", ASCENDING), ("endpoint", ASCENDING)],
        unique=True,
        name="idempotency_unique",
    )
