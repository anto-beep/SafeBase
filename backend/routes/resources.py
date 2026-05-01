"""
Resources routes — public industry compliance hub + AI compliance assistant.

Mount via register_resources_routes(api_router, db=db, LlmChat, UserMessage,
                                   emergent_llm_key, logger).

Endpoints:
  GET  /api/resources/articles               — public list of articles (filterable by industry)
  GET  /api/resources/articles/{slug}        — public single article
  GET  /api/resources/templates              — public list of free templates per industry
  GET  /api/resources/regulators/{industry}  — regulator contact list
  POST /api/resources/ai/ask                 — public AI compliance assistant (Claude Sonnet 4.5)
                                                with industry-specific system prompt
"""
from __future__ import annotations
import json
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException


# --------------------------------------------------------------------
# ARTICLES — minimal stubs.  Body is generated on first GET via Claude
# and cached on the article doc so subsequent visits are instant.
# Source-of-truth titles per industry, exactly per Part 5 of the brief.
# --------------------------------------------------------------------

ARTICLE_STUBS = {
    "trades": [
        ("hrcw-categories-2025", "The 19 HRCW Categories: Complete 2025 Guide", "WHS, SWMS, HRCW"),
        ("swms-electrical-work", "SWMS for Electrical Work — What Must Be Included", "SWMS, Electrical"),
        ("worksafe-inspection-walkthrough", "What Happens During a WorkSafe Inspection", "Audit, WorkSafe"),
        ("white-card-renewal-2025", "White Card Renewal: Everything Tradies Need", "Cards, WHS"),
        ("whs-fines-small-builders-2025", "WHS Fines for Small Builders in 2025", "Fines, WHS"),
        ("swms-plumbing-work", "How to Write a SWMS for Plumbing Work", "SWMS, Plumbing"),
        ("subcontractor-compliance-checklist", "The Subcontractor Compliance Checklist", "Contractors"),
        ("working-at-heights-edge-protection", "Working at Heights: Edge Protection Rules", "Heights, WHS"),
    ],
    "hospitality": [
        ("food-safety-supervisor-2025", "Food Safety Supervisor: Who Needs One and Why It Matters", "Food Safety"),
        ("haccp-restaurants-plain-english", "HACCP for Restaurants: Plain-English Guide", "HACCP"),
        ("temperature-control-australian-law", "Temperature Control: Australian Legal Requirements for Food Businesses", "Food Safety"),
        ("rsa-obligations-2025", "RSA Obligations for Hospitality Staff 2025", "RSA, Liquor"),
        ("council-food-safety-inspection", "Council Food Safety Inspection: How to Prepare", "Audit, Food Safety"),
        ("allergen-management-legal", "Allergen Management: Your Legal Obligations", "Food Safety"),
        ("psychosocial-safety-hospitality", "Psychosocial Safety in Hospitality — What the Law Now Requires", "WHS, Psychosocial"),
        ("top-5-whs-risks-australian-venues", "The Top 5 WHS Risks in Australian Venues", "WHS, Hospitality"),
    ],
    "transport": [
        ("chain-of-responsibility-explained", "Chain of Responsibility: Who Is In the Chain and What Are Your Legal Obligations?", "CoR, NHVR"),
        ("fatigue-management-bfm-afm", "Fatigue Management: Standard Hours vs BFM vs AFM", "Fatigue, NHVR"),
        ("load-restraint-3rd-edition", "Load Restraint Compliance Under the Load Restraint Guide 3rd Edition", "Load Restraint"),
        ("vehicle-pre-trip-inspections", "Vehicle Pre-Trip Inspections: What Australian Law Actually Requires", "Pre-trip, NHVR"),
        ("cor-penalties-criminal-prosecution", "CoR Penalties: Fines and When Criminal Prosecution Applies", "CoR, Penalties"),
        ("schedulers-cor-obligations-2025", "The Scheduler's CoR Obligations in 2025", "CoR, Scheduling"),
        ("drug-alcohol-fleet-operators", "Drug and Alcohol Management for Fleet Operators", "Fleet, WHS"),
        ("nhvr-compliance-audits", "NHVR Compliance Audits: What to Expect", "NHVR, Audit"),
    ],
    "healthcare": [
        ("aged-care-act-2024-changes", "The New Aged Care Act 2024: What Changed from 1 November 2025", "Aged Care, ACQSC"),
        ("ahpra-tracking-employers", "AHPRA Registration: Tracking Obligations for Healthcare Employers", "AHPRA"),
        ("ndis-worker-screening-rules", "NDIS Worker Screening: Who Needs It and When Does It Expire?", "NDIS, Screening"),
        ("strengthened-aged-care-standards", "The 8 Strengthened Aged Care Quality Standards: Plain-English Guide", "ACQSC"),
        ("manual-handling-healthcare-legal", "Manual Handling in Healthcare: Legal Obligations and Best Practice", "Manual Handling, Clinical"),
        ("psychosocial-healthcare-burnout", "Psychosocial Safety in Healthcare — Why WHS Now Covers Burnout", "WHS, Psychosocial"),
        ("patient-aggression-clinical-whs", "Patient Aggression: WHS Obligations for Clinical Staff", "Clinical, WHS"),
        ("ndis-audit-preparation-checklist", "NDIS Audit Preparation: What the Commission Actually Checks", "NDIS, Audit"),
    ],
    "retail": [
        ("lone-worker-safety-retail", "Lone Worker Safety in Retail: Legal Obligations for Store Owners", "Lone Worker, WHS"),
        ("high-staff-turnover-induction", "High Staff Turnover and WHS: How to Induct Casuals Without the Paperwork", "Induction, WHS"),
        ("slip-trip-prevention-retail", "Slip and Trip Prevention: The Number One Retail Injury and How to Manage It", "WHS, Retail"),
        ("manual-handling-retail-staff", "Manual Handling for Retail Staff: What the Law Requires", "Manual Handling, Retail"),
        ("customer-aggression-whs", "Customer Aggression in Retail: WHS Obligations and Practical Steps", "WHS, Customer"),
        ("rsa-bottle-shop-2025", "RSA Requirements for Bottle Shop Staff 2025", "RSA, Liquor"),
        ("multi-site-whs-retail", "Multi-Site WHS: Managing Compliance Across Multiple Stores", "Multi-Site, WHS"),
        ("franchise-whs-responsibility", "Franchise WHS: Franchisor vs Franchisee — Who Is Responsible?", "Franchise, WHS"),
    ],
}

