"""
SWMS (Safe Work Method Statement) Generator — SafeTradie
Phase 1: Complete SWMS generator with legal-compliant structure matching the
official Safe Work Australia template + WorkSafe WA info sheet + all state
regulations. Produces PDFs via WeasyPrint.

Factory pattern mirrors risk_module / incident_workflow / competency_module.
"""
from __future__ import annotations

import uuid
import asyncio
import secrets
import re
import json as _json
from datetime import datetime, timezone, timedelta
from typing import Optional, Any, List

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

swms_router = APIRouter()

# ----------------------------------------------------------------
# Reference data
# ----------------------------------------------------------------

HRCW_CATEGORIES = [
    {"code": "fall_2m", "label": "Risk of a person falling more than 2 metres"},
    {"code": "telco_tower", "label": "Work on a telecommunication tower"},
    {"code": "demo_load_bearing", "label": "Demolition of a load-bearing structural element"},
    {"code": "demo_structural_integrity", "label": "Demolition of an element related to the physical integrity of a structure"},
    {"code": "asbestos", "label": "Work that involves or is likely to involve the disturbance of asbestos"},
    {"code": "structural_alt", "label": "Structural alterations or repairs requiring temporary support to prevent collapse"},
    {"code": "confined_space", "label": "Work in or near a confined space"},
    {"code": "excavation_1_5m", "label": "Work in or near a shaft or trench with excavated depth greater than 1.5 metres"},
    {"code": "tunnel", "label": "Work in or near a tunnel"},
    {"code": "explosives", "label": "Work involving the use of explosives"},
    {"code": "pressurised_gas", "label": "Work on or near pressurised gas distribution mains or piping"},
    {"code": "chemical_fuel", "label": "Work on or near chemical, fuel or refrigerant lines"},
    {"code": "energised_electrical", "label": "Work on or near energised electrical installations or services"},
    {"code": "flammable_atmosphere", "label": "Work in an area that may have a contaminated or flammable atmosphere"},
    {"code": "tilt_up_precast", "label": "Work involving tilt-up or precast concrete elements"},
    {"code": "traffic", "label": "Work on, in or adjacent to a road, railway, shipping lane or other traffic corridor in use by traffic other than pedestrians"},
    {"code": "mobile_plant", "label": "Work in an area in which there is any movement of powered mobile plant"},
    {"code": "temperature_extreme", "label": "Work in areas with artificial extremes of temperature"},
    {"code": "water_drowning", "label": "Work in or near water or other liquid that involves a risk of drowning"},
    {"code": "diving", "label": "Diving work"},
]
HRCW_BY_CODE = {c["code"]: c["label"] for c in HRCW_CATEGORIES}

# Trade → Activities + auto-ticked HRCW codes
TRADES = {
    "electrician": {
        "label": "Electrician",
        "activities": [
            "Cable installation and termination",
            "Switchboard and distribution board work",
            "Underground cable laying",
            "Overhead cable work",
            "Solar and renewable energy installation",
            "Working near or on energised electrical installations",
            "Electrical testing and commissioning",
            "Installation in hazardous areas",
            "EV charging infrastructure installation",
            "Data and communications cabling",
            "Aerial / antenna installation",
            "Air conditioning electrical connection",
        ],
        "default_hrcw": ["energised_electrical"],
    },
    "plumber": {
        "label": "Plumber / Drainer",
        "activities": [
            "Hot water system installation",
            "Cold water pipe installation",
            "Sanitary plumbing installation",
            "Underground drainage / sewer work",
            "Roof plumbing and stormwater",
            "Gas fitting and appliance connection",
            "Gas pipe installation",
            "Pressure testing",
            "Backflow prevention device installation",
            "Confined space drainage work",
            "Pump and equipment installation",
            "Greywater and recycled water systems",
        ],
        "default_hrcw": ["excavation_1_5m", "pressurised_gas"],
    },
    "gas_fitter": {
        "label": "Gas Fitter",
        "activities": ["Gas appliance connection", "Gas pipe installation and testing", "LPG installation"],
        "default_hrcw": ["pressurised_gas"],
    },
    "roof_plumber": {
        "label": "Roof Plumber",
        "activities": ["Metal roof installation", "Gutters and downpipes", "Skylight installation", "Stormwater systems"],
        "default_hrcw": ["fall_2m"],
    },
    "builder": {
        "label": "Builder / General Construction",
        "activities": [
            "Formwork erection and stripping", "Concrete pouring and finishing",
            "Structural steel erection", "Roof framing and installation",
            "Wall framing construction", "Demolition of load-bearing elements",
            "Excavation and earthworks", "Tilt-up or precast concrete",
            "Scaffold erection and use", "Underpinning and foundation work",
            "Renovation and alteration work", "Pool construction",
        ],
        "default_hrcw": ["fall_2m", "mobile_plant"],
    },
    "carpenter": {
        "label": "Carpenter / Joiner",
        "activities": ["Roof framing", "Wall framing", "Formwork", "Decking and flooring",
                        "Stairs and balustrades", "Structural repairs", "Fit-out and joinery"],
        "default_hrcw": ["fall_2m"],
    },
    "concreter": {
        "label": "Concreter",
        "activities": ["Formwork erection and stripping", "Reinforcement placement",
                        "Concrete pouring", "Surface preparation and finishing",
                        "Saw cutting and grinding", "Slab on ground", "Elevated slab work"],
        "default_hrcw": ["mobile_plant"],
    },
    "steel_fixer": {"label": "Steel Fixer / Reinforcer", "activities": ["Reinforcement placement", "Steel tying"], "default_hrcw": []},
    "bricklayer": {"label": "Bricklayer / Blocklayer", "activities": ["Brick laying", "Block laying", "Rendering"], "default_hrcw": ["fall_2m"]},
    "plasterer": {"label": "Plasterer", "activities": ["Internal plastering", "External rendering", "Cornice installation"], "default_hrcw": []},
    "painter": {"label": "Painter", "activities": ["Internal painting", "External painting", "Spray painting", "Heritage restoration"], "default_hrcw": ["fall_2m"]},
    "tiler": {"label": "Tiler", "activities": ["Floor tiling", "Wall tiling", "Waterproofing"], "default_hrcw": []},
    "roofer": {
        "label": "Roofer",
        "activities": ["Metal roof installation", "Tile roof installation", "Roof sheeting",
                        "Roof repair and maintenance", "Gutters and downpipes", "Skylights and roof penetrations"],
        "default_hrcw": ["fall_2m"],
    },
    "scaffolder": {"label": "Scaffolder", "activities": ["Scaffold erection", "Scaffold dismantling", "Scaffold inspection"], "default_hrcw": ["fall_2m"]},
    "rigger": {"label": "Rigger", "activities": ["Basic rigging", "Intermediate rigging", "Advanced rigging"], "default_hrcw": ["fall_2m"]},
    "crane_operator": {"label": "Crane Operator", "activities": ["Tower crane operation", "Mobile crane operation"], "default_hrcw": ["mobile_plant"]},
    "demolition": {"label": "Demolition", "activities": ["Soft-strip demolition", "Load-bearing demolition", "Asbestos removal"], "default_hrcw": ["demo_load_bearing", "asbestos"]},
    "excavation": {"label": "Excavation / Civil", "activities": ["Bulk excavation", "Trenching", "Pile driving"], "default_hrcw": ["excavation_1_5m", "mobile_plant"]},
    "landscaper": {"label": "Landscaper", "activities": ["Soft landscaping", "Hardscaping", "Irrigation"], "default_hrcw": []},
    "cleaner": {"label": "Cleaner", "activities": ["Post-construction cleaning", "High-reach cleaning", "Strip-out cleaning"], "default_hrcw": []},
    "other": {"label": "Other", "activities": ["Custom activity"], "default_hrcw": []},
}

