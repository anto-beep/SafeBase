"""
AI-powered industry document generator (Part 2 of multi-industry brief).

Mounts under /api/ai-docs/* — each `industry/doc_type` declares:
  - inputs[]: form-driven fields the user fills in
  - system_prompt: domain-specific instructions for Claude Sonnet 4.5
  - user_prompt_template: callable that builds the prompt from inputs
  - sections[]: labels for the generated structure (used for skeleton fallback)

Generated documents are stamped with account_id + industry, reference number,
and stored in `compliance_docs` so they appear in the Document Library
alongside the schema-driven types.

Endpoints:
  GET  /api/ai-docs/types               — list available types (filter by industry)
  POST /api/ai-docs/{industry}/{type}/generate — runs Claude, stores result
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request


# ----------------------------------------------------------------
# Document type registry — extensible per-industry. Each entry's
# user_prompt_template is a function(inputs:dict) -> str.
# ----------------------------------------------------------------
def _haccp_prompt(inputs):
    return (
        f"Generate a complete HACCP plan for an Australian food business.\n"
        f"Process: {inputs.get('process', 'general food preparation')}\n"
        f"Serving temperature: {inputs.get('serving_temp', 'mixed')}\n"
        f"Storage methods: {inputs.get('storage', 'fridge + freezer')}\n"
        f"High-risk ingredients / allergens: {inputs.get('allergens', 'see allergen register')}\n"
        f"Venue: {inputs.get('venue_name', 'Restaurant')} ({inputs.get('venue_type', 'restaurant')})\n\n"
        f"Output a complete HACCP plan with these sections (Markdown):\n"
        f"1. Process description and scope\n"
        f"2. Flow diagram (text-based, step-by-step)\n"
        f"3. Hazard analysis table — columns: Step | Hazard | B/C/P | Significant? | Justification | Control measure\n"
        f"4. CCP determination — for each hazard, decide if it's a CCP\n"
        f"5. CCP monitoring plan — CCP | Critical limit | Monitoring procedure | Frequency | Who | Corrective action\n"
        f"6. Verification activities\n"
        f"7. Record-keeping log templates (described, not actual logs)\n"
        f"All temperatures in Celsius. Reference Food Standards Code Standard 3.2.1 and 3.2.2A. "
        f"Australian English spelling. Plain English suitable for venue staff."
    )


def _cor_plan_prompt(inputs):
    return (
        f"Generate a comprehensive Chain of Responsibility Management Plan for an Australian heavy-vehicle operator.\n"
        f"Business: {inputs.get('business_name', 'Operator')} (ABN {inputs.get('abn', 'TBA')})\n"
        f"State: {inputs.get('state', 'NSW')}\n"
        f"Fleet size: {inputs.get('fleet_size', 'small')} ({inputs.get('vehicle_types', 'rigid + semi')})\n"
        f"Fatigue option: {inputs.get('fatigue_option', 'Standard Hours')}\n"
        f"Roster pattern: {inputs.get('roster', 'day shifts')}\n"
        f"Loads carried: {inputs.get('loads', 'general freight')}\n"
        f"Supply-chain role: {inputs.get('chain_role', 'operator')}\n\n"
        f"Output a CoR Management Plan in Markdown with all 12 standard sections:\n"
        f"1. Organisation and CoR roles\n"
        f"2. Primary duty statement\n"
        f"3. Fatigue management policy (with specific work/rest hour tables for the chosen option)\n"
        f"4. Speed management policy\n"
        f"5. Mass, dimension and load restraint\n"
        f"6. Vehicle standards and maintenance\n"
        f"7. Drug and alcohol policy\n"
        f"8. Scheduling and dispatch\n"
        f"9. Incident management (with NHVR notification triggers)\n"
        f"10. Training and induction\n"
        f"11. Monitoring and review\n"
        f"12. Records and documentation (with retention periods — minimum 3 years)\n"
        f"Reference HVNL specific clauses where applicable. Australian English."
    )


def _manual_handling_clinical_prompt(inputs):
    return (
        f"Generate a Manual Handling Risk Assessment for an Australian healthcare setting.\n"
        f"Care setting: {inputs.get('care_setting', 'residential aged care')}\n"
        f"Client mobility: {inputs.get('mobility', 'mixed — some independent, some assist required')}\n"
        f"Common transfers: {inputs.get('transfers', 'bed-to-chair, chair-to-toilet, sit-to-stand')}\n"
        f"Equipment available: {inputs.get('equipment', 'mobile hoist, slide sheets, transfer belt')}\n\n"
        f"Output a Markdown document with:\n"
        f"1. Task identification (each transfer type listed)\n"
        f"2. Hazard identification per task — columns: Force | Posture | Repetition | Environment | Client factors\n"
        f"3. Risk rating per task using 5x5 matrix (likelihood x consequence) with score AND level\n"
        f"4. Control measures per task following Hierarchy of Controls (Eliminate / Engineering / Administrative / PPE)\n"
        f"5. Safe Work Procedure for each transfer type — numbered steps\n"
        f"6. Training requirements (initial + annual refresher)\n"
        f"7. Review schedule and triggers\n"
        f"Reference Safe Work Australia Model Code of Practice for Hazardous Manual Tasks. "
        f"Australian English spelling. Practical and clinically realistic."
    )


def _working_alone_retail_prompt(inputs):
    return (
        f"Generate a Working Alone Risk Assessment for an Australian retail business.\n"
        f"Store type: {inputs.get('store_type', 'convenience store')}\n"
        f"Hours of operation: {inputs.get('hours', '7am-10pm')}\n"
        f"Staff per shift: {inputs.get('staff_count', '1-2')}\n"
        f"Cash handling level: {inputs.get('cash_level', 'moderate')}\n"
        f"Location: {inputs.get('location', 'shopping strip')}\n\n"
        f"Output a Markdown document with:\n"
        f"1. Hazard identification — robbery, medical emergency, slip/trip without witness, fatigue, psychosocial harm, customer aggression\n"
        f"2. Risk rating per hazard (5x5 matrix)\n"
        f"3. Control measures — including: lone worker check-in (SafeBase), duress alarm, CCTV coverage, emergency contact procedure, after-hours protocols\n"
        f"4. Residual risk assessment after controls\n"
        f"5. Safe Work Procedure for working alone — numbered steps\n"
        f"6. Emergency contacts specific to this store (placeholders for the user to fill)\n"
        f"7. Review schedule\n"
        f"Reference Safe Work Australia 'Working alone' guidance and relevant state WHS regulations. "
        f"Australian English. Practical and realistic for a small retail operator."
    )


AI_DOC_REGISTRY = {
    # industry → doc_type → spec
    "hospitality": {
        "haccp_plan": {
            "label": "HACCP Plan",
            "ref_prefix": "HACCP",
            "category": "food_safety",
            "system_prompt": "You are a senior Australian food safety auditor with 20 years experience drafting HACCP plans for restaurants, cafes, and food production facilities. You write in plain English, use Australian spelling, reference Food Standards Code Standard 3.2.1 and 3.2.2A precisely, and produce documents that pass council and FSANZ scrutiny.",
            "user_prompt_template": _haccp_prompt,
            "inputs": [
                {"key": "venue_name", "label": "Venue name", "type": "text", "required": True},
                {"key": "venue_type", "label": "Venue type", "type": "select", "options": ["restaurant", "cafe", "bar", "catering", "takeaway", "hotel", "bakery"], "required": True},
                {"key": "process", "label": "Specific food process", "type": "textarea", "placeholder": "e.g. cooking and serving chicken dishes", "required": True},
                {"key": "serving_temp", "label": "Serving temperature", "type": "select", "options": ["hot", "cold", "ambient", "mixed"]},
                {"key": "storage", "label": "Storage methods", "type": "textarea", "placeholder": "fridge / freezer / dry store / cool room"},
                {"key": "allergens", "label": "High-risk ingredients / allergens", "type": "textarea"},
            ],
        },
    },
    "transport": {
        "cor_management_plan": {
            "label": "CoR Management Plan",
            "ref_prefix": "COR",
            "category": "compliance",
            "system_prompt": "You are a senior Australian transport compliance specialist with deep knowledge of the Heavy Vehicle National Law (HVNL), NHVR guidance, NHVAS accreditation requirements, and Load Restraint Guide 2025. You draft CoR Management Plans that meet primary-duty obligations and survive NHVR audit.",
            "user_prompt_template": _cor_plan_prompt,
            "inputs": [
                {"key": "business_name", "label": "Business name", "type": "text", "required": True},
                {"key": "abn", "label": "ABN", "type": "text"},
                {"key": "state", "label": "State", "type": "select", "options": ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"], "required": True},
                {"key": "fleet_size", "label": "Fleet size", "type": "select", "options": ["1-5", "6-20", "21-50", "51-100", "100+"]},
                {"key": "vehicle_types", "label": "Vehicle types", "type": "textarea", "placeholder": "e.g. rigid, semi, B-double"},
                {"key": "fatigue_option", "label": "Fatigue option", "type": "select", "options": ["Standard Hours", "Basic Fatigue Management (BFM)", "Advanced Fatigue Management (AFM)"], "required": True},
                {"key": "roster", "label": "Roster pattern", "type": "textarea"},
                {"key": "loads", "label": "Loads carried", "type": "textarea"},
                {"key": "chain_role", "label": "Supply-chain role", "type": "select", "options": ["operator", "scheduler", "consignor", "loader", "operator + scheduler", "operator + loader"]},
            ],
        },
    },
    "healthcare": {
        "manual_handling_ra": {
            "label": "Manual Handling Risk Assessment (Clinical)",
            "ref_prefix": "MHRA",
            "category": "clinical",
            "system_prompt": "You are a senior Australian clinical WHS consultant specialising in healthcare manual handling. You write risk assessments aligned with the Safe Work Australia Model Code of Practice for Hazardous Manual Tasks and the relevant ACQSC and NDIS Practice Standards. You include practical SWPs that nurses and PCAs actually follow.",
            "user_prompt_template": _manual_handling_clinical_prompt,
            "inputs": [
                {"key": "care_setting", "label": "Care setting", "type": "select", "options": ["residential aged care", "community / home care", "hospital", "clinic", "disability support"], "required": True},
                {"key": "mobility", "label": "Client mobility level", "type": "textarea", "placeholder": "e.g. ~30% independent, 50% partial assist, 20% full hoist"},
                {"key": "transfers", "label": "Common transfer tasks", "type": "textarea"},
                {"key": "equipment", "label": "Equipment available", "type": "textarea", "placeholder": "ceiling hoist / mobile hoist / slide sheet / transfer belt / stand aid"},
            ],
        },
    },
    "retail": {
        "working_alone_ra": {
            "label": "Working Alone Risk Assessment",
            "ref_prefix": "WAR",
            "category": "wellbeing",
            "system_prompt": "You are a senior Australian retail WHS consultant. You write working-alone risk assessments that address robbery, medical emergency, slip/trip without witness, customer aggression, and psychosocial harm. You produce realistic SWPs that small retailers can actually implement.",
            "user_prompt_template": _working_alone_retail_prompt,
            "inputs": [
                {"key": "store_type", "label": "Store type", "type": "text", "required": True},
                {"key": "hours", "label": "Hours of operation", "type": "text"},
                {"key": "staff_count", "label": "Staff per shift", "type": "text"},
                {"key": "cash_level", "label": "Cash handling level", "type": "select", "options": ["minimal", "moderate", "high"]},
                {"key": "location", "label": "Store location", "type": "text"},
            ],
        },
    },
}


def register_ai_docs_routes(api_router: APIRouter, *, db, get_current_user_dep,
                             llm_chat_cls, user_message_cls, llm_key,
                             account_id_for_fn, stamp_account_fn,
                             log_audit_fn, logger):
    """Mount the AI documents routes."""

    @api_router.get("/ai-docs/types")
    async def list_ai_doc_types(industry: Optional[str] = None,
                                 current_user=Depends(get_current_user_dep)):
        target = (industry or getattr(current_user, "industry", None) or "trades").lower()
        if target not in AI_DOC_REGISTRY:
            return {"industry": target, "types": []}
        out = []
        for slug, spec in AI_DOC_REGISTRY[target].items():
            out.append({
                "doc_type": slug,
                "label": spec["label"],
                "ref_prefix": spec["ref_prefix"],
                "category": spec["category"],
                "inputs": spec["inputs"],
            })
        return {"industry": target, "types": out}

    @api_router.post("/ai-docs/{industry}/{doc_type}/generate")
    async def generate_ai_doc(industry: str, doc_type: str, body: dict,
                               request: Request,
                               current_user=Depends(get_current_user_dep)):
        industry = industry.lower()
        # Industry hard-block — caller's industry must match
        user_industry = (getattr(current_user, "industry", None) or "trades").lower()
        if user_industry != industry:
            raise HTTPException(403, {
                "error": "feature_not_available",
                "code": f"ai_docs:{industry}",
                "message": f"AI document generation for {industry} is not available — your account is set to {user_industry}.",
            })
        if industry not in AI_DOC_REGISTRY or doc_type not in AI_DOC_REGISTRY[industry]:
            raise HTTPException(404, "Unknown AI doc type")
        spec = AI_DOC_REGISTRY[industry][doc_type]
        inputs = body.get("inputs") or {}

        # Run Claude
        try:
            chat = llm_chat_cls(
                api_key=llm_key,
                session_id=f"aidoc_{uuid.uuid4().hex[:8]}",
                system_message=spec["system_prompt"],
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            prompt = spec["user_prompt_template"](inputs)

            def _run_llm():
                return asyncio.run(chat.send_message(user_message_cls(text=prompt)))

            content = await asyncio.wait_for(asyncio.to_thread(_run_llm), timeout=50.0)
        except asyncio.TimeoutError:
            raise HTTPException(503, "AI provider slow — please retry")
        except Exception as e:
            logger.exception("AI doc generation failed")
            content = (
                f"# {spec['label']} — generation pending\n\n"
                f"AI generation is temporarily unavailable. Please retry shortly.\n\n"
                f"Error: {str(e)[:200]}"
            )

        # Reference number — per-account counter
        year = datetime.now(timezone.utc).year
        counter = await db.docs_counters.find_one_and_update(
            {"account_id": account_id_for_fn(current_user), "year": year, "prefix": spec["ref_prefix"]},
            {"$inc": {"count": 1}},
            upsert=True, return_document=True,
        )
        n = (counter or {}).get("count") or 1
        ref = f"{spec['ref_prefix']}-{year}-{n:04d}"
        doc_id = f"aidoc_{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc).isoformat()
        record = stamp_account_fn({
            "doc_id": doc_id,
            "reference": ref,
            "doc_type": doc_type,
            "category": spec["category"],
            "label": spec["label"],
            "ai_generated": True,
            "industry": industry,
            "status": "draft",
            "version": 1,
            "inputs": inputs,
            "content": content,
            "disclaimer": (
                "Generated by SafeBase AI. Review by a qualified person required "
                "before use. SafeBase Pty Ltd accepts no liability for accuracy "
                "or completeness."
            ),
            "retention_until": (datetime.now(timezone.utc) + timedelta(days=5*365)).isoformat(),
            "updated_at": now,
        }, current_user)
        await db.compliance_docs.insert_one({**record})
        await log_audit_fn(db, user=current_user, action="ai_generate",
                           record_type="compliance_doc", record_id=doc_id,
                           request=request, detail={"doc_type": doc_type, "industry": industry, "reference": ref})
        return {k: v for k, v in record.items() if k != "_id"}
