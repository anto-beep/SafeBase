"""
Hazard Library — industry-tagged catalogue of common workplace hazards.

A separate register from the risk_library which uses hazards as the
starting point for risk identification. Each hazard carries:
  - code (kebab-case slug)
  - name
  - industry
  - category (Physical / Chemical / Biological / Ergonomic / Psychosocial /
              Environmental / Operational)
  - description
  - typical_consequences (array of strings)
  - typical_controls (array of strings — high-level)
  - regulation (Australian Act/Reg/COP reference)

Endpoints:
  GET  /api/hazard-library                  (industry-locked to caller)
  GET  /api/hazard-library/{hazard_id}      (single — for clickable detail)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query


# ----------------------------------------------------------------------------
# CATALOGUE
# ----------------------------------------------------------------------------
HAZARDS: dict[str, list[dict]] = {
    "trades": [
        {"code": "fall_height", "name": "Fall from height", "category": "Physical",
         "description": "Worker falling from scaffold, roof, ladder, EWP or other elevated work area.",
         "typical_consequences": ["Fractures", "Head injury", "Fatality"],
         "typical_controls": ["Design out roof work", "Edge protection", "Scaffolding", "Harness + anchor", "Permit-to-work"],
         "regulation": "WHS Reg 78-80; HRCW item 1"},
        {"code": "trench_collapse", "name": "Trench collapse / engulfment", "category": "Physical",
         "description": "Wall failure in excavations >1.5m without shoring or batter.",
         "typical_consequences": ["Crush injury", "Asphyxiation", "Fatality"],
         "typical_controls": ["Benching/battering", "Shoring/shielding", "Daily inspection", "Competent person sign-off"],
         "regulation": "WHS Reg 297; Excavation COP"},
        {"code": "electrical_shock", "name": "Electric shock / arc flash", "category": "Physical",
         "description": "Contact with live circuits or arc flash from switching faults.",
         "typical_consequences": ["Burns", "Cardiac arrest", "Fatality"],
         "typical_controls": ["De-energise + LOTO", "Test before touch", "Insulated PPE", "Authorised electrician only"],
         "regulation": "WHS Reg 140-164; AS/NZS 3012"},
        {"code": "confined_space", "name": "Confined space atmosphere", "category": "Environmental",
         "description": "Oxygen deficiency, flammable gas, or toxic atmosphere in tanks, pits, voids.",
         "typical_consequences": ["Asphyxiation", "Explosion", "Toxic exposure"],
         "typical_controls": ["Eliminate entry", "Ventilation", "Atmospheric testing", "Entry permit", "Stand-by person"],
         "regulation": "WHS Reg 66-77"},
        {"code": "asbestos", "name": "Asbestos disturbance", "category": "Chemical",
         "description": "Disturbance of asbestos-containing materials releasing airborne fibres.",
         "typical_consequences": ["Asbestosis", "Mesothelioma", "Lung cancer"],
         "typical_controls": ["Asbestos register/survey", "Licensed removalist", "Air monitoring", "Wet methods", "P2 respirators"],
         "regulation": "WHS Reg 425-434; Asbestos COP"},
        {"code": "silica_dust", "name": "Respirable crystalline silica (RCS)", "category": "Chemical",
         "description": "Cutting, grinding, drilling engineered stone or concrete generating RCS.",
         "typical_consequences": ["Silicosis", "Lung cancer"],
         "typical_controls": ["Eliminate engineered stone", "Water suppression", "LEV", "P2/P3 respirators", "Air monitoring"],
         "regulation": "WHS Reg 49; Silica COP"},
        {"code": "noise", "name": "Excessive noise (>85 dB(A))", "category": "Physical",
         "description": "Sustained exposure above the exposure standard.",
         "typical_consequences": ["Noise-induced hearing loss", "Tinnitus"],
         "typical_controls": ["Quieter plant", "Sound enclosures", "Job rotation", "Class-5 hearing protection"],
         "regulation": "WHS Reg 56-58"},
        {"code": "manual_handling", "name": "Hazardous manual task", "category": "Ergonomic",
         "description": "Lifting/carrying loads with awkward posture, force, repetition, duration.",
         "typical_consequences": ["MSD", "Back/shoulder injury"],
         "typical_controls": ["Eliminate lift", "Mechanical aids", "Team lift", "Training"],
         "regulation": "WHS Reg 60; Hazardous Manual Tasks COP"},
        {"code": "plant_struck", "name": "Struck by mobile plant", "category": "Physical",
         "description": "Pedestrian struck by moving vehicle, crane, forklift, excavator.",
         "typical_consequences": ["Crush injury", "Fatality"],
         "typical_controls": ["Traffic management plan", "Spotter", "Exclusion zones", "High-vis", "Reverse alarms"],
         "regulation": "WHS Reg 215; Cranes/Plant COPs"},
        {"code": "hot_work_fire", "name": "Hot work — fire/explosion", "category": "Physical",
         "description": "Welding, grinding, cutting near combustible materials or flammable atmospheres.",
         "typical_consequences": ["Burns", "Explosion", "Fatality"],
         "typical_controls": ["Permit", "Atmosphere test", "Fire blankets", "Fire watch + extinguisher"],
         "regulation": "Hot Work COP"},
        {"code": "psychosocial_stress", "name": "Work-related psychosocial stress", "category": "Psychosocial",
         "description": "High job demands, low control, bullying, exposure to traumatic events.",
         "typical_consequences": ["Anxiety", "Depression", "Burnout"],
         "typical_controls": ["Workload review", "Mental health policy", "EAP", "MATES program"],
         "regulation": "Managing Psychosocial Hazards COP"},
        {"code": "chemical_exposure", "name": "Hazardous chemical exposure", "category": "Chemical",
         "description": "Skin/inhalation contact with solvents, isocyanates, acids, sealants.",
         "typical_consequences": ["Dermatitis", "Respiratory disease", "Burns"],
         "typical_controls": ["Substitute safer product", "LEV", "PPE", "SDS + training"],
         "regulation": "WHS Reg 339-387"},
    ],
    "hospitality": [
        {"code": "burns_steam", "name": "Burns / scalds (kitchen)", "category": "Physical",
         "description": "Hot surfaces, oil, steam, deep-fryers, hot liquids.",
         "typical_consequences": ["Burns", "Permanent scarring"],
         "typical_controls": ["Splash guards", "Long sleeves & insulated gloves", "Hot-cool layout", "First aid"],
         "regulation": "WHS Reg 39-40"},
        {"code": "knife_cuts", "name": "Knife / sharps injury", "category": "Physical",
         "description": "Cuts from kitchen knives, mandolins, slicers, broken glass.",
         "typical_consequences": ["Lacerations", "Tendon injury"],
         "typical_controls": ["Sharp + maintained knives", "Cut-resistant gloves", "Knife training", "Safe handover"],
         "regulation": "WHS Reg 39"},
        {"code": "slips_trips", "name": "Slips on wet/oily floors", "category": "Physical",
         "description": "Spills, mopping, dishwasher run-off, food debris.",
         "typical_consequences": ["Sprains", "Fractures"],
         "typical_controls": ["Clean-as-you-go", "Wet floor signs", "Slip-resistant footwear", "Drainage"],
         "regulation": "WHS Reg 40; STF COP"},
        {"code": "manual_handling_hosp", "name": "Manual handling (kegs/crates/dishes)", "category": "Ergonomic",
         "description": "Lifting kegs, stacks of plates, repetitive reaching.",
         "typical_consequences": ["Back/shoulder injury", "MSD"],
         "typical_controls": ["Keg trolleys", "Adjust shelf heights", "Team lift", "Rotation"],
         "regulation": "Hazardous Manual Tasks COP"},
        {"code": "cross_contam", "name": "Allergen / cross-contamination", "category": "Biological",
         "description": "Allergen transfer between dishes; pathogen spread from raw to ready-to-eat.",
         "typical_consequences": ["Anaphylaxis", "Foodborne illness"],
         "typical_controls": ["PEAL labels", "Dedicated boards/utensils", "Cleaning schedule", "Staff training"],
         "regulation": "FSANZ Std 1.2.3 + 3.2.2"},
        {"code": "temp_control", "name": "Temperature abuse — cold chain", "category": "Biological",
         "description": "Cold storage / hot hold outside 5°C / 60°C limits.",
         "typical_consequences": ["Foodborne illness", "Closure"],
         "typical_controls": ["Calibrated logs", "Alarmed fridges", "FIFO", "FSS oversight"],
         "regulation": "FSANZ Std 3.2.2 cl.5-11"},
        {"code": "customer_aggression", "name": "Customer aggression / abuse", "category": "Psychosocial",
         "description": "Verbal/physical aggression from intoxicated or angry patrons.",
         "typical_consequences": ["Psychological injury", "Physical injury"],
         "typical_controls": ["RSA training", "De-escalation training", "Two-up close", "Duress alarms"],
         "regulation": "Managing Psychosocial Hazards COP; state liquor laws"},
        {"code": "lone_worker_close", "name": "Lone closer / opener", "category": "Psychosocial",
         "description": "Single staff member handling cash, locking up late at night.",
         "typical_consequences": ["Robbery", "Assault", "Psychological injury"],
         "typical_controls": ["Two-up close", "Duress button", "CCTV", "Check-in procedure"],
         "regulation": "WHS Reg 48"},
        {"code": "gas_appliance", "name": "Commercial gas appliance leak", "category": "Chemical",
         "description": "Faulty gas connection, blocked flue, CO accumulation.",
         "typical_consequences": ["Explosion", "CO poisoning"],
         "typical_controls": ["Annual gas check", "CO detector", "Emergency isolation valve"],
         "regulation": "Gas Safety Acts"},
        {"code": "pest", "name": "Pest infestation", "category": "Biological",
         "description": "Rodents, cockroaches, flies contaminating food.",
         "typical_consequences": ["Food contamination", "Closure"],
         "typical_controls": ["Pest contract", "Bait stations", "Cleaning", "Door seals"],
         "regulation": "FSANZ Std 3.2.2 cl.24"},
    ],
    "transport": [
        {"code": "fatigue_driving", "name": "Driver fatigue", "category": "Psychosocial",
         "description": "Insufficient rest, monotonous driving, irregular hours.",
         "typical_consequences": ["Crash", "Fatality"],
         "typical_controls": ["Compliant scheduling", "EWD/work diary", "Mandatory breaks", "Fitness-for-duty"],
         "regulation": "HVNL Ch 6"},
        {"code": "load_shift", "name": "Load shift / restraint failure", "category": "Operational",
         "description": "Poor restraint, overload, weight distribution causing rollover or load loss.",
         "typical_consequences": ["Crash", "Pedestrian injury", "Cargo damage"],
         "typical_controls": ["Load restraint plan", "Compliant restraints", "Driver inspection", "Weighbridge"],
         "regulation": "NTC Load Restraint Guide; HVNL Ch 4"},
        {"code": "rollover", "name": "Vehicle rollover", "category": "Operational",
         "description": "Speed in corners, soft shoulders, top-heavy loads.",
         "typical_consequences": ["Crash", "Fatality"],
         "typical_controls": ["Speed limit policy", "ESC vehicles", "Route assessment", "Load distribution"],
         "regulation": "HVNL"},
        {"code": "dg_release", "name": "Dangerous goods release", "category": "Chemical",
         "description": "Spill or leak of bulk fuel, gases, hazardous chemicals in transit.",
         "typical_consequences": ["Explosion", "Toxic exposure", "Environmental damage"],
         "typical_controls": ["ADG-compliant packaging", "Placards", "Driver licensing", "Emergency info"],
         "regulation": "ADG Code"},
        {"code": "drug_alcohol", "name": "Drug & alcohol impairment", "category": "Psychosocial",
         "description": "Driving while affected by substances.",
         "typical_consequences": ["Crash", "Licence loss", "Prosecution"],
         "typical_controls": ["D&A policy", "Random testing", "Counselling/EAP"],
         "regulation": "HVNL; state road acts"},
        {"code": "loading_dock", "name": "Loading dock interaction", "category": "Physical",
         "description": "Forklift, pedestrian, dock-leveller hazards.",
         "typical_consequences": ["Crush injury", "Falls", "Pedestrian struck"],
         "typical_controls": ["Exclusion zones", "Wheel chocks", "High-vis", "Spotter"],
         "regulation": "WHS Reg 215"},
        {"code": "manual_handling_tx", "name": "Manual handling (straps/curtains)", "category": "Ergonomic",
         "description": "Throwing curtains, ratcheting tie-downs, climbing on tray.",
         "typical_consequences": ["MSD", "Falls"],
         "typical_controls": ["Curtain-sider design", "Walkway", "Mechanical aids", "Training"],
         "regulation": "Hazardous Manual Tasks COP"},
        {"code": "vehicle_maintenance", "name": "Mechanical failure due to poor maintenance", "category": "Operational",
         "description": "Brake/tyre/steering failure from inadequate inspection.",
         "typical_consequences": ["Crash", "Loss of control"],
         "typical_controls": ["Maintenance program", "Pre-trip inspection", "Defect reporting"],
         "regulation": "HVNL maintenance duty"},
        {"code": "psychosocial_isolation", "name": "Long-haul isolation / mental health", "category": "Psychosocial",
         "description": "Extended periods alone, away from family.",
         "typical_consequences": ["Depression", "Suicidal ideation"],
         "typical_controls": ["EAP", "Peer support", "Hotel-night limits", "Mental health training"],
         "regulation": "Managing Psychosocial Hazards COP"},
    ],
    "healthcare": [
        {"code": "manual_handling_clin", "name": "Patient/resident manual handling", "category": "Ergonomic",
         "description": "Lifting, transferring, repositioning clients.",
         "typical_consequences": ["Back injury", "Shoulder injury"],
         "typical_controls": ["Hoists/slings", "Two-person transfer", "Bariatric equipment", "Annual competency"],
         "regulation": "Hazardous Manual Tasks COP; Aged Care Act Std 5"},
        {"code": "sharps_needlestick", "name": "Sharps / needlestick injury", "category": "Biological",
         "description": "Needle, scalpel, ampoule injury during procedures or disposal.",
         "typical_consequences": ["BBV exposure (HIV, HBV, HCV)"],
         "typical_controls": ["Safety-engineered devices", "Sharps containers point of use", "Single-use", "PEP"],
         "regulation": "NHMRC Guidelines"},
        {"code": "infection_control", "name": "Infection (HAI) transmission", "category": "Biological",
         "description": "Healthcare-associated infections via contact, droplet, airborne.",
         "typical_consequences": ["Cross-infection", "Outbreak"],
         "typical_controls": ["Hand hygiene 5-moments", "PPE", "Cleaning audits", "Isolation/cohorting"],
         "regulation": "NHMRC Guidelines; Aged Care Std 3"},
        {"code": "med_error", "name": "Medication administration error", "category": "Operational",
         "description": "Wrong dose, route, time, patient or drug.",
         "typical_consequences": ["Adverse drug event", "Death"],
         "typical_controls": ["5-rights checks", "EMR with alerts", "S8 register", "Double-sign for high-risk"],
         "regulation": "Aged Care Act Std 5"},
        {"code": "client_aggression", "name": "Client/resident aggression", "category": "Psychosocial",
         "description": "Behaviours of concern, BPSD-related aggression.",
         "typical_consequences": ["Physical injury", "Psychological injury"],
         "typical_controls": ["Behaviour Support Plan", "De-escalation training", "Duress alarms", "Two-up high-risk"],
         "regulation": "NDIS Restrictive Practices; Aged Care Std 5"},
        {"code": "falls_client", "name": "Client falls", "category": "Physical",
         "description": "Falls during transfers, ambulation, toileting.",
         "typical_consequences": ["Fracture", "Head injury", "Loss of independence"],
         "typical_controls": ["Falls risk assessment", "Sensor mats", "Hip protectors", "Environment modification"],
         "regulation": "Aged Care Act Std 5"},
        {"code": "psychosocial_burnout", "name": "Workforce burnout", "category": "Psychosocial",
         "description": "Chronic understaffing, emotional load, vicarious trauma.",
         "typical_consequences": ["Anxiety", "Depression", "Resignation"],
         "typical_controls": ["Care-minute compliance", "Debrief", "EAP", "Workload review"],
         "regulation": "Managing Psychosocial Hazards COP"},
        {"code": "restrictive_practice", "name": "Unauthorised restrictive practice", "category": "Operational",
         "description": "Use of chemical, mechanical, environmental restraint without authorisation.",
         "typical_consequences": ["Regulatory breach", "Resident harm"],
         "typical_controls": ["Authorisation process", "Monthly RP report", "Behaviour support", "Workforce training"],
         "regulation": "NDIS Restrictive Practices Rules 2018; Aged Care Rules 2025"},
        {"code": "lone_worker_community", "name": "Lone worker (community care)", "category": "Psychosocial",
         "description": "Solo home visits with risk of aggression or accident.",
         "typical_consequences": ["Assault", "Psychological injury", "Delayed help"],
         "typical_controls": ["Check-in app", "Buddy system high-risk", "Risk grade homes", "Duress device"],
         "regulation": "WHS Reg 48"},
        {"code": "elder_abuse", "name": "Elder abuse / mistreatment", "category": "Psychosocial",
         "description": "Physical, sexual, emotional, financial, neglect.",
         "typical_consequences": ["Resident harm", "SIRS notifiable"],
         "typical_controls": ["Worker screening", "Code of Conduct", "Open Disclosure", "SIRS process"],
         "regulation": "Aged Care Act 2024 s.16"},
    ],
    "retail": [
        {"code": "lone_worker_retail", "name": "Lone worker", "category": "Psychosocial",
         "description": "Single staff member on shift.",
         "typical_consequences": ["Robbery", "Assault", "Delayed help"],
         "typical_controls": ["Two-up close", "Duress alarm", "CCTV", "Check-in"],
         "regulation": "WHS Reg 48"},
        {"code": "armed_holdup", "name": "Armed hold-up / robbery", "category": "Psychosocial",
         "description": "Robbery during open hours or close.",
         "typical_consequences": ["Trauma", "Physical injury", "Fatality"],
         "typical_controls": ["Cash-handling SOP", "Drop safe", "Bandit screens", "Robbery response training"],
         "regulation": "Managing Psychosocial Hazards COP"},
        {"code": "customer_aggression_retail", "name": "Customer aggression", "category": "Psychosocial",
         "description": "Verbal abuse, physical threats from customers.",
         "typical_consequences": ["Psychological injury"],
         "typical_controls": ["De-escalation training (SAFE)", "Duress alarm", "Two-up close"],
         "regulation": "Managing Psychosocial Hazards COP"},
        {"code": "manual_handling_retail", "name": "Manual handling (stock)", "category": "Ergonomic",
         "description": "Lifting cartons, restocking shelves, working overhead.",
         "typical_consequences": ["MSD", "Back/shoulder injury"],
         "typical_controls": ["Trolleys", "Shelf placement", "Rotation", "Team lift"],
         "regulation": "Hazardous Manual Tasks COP"},
        {"code": "stf_retail", "name": "Slips, trips & falls", "category": "Physical",
         "description": "Spills, trailing cables, cluttered aisles.",
         "typical_consequences": ["Sprains", "Fractures", "Liability claims"],
         "typical_controls": ["Wet floor signs", "Spill response SOP", "Aisle audits"],
         "regulation": "WHS Reg 40; STF COP"},
        {"code": "underage_sale", "name": "Underage age-restricted sale", "category": "Operational",
         "description": "Selling tobacco, vape, alcohol to minors.",
         "typical_consequences": ["Regulatory penalty", "Licence loss"],
         "typical_controls": ["ID-25 policy", "POS prompts", "RSA/tobacco training", "Refusal log"],
         "regulation": "Public Health Tobacco Act 2023; state liquor laws"},
        {"code": "theft_personal_safety", "name": "Theft + worker confrontation", "category": "Psychosocial",
         "description": "Worker confronting shoplifters.",
         "typical_consequences": ["Assault", "Psychological injury"],
         "typical_controls": ["No-pursuit policy", "Observe-and-report", "Security calls", "Insurance"],
         "regulation": "WHS Act"},
        {"code": "fire_emergency_retail", "name": "Fire / emergency evacuation", "category": "Physical",
         "description": "Fire from electrical/cooking; insufficient evacuation training.",
         "typical_consequences": ["Burns", "Smoke inhalation", "Trampling"],
         "typical_controls": ["AS 3745 plan", "Evacuation drills", "Fire warden roster", "Extinguishers"],
         "regulation": "AS 3745:2010"},
    ],
}


def register_hazard_library_routes(api_router: APIRouter, *, db,
                                     get_current_user_dep, account_id_for_fn):

    def _industry_403(current_user, requested: str | None) -> None:
        if not requested:
            return
        user_ind = (getattr(current_user, "industry", None) or "trades").lower()
        if requested.lower() != user_ind:
            raise HTTPException(
                403,
                f"Industry mismatch: account is '{user_ind}', requested '{requested}'",
            )

    @api_router.get("/hazard-library")
    async def list_hazards(
        industry: str | None = Query(None),
        category: str | None = Query(None),
        current_user=Depends(get_current_user_dep),
    ):
        _industry_403(current_user, industry)
        target = (industry or getattr(current_user, "industry", None) or "trades").lower()
        rows = HAZARDS.get(target, [])
        if category:
            rows = [h for h in rows if h.get("category", "").lower() == category.lower()]
        # Group by category for easy UI rendering
        by_cat: dict[str, list[dict]] = {}
        for h in rows:
            by_cat.setdefault(h["category"], []).append(h)
        return {
            "industry": target,
            "total": len(rows),
            "categories": [
                {"category": cat, "hazards": items}
                for cat, items in sorted(by_cat.items())
            ],
            "hazards": rows,
        }

    @api_router.get("/hazard-library/{hazard_code}")
    async def get_hazard(hazard_code: str, current_user=Depends(get_current_user_dep)):
        industry = (getattr(current_user, "industry", None) or "trades").lower()
        for h in HAZARDS.get(industry, []):
            if h["code"] == hazard_code:
                return h
        raise HTTPException(404, "Hazard not found in your industry")
