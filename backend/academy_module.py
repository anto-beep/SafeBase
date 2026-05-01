"""
SafeBase Academy — industry-tagged module catalogue (Part 5).

Each module: industry-specific. The Academy UI calls /api/academy/catalogue
with the user's industry, gets back microlearning + full courses, and tracks
completion in `academy_completions`. Completion certificates auto-link to
the worker profile and audit pack.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request


CATALOGUE = {
    "trades": {
        "microlearning": [
            "Working at Heights — Hazard Awareness",
            "Electrical Safety Basics",
            "Plumbing Safety — Common Hazards",
            "Gas Safety Awareness",
            "Asbestos Awareness (Construction)",
            "Manual Handling for Tradies",
            "Hazardous Chemicals in Construction",
            "Traffic Management Awareness",
            "Plant and Equipment Safety",
            "Confined Space Awareness",
            "SWMS — What It Is and Why It Matters",
            "Incident Reporting — How and When",
            "Near Miss Reporting",
            "PPE Selection and Use",
            "Heat Stress in Outdoor Work",
            "Mental Health in Construction",
            "Psychosocial Safety Awareness",
        ],
        "full_courses": [
            {"slug": "heights_full", "title": "Working at Heights — Full Compliance Course", "modules": [
                "Legal requirements (HRCW)", "Fall prevention hierarchy",
                "Edge protection systems", "Harness and lanyard use", "Scaffold safety",
            ]},
            {"slug": "confined_space_full", "title": "Confined Space Entry — Full Course", "modules": [
                "Legal requirements", "Atmospheric testing", "Entry permits", "Emergency procedures",
            ]},
            {"slug": "electrical_full", "title": "Electrical Safety — Full Course", "modules": [
                "Electrical hazards", "Isolation and LOTO", "Working near live conductors", "Test and tag requirements",
            ]},
            {"slug": "swms_full", "title": "SWMS — Preparation and Compliance", "modules": [
                "Legal basis (Reg 299)", "HRCW categories", "Hazard identification",
                "Hierarchy of controls", "Worker consultation", "Monitoring and review",
            ]},
            {"slug": "supervisor_whs", "title": "WHS for Supervisors and Foremen", "modules": [
                "Supervisor WHS duties", "Incident management", "Risk management",
                "Worker consultation", "Contractor management",
            ]},
        ],
    },
    "hospitality": {
        "microlearning": [
            "Food Handler Safety Basics", "Temperature Control — The Rules",
            "Cross-Contamination Prevention", "Allergen Awareness",
            "Personal Hygiene for Food Handlers", "Cleaning and Sanitising Procedures",
            "Responsible Service of Alcohol", "Knife Safety in the Kitchen",
            "Burns and Heat Injury Prevention", "Slip and Trip Prevention",
            "Manual Handling in the Kitchen", "Chemical Safety (Cleaning Products)",
            "Working in Extreme Heat (Kitchen)", "Incident Reporting in a Venue",
            "Psychosocial Safety in Hospitality (Bullying and Harassment)",
            "Mental Health in Hospitality",
        ],
        "full_courses": [
            {"slug": "food_handler_cert", "title": "Food Handler Certification Course",
             "note": "Supports compliance with Standard 3.2.2A. Does not replace formal Food Handler qualification required by your state/territory.",
             "modules": ["Food safety laws in Australia", "Food contamination and hazards",
                         "Temperature control", "Cross-contamination", "Allergen management",
                         "Cleaning and sanitising", "Personal hygiene", "Food safety records"]},
            {"slug": "fss_foundation", "title": "Food Safety Supervisor Foundation Course",
             "note": "Supports the FSS role. State-specific FSS certification must be obtained from a registered training organisation.",
             "modules": ["Role and responsibilities", "HACCP principles", "Food safety programs",
                         "Managing a food safety team", "Council inspections", "Incident management"]},
            {"slug": "rsa_foundation", "title": "Responsible Service of Alcohol (RSA) Foundation Course",
             "note": "Supports RSA awareness. State-specific RSA certification must be obtained from a registered training organisation.",
             "modules": ["Liquor laws in Australia", "Identifying intoxication", "Refusal of service",
                         "Minors policy", "Incident recording"]},
            {"slug": "venue_manager_whs", "title": "WHS for Venue Managers", "modules": [
                "WHS duties in hospitality", "Risk management", "Incident management",
                "Worker consultation", "Contractor management",
            ]},
        ],
    },
    "transport": {
        "microlearning": [
            "Chain of Responsibility — Overview", "Fatigue — Signs, Risks and Your Obligations",
            "Load Restraint Basics", "Pre-Trip Inspection Essentials",
            "Drug and Alcohol Awareness in Transport", "Dangerous Goods Awareness",
            "Safe Loading and Unloading", "Manual Handling in a Warehouse",
            "Forklift Safety Awareness", "Driver Wellness and Mental Health",
            "Incident Reporting in Transport", "CoR for Schedulers and Dispatchers",
            "CoR for Loaders and Packers",
            "Psychosocial Safety in Transport (Trucker's Helpline: 0439 263 001)",
        ],
        "full_courses": [
            {"slug": "cor_full", "title": "Chain of Responsibility — Full Compliance Course", "modules": [
                "What is CoR and who is in the chain", "The primary duty under HVNL",
                "Fatigue management obligations", "Speed management",
                "Mass, dimension and load", "Vehicle standards",
                "Scheduling and dispatch", "Record-keeping requirements",
                "Penalties and prosecutions",
            ]},
            {"slug": "fatigue_full", "title": "Fatigue Management for Heavy Vehicle Drivers — Full Course", "modules": [
                "HVNL fatigue laws", "Standard hours requirements",
                "Work diary completion", "BFM and AFM overview",
                "Signs and causes of fatigue", "Fitness for duty obligations",
            ]},
            {"slug": "load_restraint_full", "title": "Load Restraint — Full Course (Load Restraint Guide 2025)", "modules": [
                "Legal framework", "Load restraint principles",
                "Restraint methods by cargo type", "Performance standards",
                "Practical application",
            ]},
            {"slug": "scheduler_cor", "title": "CoR for Schedulers and Fleet Managers", "modules": [
                "Scheduler's CoR obligations", "Fatigue-safe scheduling",
                "Contract requirements", "Documentation and records",
                "Managing driver fitness",
            ]},
        ],
    },
    "healthcare": {
        "microlearning": [
            "Manual Handling for Healthcare Workers", "Patient Transfer Safety Basics",
            "Infection Control Essentials", "Aggressive Behaviour — Early Recognition",
            "Medication Safety Awareness", "Psychosocial Safety in Healthcare",
            "Working Alone in Community Care", "Privacy and Confidentiality",
            "Mandatory Reporting Awareness", "Elder Abuse — Recognition and Reporting",
            "Fatigue in Healthcare Settings", "Mental Health and Resilience for Clinicians",
            "NDIS Worker Obligations Awareness", "Aged Care Quality Standards Overview",
        ],
        "full_courses": [
            {"slug": "manual_handling_full", "title": "Manual Handling for Healthcare — Full Course", "modules": [
                "Legal obligations (Safe Work Australia Model Code)", "Biomechanics of injury",
                "Manual handling risk assessment", "Hoist operation and safety",
                "Patient transfer techniques", "Slide sheet and transfer aids",
                "Client handling policies",
            ]},
            {"slug": "violence_aggression_full", "title": "Violence and Aggression Management in Healthcare — Full Course", "modules": [
                "Legal framework", "Risk factors and prevention",
                "De-escalation techniques", "Physical response protocols",
                "Post-incident support", "Reporting and documentation",
            ]},
            {"slug": "infection_control_full", "title": "Infection Control — Full Course", "modules": [
                "Standard precautions", "PPE selection and use",
                "Hand hygiene (WHO 5 moments)", "Transmission-based precautions",
                "Sharps management", "Outbreak response",
            ]},
            {"slug": "acqsc_full", "title": "Aged Care Quality Standards — Full Course", "modules": [
                "New Aged Care Act 2024", "Standards 1–4", "Standards 5–8",
                "Evidence and documentation", "ACQSC audit preparation",
            ]},
            {"slug": "ndis_full", "title": "NDIS Practice Standards — Full Course", "modules": [
                "NDIS framework overview", "Rights and responsibilities",
                "Safe support delivery", "Documentation and evidence",
                "NDIS Commission audits",
            ]},
        ],
    },
    "retail": {
        "microlearning": [
            "Manual Handling for Retail Staff", "Spill Response — Quick Guide",
            "Safe Ladder Use", "Working Alone Safety",
            "Customer Aggression — Early Response", "Slip and Trip Prevention",
            "Cash Handling Safety", "Emergency Procedures for Retail",
            "Forklift Safety Awareness", "RSA Awareness (liquor retail)",
            "Incident Reporting in Retail", "Psychosocial Safety in Retail",
            "Mental Health — Resources for Retail Workers",
        ],
        "full_courses": [
            {"slug": "retail_team_lead_whs", "title": "WHS for Retail Team Leaders", "modules": [
                "Team leader WHS duties", "Incident management",
                "Hazard identification", "Induction management", "Lone worker management",
            ]},
            {"slug": "retail_manual_handling", "title": "Manual Handling in Retail — Full Course", "modules": [
                "Legal obligations", "Risk factors in retail",
                "Correct technique", "Team lifts and mechanical aids",
                "Reporting musculoskeletal pain",
            ]},
            {"slug": "retail_lone_worker", "title": "Working Alone Safety — Full Course", "modules": [
                "Legal obligations", "Risk assessment for lone work",
                "Check-in systems and procedures", "Emergency procedures when alone",
                "Reporting requirements",
            ]},
        ],
    },
}


def _slugify(s: str) -> str:
    return "_".join("".join(c if c.isalnum() else " " for c in s.lower()).split())


def register_academy_routes(api_router: APIRouter, *, db, get_current_user_dep,
                             account_id_for_fn, log_audit_fn):

    @api_router.get("/academy/catalogue")
    async def get_catalogue(industry: Optional[str] = None,
                             current_user=Depends(get_current_user_dep)):
        target = (industry or getattr(current_user, "industry", None) or "trades").lower()
        if target not in CATALOGUE:
            target = "trades"
        cat = CATALOGUE[target]
        # microlearning normalised to objects with slug
        ml = [{"slug": _slugify(t), "title": t, "duration_minutes": 10, "type": "microlearning"} for t in cat["microlearning"]]
        fc = [{**c, "modules": c["modules"], "type": "full_course",
               "duration_minutes": 60 + 10 * len(c["modules"])} for c in cat["full_courses"]]
        return {
            "industry": target,
            "microlearning": ml,
            "full_courses": fc,
            "total_modules": len(ml) + len(fc),
        }

    @api_router.get("/academy/completions")
    async def list_completions(current_user=Depends(get_current_user_dep)):
        rows = await db.academy_completions.find(
            {"account_id": account_id_for_fn(current_user)}, {"_id": 0},
        ).sort("completed_at", -1).to_list(500)
        return rows

    @api_router.post("/academy/{module_slug}/complete")
    async def mark_complete(module_slug: str, body: dict, request: Request,
                             current_user=Depends(get_current_user_dep)):
        score = body.get("score")
        worker_id = body.get("worker_id") or getattr(current_user, "user_id")
        cert_id = f"cert_{uuid.uuid4().hex[:10]}"
        doc = {
            "completion_id": cert_id,
            "account_id": account_id_for_fn(current_user),
            "module_slug": module_slug,
            "worker_id": worker_id,
            "score": score,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "industry": (getattr(current_user, "industry", None) or "trades").lower(),
        }
        await db.academy_completions.insert_one({**doc})
        await log_audit_fn(db, user=current_user, action="complete",
                            record_type="academy_module", record_id=module_slug,
                            request=request, detail={"worker_id": worker_id, "score": score})
        return doc