# Activity + HRCW → auto-ticked HRCW codes (overrides / adds to trade defaults)
ACTIVITY_HRCW = {
    "Underground cable laying": ["excavation_1_5m"],
    "Working near or on energised electrical installations": ["energised_electrical"],
    "Overhead cable work": ["fall_2m", "energised_electrical"],
    "Solar and renewable energy installation": ["fall_2m", "energised_electrical"],
    "Installation in hazardous areas": ["flammable_atmosphere"],
    "EV charging infrastructure installation": ["energised_electrical"],
    "Underground drainage / sewer work": ["excavation_1_5m", "confined_space"],
    "Gas fitting and appliance connection": ["pressurised_gas"],
    "Gas pipe installation": ["pressurised_gas"],
    "Confined space drainage work": ["confined_space"],
    "Roof plumbing and stormwater": ["fall_2m"],
    "Formwork erection and stripping": ["fall_2m"],
    "Structural steel erection": ["fall_2m"],
    "Roof framing and installation": ["fall_2m"],
    "Demolition of load-bearing elements": ["demo_load_bearing", "demo_structural_integrity"],
    "Excavation and earthworks": ["excavation_1_5m", "mobile_plant"],
    "Tilt-up or precast concrete": ["tilt_up_precast"],
    "Scaffold erection and use": ["fall_2m"],
    "Elevated slab work": ["fall_2m"],
    "Metal roof installation": ["fall_2m"],
    "Tile roof installation": ["fall_2m"],
    "Roof sheeting": ["fall_2m"],
    "Skylights and roof penetrations": ["fall_2m"],
    "Asbestos removal": ["asbestos"],
}

# State regulators
STATE_REGULATORS = {
    "NSW": {"name": "SafeWork NSW", "phone": "13 10 50"},
    "VIC": {"name": "WorkSafe Victoria", "phone": "13 23 60"},
    "QLD": {"name": "Workplace Health and Safety QLD", "phone": "1300 362 128"},
    "WA": {"name": "WorkSafe WA", "phone": "1300 307 877"},
    "SA": {"name": "SafeWork SA", "phone": "1300 365 255"},
    "TAS": {"name": "WorkSafe Tasmania", "phone": "1300 366 322"},
    "NT": {"name": "NT WorkSafe", "phone": "1800 019 115"},
    "ACT": {"name": "WorkSafe ACT", "phone": "02 6207 3000"},
}

HIERARCHY_LEVELS = ["eliminate", "substitute", "isolate", "engineer", "admin", "ppe"]
HIERARCHY_COLOURS = {
    "eliminate": "#065f46", "substitute": "#0d9488", "isolate": "#1d4ed8",
    "engineer": "#1e3a8a", "admin": "#d97706", "ppe": "#b91c1c",
}

STANDARD_PPE = [
    "Safety helmet (hard hat) — AS/NZS 1801",
    "Safety boots (steel cap) — AS/NZS 2210.3",
    "High-visibility vest / jacket",
    "Safety glasses / goggles — AS/NZS 1337",
    "Full face shield",
    "Hearing protection (earmuffs / plugs) — AS/NZS 1270",
    "P2 respirator / dust mask — AS/NZS 1716",
    "Chemical-resistant gloves",
    "Cut-resistant gloves",
    "Anti-vibration gloves",
    "Heat-resistant / leather gloves",
    "Class 1 insulated electrical gloves — AS/NZS 2225",
    "Full-body safety harness — AS/NZS 1891.1",
    "Shock-absorbing lanyard — AS/NZS 1891.1",
    "Self-retracting lifeline (SRL)",
    "Arc flash rated PPE — minimum 4 cal/cm²",
    "Welding helmet / shade",
    "Sun protection (sunscreen, hat, long sleeves)",
    "Knee pads",
]

STANDARD_TRAINING = [
    "General Construction Induction (white card) — all workers",
    "Site-specific induction — all workers",
    "Electrical licence",
    "Plumbing licence",
    "High Risk Work Licence — EWP",
    "High Risk Work Licence — Forklift",
    "High Risk Work Licence — Scaffold",
    "High Risk Work Licence — Crane",
    "High Risk Work Licence — Rigging",
    "High Risk Work Licence — Dogging",
    "Working at heights training",
    "Confined space entry training",
    "Asbestos awareness training",
    "First aid certificate — minimum 1 per team",
    "Traffic control certification",
    "Demolition licence",
    "Explosive blasting licence",
    "Diving certificate",
]


# ----------------------------------------------------------------
# Pydantic models
# ----------------------------------------------------------------

class SwmsRow(BaseModel):
    row_id: Optional[str] = None
    task: str
    hrcw_code: Optional[str] = None
    hazards: List[str] = []
    controls: List[dict] = []  # [{level, text}]
    responsible: Optional[str] = None


class WorkerOnSwms(BaseModel):
    worker_id: Optional[str] = None
    name: str
    role: Optional[str] = None
    signed: bool = False
    signed_at: Optional[str] = None
    signature_data: Optional[str] = None  # base64 PNG or initials
    signed_via: Optional[str] = None  # in_person | sms | manual