TEMPLATES = {
    "trades":      ["SWMS templates (by trade)", "Incident report form", "Site induction record", "Licence tracking spreadsheet", "WorkSafe inspection checklist"],
    "hospitality": ["Temperature monitoring log (blank)", "HACCP plan template", "Cleaning schedule template", "Food handler certificate record", "Council inspection self-assessment"],
    "transport":   ["Fitness for duty declaration", "Vehicle pre-trip checklist", "CoR Management Plan template", "Load restraint record", "Driver licence tracking spreadsheet"],
    "healthcare":  ["AHPRA registration tracking spreadsheet", "Worker screening record template", "Manual handling risk assessment (clinical)", "Emergency plan template (healthcare)", "ACQSC self-assessment per standard"],
    "retail":      ["Quick Induct form (casual, printable)", "Lone worker check-in log", "Spill response procedure (laminate-ready)", "Staff induction checklist (retail)", "Working alone risk assessment"],
}

REGULATORS = {
    "trades":      [("SafeWork NSW", "13 10 50"), ("WorkSafe Victoria", "13 23 60"), ("WHSQ", "1300 362 128"), ("WorkSafe WA", "1300 307 877"), ("SafeWork SA", "1300 365 255")],
    "hospitality": [("SafeWork NSW", "13 10 50"), ("NSW Food Authority", "1300 552 406"), ("Victorian DHHS food safety", "1300 364 352"), ("Liquor & Gaming NSW", "1300 024 720"), ("FSANZ (national)", "02 6271 2222")],
    "transport":   [("NHVR", "1300 696 487"), ("Transport for NSW", "131 700"), ("VicRoads", "13 11 71"), ("TMR Queensland", "13 23 80"), ("Main Roads WA", "138 138")],
    "healthcare":  [("ACQSC", "1800 951 822"), ("NDIS Commission", "1800 035 544"), ("AHPRA", "1300 419 495"), ("SafeWork NSW", "13 10 50"), ("Department of Health", "1800 020 103")],
    "retail":      [("SafeWork NSW", "13 10 50"), ("WorkSafe Victoria", "13 23 60"), ("WHSQ", "1300 362 128"), ("WorkSafe WA", "1300 307 877"), ("Safe Work Australia", "1300 551 832")],
}


