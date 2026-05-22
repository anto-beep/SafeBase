"""SafeBase — Support chatbot + Accessibility preferences (Iter50).

Chatbot uses Emergent LLM Key (Claude Sonnet 4.5). Sessions are persisted
per anonymous client (cookie) or per logged-in user. Accessibility preferences
are per-user when logged in, fully server-side so they roam across devices.

All routes are PUBLIC (no auth dependency) but enrich with user info when a
customer JWT is supplied via Authorization header.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

SYSTEM_PROMPT = """You are SafeBase Concierge — a friendly support assistant for the SafeBase platform.

SafeBase is an Australian WHS compliance SaaS for 5 industries:
- Trades & Construction (SWMS, Reg 299, plant register, asbestos register)
- Hospitality (HACCP, Food Standards 3.2.2A, RSA/FSS, temperature monitoring)
- Transport (Chain of Responsibility, CoR, fatigue management, NHVR)
- Healthcare & Aged Care (ACQSC, AHPRA monitoring, SIRS, NDIS reportable incidents)
- Retail (lone worker, QR inductions, RSA, multi-store rollups)

Pricing (always quote "+ GST"):
- Trades: From A$799/month + GST
- Hospitality: From A$1,499/month + GST
- Transport: From A$1,499/month + GST
- Healthcare: From A$2,499/month + GST
- Retail: From A$999/month + GST
- Enterprise (custom): A$39,990/year + GST

Add-ons (all + GST per month): SafeInduct A$299, SafeCheck A$349, SafeBase Academy A$799 (30 workers).

Universal API access is included on every plan.
14-day free trial, no credit card required, cancel anytime.

Rules:
- Be concise, friendly, practical. Most answers should be 1-3 short paragraphs.
- Never invent product features. If you don't know, say so and offer to connect them with a human at hello@safebase.com.au.
- Always include "+ GST" after any A$ price.
- Use Australian English (organise, customise, programme).
- Never share or claim to have access to specific customer accounts, billing data, or licences.
- If asked about something legal (a fine, an investigation, an injury), recommend they speak with their state WHS regulator or a qualified WHS consultant — SafeBase is not legal advice.
"""


class ChatMessageIn(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(min_length=1, max_length=4000)


class A11yPrefsIn(BaseModel):
    preferences: dict


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def register_concierge_routes(api_router: APIRouter, *, db, get_optional_user_dep=None):
    """Mount /concierge + /accessibility routes.

    get_optional_user_dep: a FastAPI dependency that returns the current User
    if a valid JWT is present, or None otherwise. We DO NOT require auth
    because anonymous visitors should be able to use both features.
    """

    async def _maybe_user(request: Request):
        if not get_optional_user_dep:
            return None
        try:
            return await get_optional_user_dep(request)
        except Exception:
            return None

    # ────────────────────────── Chat ──────────────────────────
    @api_router.post("/concierge/chat")
    async def chat(body: ChatMessageIn, request: Request,
                   x_anon_id: Optional[str] = Header(default=None)):
        user = await _maybe_user(request)
        # Owner identifier — prefer logged-in user id, else anonymous id
        owner_id = (user.user_id if user else None) or x_anon_id or "anon"
        session_id = body.session_id or f"chat_{uuid.uuid4().hex[:16]}"

        # Persist user turn
        await db.concierge_messages.insert_one({
            "session_id": session_id,
            "owner_id": owner_id,
            "user_id": user.user_id if user else None,
            "role": "user",
            "content": body.message,
            "created_at": _now(),
        })

        # Build conversation history (last 10 turns to keep prompt small)
        history: list[dict] = []
        async for m in db.concierge_messages.find(
            {"session_id": session_id}, {"_id": 0, "role": 1, "content": 1}
        ).sort("created_at", -1).limit(10):
            history.append(m)
        history.reverse()

        # Call Claude via emergentintegrations
        reply_text = ""
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat_client = LlmChat(
                api_key=os.environ["EMERGENT_LLM_KEY"],
                session_id=session_id,
                system_message=SYSTEM_PROMPT,
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            user_msg = UserMessage(text=body.message)
            reply_text = await chat_client.send_message(user_msg)
        except Exception as exc:
            reply_text = ("I'm having trouble reaching the SafeBase concierge brain right now. "
                          "Please email hello@safebase.com.au and a human will get back to you within one business day.")
            import logging
            logging.getLogger(__name__).warning("concierge chat failed: %s", exc)

        await db.concierge_messages.insert_one({
            "session_id": session_id,
            "owner_id": owner_id,
            "user_id": user.user_id if user else None,
            "role": "assistant",
            "content": reply_text,
            "created_at": _now(),
        })
        return {"session_id": session_id, "reply": reply_text}

    @api_router.get("/concierge/history")
    async def chat_history(session_id: str, request: Request):
        msgs = []
        async for m in db.concierge_messages.find(
            {"session_id": session_id},
            {"_id": 0, "role": 1, "content": 1, "created_at": 1}
        ).sort("created_at", 1).limit(100):
            msgs.append(m)
        return {"messages": msgs}

    # ────────────────────── Accessibility prefs ──────────────────────
    @api_router.get("/accessibility/preferences")
    async def get_a11y_prefs(request: Request):
        user = await _maybe_user(request)
        if not user:
            return {"preferences": None}
        doc = await db.accessibility_prefs.find_one(
            {"user_id": user.user_id}, {"_id": 0, "preferences": 1}
        )
        return {"preferences": (doc or {}).get("preferences")}

    @api_router.put("/accessibility/preferences")
    async def put_a11y_prefs(body: A11yPrefsIn, request: Request):
        user = await _maybe_user(request)
        if not user:
            # Anonymous — no-op on the server side, frontend keeps localStorage
            return {"preferences": body.preferences, "persisted": False}
        await db.accessibility_prefs.update_one(
            {"user_id": user.user_id},
            {"$set": {"user_id": user.user_id,
                       "preferences": body.preferences,
                       "updated_at": _now()}},
            upsert=True,
        )
        return {"preferences": body.preferences, "persisted": True}