class SwmsCreate(BaseModel):
    # Step 1
    company_name: str
    abn: Optional[str] = None
    business_address: Optional[str] = None
    business_phone: Optional[str] = None
    business_email: Optional[str] = None
    work_activity: str
    site_location: str
    site_state: str = "NSW"
    site_type: Optional[str] = None
    start_date: Optional[str] = None
    duration: Optional[str] = None
    works_manager_name: Optional[str] = None
    works_manager_phone: Optional[str] = None
    has_principal_contractor: bool = False
    pc_business: Optional[str] = None
    pc_contact: Optional[str] = None
    pc_phone: Optional[str] = None
    pc_swms_date: Optional[str] = None
    # Step 2
    trade: str
    activity: str
    workers: List[WorkerOnSwms] = []
    # Step 3
    hrcw_codes: List[str] = []
    # Step 4
    rows: List[SwmsRow] = []
    # Step 5
    compliance_responsible: Optional[str] = None
    compliance_measures: Optional[str] = None
    review_responsible: Optional[str] = None
    review_measures: Optional[str] = None
    review_date: Optional[str] = None
    consulted_workers: List[str] = []  # names
    hsr_name: Optional[str] = None
    # Step 6
    plant: List[dict] = []  # [{name, class, registration, prestart_check:bool}]
    ppe: List[str] = []
    training: List[str] = []
    emergency_contact: Optional[str] = None
    nearest_hospital: Optional[str] = None
    assembly_point: Optional[str] = None
    first_aider: Optional[str] = None


# ----------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _auto_hrcw_for(trade: str, activity: str) -> list[str]:
    codes = set(TRADES.get(trade, {}).get("default_hrcw", []))
    codes.update(ACTIVITY_HRCW.get(activity, []))
    return sorted(codes)


def _fallback_rows(trade: str, hrcw_codes: list[str]) -> list[dict]:
    """Safe generic rows used when AI is unavailable. Returns 1 row per
    ticked HRCW with a basic hazard + 3-level hierarchy control sample."""
    rows = []
    for code in hrcw_codes:
        label = HRCW_BY_CODE.get(code, code)
        rows.append({
            "row_id": f"row_{uuid.uuid4().hex[:8]}",
            "task": f"Work involving: {label}",
            "hrcw_code": code,
            "hazards": [f"Exposure risk from: {label.lower()}."],
            "controls": [
                {"level": "engineer", "text": "Apply engineering controls appropriate to this hazard (guardrails, barriers, isolation, ventilation as applicable)."},
                {"level": "admin", "text": "Document a safe work procedure, brief all workers before commencing, and supervise execution. Stop work if controls fail."},
                {"level": "ppe", "text": "Task-specific PPE as identified in Step 6 — minimum hard hat, steel-capped boots, hi-vis, safety glasses."},
            ],
        })
    if not rows:  # no HRCW — still provide one row
        rows.append({
            "row_id": f"row_{uuid.uuid4().hex[:8]}",
            "task": f"General {trade} work",
            "hrcw_code": None,
            "hazards": ["Manual handling", "Slips, trips, and falls", "Exposure to dust and noise"],
            "controls": [
                {"level": "engineer", "text": "Select appropriate plant and tools; maintain clear access and egress."},
                {"level": "admin", "text": "Pre-start briefing; regular toolbox talks; supervisor walk-throughs."},
                {"level": "ppe", "text": "Standard trade PPE — hard hat, boots, hi-vis, eyewear, hearing protection."},
            ],
        })
    return rows


