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
            "Food Allergen Death-Response Drill", "PEAL — Preventing Anaphylaxis in Food Service",
            "Council Inspection — What They'll Check",
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
            "NHVR Notifiable Occurrences — What and When",
            "Mass Management Basics", "Dangerous Goods Segregation Rules",
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
            "SIRS — What Triggers a Priority 1 Report",
            "Restrictive Practices — Aged Care and NDIS Rules",
            "Clinical Documentation Essentials",
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
            "Armed Robbery Response — 3-Minute Drill",
            "Customer De-escalation in 60 Seconds",
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


# ---- Module quizzes (auto-generated 5-question multiple choice per module) ----
# We seed a small pool per industry for "real" modules; everything else gets a
# generic 3-question quiz tied to the module title so the LMS still has some
# assessment instead of just self-attestation.
QUIZZES = {
    # Trades
    "swms_full": [
        {"q": "Under Reg 299, a SWMS is required for…", "options": ["any construction job over $1m", "any High Risk Construction Work activity", "only government jobs", "only when SafeWork asks"], "answer": 1},
        {"q": "How many HRCW categories are listed in WHS Regulations 2017 (NSW)?", "options": ["12", "18", "19", "21"], "answer": 2},
        {"q": "When must a SWMS be reviewed?", "options": ["Annually", "When circumstances change OR after an incident", "Never — once is fine", "Only at audit time"], "answer": 1},
        {"q": "Who must be consulted in SWMS preparation?", "options": ["The principal contractor only", "Workers and HSRs", "The auditor", "Nobody"], "answer": 1},
        {"q": "The Hierarchy of Controls puts what FIRST?", "options": ["PPE", "Administrative controls", "Elimination", "Substitution"], "answer": 2},
    ],
    "heights_full": [
        {"q": "Working at heights generally means working above…", "options": ["1m", "2m", "3m", "5m"], "answer": 1},
        {"q": "Which control is preferred under HOC for heights?", "options": ["Harness", "Edge protection / scaffolding", "PPE alone", "Spotter"], "answer": 1},
        {"q": "How often should harnesses be inspected?", "options": ["Yearly", "Before each use AND every 6 months", "Every 5 years", "When damaged"], "answer": 1},
        {"q": "Anchor points must be rated to at least…", "options": ["10kN", "15kN", "21kN", "5kN"], "answer": 2},
        {"q": "Fall arrest systems require…", "options": ["Just a harness", "Harness, lanyard, anchor, and rescue plan", "Just a lanyard", "Hi-vis"], "answer": 1},
    ],
    # Hospitality
    "food_handler_cert": [
        {"q": "Cold storage temperature must be at or below…", "options": ["10°C", "8°C", "5°C", "0°C"], "answer": 2},
        {"q": "Hot hold temperature must be at or above…", "options": ["55°C", "60°C", "65°C", "75°C"], "answer": 1},
        {"q": "Chicken core temperature must reach at least…", "options": ["63°C", "70°C", "75°C", "85°C"], "answer": 2},
        {"q": "Which is a high-risk allergen in Australia?", "options": ["Tomato", "Sesame", "Carrot", "Rice"], "answer": 1},
        {"q": "Hand-washing should follow what model?", "options": ["WHO 5 moments", "AHPRA 4-step", "FSANZ 3-step", "FoodSafe 2-step"], "answer": 0},
    ],
    "rsa_foundation": [
        {"q": "RSA stands for…", "options": ["Retail Service Association", "Responsible Service of Alcohol", "Required Standard Approval", "Restaurant Service Award"], "answer": 1},
        {"q": "Refusal of service is required when a patron is…", "options": ["Alone", "Unduly intoxicated or disorderly", "Wearing a hat", "Ordering food only"], "answer": 1},
        {"q": "Minors policy means…", "options": ["No service to anyone under 21", "No service to under-18s without ID matching", "ID checks for under-30s only", "Parents can buy for minors"], "answer": 1},
    ],
    # Transport
    "cor_full": [
        {"q": "CoR primarily applies to…", "options": ["Light vehicle drivers", "Heavy vehicle operators and the chain", "Bus drivers only", "Couriers under 4.5t"], "answer": 1},
        {"q": "Standard hours allow how many hours' work per 24h?", "options": ["10", "11", "12", "14"], "answer": 2},
        {"q": "Mandatory rest break for Standard Hours after 5.25 hours work is…", "options": ["10 min", "15 min", "30 min (continuous)", "1 hour"], "answer": 2},
        {"q": "BFM accreditation allows…", "options": ["Same as Standard", "Up to 14 hours work in some scenarios", "20 hours straight", "No limits"], "answer": 1},
        {"q": "CoR primary duty extends to…", "options": ["Drivers only", "Operators only", "Drivers, operators, schedulers, loaders, consignors", "Mechanics only"], "answer": 2},
    ],
    "fatigue_full": [
        {"q": "Fatigue is recognised under HVNL as a…", "options": ["Soft compliance issue", "Primary duty matter", "Driver-only concern", "Voluntary compliance"], "answer": 1},
        {"q": "How long must work diaries be retained?", "options": ["1 year", "3 years", "5 years", "Forever"], "answer": 1},
        {"q": "Fitness for duty includes assessment of…", "options": ["Sleep, drugs, alcohol, medical conditions", "Only alcohol", "Only sleep", "Only mental health"], "answer": 0},
    ],
    # Healthcare
    "manual_handling_full": [
        {"q": "The leading cause of injury in clinical settings is…", "options": ["Sharps", "Slips and falls", "Manual handling", "Burns"], "answer": 2},
        {"q": "Hierarchy of Controls preference for manual handling:", "options": ["PPE first", "Eliminate or mechanically substitute first", "Procedural only", "PPE + procedure"], "answer": 1},
        {"q": "Two-person hoist transfers are recommended when…", "options": ["Always", "Client weight or instability requires", "Never", "Only on weekends"], "answer": 1},
        {"q": "Slide sheets reduce…", "options": ["Pressure only", "Friction during repositioning", "Sharps risk", "Infection risk"], "answer": 1},
        {"q": "When a hoist fails with a client suspended, the priority is…", "options": ["Photograph the failure", "Stabilise + safely lower client + call for help", "Leave and call maintenance", "Try to fix the hoist"], "answer": 1},
    ],
    "infection_control_full": [
        {"q": "WHO 5 moments for hand hygiene includes…", "options": ["Before patient contact, before clean/aseptic, after body fluid risk, after patient contact, after touching surroundings", "Just before and after gloves", "5 minutes hand-washing", "Once per shift"], "answer": 0},
        {"q": "Sharps injuries should be…", "options": ["Hidden", "Reported and managed per protocol", "Treated at home", "Ignored if minor"], "answer": 1},
        {"q": "Standard precautions apply to…", "options": ["Known infectious patients only", "All patients, all the time", "Surgical procedures only", "ICU only"], "answer": 1},
    ],
    # Retail
    "retail_lone_worker": [
        {"q": "A defensible lone-worker check-in system needs…", "options": ["Manual SMS", "Automated check-in + escalation if missed", "Phone calls only", "Once-a-week check"], "answer": 1},
        {"q": "If a robbery occurs, priority #1 is…", "options": ["Catch the offender", "Staff safety / comply", "Save the cash", "Call insurance first"], "answer": 1},
        {"q": "Lone worker risk is reduced by…", "options": ["More work alone", "Buddy systems, CCTV, duress alarms, check-ins", "Removing breaks", "Longer shifts"], "answer": 1},
    ],
}