SYSTEM_PROMPT_BY_INDUSTRY = {
    "trades":      "You are SafeBase's expert AI compliance assistant for Australian TRADES & CONSTRUCTION businesses. You answer questions about WHS legislation (Model WHS Act 2011 + state variants), SWMS for high-risk construction work, the 19 HRCW categories, contractor obligations, and licence requirements (white card, electrical, plumbing, EWP, scaffold, crane, dogging, rigging). Always specify which Australian state regulator applies (SafeWork NSW, WorkSafe Victoria, WHSQ, WorkSafe WA, SafeWork SA, NT WorkSafe, WorkSafe Tasmania, WorkSafe ACT). Reference Reg 299 SWMS requirements, Reg 38 HRCW where relevant. Plain English. Australian spelling (organisation, programme, colour). When uncertain or for high-risk decisions, recommend professional WHS advice. Keep responses under 250 words.",
    "hospitality": "You are SafeBase's expert AI compliance assistant for Australian HOSPITALITY businesses (restaurants, cafes, bars, hotels, catering). You answer questions about (a) WHS — Model WHS Act 2011 + state variants, psychosocial regulations 2023, (b) Food safety — Food Standards Code (Standards 3.2.1, 3.2.2, 3.2.2A, 3.2.3), HACCP, allergens, (c) Liquor — RSA, RSG, Approved Manager. Always specify state regulator (Food Authority NSW, DHHS Vic, QLD Health, WA Health) AND local council role. Plain English. Australian spelling. When uncertain, recommend professional advice. Keep responses under 250 words.",
    "transport":   "You are SafeBase's expert AI compliance assistant for Australian TRANSPORT & LOGISTICS businesses. You answer questions about (a) Heavy Vehicle National Law (HVNL) and the National Heavy Vehicle Regulator (NHVR), (b) Chain of Responsibility — Section 26C and the safety duty cascade across consigner / packer / loader / driver / scheduler / operator, (c) Fatigue management (Standard Hours, BFM, AFM), (d) Mass and dimension, load restraint (Load Restraint Guide 3rd Edition), pre-trip inspections, (e) WHS overlay. Cite specific HVNL sections where useful. Australian spelling. When uncertain, recommend NHVR or legal professional advice. Keep responses under 250 words.",
    "healthcare":  "You are SafeBase's expert AI compliance assistant for Australian HEALTHCARE & AGED CARE / NDIS / Allied Health businesses. You answer questions about (a) Aged Care Act 2024 (effective 1 November 2025), Strengthened Aged Care Quality Standards (8 standards), Aged Care Quality and Safety Commission (ACQSC), (b) NDIS Practice Standards, NDIS Worker Screening rules, (c) AHPRA registration requirements per profession, (d) Working with Children / Vulnerable Person Checks per state, (e) WHS overlay including psychosocial duties for clinical staff. Australian spelling. When uncertain, recommend ACQSC, NDIS Commission, AHPRA or legal professional advice. Keep responses under 250 words.",
    "retail":      "You are SafeBase's expert AI compliance assistant for Australian RETAIL businesses (single store through multi-site franchise). You answer questions about (a) WHS — Model WHS Act 2011 + state variants, with focus on slip/trip, manual handling, lone worker safety, customer aggression, (b) RSA where applicable (bottle shops), (c) High staff turnover induction obligations, (d) Casual contract WHS coverage, (e) Multi-site / franchise PCBU duties (franchisor vs franchisee). Australian spelling. When uncertain, recommend professional WHS advice. Keep responses under 250 words.",
}


