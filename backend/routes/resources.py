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
        ("hrcw-categories-2025", "The 19 HRCW Categories: Complete 2025 Guide", "WHS, SWMS, HRCW",
         "A working guide to the 19 high-risk construction work categories triggering SWMS obligations under Reg 299 — with practical examples for plumbers, sparkies, and concreters.", 6),
        ("swms-electrical-work", "SWMS for Electrical Work — What Must Be Included", "SWMS, Electrical",
         "What an electrical SWMS must contain to satisfy AS/NZS 3000, the WHS Regulation, and tier-1 builder demands. Includes a one-page checklist.", 5),
        ("worksafe-inspection-walkthrough", "What Happens During a WorkSafe Inspection", "Audit, WorkSafe",
         "Step-by-step: how an unannounced WorkSafe inspection actually runs, what the inspector asks for first, and the five documents they expect within ten minutes.", 7),
        ("white-card-renewal-2025", "White Card Renewal: Everything Tradies Need", "Cards, WHS",
         "When does a White Card expire? It depends on your state — and it changed in 2024. The current rules per state, plus how to verify a new hire's card in seconds.", 4),
        ("whs-fines-small-builders-2025", "WHS Fines for Small Builders in 2025", "Fines, WHS",
         "Average WorkSafe fines for sub-50-worker builders have risen 18% YoY. We break down the actual ranges, the top three breach categories, and four documents that mitigate exposure.", 6),
        ("swms-plumbing-work", "How to Write a SWMS for Plumbing Work", "SWMS, Plumbing",
         "Most plumbing SWMS fail on hazard specificity. Here's how to tie hazards to job steps, plus an example SWMS for a residential hot-water installation.", 5),
        ("subcontractor-compliance-checklist", "The Subcontractor Compliance Checklist", "Contractors",
         "The seven documents every subbie needs to produce before they step on site — and how to automate verification so you stop chasing screenshots.", 5),
        ("working-at-heights-edge-protection", "Working at Heights: Edge Protection Rules", "Heights, WHS",
         "When edge protection is mandatory, when a harness is acceptable, and the three permit-to-work triggers above 4 m. Aligned to AS/NZS 1891 and state codes of practice.", 6),
    ],
    "hospitality": [
        ("food-safety-supervisor-2025", "Food Safety Supervisor: Who Needs One and Why It Matters", "Food Safety",
         "FSS rules vary by state. We map the obligations across NSW, VIC, QLD, WA and SA, including the renewal cycles and acceptable qualifications.", 5),
        ("haccp-restaurants-plain-english", "HACCP for Restaurants: Plain-English Guide", "HACCP",
         "HACCP without the textbook jargon. Seven principles, twelve steps, and exactly what your kitchen records have to look like to pass a council audit.", 7),
        ("temperature-control-australian-law", "Temperature Control: Australian Legal Requirements for Food Businesses", "Food Safety",
         "Cold storage, hot holding, reheating, and the 2-hour/4-hour rule — what the Food Standards Code actually says, and the temperature log structure councils expect.", 5),
        ("rsa-obligations-2025", "RSA Obligations for Hospitality Staff 2025", "RSA, Liquor",
         "RSA isn't just a course — it's a continuing legal obligation. The state-by-state validity rules, refresher requirements, and how to track currency for casuals.", 4),
        ("council-food-safety-inspection", "Council Food Safety Inspection: How to Prepare", "Audit, Food Safety",
         "Most cafes lose points on the same five items. Here's the prep checklist, the documents to have on the bench, and the language council officers look for in your records.", 6),
        ("allergen-management-legal", "Allergen Management: Your Legal Obligations", "Food Safety",
         "Failure to disclose an allergen is a Category 1 offence. The current declaration standards, menu labelling rules, and how to train casuals to handle allergen requests safely.", 5),
        ("psychosocial-safety-hospitality", "Psychosocial Safety in Hospitality — What the Law Now Requires", "WHS, Psychosocial",
         "Since 2023, psychosocial hazards must be documented in your risk register. Bullying, customer aggression, fatigue and shift design — what good evidence looks like.", 6),
        ("top-5-whs-risks-australian-venues", "The Top 5 WHS Risks in Australian Venues", "WHS, Hospitality",
         "Slips on wet floors, manual handling, burns, lone-worker risk, aggression. Ranked by frequency and severity — with the practical control measures regulators want to see.", 5),
    ],
    "transport": [
        ("chain-of-responsibility-explained", "Chain of Responsibility: Who Is In the Chain and What Are Your Legal Obligations?", "CoR, NHVR",
         "S26C of the HVNL applies to far more than the driver. Here's the safety duty cascade across consigner, packer, loader, driver, scheduler, operator — and what 'reasonably practicable' means in practice.", 7),
        ("fatigue-management-bfm-afm", "Fatigue Management: Standard Hours vs BFM vs AFM", "Fatigue, NHVR",
         "Standard, Basic Fatigue Management and Advanced Fatigue Management compared. Hours, record-keeping, and which option fits which operation type.", 6),
        ("load-restraint-3rd-edition", "Load Restraint Compliance Under the Load Restraint Guide 3rd Edition", "Load Restraint",
         "The 3rd edition Load Restraint Guide is now the de-facto standard NHVR officers test against. Performance standards, restraint maths, and the most common audit findings.", 6),
        ("vehicle-pre-trip-inspections", "Vehicle Pre-Trip Inspections: What Australian Law Actually Requires", "Pre-trip, NHVR",
         "The HVNL doesn't prescribe a form — but it does require evidence. The eight checks that defend a CoR investigation, plus a printable pre-trip template.", 4),
        ("cor-penalties-criminal-prosecution", "CoR Penalties: Fines and When Criminal Prosecution Applies", "CoR, Penalties",
         "Civil fines, executive officer liability, and the line between negligent and reckless conduct. Recent prosecutions and what they tell scheduler-managers.", 6),
        ("schedulers-cor-obligations-2025", "The Scheduler's CoR Obligations in 2025", "CoR, Scheduling",
         "A scheduler is a duty-holder under HVNL S26C. The trip-plan evidence regulators expect, fatigue interactions, and what to do when a driver tells you they're tired.", 5),
        ("drug-alcohol-fleet-operators", "Drug and Alcohol Management for Fleet Operators", "Fleet, WHS",
         "Random testing programs, post-incident testing, and the AS 4308/AS/NZS 4760 standards your policy should reference. With practical implementation steps for small fleets.", 5),
        ("nhvr-compliance-audits", "NHVR Compliance Audits: What to Expect", "NHVR, Audit",
         "Notified vs unannounced audits, the documents officers request first, and how to structure your CoR Management Plan so an officer can verify it in under twenty minutes.", 6),
    ],
    "healthcare": [
        ("aged-care-act-2024-changes", "The New Aged Care Act 2024: What Changed from 1 November 2025", "Aged Care, ACQSC",
         "The Aged Care Act 2024 replaced four Acts. The eight new standards, the rights-based framework, and the operational changes providers must have completed by November.", 8),
        ("ahpra-tracking-employers", "AHPRA Registration: Tracking Obligations for Healthcare Employers", "AHPRA",
         "Employers must verify and re-verify AHPRA currency. Endorsements, conditions, and what to do when a clinician's status changes mid-cycle.", 5),
        ("ndis-worker-screening-rules", "NDIS Worker Screening: Who Needs It and When Does It Expire?", "NDIS, Screening",
         "Who needs an NDIS Worker Screening Clearance, the five-year cycle, and the interim arrangements between states. With a tracking template you can use today.", 5),
        ("strengthened-aged-care-standards", "The 8 Strengthened Aged Care Quality Standards: Plain-English Guide", "ACQSC",
         "Standards 1 through 8 translated into operational language. The audit triggers, the evidence formats ACQSC accepts, and the most common gap areas for small providers.", 7),
        ("manual-handling-healthcare-legal", "Manual Handling in Healthcare: Legal Obligations and Best Practice", "Manual Handling, Clinical",
         "Manual handling injuries are the single biggest WorkCover claim category in residential aged care. What controls regulators want to see — beyond training records.", 6),
        ("psychosocial-healthcare-burnout", "Psychosocial Safety in Healthcare — Why WHS Now Covers Burnout", "WHS, Psychosocial",
         "Workload, exposure to trauma, and rostering are now documented psychosocial hazards. What your risk register and consultation evidence should look like.", 6),
        ("patient-aggression-clinical-whs", "Patient Aggression: WHS Obligations for Clinical Staff", "Clinical, WHS",
         "Aggression from patients, residents and visitors is a WHS hazard your PCBU must control. The control hierarchy, training expectations, and what to record after an event.", 5),
        ("ndis-audit-preparation-checklist", "NDIS Audit Preparation: What the Commission Actually Checks", "NDIS, Audit",
         "Mid-term and renewal audits compared. The evidence categories that always come up, plus the eight documents that should already exist before the auditor arrives.", 7),
    ],
    "retail": [
        ("lone-worker-safety-retail", "Lone Worker Safety in Retail: Legal Obligations for Store Owners", "Lone Worker, WHS",
         "The model WHS Code of Practice on Working Alone, the check-in cadence regulators expect, and the practical tooling small retailers actually deploy.", 5),
        ("high-staff-turnover-induction", "High Staff Turnover and WHS: How to Induct Casuals Without the Paperwork", "Induction, WHS",
         "Retail turns over staff faster than any other industry. A three-minute QR induction that satisfies your WHS duty without burying a manager in printouts.", 4),
        ("slip-trip-prevention-retail", "Slip and Trip Prevention: The Number One Retail Injury and How to Manage It", "WHS, Retail",
         "Slip-and-trip incidents are the leading WorkCover claim in retail. The five hazard sources, the cleaning-log evidence regulators look for, and how to defend a customer claim.", 5),
        ("manual-handling-retail-staff", "Manual Handling for Retail Staff: What the Law Requires", "Manual Handling, Retail",
         "Stocking shelves, unloading deliveries, lifting registers. The legal duty around manual handling and how to evidence training for casuals who turn over weekly.", 4),
        ("customer-aggression-whs", "Customer Aggression in Retail: WHS Obligations and Practical Steps", "WHS, Customer",
         "Verbal abuse, theft confrontations, intoxicated patrons. Practical control measures plus the post-event reporting workflow regulators expect.", 5),
        ("rsa-bottle-shop-2025", "RSA Requirements for Bottle Shop Staff 2025", "RSA, Liquor",
         "RSA validity by state, refresher cycles, and how to verify a casual's RSA in under thirty seconds before their first shift.", 4),
        ("multi-site-whs-retail", "Multi-Site WHS: Managing Compliance Across Multiple Stores", "Multi-Site, WHS",
         "Standardised documents at the network level, local controls at the store level. The split that scales — with a sample governance structure.", 6),
        ("franchise-whs-responsibility", "Franchise WHS: Franchisor vs Franchisee — Who Is Responsible?", "Franchise, WHS",
         "Both are PCBUs. We unpack overlapping duties under the WHS Act, the audit risks franchisors carry, and the contractual terms that limit (but don't extinguish) exposure.", 6),
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
        for s, title, tags, excerpt, read_mins in ARTICLE_STUBS.get(industry, []):
            if s == slug:
                doc = {
                    "slug": slug, "industry": industry, "title": title, "tags": tags,
                    "excerpt": excerpt, "read_mins": read_mins,
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
            for slug, title, tags, excerpt, read_mins in ARTICLE_STUBS.get(ind, []):
                out.append({"slug": slug, "industry": ind, "title": title, "tags": tags,
                            "excerpt": excerpt, "read_mins": read_mins})
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
