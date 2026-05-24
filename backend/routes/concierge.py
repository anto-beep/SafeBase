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
- Write like a real human in a casual chat. Use plain prose only — no bullet points, no bold/italic markdown, no headings, no asterisks, no dashes used as list markers, no emoji. If you need to list options, use natural sentences ("you've got Trades at A$799/month, Hospitality at A$1,499/month, and so on") instead of a bullet list.
- Never invent product features. If you don't know, say so and offer to connect them with a human at hello@safebase.com.au.
- Always include "+ GST" after any A$ price.
- Use Australian English (organise, customise, programme).
- Never share or claim to have access to specific customer accounts, billing data, or licences.
- If asked about something legal (a fine, an investigation, an injury), recommend they speak with their state WHS regulator or a qualified WHS consultant — SafeBase is not legal advice.
"""


# Strip the markdown bits Claude occasionally still emits even with a
# "no formatting" prompt. We only touch list / emphasis markers — hyphens
# inside compound words ("co-design", "real-time") are preserved.
import re

_BOLD_RE = re.compile(r"\*\*(.*?)\*\*", re.DOTALL)
_UNDERLINE_BOLD_RE = re.compile(r"__(.*?)__", re.DOTALL)
_ITALIC_STAR_RE = re.compile(r"(?<!\w)\*([^*\n]+?)\*(?!\w)")
_HEADING_RE = re.compile(r"^#{1,6}\s+", re.MULTILINE)
# Bullet line: optional leading whitespace, then "- " / "* " / "• " / "1. " etc.
_BULLET_RE = re.compile(r"^[ \t]*(?:[-*•]|\d+\.)\s+", re.MULTILINE)


def _strip_markdown(text: str) -> str:
    """Render Claude output as plain conversational text — no markdown
    markers, no bullet structure. Idempotent and safe on already-plain text."""
    if not text:
        return text
    out = text
    out = _BOLD_RE.sub(r"\1", out)
    out = _UNDERLINE_BOLD_RE.sub(r"\1", out)
    out = _ITALIC_STAR_RE.sub(r"\1", out)
    out = _HEADING_RE.sub("", out)
    out = _BULLET_RE.sub("", out)
    # Collapse 3+ blank lines down to a single paragraph break and trim
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


class ChatMessageIn(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(min_length=1, max_length=4000)


class LeadCaptureIn(BaseModel):
    session_id: Optional[str] = None
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=40)
    industry: Optional[str] = Field(default=None, max_length=40)
    company: Optional[str] = Field(default=None, max_length=200)
    note: Optional[str] = Field(default=None, max_length=1000)


class A11yPrefsIn(BaseModel):
    preferences: dict


# High-intent keywords that surface the lead-capture banner inline in the chat
# response. Kept narrow on purpose — we don't want to flash the banner on every
# message, just the conversion-relevant ones.
HIGH_INTENT_KEYWORDS = (
    "demo", "demonstration", "trial", "pricing", "price", "quote",
    "discount", "subscription", "subscribe", "buy", "purchase",
    "onboard", "onboarding", "implementation", "rollout",
    "integration", "integrate", "api", "xero", "deputy", "teletrac", "shopify",
    "enterprise", "multi-site", "multisite", "rollout",
    "talk to someone", "speak to someone", "human", "sales",
    "contact you", "follow up", "call me", "email me",
)


def _detect_intent(message: str) -> bool:
    msg = (message or "").lower()
    return any(k in msg for k in HIGH_INTENT_KEYWORDS)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def register_concierge_routes(api_router: APIRouter, *, db, get_optional_user_dep=None):
    """Mount /concierge + /accessibility routes.

    get_optional_user_dep: a FastAPI dependency that returns the current User
    if a valid JWT is present, or None otherwise. We DO NOT require auth
    because anonymous visitors should be able to use both features.
    """

    # ────────────────────────── Notification template preview ──────────
    # Public utility for the dashboard / admin tooling to inspect what an
    # industry-specific copy variant will look like. No auth required because
    # the templates are static, not user data.
    @api_router.get("/notification-templates/preview")
    async def preview_template(key: str, industry: Optional[str] = None):
        from routes.notification_templates import render, get_variant  # local import to avoid cycles
        if not get_variant(key, industry):
            raise HTTPException(status_code=404, detail=f"Unknown template key: {key}")
        # Provide a representative context so the preview is readable.
        ctx = dict(
            credential_label="White Card",
            worker_name="Jane Smith",
            expires_on="2026-03-15",
            days=14,
            asset_label="Site 7 — Smith Builders",
            site_name="Site 7",
            incident_title="Slip and fall, customer",
            incident_id="inc_demo123",
        )
        # Industry-specific tweak for credential label so the preview reads naturally
        if industry == "hospitality":
            ctx["credential_label"] = "Food Safety Supervisor"
        elif industry == "transport":
            ctx["credential_label"] = "Heavy-vehicle driver licence"
        elif industry == "healthcare":
            ctx["credential_label"] = "AHPRA registration"
        elif industry == "retail":
            ctx["credential_label"] = "RSA"
        return {"key": key, "industry": industry, "rendered": render(key, industry, **ctx)}

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

        # Strip any markdown Claude emitted so the chat reads as plain conversation
        reply_text = _strip_markdown(reply_text)

        await db.concierge_messages.insert_one({
            "session_id": session_id,
            "owner_id": owner_id,
            "user_id": user.user_id if user else None,
            "role": "assistant",
            "content": reply_text,
            "created_at": _now(),
        })
        # Suggest lead capture when the user's last message looks high-intent
        # (asking about pricing / demos / integrations / "talk to someone").
        offer_lead_capture = _detect_intent(body.message)
        return {
            "session_id": session_id,
            "reply": reply_text,
            "offer_lead_capture": offer_lead_capture,
        }

    @api_router.post("/concierge/lead")
    async def capture_lead(body: LeadCaptureIn, request: Request,
                           x_anon_id: Optional[str] = Header(default=None)):
        """Capture a sales lead from the concierge widget. Stores in
        `concierge_leads` and (best-effort) emails sales — never blocks the
        user-facing flow if email fails."""
        user = await _maybe_user(request)
        owner_id = (user.user_id if user else None) or x_anon_id or "anon"
        # Light email validation — concierge isn't a sign-up flow, so we just
        # require an "@" + "." and let humans triage edge cases.
        if "@" not in body.email or "." not in body.email.split("@")[-1]:
            raise HTTPException(status_code=400, detail="Email looks malformed.")
        lead_id = uuid.uuid4().hex[:24]
        # Pull last few chat turns so the receiving human has context
        history: list[dict] = []
        if body.session_id:
            async for m in db.concierge_messages.find(
                {"session_id": body.session_id}, {"_id": 0, "role": 1, "content": 1, "created_at": 1}
            ).sort("created_at", 1).limit(20):
                history.append(m)
        doc = {
            "lead_id": lead_id,
            "session_id": body.session_id,
            "owner_id": owner_id,
            "user_id": user.user_id if user else None,
            "name": body.name.strip(),
            "email": body.email.strip().lower(),
            "phone": (body.phone or "").strip() or None,
            "industry": (body.industry or "").strip().lower() or None,
            "company": (body.company or "").strip() or None,
            "note": (body.note or "").strip() or None,
            "transcript_excerpt": history,
            "status": "new",
            "created_at": _now(),
        }
        await db.concierge_leads.insert_one(dict(doc))

        # Fire-and-forget notify (Resend if configured, otherwise log).
        try:
            from routes.email_util import send_email  # local import to avoid cycles
            to_addr = os.environ.get("CONCIERGE_LEAD_INBOX", "hello@safebase.com.au")
            transcript_html = "".join(
                f"<div style='margin:6px 0;padding:6px 10px;border-left:3px solid {'#FFCC00' if m['role'] == 'user' else '#0A0A0A'};background:#f7f7f7'>"
                f"<strong style='text-transform:uppercase;font-size:10px;letter-spacing:.1em'>{m['role']}</strong><br/>{m['content']}"
                f"</div>"
                for m in history[-8:]
            )
            html = (
                f"<h2>New SafeBase concierge lead</h2>"
                f"<p><strong>Name:</strong> {doc['name']}<br/>"
                f"<strong>Email:</strong> {doc['email']}<br/>"
                f"<strong>Phone:</strong> {doc['phone'] or '—'}<br/>"
                f"<strong>Industry:</strong> {doc['industry'] or '—'}<br/>"
                f"<strong>Company:</strong> {doc['company'] or '—'}<br/>"
                f"<strong>Note:</strong> {doc['note'] or '—'}</p>"
                f"<h3>Last chat turns</h3>{transcript_html or '<em>No prior transcript</em>'}"
                f"<p style='font-size:11px;color:#888'>Lead ID: {lead_id}</p>"
            )
            await send_email(to=to_addr, subject=f"[SafeBase] New concierge lead — {doc['name']}", html=html)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("concierge lead email failed: %s", exc)

        return {"ok": True, "lead_id": lead_id}

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