def register_resources_routes(api_router: APIRouter, *, db, LlmChat, UserMessage,
                              emergent_llm_key: str, logger):
    """Mount /resources/* routes onto api_router."""

    async def _ensure_article_doc(industry: str, slug: str) -> dict | None:
        """Look up an article in `resources_articles`. If not present and slug
        is a known stub, create a placeholder doc."""
        doc = await db.resources_articles.find_one({"slug": slug, "industry": industry}, {"_id": 0})
        if doc:
            return doc
        for s, title, tags in ARTICLE_STUBS.get(industry, []):
            if s == slug:
                doc = {
                    "slug": slug, "industry": industry, "title": title, "tags": tags,
                    "body_md": None,  # generated on first read
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "view_count": 0,
                }
                await db.resources_articles.insert_one({**doc})
                return doc
        return None

    async def _generate_article_body(industry: str, title: str) -> str:
        """Generate a 400–500 word article body via Claude Sonnet 4.5."""
        prompt = (
            f"Write a 400–500 word compliance article titled exactly: '{title}'.\n\n"
            f"Audience: Australian {industry} business owners and managers.\n"
            f"Style: Plain English, Australian spelling (organisation, programme, colour, recognise), "
            f"practical, actionable, no hedging, no bullet-list exhaustion, real legislation citations.\n"
            f"Structure: 2–3 short subheadings (use markdown ## level headings), 2–3 sentences per paragraph.\n"
            f"Voice: Confident, expert, friendly, no marketing puff. End with one practical recommended next step.\n"
            f"Do NOT include the title at the top — start directly with content.\n"
        )
        try:
            chat = LlmChat(
                api_key=emergent_llm_key,
                session_id=f"article_{industry}_{int(time.time())}",
                system_message=SYSTEM_PROMPT_BY_INDUSTRY.get(industry, SYSTEM_PROMPT_BY_INDUSTRY["trades"]),
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            resp = await chat.send_message(UserMessage(text=prompt))
            return resp or "Article body unavailable."
        except Exception:
            logger.exception(f"_generate_article_body failed for {industry}/{title}")
            return "_Article body generation temporarily unavailable. Please try again later._"

    @api_router.get("/resources/articles")
    async def list_articles(industry: str | None = None):
        """Public — list of article stubs across all industries (or filtered)."""
        out = []
        industries = [industry] if industry else list(ARTICLE_STUBS.keys())
        for ind in industries:
            for slug, title, tags in ARTICLE_STUBS.get(ind, []):
                out.append({"slug": slug, "industry": ind, "title": title, "tags": tags})
        return out

    @api_router.get("/resources/articles/{slug}")
    async def get_article(slug: str, industry: str):
        """Public — single article. Generates body via Claude on first request."""
        doc = await _ensure_article_doc(industry, slug)
        if not doc:
            raise HTTPException(404, "Article not found")
        if not doc.get("body_md"):
            body = await _generate_article_body(industry, doc["title"])
            await db.resources_articles.update_one(
                {"slug": slug, "industry": industry},
                {"$set": {"body_md": body, "generated_at": datetime.now(timezone.utc).isoformat()}},
            )
            doc["body_md"] = body
        await db.resources_articles.update_one(
            {"slug": slug, "industry": industry}, {"$inc": {"view_count": 1}}
        )
        doc.pop("_id", None)
        return doc

    @api_router.get("/resources/templates")
    async def list_templates(industry: str | None = None):
        if industry:
            return {"industry": industry, "templates": TEMPLATES.get(industry, [])}
        return {ind: TEMPLATES[ind] for ind in TEMPLATES}

    @api_router.get("/resources/regulators/{industry}")
    async def list_regulators(industry: str):
        if industry not in REGULATORS:
            raise HTTPException(404, "Unknown industry")
        return [{"name": n, "phone": p} for n, p in REGULATORS[industry]]

    @api_router.post("/resources/ai/ask")
    async def ai_ask(body: dict):
        """Public — AI compliance assistant with industry-specific system prompt."""
        question = (body.get("question") or "").strip()
        industry = body.get("industry") or "trades"
        session_id = body.get("session_id") or f"ask_{uuid.uuid4().hex[:10]}"
        if not question or len(question) < 5:
            raise HTTPException(400, "Question is too short")
        if industry not in SYSTEM_PROMPT_BY_INDUSTRY:
            industry = "trades"
        system_msg = SYSTEM_PROMPT_BY_INDUSTRY[industry]
        try:
            chat = LlmChat(
                api_key=emergent_llm_key,
                session_id=session_id,
                system_message=system_msg,
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            answer = await chat.send_message(UserMessage(text=question))
        except Exception:
            logger.exception("ai_ask failed")
            raise HTTPException(503, "AI assistant temporarily unavailable")

        # Audit log every Q&A for moderation + product insight
        await db.resources_ai_log.insert_one({
            "log_id": f"ai_{uuid.uuid4().hex[:10]}",
            "session_id": session_id,
            "industry": industry,
            "question": question[:1000],
            "answer": (answer or "")[:4000],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"answer": answer, "industry": industry, "session_id": session_id}

    return {"system_prompts": SYSTEM_PROMPT_BY_INDUSTRY}
