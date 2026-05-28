"""
SafeBase Academy — industry-tagged module catalogue (Stage 1 MVP).

Sourced from the SafeBase Academy Research Report (Feb 2026).
88 modules across 5 industries. Each module carries:
    - regulatory_anchor (Act/Section/COP reference)
    - rto_boundary (bool) + rto_disclaimer (str) for credentials that must be
      issued by a Registered Training Organisation
    - duration_minutes (drives type: microlearning <15, standard 15-30, full_course 30-60)
    - mvp_stage1 (bool) — the 17 "worked" modules shipped with full 5-Q quizzes
    - authoring_standard ("SCORM 1.2 + xAPI") + scorm_package_url (None for now)

Completion writes to academy_completions; certificates are PDF-generated.
SafeBase Academy is NOT an RTO. Where rto_boundary is true the user MUST be
told that the formal credential is issued by an external RTO.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request


RTO_DISCLAIMER_DEFAULT = (
    "SafeBase Academy is not a Registered Training Organisation. This module "
    "provides awareness and refresher training only. The formal credential "
    "must be issued by an RTO."
)

AUTHORING_STANDARD_DEFAULT = "SCORM 1.2 + xAPI"


def _type_for(duration: int) -> str:
    if duration < 15:
        return "microlearning"
    if duration <= 30:
        return "standard"
    return "full_course"


def _mk(slug, title, anchor, duration, *, mvp=False, rto=False, rto_text=None):
    """Build a module dict from compact args."""
    m = {
        "slug": slug,
        "title": title,
        "type": _type_for(duration),
        "duration_minutes": duration,
        "regulatory_anchor": anchor,
        "rto_boundary": rto,
        "mvp_stage1": mvp,
        "authoring_standard": AUTHORING_STANDARD_DEFAULT,
        "scorm_package_url": None,
    }
    if rto:
        m["rto_disclaimer"] = rto_text or RTO_DISCLAIMER_DEFAULT
    return m


# ----------------------------------------------------------------------------
# MODULES — 88 total across 5 industries (per Academy Research Report)
# ----------------------------------------------------------------------------
MODULES = {
    "trades": [
        # # 1 — Stage 1 MVP (RTO boundary: White Card is RTO-issued)
        _mk("trades_general_induction_refresher",
            "General Construction Induction Refresher",
            "CPCCWHS1001 (RTO-issued); model WHS Act", 30, mvp=True, rto=True,
            rto_text="The General Construction Induction (White Card) must be issued by an RTO. This refresher reinforces awareness only."),
        _mk("heights_full",
            "Working at Heights", "WHS Reg 78-80; HRCW item 1", 45, mvp=True),
        _mk("confined_space_full",
            "Confined Space Entry Awareness", "WHS Reg 66-77", 45, mvp=True),
        _mk("swms_full",
            "SWMS Development", "WHS Reg 299", 30, mvp=True),
        _mk("trades_manual_handling",
            "Manual Handling (Construction)", "Hazardous Manual Tasks COP", 25, mvp=True),
        _mk("electrical_full",
            "Electrical Safety on Sites", "AS/NZS 3012; WHS Reg 140-164", 30),
        _mk("trades_asbestos_awareness",
            "Asbestos Awareness", "How to Manage and Control Asbestos COP", 30),
        _mk("trades_hazardous_chemicals_sds",
            "Hazardous Chemicals & SDS", "WHS Reg 339-387", 12),
        _mk("trades_hot_work_permits",
            "Hot Work & Permits", "Construction Work COP", 12),
        _mk("trades_excavation_safety",
            "Excavation Safety", "Excavation Work COP", 30),
        _mk("trades_crane_lifts",
            "Crane Lifts (Rigging/Dogging Awareness)", "Cranes COP", 25),
        _mk("trades_scaffolding_safety",
            "Scaffolding Safety", "Scaffolds COP", 25),
        _mk("trades_plant_equipment_prestart",
            "Plant & Equipment Pre-start", "WHS Reg 213", 10),
        _mk("trades_whs_management_plan",
            "WHS Management Plan Walkthrough", "WHS Reg 309", 45),
        _mk("trades_subcontractor_management",
            "Subcontractor Management & Pre-quals", "Model WHS Act ss.46-47", 30),
        _mk("trades_toolbox_talk",
            "Toolbox Talk Facilitation", "Consultation COP", 10),
        _mk("trades_first_aid_awareness",
            "Construction First Aid Awareness", "First Aid COP", 30),
        _mk("trades_mates_gat",
            "MATES in Construction: General Awareness (GAT)",
            "Managing Psychosocial Hazards COP; MATES network", 25),
    ],
    "hospitality": [
        # Stage 1 MVP modules (1-4)
        _mk("food_handler_cert",
            "Food Safety Supervisor Foundation",
            "Food Standards Code Std 3.2.2A", 45, mvp=True, rto=True,
            rto_text="State-specific Food Safety Supervisor certification must be issued by an RTO. This module supports the FSS role with awareness training only."),
        _mk("hosp_haccp_implementation",
            "HACCP Implementation", "Std 3.2.2 cl.7", 45, mvp=True),
        _mk("hosp_personal_hygiene",
            "Personal Hygiene & Food Handler", "Std 3.2.2 cl.15", 25, mvp=True),
        _mk("hosp_allergen_management",
            "Allergen Management (PEAL-aligned)",
            "Std 1.2.3 + Schedule 9", 30, mvp=True),
        _mk("hosp_temperature_control",
            "Temperature Control", "Std 3.2.2 cl.5-11", 20),
        _mk("hosp_cross_contamination",
            "Cross-Contamination Prevention", "Std 3.2.2 cl.3", 20),
        _mk("hosp_cleaning_sanitising",
            "Cleaning & Sanitising", "Std 3.2.2 cl.20", 20),
        _mk("rsa_foundation",
            "RSA Refresher (Awareness)", "State Liquor Act", 30, rto=True,
            rto_text="Formal RSA certification must be issued by an RTO. This refresher provides awareness only."),
        _mk("hosp_food_recalls_complaints",
            "Food Recalls & Customer Complaints", "Std 3.2.2 cl.13", 20),
        _mk("hosp_kitchen_safety",
            "Kitchen Safety (knives, burns, slips)", "WHS Reg 39-40", 25),
        _mk("hosp_manual_handling",
            "Manual Handling (Hospitality)", "Hazardous Manual Tasks COP", 20),
        _mk("hosp_customer_aggression",
            "Customer Aggression Management",
            "Managing Psychosocial Hazards COP", 30),
        _mk("hosp_first_aid",
            "First Aid in Hospitality", "First Aid COP", 30),
        _mk("hosp_pest_control",
            "Pest Control Awareness", "Std 3.2.2 cl.24", 15),
        _mk("hosp_322a_deepdive",
            "Standard 3.2.2A Compliance Deep-Dive", "Std 3.2.2A", 45),
        _mk("hosp_liquor_licensing",
            "Liquor Licensing Compliance", "State liquor laws", 25),
    ],
    "transport": [
        # Stage 1 MVP modules (1-3)
        _mk("cor_full",
            "Chain of Responsibility Foundation", "HVNL Pt 1A", 45, mvp=True),
        _mk("transport_hv_driver_awareness",
            "Heavy Vehicle Driver Awareness", "HVNL", 30, mvp=True),
        _mk("fatigue_full",
            "Fatigue Management — Standard Hours", "HVNL Ch 6", 30, mvp=True),
        _mk("transport_fatigue_bfm",
            "Fatigue Management — BFM", "NHVAS BFM", 30),
        _mk("transport_fatigue_afm",
            "Fatigue Management — AFM Awareness", "NHVAS AFM", 30),
        _mk("transport_load_restraint",
            "Load Restraint", "NTC Load Restraint Guide", 30),
        _mk("transport_dangerous_goods",
            "Dangerous Goods Transport Awareness", "ADG Code", 45),
        _mk("transport_pretrip_inspection",
            "Pre-Trip Inspection", "HVNL maintenance duty", 15),
        _mk("transport_drug_alcohol",
            "Drug & Alcohol Policy", "HVNL 'fit to drive'", 20),
        _mk("transport_nhvas_hva_transition",
            "NHVAS → HVA Transition", "HVNL 2026 amendments", 30),
        _mk("transport_hva_foundation",
            "Heavy Vehicle Accreditation Foundation", "HVNL 2026", 30),
        _mk("transport_fitness_for_duty",
            "Fitness for Duty (Beyond Fatigue)", "HVNL 'fit to drive'", 25),
        _mk("transport_vehicle_maintenance",
            "Vehicle Maintenance Management",
            "Maintenance Management Standards", 25),
        _mk("transport_incident_response",
            "Incident Response (Transport)", "HVNL notifiable occurrences", 25),
        _mk("transport_mental_health_drivers",
            "Mental Health for Drivers (MATES-aligned)",
            "Managing Psychosocial Hazards COP", 25),
        _mk("transport_cargo_security",
            "Customer/Cargo Security", "CoR + insurer best-practice", 20),
    ],
    "healthcare": [
        # Stage 1 MVP modules (1-2)
        _mk("acqsc_full",
            "Aged Care Quality Standards Overview",
            "Aged Care Act 2024 (Strengthened 7-Standard set)", 45, mvp=True),
        _mk("health_sirs_reporting",
            "SIRS Reporting Foundation",
            "Aged Care Act 2024 s.16 (8 reportable incident types)", 30, mvp=True),
        _mk("ndis_full",
            "NDIS Practice Standards", "NDIS Rules 2018", 45),
        _mk("manual_handling_full",
            "Manual Handling (Clinical)", "Hazardous Manual Tasks COP", 30),
        _mk("infection_control_full",
            "Infection Prevention & Control", "NHMRC Guidelines", 30),
        _mk("health_medication_management",
            "Medication Management", "Aged Care Act 2024 Std 5", 45),
        _mk("health_restrictive_practices",
            "Restrictive Practices Authorisation",
            "NDIS Restrictive Practices Rules 2018 (5 regulated practices)", 45),
        _mk("health_person_centred_care",
            "Person-Centred Care", "Std 1 The individual", 25),
        _mk("health_dementia_care",
            "Dementia Care Essentials", "Std 5", 45),
        _mk("health_aged_care_act_awareness",
            "Aged Care Act 2024 Awareness", "Statement of Rights", 30),
        _mk("health_privacy_confidentiality",
            "Privacy & Confidentiality", "Privacy Act 1988 + APPs", 20),
        _mk("health_open_disclosure",
            "Open Disclosure", "National Open Disclosure Framework", 25),
        _mk("health_clinical_incident_reporting",
            "Clinical Incident Reporting", "Std 5", 25),
        _mk("health_workplace_violence",
            "Workplace Violence in Healthcare",
            "Managing Psychosocial Hazards COP", 30),
        _mk("health_ahpra_compliance",
            "AHPRA Compliance for Practitioners", "National Law", 25),
        _mk("health_lone_worker_community",
            "Lone Worker Safety (Community Care)", "WHS Reg 48", 25),
        _mk("health_first_aid",
            "First Aid in Healthcare", "First Aid COP", 30),
        _mk("health_cultural_safety",
            "Cultural Safety", "Strengthened Std 1", 30),
        _mk("health_lgbtiq_inclusive_care",
            "LGBTIQ+ Inclusive Care", "Std 1", 25),
        _mk("health_elder_abuse",
            "Elder Abuse Awareness", "Aged Care Act 2024", 25),
        _mk("health_qi_program",
            "National Aged Care QI Program",
            "QI Program Manual 4.0 (all 14 indicators)", 30),
        _mk("health_worker_screening",
            "Worker Screening & Code of Conduct",
            "Aged Care Rules 2025 + NDIS Code", 20),
    ],
    "retail": [
        # Stage 1 MVP modules (1-3)
        _mk("retail_whs_team_members",
            "WHS for Retail Team Members", "Model WHS Act", 25, mvp=True),
        _mk("retail_manual_handling",
            "Manual Handling (Retail)", "Hazardous Manual Tasks COP", 20, mvp=True),
        _mk("retail_lone_worker",
            "Lone Worker Safety", "WHS Reg 48", 30, mvp=True),
        _mk("retail_customer_aggression",
            "Customer Aggression De-escalation",
            "Managing Psychosocial Hazards COP; SAFE framework", 30),
        _mk("retail_working_alone_after_hours",
            "Working Alone & After Hours", "WHS Reg 48", 25),
        _mk("retail_cash_handling",
            "Cash Handling Safety",
            "SWA Guide for Handling and Transporting Cash", 20),
        _mk("retail_age_restricted_tobacco",
            "Age-Restricted Sales — Tobacco",
            "Public Health (Tobacco and Other Products) Act 2023", 25),
        _mk("retail_age_restricted_alcohol",
            "Age-Restricted Sales — Alcohol (RSA Retail Awareness)",
            "State liquor laws", 25, rto=True,
            rto_text="Formal RSA certification must be issued by an RTO. This module is awareness only."),
        _mk("retail_age_restricted_vaping",
            "Age-Restricted Sales — Vaping",
            "Therapeutic Goods (Vaping Reforms) Act 2024", 20),
        _mk("retail_theft_prevention",
            "Theft Prevention & Personal Safety",
            "Model WHS Act; insurer best-practice", 25),
        _mk("retail_stock_receivers_handling",
            "Manual Handling for Stock Receivers",
            "Hazardous Manual Tasks COP", 20),
        _mk("retail_emergency_procedures",
            "Emergency Procedures in Retail", "AS 3745:2010", 25),
        _mk("retail_first_aid",
            "First Aid for Retail", "First Aid COP", 25),
        _mk("retail_slips_trips_falls",
            "Slips, Trips & Falls Prevention",
            "WHS Reg 40; Slips Trips Falls COP", 20),
        _mk("retail_workplace_bullying",
            "Workplace Bullying (Retail)",
            "Fair Work Act + Managing Psychosocial Hazards COP", 20),
        _mk("retail_customer_injury_response",
            "Customer Injury Response",
            "WHS Reg 38; First Aid COP", 20),
    ],
}


def _slugify(s: str) -> str:
    return "_".join("".join(c if c.isalnum() else " " for c in s.lower()).split())


def _module_by_slug(slug: str) -> Optional[dict]:
    for ind in MODULES.values():
        for m in ind:
            if m["slug"] == slug:
                return m
    return None


# ----------------------------------------------------------------------------
# QUIZZES — real 5-question quizzes for all 17 Stage 1 MVP modules
# ----------------------------------------------------------------------------
QUIZZES = {
    # ---------- TRADES (5 MVP) ----------
    "trades_general_induction_refresher": [
        {"q": "The General Construction Induction (White Card) is issued by…",
         "options": ["SafeBase Academy", "A Registered Training Organisation (RTO)", "The WHS regulator directly", "An employer's HR team"], "answer": 1},
        {"q": "Under the model WHS Act, who owes the primary duty of care on a construction site?",
         "options": ["The principal contractor only", "Workers only", "Every PCBU (Person Conducting a Business or Undertaking)", "The WHS regulator"], "answer": 2},
        {"q": "If you arrive on site and have not been inducted, you must…",
         "options": ["Start work and induct later", "Refuse to start until inducted", "Self-induct from the SWMS pack", "Sign the visitor book and proceed"], "answer": 1},
        {"q": "A WHS Management Plan is required for construction projects valued at…",
         "options": ["$100,000 or more", "$250,000 or more", "$500,000 or more", "Any project"], "answer": 2},
        {"q": "If you see an unsafe act, you must…",
         "options": ["Ignore it — not your job", "Stop work, report it, isolate the hazard", "Wait for the supervisor to notice", "Take a photo and post online"], "answer": 1},
    ],
    "heights_full": [
        {"q": "Under WHS Reg 78-80, fall risk controls are mandatory above…",
         "options": ["1 metre", "2 metres", "3 metres", "5 metres"], "answer": 1},
        {"q": "The hierarchy of controls for working at heights prefers…",
         "options": ["PPE first", "Edge protection / scaffolding before harnesses", "Harness only", "Spotter only"], "answer": 1},
        {"q": "A fall arrest anchor point in Australia must be rated to at least…",
         "options": ["10 kN", "15 kN", "21 kN", "5 kN"], "answer": 2},
        {"q": "Harnesses must be inspected…",
         "options": ["Yearly", "Before each use and every 6 months by a competent person", "Every 5 years", "Only when damaged"], "answer": 1},
        {"q": "A fall arrest system is incomplete without…",
         "options": ["Hi-vis clothing", "A documented rescue plan", "A second harness", "A gas test"], "answer": 1},
    ],
    "confined_space_full": [
        {"q": "WHS Reg 66-77 defines a confined space as one with…",
         "options": ["A small floor area", "Restricted entry/exit AND potential for hazardous atmosphere", "No windows", "More than two workers"], "answer": 1},
        {"q": "Before entry to a confined space you must…",
         "options": ["Open the lid and check visually", "Conduct atmospheric testing AND issue an entry permit", "Hold your breath", "Wear hi-vis only"], "answer": 1},
        {"q": "A confined space entry permit must specify…",
         "options": ["Just the worker's name", "Hazards, controls, atmospheric results, stand-by person, time limits", "The contractor's invoice", "The weather"], "answer": 1},
        {"q": "Oxygen content in a confined space is safe between…",
         "options": ["15% – 25%", "19.5% – 23.5%", "10% – 30%", "21% only"], "answer": 1},
        {"q": "A stand-by person at a confined space must…",
         "options": ["Be inside the space to assist", "Stay outside, maintain communication, initiate rescue", "Leave once entry is made", "Be a worker on rotation"], "answer": 1},
    ],
    "swms_full": [
        {"q": "Under Reg 299, a SWMS is required for…",
         "options": ["Any construction job over $1m", "Any High Risk Construction Work (HRCW) activity", "Only government jobs", "Only when SafeWork requests one"], "answer": 1},
        {"q": "How many HRCW categories are listed in WHS Regulations?",
         "options": ["12", "18", "19", "21"], "answer": 2},
        {"q": "A SWMS must be reviewed…",
         "options": ["Annually", "When circumstances change OR after an incident", "Never — once is fine", "Only at audit time"], "answer": 1},
        {"q": "Who must be consulted in SWMS preparation?",
         "options": ["The principal contractor only", "Workers and HSRs (Health and Safety Representatives)", "The auditor", "Nobody"], "answer": 1},
        {"q": "The Hierarchy of Controls puts what FIRST?",
         "options": ["PPE", "Administrative controls", "Elimination", "Substitution"], "answer": 2},
    ],
    "trades_manual_handling": [
        {"q": "The Hazardous Manual Tasks Code of Practice requires you to consider…",
         "options": ["Only the weight of the load", "Posture, force, repetition, duration AND environment", "Worker age only", "The PPE worn"], "answer": 1},
        {"q": "Hierarchy of controls preference for manual handling is…",
         "options": ["PPE first", "Eliminate or mechanically substitute FIRST", "Procedural only", "Worker training only"], "answer": 1},
        {"q": "Reporting musculoskeletal discomfort early is…",
         "options": ["Discouraged", "Required so controls can be reviewed before injury occurs", "Optional", "Done only at exit medicals"], "answer": 1},
        {"q": "A safe team lift requires…",
         "options": ["The strongest worker leads", "Coordination, communication, balanced load, clear path", "More than 4 workers", "PPE only"], "answer": 1},
        {"q": "Mechanical aids (trolleys, hoists, conveyors) should be used when…",
         "options": ["Only if the worker complains", "Reasonably practicable to reduce manual effort", "Only on weekends", "Never on residential sites"], "answer": 1},
    ],
    # ---------- HOSPITALITY (4 MVP) ----------
    "food_handler_cert": [
        {"q": "Cold storage temperature must be at or below…",
         "options": ["10°C", "8°C", "5°C", "0°C"], "answer": 2},
        {"q": "Hot hold temperature must be at or above…",
         "options": ["55°C", "60°C", "65°C", "75°C"], "answer": 1},
        {"q": "Chicken core temperature must reach at least…",
         "options": ["63°C", "70°C", "75°C", "85°C"], "answer": 2},
        {"q": "Standard 3.2.2A requires food businesses to have a…",
         "options": ["Food Safety Supervisor (FSS) where required by jurisdiction", "Cleaner on site", "Cash register", "Forklift"], "answer": 0},
        {"q": "Hand-washing should follow what model?",
         "options": ["WHO 5 moments", "AHPRA 4-step", "FSANZ 3-step", "FoodSafe 2-step"], "answer": 0},
    ],
    "hosp_haccp_implementation": [
        {"q": "HACCP stands for…",
         "options": ["Hospitality and Catering Compliance Plan", "Hazard Analysis and Critical Control Points", "Health and Cleaning Control Policy", "Hot and Cold Critical Practice"], "answer": 1},
        {"q": "Critical Control Points (CCPs) are…",
         "options": ["Cleaning schedules", "Steps where control is essential to prevent or eliminate a hazard", "Storage locations", "Staff break times"], "answer": 1},
        {"q": "Standard 3.2.2 cl.7 requires a food business to…",
         "options": ["Have a food safety program where required", "Use only stainless steel", "Hire a chef", "Open before 9am"], "answer": 0},
        {"q": "If a CCP fails, the food business must…",
         "options": ["Ignore and reset", "Take corrective action, record it, and review the CCP", "Discard the venue", "Wait for the regulator"], "answer": 1},
        {"q": "HACCP records must be retained for…",
         "options": ["7 days", "1 month", "The period required by your jurisdiction (commonly 1-2 years)", "Forever"], "answer": 2},
    ],
    "hosp_personal_hygiene": [
        {"q": "Under Std 3.2.2 cl.15, food handlers must…",
         "options": ["Wear hi-vis", "Notify their supervisor of conditions likely to contaminate food (e.g., vomiting, diarrhoea)", "Sign in via a touchscreen", "Wear a hairnet only"], "answer": 1},
        {"q": "Effective hand-washing requires…",
         "options": ["Water only", "Warm water, soap, and at least 20 seconds rubbing all surfaces", "Hand sanitiser only", "Wet wipes only"], "answer": 1},
        {"q": "Gloves should be changed…",
         "options": ["Once a shift", "Between tasks, after contamination, and after breaks", "Daily", "Only when torn"], "answer": 1},
        {"q": "Jewellery on hands is…",
         "options": ["Encouraged", "Restricted — typically only plain wedding bands permitted", "Permitted in all forms", "Required for FSS"], "answer": 1},
        {"q": "A food handler with an open wound on their hand must…",
         "options": ["Continue with bare hands", "Cover with a waterproof, brightly coloured dressing and wear gloves", "Use clear tape only", "Go home immediately"], "answer": 1},
    ],
    "hosp_allergen_management": [
        {"q": "Under Std 1.2.3 + Schedule 9, how many allergens MUST be declared?",
         "options": ["3", "5", "11 (PEAL-aligned list with sesame, lupin, etc.)", "20"], "answer": 2},
        {"q": "The PEAL standard requires allergen declarations to be…",
         "options": ["In any colour", "Bold, plain English, in the ingredient list and a separate 'contains' statement", "Optional", "Only on packaged goods"], "answer": 1},
        {"q": "Cross-contact between allergens must be prevented by…",
         "options": ["Wiping the bench once", "Separation, dedicated equipment, cleaning regimes, staff training", "A sign on the wall", "Spraying sanitiser"], "answer": 1},
        {"q": "If a customer reports an allergy, the safest action is…",
         "options": ["Assume the kitchen knows", "Confirm allergens with the chef, check recipe, document order", "Tell them 'it should be fine'", "Refer them to the supplier"], "answer": 1},
        {"q": "An anaphylactic reaction in a venue requires…",
         "options": ["A glass of water", "Call 000, administer adrenaline auto-injector if available, lay flat", "Wait for the customer's family", "Email the FSS"], "answer": 1},
    ],
    # ---------- TRANSPORT (3 MVP) ----------
    "cor_full": [
        {"q": "CoR primarily applies to…",
         "options": ["Light vehicle drivers", "Heavy vehicle operators AND the chain (consignor, packer, loader, scheduler, driver, operator)", "Bus drivers only", "Couriers under 4.5t"], "answer": 1},
        {"q": "The primary duty under HVNL Pt 1A is…",
         "options": ["Drive carefully", "So far as is reasonably practicable, ensure the safety of transport activities", "Wear hi-vis", "Lodge a work diary"], "answer": 1},
        {"q": "CoR primary duty extends to…",
         "options": ["Drivers only", "Operators only", "Drivers, operators, schedulers, loaders, consignors, packers, receivers", "Mechanics only"], "answer": 2},
        {"q": "A scheduler who sets a roster that forces a driver to exceed work hours…",
         "options": ["Has no liability", "Breaches CoR primary duty and may be prosecuted", "Is protected by the driver's licence", "Is fine if the driver agrees"], "answer": 1},
        {"q": "CoR records (work diaries, schedules, contracts) must be retained for…",
         "options": ["1 month", "1 year", "3 years (minimum)", "Forever"], "answer": 2},
    ],
    "transport_hv_driver_awareness": [
        {"q": "A heavy vehicle under the HVNL is one with a Gross Vehicle Mass exceeding…",
         "options": ["3.5 tonnes", "4.5 tonnes", "12 tonnes", "20 tonnes"], "answer": 1},
        {"q": "Before each trip a driver must…",
         "options": ["Wash the truck", "Complete a pre-trip inspection and ensure fitness for duty", "Refuel only", "Update social media"], "answer": 1},
        {"q": "If a driver feels fatigued mid-trip they must…",
         "options": ["Push through to the depot", "Take a rest in line with work/rest rules — fatigue is a primary duty issue", "Drink coffee and keep going", "Speed up to finish sooner"], "answer": 1},
        {"q": "Notifiable occurrences under HVNL include…",
         "options": ["A minor speeding fine", "Fatalities, serious injuries, dangerous incidents", "Late deliveries", "Tyre wear"], "answer": 1},
        {"q": "A driver who knowingly drives an unsafe vehicle…",
         "options": ["Has no liability if asked by the operator", "Breaches CoR and may be prosecuted personally", "Is protected by insurance", "Only liable if there is an accident"], "answer": 1},
    ],
    "fatigue_full": [
        {"q": "Standard Hours allow how many hours' work per 24-hour period?",
         "options": ["10", "11", "12", "14"], "answer": 2},
        {"q": "Mandatory continuous rest break for Standard Hours after 5.25 hours work is…",
         "options": ["10 min", "15 min", "30 min (continuous)", "1 hour"], "answer": 2},
        {"q": "BFM (Basic Fatigue Management) allows…",
         "options": ["Same as Standard", "Up to 14 hours work in some scenarios with extra controls", "20 hours straight", "No limits"], "answer": 1},
        {"q": "Work diaries (paper or EWD) must be retained for…",
         "options": ["1 year", "3 years", "5 years", "Forever"], "answer": 1},
        {"q": "Fitness for duty includes assessment of…",
         "options": ["Sleep, drugs, alcohol, medical conditions, stress", "Only alcohol", "Only sleep", "Only mental health"], "answer": 0},
    ],
    # ---------- HEALTHCARE (2 MVP) ----------
    "acqsc_full": [
        {"q": "How many Strengthened Aged Care Quality Standards apply under the Aged Care Act 2024?",
         "options": ["4", "7", "8", "14"], "answer": 1},
        {"q": "Standard 1 (The Individual) focuses on…",
         "options": ["Cleaning schedules", "Person-centred care, dignity, choice, and rights", "Budgets", "Workforce ratios"], "answer": 1},
        {"q": "Open Disclosure is required when…",
         "options": ["A clinical incident causes harm to an older person", "There is a billing error", "A worker resigns", "A regulator visits"], "answer": 0},
        {"q": "Evidence for the strengthened standards is best demonstrated through…",
         "options": ["Verbal assurance", "Documented policies, observations, lived-experience feedback, audit records", "Marketing brochures", "Staff CVs"], "answer": 1},
        {"q": "The Aged Care Quality and Safety Commission's role is to…",
         "options": ["Provide funding", "Regulate, audit, and enforce the standards", "Train staff", "Hire workers"], "answer": 1},
    ],
    "health_sirs_reporting": [
        {"q": "SIRS stands for…",
         "options": ["Senior Investigation and Review System", "Serious Incident Response Scheme", "Standard Incident Recording System", "Safety Investigation Reporting Service"], "answer": 1},
        {"q": "How many reportable incident types are defined under Aged Care Act 2024 s.16?",
         "options": ["5", "8", "10", "14"], "answer": 1},
        {"q": "A Priority 1 SIRS report must be made within…",
         "options": ["7 days", "24 hours", "30 days", "Immediately and no later than 24 hours"], "answer": 3},
        {"q": "Unexplained absence of a consumer is a reportable incident under SIRS?",
         "options": ["No", "Yes", "Only if police are called", "Only if it lasts >24 hours"], "answer": 1},
        {"q": "Records for SIRS investigations must be retained per…",
         "options": ["The provider's preference", "Aged Care Act 2024 record-keeping requirements and Commission guidance", "1 year", "Forever locally"], "answer": 1},
    ],
    # ---------- RETAIL (3 MVP) ----------
    "retail_whs_team_members": [
        {"q": "Under the model WHS Act, a worker's duties include…",
         "options": ["Following lawful instructions only", "Taking reasonable care for own safety AND that of others, complying with reasonable instructions, following policies", "Wearing hi-vis", "Reporting only fatal injuries"], "answer": 1},
        {"q": "A 'hazard' in a retail setting is…",
         "options": ["A customer complaint", "Something with potential to cause harm (e.g., wet floor, heavy stock, aggressive customer)", "A discount sign", "A roster gap"], "answer": 1},
        {"q": "If you spot a hazard you cannot fix safely, you must…",
         "options": ["Ignore it", "Isolate it (signage/cones) and report to a supervisor", "Try anyway", "Wait for a customer to point it out"], "answer": 1},
        {"q": "Worker consultation rights under the WHS Act mean…",
         "options": ["Workers can be ignored", "Workers must be consulted on matters affecting their health and safety", "Only HSRs are consulted", "Consultation is annual only"], "answer": 1},
        {"q": "Incidents (including near misses) must be…",
         "options": ["Reported only if injury occurs", "Reported and recorded so controls can be reviewed", "Posted on social media", "Discussed at year-end"], "answer": 1},
    ],
    "retail_manual_handling": [
        {"q": "The leading cause of injury in retail is…",
         "options": ["Sharps", "Slips and falls only", "Manual handling (lifting, pushing, repetitive tasks)", "Burns"], "answer": 2},
        {"q": "Boxes and stock should ideally be stored…",
         "options": ["On the floor", "Between knee and shoulder height to reduce bending and over-reach", "Above head height", "Stacked to the ceiling"], "answer": 1},
        {"q": "Pushing a trolley is generally safer than pulling because…",
         "options": ["You can see where you are going AND use legs and core, not back", "It is faster", "Wheels work better", "Customers expect it"], "answer": 0},
        {"q": "Reporting musculoskeletal discomfort early is…",
         "options": ["Discouraged", "Required so controls can be reviewed before injury occurs", "Optional", "Done only at exit medicals"], "answer": 1},
        {"q": "A safe lift involves…",
         "options": ["Lifting with the back straight, knees bent, load close to body, no twisting", "Bending at the waist", "Twisting at the spine", "Holding load far from the body"], "answer": 0},
    ],
    "retail_lone_worker": [
        {"q": "Under WHS Reg 48, lone workers require…",
         "options": ["No special controls", "Risk assessment, communication systems, and check-in arrangements", "A daily phone call only", "More overtime"], "answer": 1},
        {"q": "If a robbery occurs, priority #1 is…",
         "options": ["Catch the offender", "Staff and customer safety — comply, do not resist", "Save the cash", "Call insurance first"], "answer": 1},
        {"q": "A defensible lone-worker check-in system needs…",
         "options": ["Manual SMS", "Automated check-in + escalation if missed", "Phone calls only", "Once-a-week check"], "answer": 1},
        {"q": "Lone worker risk is reduced by…",
         "options": ["Working more hours alone", "Buddy systems, CCTV, duress alarms, scheduled check-ins", "Removing breaks", "Longer shifts"], "answer": 1},
        {"q": "If a lone worker misses a scheduled check-in, the escalation should…",
         "options": ["Wait until end of shift", "Trigger an immediate welfare call and escalate to emergency services if no response", "Be logged for next week", "Be ignored"], "answer": 1},
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


# ----------------------------------------------------------------------------
# Public helpers for /catalogue
# ----------------------------------------------------------------------------
def _industry_payload(industry: str) -> dict:
    industry = (industry or "trades").lower()
    if industry not in MODULES:
        industry = "trades"
    mods = MODULES[industry]
    microlearning = [m for m in mods if m["type"] == "microlearning"]
    standard = [m for m in mods if m["type"] == "standard"]
    full_courses = [m for m in mods if m["type"] == "full_course"]
    stage1 = [m for m in mods if m.get("mvp_stage1")]
    return {
        "industry": industry,
        "modules": mods,
        "microlearning": microlearning,
        "standard": standard,
        "full_courses": full_courses,
        "stage1_mvp": stage1,
        "total_modules": len(mods),
        "rto_boundary_notice": (
            "SafeBase Academy is not a Registered Training Organisation (RTO). "
            "Where a module is flagged as RTO-boundary, the formal credential "
            "must be obtained from an RTO. SafeBase tracks awareness training "
            "and external credentials only."
        ),
    }


# ----------------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------------
def register_academy_routes(api_router: APIRouter, *, db, get_current_user_dep,
                             account_id_for_fn, log_audit_fn):

    @api_router.get("/academy/catalogue")
    async def get_catalogue(industry: Optional[str] = None,
                             current_user=Depends(get_current_user_dep)):
        target = (industry or getattr(current_user, "industry", None) or "trades").lower()
        # Industry 403: if caller explicitly requests another industry, deny.
        if industry:
            user_ind = (getattr(current_user, "industry", None) or "trades").lower()
            if industry.lower() != user_ind:
                raise HTTPException(
                    403,
                    f"Industry mismatch: account is '{user_ind}', requested '{industry}'",
                )
        return _industry_payload(target)

    @api_router.get("/academy/modules/{module_slug}")
    async def get_module(module_slug: str, current_user=Depends(get_current_user_dep)):
        m = _module_by_slug(module_slug)
        if not m:
            raise HTTPException(404, "Module not found")
        return m

    @api_router.get("/academy/{module_slug}/quiz")
    async def get_quiz(module_slug: str, current_user=Depends(get_current_user_dep)):
        """Return the quiz for a module — answers stripped client-side."""
        m = _module_by_slug(module_slug)
        title = (m or {}).get("title") or module_slug.replace("_", " ").title()
        questions = get_quiz_for(module_slug, title)
        return {
            "module_slug": module_slug,
            "title": title,
            "regulatory_anchor": (m or {}).get("regulatory_anchor"),
            "rto_boundary": bool((m or {}).get("rto_boundary")),
            "rto_disclaimer": (m or {}).get("rto_disclaimer"),
            "questions": [{"q": q["q"], "options": q["options"]} for q in questions],
        }

    @api_router.post("/academy/{module_slug}/submit-quiz")
    async def submit_quiz(module_slug: str, body: dict, request: Request,
                           current_user=Depends(get_current_user_dep)):
        """Score the quiz; create completion + cert if passed (>= 80%)."""
        answers = body.get("answers") or []
        m = _module_by_slug(module_slug)
        title = (m or {}).get("title") or module_slug.replace("_", " ").title()
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
                "regulatory_anchor": (m or {}).get("regulatory_anchor"),
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
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import A4
            from io import BytesIO
            buf = BytesIO()
            c = canvas.Canvas(buf, pagesize=A4)
            w, h = A4
            c.setStrokeColorRGB(0.05, 0.05, 0.05)
            c.setLineWidth(3)
            c.rect(40, 40, w - 80, h - 80)
            c.setFont("Helvetica-Bold", 36)
            c.drawCentredString(w / 2, h - 140, "Certificate of Completion")
            c.setFont("Helvetica", 14)
            c.drawCentredString(w / 2, h - 175, "SafeBase Academy")
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
            if rec.get("regulatory_anchor"):
                c.setFont("Helvetica-Oblique", 9)
                c.drawCentredString(w / 2, h - 445, f"Regulatory anchor: {rec['regulatory_anchor']}")
            c.setFont("Helvetica", 8)
            c.drawCentredString(w / 2, 95, "SafeBase Academy is not a Registered Training Organisation.")
            c.drawCentredString(w / 2, 80, f"Certificate ID: {completion_id}")
            c.drawCentredString(w / 2, 65, "Verify at app.safebase.com.au")
            c.showPage()
            c.save()
            return Response(content=buf.getvalue(), media_type="application/pdf",
                             headers={"Content-Disposition": f'inline; filename=\"{completion_id}.pdf\"'})
        except ImportError:
            text = f"""SafeBase Academy — Certificate of Completion

Awarded to: {rec.get('worker_name')}
Module: {rec.get('module_title') or rec['module_slug']}
Score: {rec.get('score')}%
Completed: {rec.get('completed_at')}
Certificate ID: {completion_id}
"""
            return Response(content=text, media_type="text/plain")

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
        m = _module_by_slug(module_slug)
        cert_id = f"cert_{uuid.uuid4().hex[:10]}"
        doc = {
            "completion_id": cert_id,
            "account_id": account_id_for_fn(current_user),
            "module_slug": module_slug,
            "module_title": (m or {}).get("title"),
            "regulatory_anchor": (m or {}).get("regulatory_anchor"),
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


# ----------------------------------------------------------------------------
# Backwards compatibility — old code imported CATALOGUE; keep a derived shim
# so any external reference (server.py) still has access to the old shape.
# ----------------------------------------------------------------------------
CATALOGUE = {
    ind: {
        "microlearning": [m["title"] for m in mods if m["type"] == "microlearning"],
        "full_courses": [
            {
                "slug": m["slug"],
                "title": m["title"],
                "modules": [m["title"]],
            }
            for m in mods if m["type"] != "microlearning"
        ],
    }
    for ind, mods in MODULES.items()
}