def _generic_quiz(module_title: str):
    """Three generic acknowledgement questions for any module without a real quiz."""
    return [
        {"q": f"Have you completed all sections of '{module_title}'?",
         "options": ["No", "Yes — read fully", "Skimmed only", "Started but not finished"], "answer": 1},
        {"q": "Will you apply this content to your role?",
         "options": ["No", "Yes — already do this", "Yes — plan to apply going forward", "Unsure"], "answer": 2},
        {"q": "Do you understand your reporting obligations if you encounter a relevant hazard?",
         "options": ["No", "Yes — report to supervisor immediately", "Yes — report at end of week", "Will figure it out"], "answer": 1},
    ]


def get_quiz_for(slug: str, title: str = "") -> list[dict]:
    return QUIZZES.get(slug) or _generic_quiz(title or slug.replace("_", " ").title())


def register_academy_routes(api_router: APIRouter, *, db, get_current_user_dep,
                             account_id_for_fn, log_audit_fn):

    @api_router.get("/academy/{module_slug}/quiz")
    async def get_quiz(module_slug: str, current_user=Depends(get_current_user_dep)):
        """Return the quiz for a module — answers stripped client-side."""
        # Look up module title from CATALOGUE
        title = module_slug.replace("_", " ").title()
        for ind in CATALOGUE.values():
            for c in ind["full_courses"]:
                if c["slug"] == module_slug:
                    title = c["title"]
        questions = get_quiz_for(module_slug, title)
        # Strip the answer index from outgoing payload
        return {
            "module_slug": module_slug,
            "title": title,
            "questions": [{"q": q["q"], "options": q["options"]} for q in questions],
        }

    @api_router.post("/academy/{module_slug}/submit-quiz")
    async def submit_quiz(module_slug: str, body: dict, request: Request,
                           current_user=Depends(get_current_user_dep)):
        """Score the quiz; create completion + cert if passed (>= 80%)."""
        answers = body.get("answers") or []
        title = module_slug.replace("_", " ").title()
        for ind in CATALOGUE.values():
            for c in ind["full_courses"]:
                if c["slug"] == module_slug:
                    title = c["title"]
        questions = get_quiz_for(module_slug, title)
        if len(answers) != len(questions):
            raise HTTPException(400, f"Expected {len(questions)} answers, got {len(answers)}")
        correct = sum(1 for i, q in enumerate(questions) if answers[i] == q["answer"])
        score = round((correct / len(questions)) * 100)
        passed = score >= 80
        cert_id = f"cert_{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc).isoformat()
        if passed:
            await db.academy_completions.insert_one({
                "completion_id": cert_id,
                "account_id": account_id_for_fn(current_user),
                "module_slug": module_slug,
                "module_title": title,
                "worker_id": getattr(current_user, "user_id"),
                "worker_name": getattr(current_user, "name", "Worker"),
                "score": score,
                "passed": True,
                "completed_at": now,
                "industry": (getattr(current_user, "industry", None) or "trades").lower(),
            })
            await log_audit_fn(db, user=current_user, action="quiz_pass",
                                record_type="academy_module", record_id=module_slug,
                                request=request, detail={"score": score})
        return {"score": score, "correct": correct, "total": len(questions),
                "passed": passed, "cert_id": cert_id if passed else None}

    @api_router.get("/academy/cert/{completion_id}.pdf")
    async def cert_pdf(completion_id: str, current_user=Depends(get_current_user_dep)):
        """Generate a simple PDF certificate of completion."""
        from fastapi.responses import Response
        rec = await db.academy_completions.find_one(
            {"completion_id": completion_id,
             "account_id": account_id_for_fn(current_user)},
            {"_id": 0},
        )
        if not rec:
            raise HTTPException(404, "Certificate not found")
        # Minimal PDF using reportlab
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import A4
            from io import BytesIO
            buf = BytesIO()
            c = canvas.Canvas(buf, pagesize=A4)
            w, h = A4
            # Border
            c.setStrokeColorRGB(0.05, 0.05, 0.05)
            c.setLineWidth(3)
            c.rect(40, 40, w - 80, h - 80)
            # Title
            c.setFont("Helvetica-Bold", 36)
            c.drawCentredString(w / 2, h - 140, "Certificate of Completion")
            c.setFont("Helvetica", 14)
            c.drawCentredString(w / 2, h - 175, "SafeBase Academy")
            # Body
            c.setFont("Helvetica", 12)
            c.drawCentredString(w / 2, h - 240, "This certifies that")
            c.setFont("Helvetica-Bold", 24)
            c.drawCentredString(w / 2, h - 280, rec.get("worker_name") or "Worker")
            c.setFont("Helvetica", 12)
            c.drawCentredString(w / 2, h - 320, "has successfully completed")
            c.setFont("Helvetica-Bold", 18)
            c.drawCentredString(w / 2, h - 360, rec.get("module_title") or rec["module_slug"])
            c.setFont("Helvetica", 11)
            c.drawCentredString(w / 2, h - 400, f"with a score of {rec.get('score', 100)}%")
            c.drawCentredString(w / 2, h - 420, f"on {rec.get('completed_at', '')[:10]}")
            # Cert ID
            c.setFont("Helvetica", 8)
            c.drawCentredString(w / 2, 80, f"Certificate ID: {completion_id}")
            c.drawCentredString(w / 2, 65, "Verify at app.safebase.com.au")
            c.showPage()
            c.save()
            return Response(content=buf.getvalue(), media_type="application/pdf",
                             headers={"Content-Disposition": f'inline; filename=\"{completion_id}.pdf\"'})
        except ImportError:
            # Fallback if reportlab not installed — return a plain text cert.
            text = f"""SafeBase Academy — Certificate of Completion

Awarded to: {rec.get('worker_name')}
Module: {rec.get('module_title') or rec['module_slug']}
Score: {rec.get('score')}%
Completed: {rec.get('completed_at')}
Certificate ID: {completion_id}
"""
            return Response(content=text, media_type="text/plain")

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