async def _call_claude(system: str, user_prompt: str, fallback: Any,
                      llm_chat_cls, user_message_cls, llm_key: str,
                      timeout: float = 65.0) -> Any:
    """Robust Claude call that always returns JSON (falls back on any failure)."""
    try:
        chat = llm_chat_cls(
            api_key=llm_key, session_id=f"swms_{uuid.uuid4().hex[:8]}",
            system_message=system,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        def _run():
            return asyncio.run(chat.send_message(user_message_cls(text=user_prompt)))

        raw = await asyncio.wait_for(asyncio.to_thread(_run), timeout=timeout)
        txt = raw if isinstance(raw, str) else str(raw)
        m = re.search(r"\{[\s\S]*\}|\[[\s\S]*\]", txt)
        if m:
            return _json.loads(m.group(0))
        return fallback
    except Exception:
        return fallback


# ----------------------------------------------------------------
# Routes
# ----------------------------------------------------------------

def register_swms_routes(app_db, get_current_user, llm_chat_cls, user_message_cls, llm_key):

    # ---------------- Reference data ----------------
    @swms_router.get("/swms/reference")
    async def reference():
        return {
            "hrcw_categories": HRCW_CATEGORIES,
            "trades": {k: {"label": v["label"], "activities": v["activities"]} for k, v in TRADES.items()},
            "state_regulators": STATE_REGULATORS,
            "hierarchy_levels": HIERARCHY_LEVELS,
            "hierarchy_colours": HIERARCHY_COLOURS,
            "standard_ppe": STANDARD_PPE,
            "standard_training": STANDARD_TRAINING,
        }

    # ---------------- AI ----------------
    @swms_router.post("/swms/ai/suggest-hrcw")
    async def suggest_hrcw(body: dict, current_user=Depends(get_current_user)):
        trade = (body or {}).get("trade", "other")
        activity = (body or {}).get("activity", "")
        return {"hrcw_codes": _auto_hrcw_for(trade, activity)}

    @swms_router.post("/swms/ai/suggest-rows")
    async def suggest_rows(body: dict, current_user=Depends(get_current_user)):
        trade = body.get("trade", "other")
        activity = body.get("activity", "")
        hrcw_codes = body.get("hrcw_codes", []) or []
        existing_rows = body.get("rows", [])
        state = body.get("site_state", "NSW")
        hrcw_labels = [HRCW_BY_CODE.get(c, c) for c in hrcw_codes]
        fallback = {"rows": _fallback_rows(trade, hrcw_codes), "fallback": True}
        if not hrcw_codes and not activity:
            return fallback
        sys = (
            "You are a senior Australian WHS consultant drafting the Tasks/Hazards/Controls "
            "section of a Safe Work Method Statement for a tradie business. Output must be "
            "practical, plain-English and reference the Hierarchy of Controls strictly."
        )
        prompt = (
            f"Trade: {TRADES.get(trade,{}).get('label', trade)}\n"
            f"Activity: {activity}\n"
            f"Site state: {state}\n"
            f"HRCW categories selected: {', '.join(hrcw_labels) or 'None (still provide 3 generic rows for this trade)'}\n"
            f"Existing row tasks (extend, do not duplicate): {[r.get('task') for r in existing_rows][:10]}\n\n"
            "Return JSON: {rows: [{task, hrcw_code (one of the codes listed below or null), "
            "hazards: [string, ...], controls: [{level: 'eliminate'|'substitute'|'isolate'|'engineer'|'admin'|'ppe', text}, ...]}, ...]}\n"
            f"Allowed hrcw_code values: {list(HRCW_BY_CODE.keys())}\n"
            "Rules:\n"
            "- 4 to 7 rows covering the key tasks in LOGICAL SEQUENCE of work.\n"
            "- Each row: 1-3 distinct hazards, 4-6 controls working TOP-DOWN through hierarchy.\n"
            "- Controls must be concrete and action-oriented. Reference Australian Standards in-line only where it adds value (e.g. 'per AS/NZS 3000').\n"
            "- Do NOT use generic filler like 'follow safe practice'. Every control must be testable.\n"
            "- Output ONLY the JSON. No prose."
        )
        res = await _call_claude(sys, prompt, fallback, llm_chat_cls, user_message_cls, llm_key)
        out_rows = res.get("rows") or []
        # Normalise + attach row_ids
        norm = []
        for r in out_rows:
            norm.append({
                "row_id": f"row_{uuid.uuid4().hex[:8]}",
                "task": r.get("task", "Task"),
                "hrcw_code": r.get("hrcw_code") if r.get("hrcw_code") in HRCW_BY_CODE else None,
                "hazards": [h for h in (r.get("hazards") or []) if h],
                "controls": [
                    {"level": c.get("level", "admin") if c.get("level") in HIERARCHY_LEVELS else "admin",
                     "text": c.get("text", "")}
                    for c in (r.get("controls") or []) if c.get("text")
                ],
            })
        return {"rows": norm or _fallback_rows(trade, hrcw_codes),
                "fallback": res.get("fallback", False)}

    # ---------------- Reference counter ----------------
    async def _next_ref(user_id: str) -> str:
        year = _now().year
        res = await app_db.swms_counters.find_one_and_update(
            {"user_id": user_id, "year": year},
            {"$inc": {"count": 1}},
            upsert=True, return_document=True,
        )
        # Motor returns the UPDATED doc when return_document=True (ReturnDocument.AFTER default)
        n = (res or {}).get("count") or 1
        return f"SWMS-{year}-{n:04d}"

    # ---------------- CRUD ----------------
    @swms_router.post("/swms")
    async def create_swms(body: SwmsCreate, current_user=Depends(get_current_user)):
        swms_id = f"swms_{uuid.uuid4().hex[:10]}"
        ref = await _next_ref(current_user.user_id)
        now = _now_iso()
        # Retention — default 5 years from creation; extended to 2y from incident on link
        retention = (_now() + timedelta(days=5 * 365)).isoformat()
        review_date = body.review_date or (_now() + timedelta(days=30)).date().isoformat()
        # Normalise workers
        workers = []
        for w in (body.workers or []):
            w_dict = w.dict() if hasattr(w, "dict") else dict(w)
            w_dict.setdefault("signed", False)
            workers.append(w_dict)
        # Normalise rows
        rows = []
        for r in (body.rows or []):
            r_dict = r.dict() if hasattr(r, "dict") else dict(r)
            if not r_dict.get("row_id"):
                r_dict["row_id"] = f"row_{uuid.uuid4().hex[:8]}"
            rows.append(r_dict)

        doc = {
            "swms_id": swms_id,
            "reference": ref,
            "user_id": current_user.user_id,
            "version": 1,
            "status": "draft",
            "created_at": now,
            "updated_at": now,
            "review_date": review_date,
            "retention_until": retention,
            "locked_by_incident": False,
            "workflow_state": "draft",
            # persist all form fields
            **{k: v for k, v in body.dict().items() if k not in {"workers", "rows"}},
            "workers": workers,
            "rows": rows,
            "audit_log": [{"at": now, "user_id": current_user.user_id,
                           "user_name": getattr(current_user, "name", None),
                           "event": "created", "detail": f"{ref} drafted"}],
            "revisions": [{"version": 1, "at": now,
                           "by": getattr(current_user, "name", None) or "Creator",
                           "nature": "Original"}],
        }
        await app_db.swms.insert_one({**doc})
        return {k: v for k, v in doc.items() if k != "_id"}

    @swms_router.get("/swms")
    async def list_swms(current_user=Depends(get_current_user)):
        rows = await app_db.swms.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(500)
        return rows

    @swms_router.get("/swms/{swms_id}")
    async def get_swms(swms_id: str, current_user=Depends(get_current_user)):
        doc = await app_db.swms.find_one(
            {"swms_id": swms_id, "user_id": current_user.user_id}, {"_id": 0}
        )
        if not doc:
            raise HTTPException(404, "SWMS not found")
        return doc

    @swms_router.patch("/swms/{swms_id}")
    async def update_swms(swms_id: str, body: dict, current_user=Depends(get_current_user)):
        doc = await app_db.swms.find_one(
            {"swms_id": swms_id, "user_id": current_user.user_id}
        )
        if not doc:
            raise HTTPException(404, "SWMS not found")
        body.pop("_id", None); body.pop("user_id", None); body.pop("swms_id", None)
        body.pop("reference", None); body.pop("created_at", None)
        now = _now_iso()
        body["updated_at"] = now
        # Version bump when rows / HRCW / controls change materially
        material_keys = {"rows", "hrcw_codes", "ppe", "training", "plant",
                         "compliance_measures", "review_measures"}
        bumped = any(k in body for k in material_keys) and doc.get("status") != "draft"
        if bumped:
            body["version"] = (doc.get("version", 1)) + 1
            revs = doc.get("revisions", []) + [{
                "version": body["version"], "at": now,
                "by": getattr(current_user, "name", None) or "Editor",
                "nature": body.get("_revision_note") or "Revised during review",
            }]
            body["revisions"] = revs
        body.pop("_revision_note", None)
        audit = doc.get("audit_log", []) + [{
            "at": now, "user_id": current_user.user_id,
            "user_name": getattr(current_user, "name", None),
            "event": "updated", "detail": ", ".join(list(body.keys())[:10]),
        }]
        body["audit_log"] = audit
        await app_db.swms.update_one(
            {"swms_id": swms_id, "user_id": current_user.user_id}, {"$set": body}
        )
        out = await app_db.swms.find_one(
            {"swms_id": swms_id, "user_id": current_user.user_id}, {"_id": 0}
        )
        return out

    @swms_router.delete("/swms/{swms_id}")
    async def delete_swms(swms_id: str, current_user=Depends(get_current_user)):
        doc = await app_db.swms.find_one(
            {"swms_id": swms_id, "user_id": current_user.user_id}
        )
        if not doc:
            raise HTTPException(404, "SWMS not found")
        if doc.get("locked_by_incident"):
            raise HTTPException(400, "SWMS is locked due to a linked notifiable incident and cannot be deleted for 2 years after incident date.")
        # Soft-archive rather than hard delete (retention)
        if doc.get("status") != "archived":
            await app_db.swms.update_one(
                {"swms_id": swms_id, "user_id": current_user.user_id},
                {"$set": {"status": "archived", "archived_at": _now_iso()}},
            )
            return {"archived": True, "swms_id": swms_id}
        await app_db.swms.delete_one({"swms_id": swms_id, "user_id": current_user.user_id})
        return {"deleted": True, "swms_id": swms_id}

    @swms_router.post("/swms/{swms_id}/duplicate")
    async def duplicate_swms(swms_id: str, current_user=Depends(get_current_user)):
        src = await app_db.swms.find_one(
            {"swms_id": swms_id, "user_id": current_user.user_id}, {"_id": 0}
        )
        if not src:
            raise HTTPException(404, "SWMS not found")
        new_id = f"swms_{uuid.uuid4().hex[:10]}"
        ref = await _next_ref(current_user.user_id)
        now = _now_iso()
        clone = {**src,
                 "swms_id": new_id,
                 "reference": ref,
                 "version": 1,
                 "status": "draft",
                 "workflow_state": "draft",
                 "workers": [{**w, "signed": False, "signed_at": None,
                              "signature_data": None, "signed_via": None}
                             for w in src.get("workers", [])],
                 "created_at": now,
                 "updated_at": now,
                 "archived_at": None,
                 "locked_by_incident": False,
                 "audit_log": [{"at": now, "user_id": current_user.user_id,
                                "user_name": getattr(current_user, "name", None),
                                "event": "duplicated", "detail": f"Duplicated from {src.get('reference')}"}],
                 "revisions": [{"version": 1, "at": now,
                                "by": getattr(current_user, "name", None) or "Creator",
                                "nature": f"Duplicated from {src.get('reference')}"}]}
        await app_db.swms.insert_one({**clone})
        return {k: v for k, v in clone.items() if k != "_id"}

    # ---------------- Sign off ----------------
    @swms_router.post("/swms/{swms_id}/sign")
    async def sign_swms(swms_id: str, body: dict, current_user=Depends(get_current_user)):
        """In-person digital sign-off. Body: {worker_id OR name, signature_data}."""
        doc = await app_db.swms.find_one(
            {"swms_id": swms_id, "user_id": current_user.user_id}
        )
        if not doc:
            raise HTTPException(404, "SWMS not found")
        worker_id = body.get("worker_id")
        name = body.get("name")
        sig = body.get("signature_data")
        if not sig:
            raise HTTPException(400, "signature_data required")
        now = _now_iso()
        workers = doc.get("workers", [])
        updated = False
        for w in workers:
            match = (worker_id and w.get("worker_id") == worker_id) or \
                    (not worker_id and name and w.get("name") == name)
            if match:
                w["signed"] = True
                w["signed_at"] = now
                w["signature_data"] = sig
                w["signed_via"] = body.get("signed_via", "in_person")
                updated = True
                break
        if not updated:
            # Allow ad-hoc worker sign-on (not in roster) — append
            workers.append({"worker_id": worker_id, "name": name or "Worker",
                            "signed": True, "signed_at": now,
                            "signature_data": sig, "signed_via": body.get("signed_via", "in_person")})
        # Status progression
        all_signed = all(w.get("signed") for w in workers) and len(workers) > 0
        status = "signed" if all_signed else "awaiting_signatures"
        await app_db.swms.update_one(
            {"swms_id": swms_id, "user_id": current_user.user_id},
            {"$set": {"workers": workers, "status": status, "updated_at": now},
             "$push": {"audit_log": {"at": now, "user_id": current_user.user_id,
                                      "user_name": getattr(current_user, "name", None),
                                      "event": "signed",
                                      "detail": f"Sign-off by {name or worker_id or 'worker'}"}}},
        )
        return {"signed": True, "all_signed": all_signed, "status": status}

    @swms_router.post("/swms/{swms_id}/send-sign-links")
    async def send_sign_links(swms_id: str, current_user=Depends(get_current_user)):
        """Generate secure 7-day tokens for each unsigned worker. SMS delivery
        is MOCKED — we only log the link via in-app notification."""
        doc = await app_db.swms.find_one(
            {"swms_id": swms_id, "user_id": current_user.user_id}
        )
        if not doc:
            raise HTTPException(404, "SWMS not found")
        now = _now_iso()
        exp = (_now() + timedelta(days=7)).isoformat()
        tokens = []
        for w in doc.get("workers", []):
            if w.get("signed"):
                continue
            token = secrets.token_urlsafe(24)
            await app_db.swms_sign_tokens.insert_one({
                "token": token, "swms_id": swms_id, "user_id": current_user.user_id,
                "worker_name": w.get("name"), "worker_id": w.get("worker_id"),
                "created_at": now, "expires_at": exp, "used_at": None,
            })
            tokens.append({"worker_name": w.get("name"), "token": token, "expires_at": exp})
        # Log notification
        await app_db.notifications.insert_one({
            "user_id": current_user.user_id, "channel": "in_app",
            "type": "swms_sign_links_sent",
            "title": f"SWMS {doc['reference']} sign links generated",
            "body": f"{len(tokens)} worker(s) can now sign via secure link (7-day expiry). SMS delivery MOCKED.",
            "severity": "info", "swms_id": swms_id,
            "created_at": now, "read": False,
        })
        # Update status
        await app_db.swms.update_one(
            {"swms_id": swms_id, "user_id": current_user.user_id},
            {"$set": {"status": "awaiting_signatures" if tokens else doc.get("status"),
                      "updated_at": now}}
        )
        return {"sent": len(tokens), "tokens": tokens}

    # ---------------- Public sign flow (no auth) ----------------
    @swms_router.get("/public/swms/sign/{token}")
    async def public_get_swms_for_sign(token: str):
        rec = await app_db.swms_sign_tokens.find_one({"token": token}, {"_id": 0})
        if not rec:
            raise HTTPException(404, "Invalid or expired link")
        if rec.get("used_at"):
            raise HTTPException(410, "This sign-off link has already been used")
        try:
            exp = datetime.fromisoformat(rec["expires_at"].replace("Z", "+00:00")).replace(tzinfo=timezone.utc)
            if exp < _now():
                raise HTTPException(410, "This sign-off link has expired")
        except HTTPException:
            raise
        except Exception:
            pass
        doc = await app_db.swms.find_one({"swms_id": rec["swms_id"]}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "SWMS not found")
        # Return a trimmed public view
        return {
            "reference": doc.get("reference"),
            "work_activity": doc.get("work_activity"),
            "site_location": doc.get("site_location"),
            "company_name": doc.get("company_name"),
            "rows": doc.get("rows", []),
            "hrcw_codes": doc.get("hrcw_codes", []),
            "ppe": doc.get("ppe", []),
            "training": doc.get("training", []),
            "emergency_contact": doc.get("emergency_contact"),
            "nearest_hospital": doc.get("nearest_hospital"),
            "assembly_point": doc.get("assembly_point"),
            "worker_name": rec.get("worker_name"),
            "worker_id": rec.get("worker_id"),
            "expires_at": rec.get("expires_at"),
        }

    @swms_router.post("/public/swms/sign/{token}")
    async def public_sign_swms(token: str, body: dict):
        rec = await app_db.swms_sign_tokens.find_one({"token": token}, {"_id": 0})
        if not rec:
            raise HTTPException(404, "Invalid link")
        if rec.get("used_at"):
            raise HTTPException(410, "Link already used")
        sig = body.get("signature_data")
        if not sig:
            raise HTTPException(400, "signature_data required")
        now = _now_iso()
        # Mark token used
        await app_db.swms_sign_tokens.update_one({"token": token}, {"$set": {"used_at": now}})
        # Stamp worker as signed
        doc = await app_db.swms.find_one({"swms_id": rec["swms_id"]})
        if not doc:
            raise HTTPException(404, "SWMS not found")
        workers = doc.get("workers", [])
        matched = False
        for w in workers:
            if (rec.get("worker_id") and w.get("worker_id") == rec["worker_id"]) or \
               (not rec.get("worker_id") and w.get("name") == rec.get("worker_name")):
                w["signed"] = True
                w["signed_at"] = now
                w["signature_data"] = sig
                w["signed_via"] = "sms"
                matched = True
                break
        if not matched:
            workers.append({"worker_id": rec.get("worker_id"), "name": rec.get("worker_name"),
                            "signed": True, "signed_at": now, "signature_data": sig,
                            "signed_via": "sms"})
        all_signed = all(w.get("signed") for w in workers) and len(workers) > 0
        await app_db.swms.update_one(
            {"swms_id": doc["swms_id"]},
            {"$set": {"workers": workers, "updated_at": now,
                      "status": "signed" if all_signed else "awaiting_signatures"},
             "$push": {"audit_log": {"at": now, "event": "signed_public",
                                      "detail": f"Public sign-off by {rec.get('worker_name')}"}}},
        )
        return {"signed": True, "all_signed": all_signed}

    # ---------------- Status transitions ----------------
    @swms_router.post("/swms/{swms_id}/status")
    async def set_status(swms_id: str, body: dict, current_user=Depends(get_current_user)):
        new_status = body.get("status")
        allowed = {"draft", "awaiting_signatures", "signed", "in_use", "reviewed", "archived"}
        if new_status not in allowed:
            raise HTTPException(400, f"Invalid status. Must be one of {allowed}")
        doc = await app_db.swms.find_one(
            {"swms_id": swms_id, "user_id": current_user.user_id}
        )
        if not doc:
            raise HTTPException(404, "SWMS not found")
        now = _now_iso()
        update = {"status": new_status, "updated_at": now}
        if new_status == "reviewed":
            update["last_reviewed_at"] = now
            update["review_date"] = (_now() + timedelta(days=365)).date().isoformat()
        await app_db.swms.update_one(
            {"swms_id": swms_id, "user_id": current_user.user_id},
            {"$set": update,
             "$push": {"audit_log": {"at": now, "user_id": current_user.user_id,
                                      "user_name": getattr(current_user, "name", None),
                                      "event": "status_change",
                                      "detail": f"{doc.get('status')} → {new_status}"}}},
        )
        return {"status": new_status}

    @swms_router.post("/swms/{swms_id}/link-incident")
    async def link_incident(swms_id: str, body: dict, current_user=Depends(get_current_user)):
        """Mark SWMS as locked by notifiable incident (2 year retention from
        incident date). Used by the incident workflow when an investigation
        linked a SWMS + the incident was deemed notifiable."""
        incident_id = body.get("incident_id")
        notifiable = bool(body.get("notifiable", True))
        doc = await app_db.swms.find_one(
            {"swms_id": swms_id, "user_id": current_user.user_id}
        )
        if not doc:
            raise HTTPException(404, "SWMS not found")
        now = _now_iso()
        update = {
            "linked_incident_id": incident_id,
            "updated_at": now,
            "requires_review": True,
        }
        if notifiable:
            update["locked_by_incident"] = True
            update["retention_until"] = (_now() + timedelta(days=2 * 365)).isoformat()
        await app_db.swms.update_one(
            {"swms_id": swms_id, "user_id": current_user.user_id},
            {"$set": update,
             "$push": {"audit_log": {"at": now, "event": "linked_incident",
                                      "detail": f"Linked to incident {incident_id}, notifiable={notifiable}"}}},
        )
        return {"linked": True, "locked": notifiable}

    # ---------------- PDF ----------------
    @swms_router.get("/swms/{swms_id}/pdf")
    async def swms_pdf(swms_id: str, current_user=Depends(get_current_user)):
        doc = await app_db.swms.find_one(
            {"swms_id": swms_id, "user_id": current_user.user_id}, {"_id": 0}
        )
        if not doc:
            raise HTTPException(404, "SWMS not found")
        try:
            from weasyprint import HTML
        except Exception:
            raise HTTPException(503, "PDF engine unavailable")
        html = render_swms_html(doc)
        def _render():
            return HTML(string=html).write_pdf()
        pdf_bytes = await asyncio.to_thread(_render)
        return Response(
            content=pdf_bytes, media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{doc.get("reference")}.pdf"'},
        )

    return swms_router


# ----------------------------------------------------------------
# HTML template for PDF rendering — Safe Work Australia template layout
# ----------------------------------------------------------------

def _hz_pill(code: str) -> str:
    if not code:
        return ""
    label = HRCW_BY_CODE.get(code, code)
    return f'<span class="hrcw-pill">{label}</span>'


def _hierarchy_pill(level: str) -> str:
    colour = HIERARCHY_COLOURS.get(level, "#555")
    return (f'<span class="hier-pill" style="background:{colour}">'
            f'{(level or "").upper()}</span>')


def _escape(s: Any) -> str:
    if s is None:
        return ""
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def render_swms_html(doc: dict) -> str:
    state = doc.get("site_state", "NSW")
    reg = STATE_REGULATORS.get(state, {"name": "State WHS Regulator", "phone": ""})
    ref = _escape(doc.get("reference", ""))
    now_str = _now().strftime("%d %b %Y")
    company = _escape(doc.get("company_name", ""))
    ticked = set(doc.get("hrcw_codes", []) or [])

    # Build HRCW grid (2 columns, all 20 with tick state)
    hrcw_html = ""
    for c in HRCW_CATEGORIES:
        mark = "☒" if c["code"] in ticked else "☐"
        cls = "hrcw-ticked" if c["code"] in ticked else "hrcw-un"
        hrcw_html += f'<div class="hrcw-item {cls}"><span class="box">{mark}</span> {_escape(c["label"])}</div>'

    # Rows
    rows_html = ""
    for r in (doc.get("rows") or []):
        hazards_html = "".join(f"<li>{_escape(h)}</li>" for h in (r.get("hazards") or []))
        controls_html = ""
        # Sort controls by hierarchy (elim→ppe)
        ordered = sorted((r.get("controls") or []),
                         key=lambda c: HIERARCHY_LEVELS.index(c.get("level", "admin")) if c.get("level") in HIERARCHY_LEVELS else 99)
        for c in ordered:
            controls_html += (
                f'<div class="ctrl">{_hierarchy_pill(c.get("level","admin"))}'
                f' <span class="ctrl-text">{_escape(c.get("text",""))}</span></div>'
            )
        rows_html += f"""
        <tr>
          <td class="c1"><strong>{_escape(r.get('task',''))}</strong>{_hz_pill(r.get('hrcw_code'))}</td>
          <td class="c2"><ul>{hazards_html}</ul></td>
          <td class="c3">{controls_html}</td>
        </tr>"""

    # PPE + training checklist
    def checklist(items, selected):
        sel = set(selected or [])
        out = ""
        for item in items:
            tick = "☒" if item in sel else "☐"
            out += f'<div class="ck"><span class="box">{tick}</span> {_escape(item)}</div>'
        return out

    ppe_html = checklist(STANDARD_PPE, doc.get("ppe"))
    training_html = checklist(STANDARD_TRAINING, doc.get("training"))

    # Plant rows
    plant_html = ""
    for p in (doc.get("plant") or []):
        plant_html += (
            f"<tr><td>{_escape(p.get('name',''))}</td>"
            f"<td>{_escape(p.get('registration') or p.get('serial') or '')}</td>"
            f"<td>{'Yes' if p.get('prestart_check') else 'No'}</td></tr>"
        )
    if not plant_html:
        plant_html = '<tr><td colspan="3" class="empty">No plant / equipment listed.</td></tr>'

    # Workers sign-on
    workers_html = ""
    for w in (doc.get("workers") or []):
        sig_cell = "_______________________"
        date_cell = "___/___/______"
        if w.get("signed"):
            sig_data = w.get("signature_data") or ""
            if sig_data.startswith("data:image"):
                sig_cell = f'<img src="{sig_data}" class="sig-img" alt="sig" />'
            else:
                sig_cell = f'<em>{_escape(sig_data or w.get("name"))}</em>'
            date_cell = _escape((w.get("signed_at") or "")[:10])
        workers_html += (
            f"<tr><td>{_escape(w.get('name',''))}</td>"
            f"<td>{sig_cell}</td><td>{date_cell}</td></tr>"
        )
    if not workers_html:
        for _ in range(5):
            workers_html += "<tr><td>&nbsp;</td><td>_______________________</td><td>___/___/______</td></tr>"

    # Revisions
    rev_html = ""
    for v in (doc.get("revisions") or []):
        rev_html += (f"<tr><td>V{_escape(v.get('version'))}</td>"
                     f"<td>{_escape((v.get('at') or '')[:10])}</td>"
                     f"<td>{_escape(v.get('by'))}</td>"
                     f"<td>{_escape(v.get('nature'))}</td></tr>")

    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>SWMS {ref}</title>
<style>
  @page {{ size: A4; margin: 15mm 12mm 18mm 12mm;
           @bottom-center {{ content: "{company} · {ref} · Generated by SafeTradie · Page " counter(page) " of " counter(pages);
                             font-family: Arial, sans-serif; font-size: 8pt; color: #666; }} }}
  body {{ font-family: Arial, Helvetica, sans-serif; color: #0a0a0a; font-size: 10pt; line-height: 1.45; }}
  h1 {{ font-size: 22pt; font-weight: 900; letter-spacing: -0.02em; margin: 0; text-align: center; }}
  h2 {{ font-size: 13pt; font-weight: 900; letter-spacing: -0.01em; margin: 18px 0 8px; padding-top: 8px; border-top: 2px solid #0a0a0a; }}
  h3 {{ font-size: 11pt; font-weight: 700; margin: 12px 0 4px; }}
  .subheading {{ text-align: center; font-size: 12pt; color: #555; margin: 4px 0 18px; }}
  .ref-line {{ text-align: center; font-size: 10pt; letter-spacing: 0.1em; color: #444; margin-bottom: 12px; }}
  .legal {{ background: #fff7cc; border: 2px solid #0a0a0a; padding: 10px 14px; font-size: 9pt; margin: 16px 0; }}
  .legal strong {{ display: block; font-size: 10pt; margin-bottom: 4px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 9.5pt; }}
  th, td {{ border: 1px solid #0a0a0a; padding: 6px 8px; vertical-align: top; }}
  th {{ background: #0a0a0a; color: #ffcc00; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.05em; }}
  th .sub {{ display: block; text-transform: none; color: #fff; font-weight: 400; font-size: 7.5pt; margin-top: 2px; }}
  .biz-table td.k {{ width: 18%; background: #f6f6f6; font-weight: 700; font-size: 9pt; }}
  .biz-table td.v {{ width: 32%; font-size: 9pt; }}
  .hrcw-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 3px 16px; margin: 6px 0 4px; }}
  .hrcw-item {{ font-size: 9pt; padding: 2px 0; }}
  .hrcw-ticked {{ font-weight: 700; }}
  .hrcw-un {{ color: #666; }}
  .box {{ display: inline-block; width: 14px; font-family: monospace; font-size: 11pt; }}
  .rows-table td.c1 {{ width: 28%; }}
  .rows-table td.c2 {{ width: 30%; }}
  .rows-table td.c3 {{ width: 42%; }}
  .rows-table tr:nth-child(even) td {{ background: #f9f9f9; }}
  .rows-table ul {{ margin: 0; padding-left: 16px; }}
  .hrcw-pill {{ display: inline-block; background: #fef3c7; color: #78350f; border: 1px solid #b45309; font-size: 7.5pt; font-weight: 700; padding: 1px 6px; margin-top: 4px; letter-spacing: 0.04em; }}
  .ctrl {{ margin: 4px 0; font-size: 9pt; line-height: 1.4; }}
  .hier-pill {{ display: inline-block; color: white; font-size: 7pt; font-weight: 900; padding: 1px 5px; letter-spacing: 0.06em; margin-right: 4px; vertical-align: middle; }}
  .ctrl-text {{ vertical-align: middle; }}
  .ck {{ font-size: 9pt; padding: 2px 0; display: inline-block; width: 48%; }}
  .emergency {{ background: #e0f2fe; border: 1px solid #075985; padding: 10px 14px; font-size: 9.5pt; }}
  .emergency strong {{ display: inline-block; width: 170px; }}
  .sig-img {{ max-height: 34px; max-width: 140px; }}
  .footer-note {{ font-size: 8pt; color: #666; margin-top: 18px; font-style: italic; border-top: 1px solid #ccc; padding-top: 8px; }}
  .empty {{ text-align: center; color: #888; font-style: italic; padding: 10px; }}
</style></head><body>

<h1>SAFE WORK METHOD STATEMENT</h1>
<div class="subheading">For High Risk Construction Work</div>
<div class="ref-line">{ref} · Version {_escape(doc.get('version', 1))} · Generated {now_str}</div>

<div class="legal"><strong>LEGAL NOTICE</strong>
Work must be performed in accordance with this SWMS. This SWMS must be kept
accessible for each relevant worker and available for inspection until the high
risk construction work is completed. If the SWMS is revised, every version
must be kept. If a notifiable incident occurs in relation to this SWMS, it
must be kept for at least 2 years from the date of the incident.</div>

<h2>Business and Job Details</h2>
<table class="biz-table">
  <tr><td class="k">Company name</td><td class="v">{_escape(doc.get('company_name',''))}</td>
      <td class="k">Work activity</td><td class="v">{_escape(doc.get('work_activity',''))}</td></tr>
  <tr><td class="k">ABN</td><td class="v">{_escape(doc.get('abn',''))}</td>
      <td class="k">Workplace location</td><td class="v">{_escape(doc.get('site_location',''))}</td></tr>
  <tr><td class="k">Business address</td><td class="v">{_escape(doc.get('business_address',''))}</td>
      <td class="k">Site type</td><td class="v">{_escape(doc.get('site_type',''))}</td></tr>
  <tr><td class="k">Business phone</td><td class="v">{_escape(doc.get('business_phone',''))}</td>
      <td class="k">Start date</td><td class="v">{_escape(doc.get('start_date',''))}</td></tr>
  <tr><td class="k">Works manager</td><td class="v">{_escape(doc.get('works_manager_name',''))} · {_escape(doc.get('works_manager_phone',''))}</td>
      <td class="k">Principal contractor</td><td class="v">{_escape(doc.get('pc_business','') or '—')}</td></tr>
</table>

<h2>High Risk Construction Work Categories Covered</h2>
<div class="hrcw-grid">{hrcw_html}</div>

<h2>Compliance and Review</h2>
<table class="biz-table">
  <tr><td class="k">Compliance responsibility</td><td class="v" colspan="3">{_escape(doc.get('compliance_responsible',''))}</td></tr>
  <tr><td class="k">Compliance measures</td><td class="v" colspan="3">{_escape(doc.get('compliance_measures',''))}</td></tr>
  <tr><td class="k">Review responsibility</td><td class="v" colspan="3">{_escape(doc.get('review_responsible',''))}</td></tr>
  <tr><td class="k">Review measures</td><td class="v" colspan="3">{_escape(doc.get('review_measures',''))}</td></tr>
  <tr><td class="k">Review date</td><td class="v">{_escape(doc.get('review_date',''))}</td>
      <td class="k">HSR consulted</td><td class="v">{_escape(doc.get('hsr_name','') or '—')}</td></tr>
</table>

<h2>Tasks, Hazards and Controls</h2>
<table class="rows-table">
  <thead><tr>
    <th>What are the tasks involved?<span class="sub">In logical order</span></th>
    <th>What are the hazards and risks?<span class="sub">To workers or public</span></th>
    <th>What are the control measures?<span class="sub">Top-down per Hierarchy of Controls</span></th>
  </tr></thead>
  <tbody>{rows_html or '<tr><td colspan="3" class="empty">No tasks listed.</td></tr>'}</tbody>
</table>

<h2>Plant and Equipment</h2>
<table><thead><tr><th>Item</th><th>Registration / Serial</th><th>Pre-start check required</th></tr></thead>
<tbody>{plant_html}</tbody></table>

<h2>PPE Required</h2>
<div>{ppe_html}</div>

<h2>Training and Licences Required</h2>
<div>{training_html}</div>

<h2>Emergency Procedures</h2>
<div class="emergency">
<div><strong>Emergency contact:</strong> {_escape(doc.get('emergency_contact','') or '—')}</div>
<div><strong>Nearest hospital:</strong> {_escape(doc.get('nearest_hospital','') or '—')}</div>
<div><strong>Assembly point:</strong> {_escape(doc.get('assembly_point','') or '—')}</div>
<div><strong>First aider on site:</strong> {_escape(doc.get('first_aider','') or '—')}</div>
<div><strong>State WHS Regulator:</strong> {_escape(reg['name'])} — {_escape(reg['phone'])}</div>
<div><strong>Emergency services:</strong> 000</div>
</div>

<h2>Worker Acknowledgement</h2>
<p style="font-size:9.5pt; margin-top:0;">By signing below, each worker confirms they have read, understood and received a copy of this SWMS. They understand the hazards identified and the controls in place, and know what they must do to safely carry out the high risk construction work described in this SWMS. <strong>Workers understand work must stop if this SWMS is not being followed.</strong></p>
<table><thead><tr><th>Name of Worker</th><th>Signature</th><th>Date Received</th></tr></thead>
<tbody>{workers_html}</tbody></table>

<h2>Revision History</h2>
<table><thead><tr><th>Version</th><th>Date</th><th>Revised by</th><th>Nature of revision</th></tr></thead>
<tbody>{rev_html or '<tr><td colspan="4" class="empty">No revisions yet.</td></tr>'}</tbody></table>

<div class="footer-note">
This SWMS was generated using SafeTradie. It must be reviewed and tailored on site before HRCW commences.
SafeTradie does not provide legal or professional advice. All documents must be tailored to your specific workplace
before being relied upon. SafeTradie Pty Ltd accepts no liability for the accuracy or completeness of generated documents.
</div>

</body></html>"""
