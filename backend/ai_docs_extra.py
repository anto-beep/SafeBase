"""
Extra AI document types — extends the registry built in ai_docs_module.py.

Uses a generic `_brief_prompt(brief, sections, inputs)` builder so each new
doc is essentially data: brief + section headings. Claude 4.5 produces the
structured Markdown.
"""
from __future__ import annotations


def _generic_prompt(brief: str, sections: list[str]):
    """Returns a `user_prompt_template(inputs)->str` factory.

    Brief = high-level instructions and context. Sections = ordered list of
    section headings the document must contain.
    """
    def _build(inputs: dict) -> str:
        # Render inputs as a simple key: value block for the LLM
        ctx = "\n".join(f"  {k}: {v}" for k, v in (inputs or {}).items() if v)
        section_block = "\n".join(f"  {i+1}. {s}" for i, s in enumerate(sections))
        return (
            f"{brief}\n\n"
            f"User-supplied inputs:\n{ctx or '  (none)'}\n\n"
            f"Output a complete Markdown document with these sections:\n{section_block}\n\n"
            f"Use plain English, Australian spelling, and produce content "
            f"that is realistic and actionable for the user's specific "
            f"context. Reference applicable Australian legislation/regulators "
            f"by name where relevant."
        )
    return _build


# ----------------------------------------------------------------
# Per-industry extra documents — appended to AI_DOC_REGISTRY
# ----------------------------------------------------------------

EXTRA_DOC_TYPES = {
    "hospitality": {
        "food_safety_program": {
            "label": "Food Safety Program",
            "ref_prefix": "FSP", "category": "food_safety",
            "system_prompt": "You are a senior Australian food safety auditor. You draft Food Safety Programs aligned with Food Standards Code Standard 3.2.1 (Class 1 food businesses) for Australian venues.",
            "sections": ["Scope of the food safety program", "Flow diagram of food handling (receiving → storage → preparation → cooking → cooling → serving)",
                          "Hazard analysis at each step", "Critical Control Points", "Critical limits",
                          "Monitoring procedures", "Corrective actions", "Verification procedures",
                          "Record-keeping requirements", "Staff responsibilities"],
            "inputs": [
                {"key": "venue_name", "label": "Venue name", "type": "text", "required": True},
                {"key": "venue_type", "label": "Venue type", "type": "select", "options": ["restaurant", "cafe", "bar", "catering", "takeaway", "hotel", "bakery"], "required": True},
                {"key": "address", "label": "Venue address", "type": "text"},
                {"key": "food_categories", "label": "Food categories handled", "type": "textarea", "placeholder": "raw meat / cooked / cold display / hot hold / buffet"},
                {"key": "handler_count", "label": "Number of food handlers", "type": "text"},
                {"key": "state", "label": "State / Territory", "type": "select", "options": ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"]},
                {"key": "fss_name", "label": "Food Safety Supervisor name", "type": "text"},
            ],
        },
        "allergen_management_plan": {
            "label": "Allergen Management Plan",
            "ref_prefix": "ALG", "category": "food_safety",
            "system_prompt": "You are a senior Australian food safety expert specialising in allergen control.",
            "sections": ["Allergen identification procedure", "Cross-contamination prevention measures",
                          "Staff communication procedure", "Customer disclosure procedure",
                          "Supplier allergen verification procedure", "Allergen incident response procedure",
                          "Training requirements for staff"],
            "inputs": [
                {"key": "menu_allergens", "label": "Menu allergens present", "type": "textarea", "placeholder": "egg, milk, peanut, tree nut, soy, wheat, fish, shellfish, sesame, lupin"},
                {"key": "shared_equipment", "label": "Shared equipment / surfaces", "type": "select", "options": ["yes", "no"]},
                {"key": "allergen_free_menu", "label": "Allergen-free menu items offered", "type": "select", "options": ["yes", "no"]},
            ],
        },
        "temperature_monitoring_procedure": {
            "label": "Temperature Monitoring Procedure",
            "ref_prefix": "TMP", "category": "food_safety",
            "system_prompt": "You are an Australian food safety consultant specialising in temperature control.",
            "sections": ["Temperature monitoring schedule per equipment", "Correct temperature ranges per equipment type",
                          "Monitoring frequency requirements", "Recording procedure",
                          "Out-of-range response procedure", "Calibration requirements for thermometers",
                          "Record retention requirements (minimum 3 months)"],
            "inputs": [
                {"key": "equipment_list", "label": "Equipment list", "type": "textarea", "placeholder": "fridge 1, freezer 1, hot bain marie, cool room…"},
                {"key": "service_periods", "label": "Business hours / service periods", "type": "text"},
            ],
        },
        "cleaning_sanitation_procedure": {
            "label": "Cleaning & Sanitation Procedure",
            "ref_prefix": "CLS", "category": "food_safety",
            "system_prompt": "You are a senior Australian food safety consultant.",
            "sections": ["Cleaning schedule per area and equipment", "Cleaning chemicals and concentrations",
                          "Sanitising requirements and contact times", "Frequency per item",
                          "Responsibility assignments by role", "Pest control requirements", "Waste management procedures"],
            "inputs": [
                {"key": "venue_areas", "label": "Venue areas", "type": "textarea", "placeholder": "kitchen / cool room / dining / bathrooms / bar / prep areas"},
                {"key": "equipment_types", "label": "Equipment types", "type": "textarea", "placeholder": "fryers / grills / slicers / display cabinets"},
            ],
        },
        "food_safety_incident_response": {
            "label": "Food Safety Incident Response Plan",
            "ref_prefix": "FSI", "category": "food_safety",
            "system_prompt": "You are a senior Australian food safety auditor.",
            "sections": ["Customer illness complaint response procedure", "Food contamination response procedure",
                          "Allergen incident response procedure", "Temperature failure response procedure",
                          "Supplier recall response procedure", "Regulatory notification triggers and contacts (NSW Food Authority 1300 552 406, Vic DHHS 1300 364 352, QLD Health 13 43 25 84, WA Health 08 9222 4222, SA Health 1300 232 272)"],
            "inputs": [
                {"key": "venue_name", "label": "Venue name", "type": "text", "required": True},
                {"key": "state", "label": "State", "type": "select", "options": ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"], "required": True},
            ],
        },
        "rsa_liquor_policy": {
            "label": "RSA & Liquor Management Policy",
            "ref_prefix": "RSA", "category": "compliance",
            "system_prompt": "You are an Australian liquor licensing consultant.",
            "sections": ["Responsible Service of Alcohol policy", "Intoxication assessment procedure",
                          "Refusal of service procedure", "Minors policy", "Incident recording requirements", "Staff training requirements"],
            "inputs": [
                {"key": "venue_type", "label": "Venue type", "type": "select", "options": ["pub", "restaurant", "club", "hotel", "bar"], "required": True},
                {"key": "licence_type", "label": "Licence type", "type": "text"},
                {"key": "state", "label": "State", "type": "select", "options": ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"], "required": True},
            ],
        },
        "staff_induction_checklist": {
            "label": "Hospitality Staff Induction Checklist",
            "ref_prefix": "IND", "category": "induction",
            "system_prompt": "You are an Australian hospitality WHS consultant.",
            "sections": ["Food safety responsibilities for this role", "Kitchen and venue hazards",
                          "Emergency procedures", "PPE requirements", "Reporting procedures", "RSA obligations (if applicable)"],
            "inputs": [
                {"key": "venue_name", "label": "Venue name", "type": "text", "required": True},
                {"key": "venue_type", "label": "Venue type", "type": "select", "options": ["restaurant", "cafe", "bar", "catering", "hotel"]},
                {"key": "role", "label": "Staff role", "type": "select", "options": ["chef", "kitchen hand", "front of house", "bar", "manager", "casual"], "required": True},
            ],
        },
        "peal_anaphylaxis_plan": {
            "label": "PEAL — Prevent Anaphylaxis Plan",
            "ref_prefix": "PEAL", "category": "food_safety",
            "system_prompt": "You are a senior Australian food safety expert. PEAL = Prevent, Educate, Ask, Label. Produce a complete anaphylaxis prevention plan for hospitality.",
            "sections": ["PEAL framework overview (Prevent / Educate / Ask / Label)",
                          "Allergen map of the kitchen", "Customer disclosure questions (Ask)",
                          "Menu labelling procedure (Label)", "Staff training schedule (Educate)",
                          "Prevention controls per workstation (Prevent)",
                          "Adrenaline auto-injector location and use", "Customer anaphylaxis emergency response", "Incident recording requirements"],
            "inputs": [
                {"key": "venue_name", "label": "Venue", "type": "text", "required": True},
                {"key": "menu_allergens", "label": "Known allergens on the menu", "type": "textarea"},
                {"key": "state", "label": "State", "type": "select", "options": ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"]},
            ],
        },
    },
    "transport": {
        "fatigue_management_policy": {
            "label": "Fatigue Management Policy",
            "ref_prefix": "FAT", "category": "compliance",
            "system_prompt": "You are a senior Australian transport compliance expert specialising in fatigue management under HVNL.",
            "sections": ["Work and rest hour requirements (Standard / BFM / AFM with specific hour tables for Solo and Two-Up)",
                          "Fitness for duty procedure", "Scheduling responsibilities", "Driver responsibilities",
                          "Supervisor / scheduler responsibilities", "Record-keeping requirements", "Consequences of non-compliance"],
            "inputs": [
                {"key": "fatigue_option", "label": "Fatigue option", "type": "select", "options": ["Standard Hours", "BFM", "AFM"], "required": True},
                {"key": "two_up", "label": "Two-up driver operations", "type": "select", "options": ["yes", "no"]},
            ],
        },
        "driver_fitness_for_duty": {
            "label": "Driver Fitness for Duty Form",
            "ref_prefix": "FFD", "category": "compliance",
            "system_prompt": "You are an Australian transport compliance expert.",
            "sections": ["Form fields (driver, licence, date/time, trip details)",
                          "Self-declaration questions (sleep hours in last 24, hours awake, medications, conditions)",
                          "Drug and alcohol declaration", "Driver signature section",
                          "System validation rules (flags suggesting impairment or fatigue risk)"],
            "inputs": [
                {"key": "operator_name", "label": "Operator name", "type": "text", "required": True},
            ],
        },
        "vehicle_pretrip_inspection": {
            "label": "Vehicle Pre-Trip Inspection Form",
            "ref_prefix": "VPT", "category": "fleet",
            "system_prompt": "You are an Australian heavy-vehicle inspection expert aligned with NHVR requirements.",
            "sections": ["Inspection items by vehicle class (rigid / semi / B-train / van / light heavy)",
                          "Pass/fail per item", "Photo evidence requirements (mandatory on fail)",
                          "Defect classification (minor / major / safety-critical)",
                          "Out-of-service criteria"],
            "inputs": [
                {"key": "vehicle_class", "label": "Vehicle class", "type": "select", "options": ["rigid", "semi", "B-train", "van", "light heavy"], "required": True},
                {"key": "load_type", "label": "Load type", "type": "select", "options": ["refrigerated", "dangerous goods", "general", "bulk"]},
            ],
        },
        "load_restraint_plan": {
            "label": "Load Restraint Plan",
            "ref_prefix": "LRP", "category": "fleet",
            "system_prompt": "You are an Australian load restraint expert aligned with Load Restraint Guide 2025.",
            "sections": ["Cargo description and mass", "Restraint method (chains / straps / airbags)",
                          "Number and placement of restraint points", "Performance standard confirmation",
                          "Loader and driver responsibilities", "Pre-departure check requirements"],
            "inputs": [
                {"key": "vehicle_type", "label": "Vehicle type / deck config", "type": "text", "required": True},
                {"key": "cargo", "label": "Cargo type and description", "type": "textarea", "required": True},
                {"key": "total_mass", "label": "Total mass (kg)", "type": "text"},
                {"key": "restraint_points", "label": "Number of restraint points available", "type": "text"},
            ],
        },
        "drug_alcohol_policy": {
            "label": "Drug & Alcohol Policy (Transport)",
            "ref_prefix": "DAP", "category": "compliance",
            "system_prompt": "You are an Australian transport compliance expert.",
            "sections": ["Policy statement (zero tolerance)", "Applicable law (HVNL and state WHS)",
                          "Testing procedures", "Pre-employment / Post-incident / Random testing",
                          "Return-to-work after positive test", "Record-keeping requirements", "Consequences of breach"],
            "inputs": [
                {"key": "operator_name", "label": "Operator name", "type": "text", "required": True},
            ],
        },
        "vehicle_maintenance_procedure": {
            "label": "Vehicle Maintenance Management Procedure",
            "ref_prefix": "VMP", "category": "fleet",
            "system_prompt": "You are an Australian heavy-vehicle compliance expert.",
            "sections": ["Preventive maintenance schedule by vehicle type",
                          "Inspection frequency (daily / weekly / monthly / annually)",
                          "Defect classification (minor / major / safety-critical)",
                          "Out-of-service criteria", "Rectification timeframes by defect class",
                          "Record-keeping requirements", "Maintenance provider management"],
            "inputs": [
                {"key": "fleet_size", "label": "Fleet size", "type": "select", "options": ["1-5", "6-20", "21-50", "51-100", "100+"]},
            ],
        },
        "transport_safety_management_plan": {
            "label": "Transport Safety Management Plan (NHVAS-aligned)",
            "ref_prefix": "TSM", "category": "compliance",
            "system_prompt": "You are an Australian transport compliance expert specialising in NHVAS accreditation.",
            "sections": ["Safety management objectives", "Safety risk management process",
                          "Key performance indicators", "Internal audit schedule",
                          "Management review process", "Continuous improvement framework"],
            "inputs": [
                {"key": "operator_name", "label": "Operator name", "type": "text", "required": True},
                {"key": "accred_modules", "label": "NHVAS modules sought", "type": "textarea", "placeholder": "Fatigue / Maintenance / Mass"},
            ],
        },
        "nhvas_audit_pack": {
            "label": "NHVAS Audit Preparation Pack",
            "ref_prefix": "NHVAS", "category": "compliance",
            "system_prompt": "You are a senior Australian transport compliance expert preparing for an NHVAS audit.",
            "sections": ["Audit scope and modules covered", "Evidence checklist per module (Fatigue / Maintenance / Mass Management)",
                          "Self-assessment rating per requirement", "Gaps identified and remediation plan",
                          "Records sample pull list", "Auditor Q&A preparation", "Management sign-off"],
            "inputs": [
                {"key": "operator_name", "label": "Operator", "type": "text", "required": True},
                {"key": "modules", "label": "Modules", "type": "select", "options": ["Fatigue", "Maintenance", "Mass", "All three"], "required": True},
                {"key": "audit_date", "label": "Scheduled audit date", "type": "text"},
            ],
        },
        "nhvr_notifiable_occurrence": {
            "label": "NHVR Notifiable Occurrence Report",
            "ref_prefix": "NHVRO", "category": "compliance",
            "system_prompt": "You are an Australian transport compliance expert preparing an HVNL s596A Notifiable Occurrence report.",
            "sections": ["Operator and vehicle details", "Driver details", "Date/time and location of occurrence",
                          "Nature of occurrence (death / serious injury / rollover / load loss / DG release)",
                          "Immediate actions taken", "Root cause / contributing factors analysis",
                          "Corrective actions completed and planned", "Submission instructions to NHVR (1300 696 487)"],
            "inputs": [
                {"key": "operator_name", "label": "Operator", "type": "text", "required": True},
                {"key": "vehicle_rego", "label": "Vehicle rego", "type": "text"},
                {"key": "occurrence_type", "label": "Occurrence type", "type": "select", "options": ["death", "serious injury", "rollover", "load loss", "dangerous goods release"], "required": True},
                {"key": "when", "label": "When it occurred", "type": "text"},
                {"key": "summary", "label": "Summary", "type": "textarea", "required": True},
            ],
        },
    },
    "healthcare": {
        "swp_hoist_transfer": {
            "label": "Safe Work Procedure — Hoist Transfer",
            "ref_prefix": "SWP", "category": "clinical",
            "system_prompt": "You are an Australian clinical WHS consultant.",
            "sections": ["Purpose and scope", "Who this procedure applies to", "Equipment required",
                          "Pre-use hoist inspection steps", "Sling selection and attachment",
                          "Transfer steps (numbered, detailed)", "Post-transfer checks",
                          "Hoist storage requirements", "Emergency procedure if hoist fails with client suspended",
                          "Training requirement", "Review date"],
            "inputs": [
                {"key": "hoist_type", "label": "Hoist type", "type": "select", "options": ["ceiling", "mobile"], "required": True},
                {"key": "client_type", "label": "Client setting", "type": "select", "options": ["residential", "home care", "hospital"], "required": True},
            ],
        },
        "swp_aggressive_behaviour": {
            "label": "SWP — Aggressive Behaviour Response",
            "ref_prefix": "SWP", "category": "clinical",
            "system_prompt": "You are an Australian clinical WHS consultant specialising in violence and aggression in healthcare.",
            "sections": ["Risk factors for aggression in this setting", "Early warning signs",
                          "De-escalation procedures (verbal)", "Physical response procedures",
                          "Reporting requirements (WHS incident + clinical event)",
                          "Post-incident support (EAP referral)", "Pattern reporting requirements", "Training requirements"],
            "inputs": [
                {"key": "setting_type", "label": "Setting type", "type": "select", "options": ["aged care", "disability", "acute", "community mental health"], "required": True},
                {"key": "client_population", "label": "Client population", "type": "text"},
            ],
        },
        "infection_control_policy": {
            "label": "Infection Control Policy",
            "ref_prefix": "ICP", "category": "clinical",
            "system_prompt": "You are an Australian clinical infection control expert (CICM-aligned).",
            "sections": ["Standard precautions (PPE, hand hygiene)", "Transmission-based precautions",
                          "Sharps handling and disposal", "Personal protective equipment requirements",
                          "Hand hygiene procedure (WHO 5 moments)", "Cleaning and disinfection procedures",
                          "Waste management", "Exposure incident response", "Staff vaccination requirements", "Outbreak management procedure"],
            "inputs": [
                {"key": "setting_type", "label": "Setting type", "type": "select", "options": ["aged care", "disability", "hospital", "clinic", "community"], "required": True},
                {"key": "services", "label": "Services provided", "type": "textarea"},
                {"key": "immunocompromised", "label": "Immunocompromised population", "type": "select", "options": ["yes", "no"]},
            ],
        },
        "acqsc_evidence_pack": {
            "label": "ACQSC Quality Standard Evidence Pack",
            "ref_prefix": "ACQ", "category": "compliance",
            "system_prompt": "You are an Australian aged care compliance expert specialising in the Strengthened Aged Care Quality Standards.",
            "sections": ["Evidence summary narrative", "Linked incidents", "Corrective actions completed",
                          "Training completion records", "Policy documents linked",
                          "Non-conformance history and resolution", "Self-assessment rating with justification"],
            "inputs": [
                {"key": "standard", "label": "Quality Standard", "type": "select", "options": ["1", "2", "3", "4", "5", "6", "7", "8"], "required": True},
                {"key": "service_name", "label": "Service name", "type": "text", "required": True},
            ],
        },
        "ndis_evidence_pack": {
            "label": "NDIS Compliance Evidence Pack",
            "ref_prefix": "NDIS", "category": "compliance",
            "system_prompt": "You are an Australian disability sector compliance expert specialising in NDIS Practice Standards.",
            "sections": ["Evidence narrative per Module", "Linked records", "Gap analysis", "Corrective actions"],
            "inputs": [
                {"key": "module", "label": "Practice Standards Module", "type": "select", "options": ["Rights and Responsibilities", "Governance and Operational Management", "Provision of Supports", "Support Provision Environment"], "required": True},
                {"key": "provider_name", "label": "Provider name", "type": "text", "required": True},
            ],
        },
        "worker_screening_compliance": {
            "label": "Worker Screening Compliance Record",
            "ref_prefix": "WSC", "category": "compliance",
            "system_prompt": "You are an Australian healthcare compliance expert.",
            "sections": ["Compliance overview", "Per-staff tracking template (Name | NDIS Worker Screening | Aged care screening | WWCC | Vaccinations | Status)",
                          "Compliance gaps identified", "Renewal schedule"],
            "inputs": [
                {"key": "staff_count", "label": "Number of staff", "type": "text"},
                {"key": "service_type", "label": "Service type", "type": "select", "options": ["aged care", "disability (NDIS)", "both"]},
            ],
        },
        "psychosocial_risk_assessment": {
            "label": "Psychosocial Risk Assessment (Healthcare)",
            "ref_prefix": "PRA", "category": "clinical",
            "system_prompt": "You are an Australian clinical psychosocial safety expert.",
            "sections": ["Hazard identification (client-initiated violence, secondary trauma, moral injury, burnout, understaffing, shift work, harassment)",
                          "Risk rating per hazard (5x5 matrix)", "Controls per hazard",
                          "Owner and review date", "Monitoring and review schedule"],
            "inputs": [
                {"key": "setting_type", "label": "Setting type", "type": "text", "required": True},
                {"key": "staff_roles", "label": "Staff roles", "type": "textarea"},
                {"key": "known_risks", "label": "Known psychosocial risks in this setting", "type": "textarea"},
            ],
        },
        "sirs_investigation_report": {
            "label": "SIRS Investigation Report (Post-24h)",
            "ref_prefix": "SIRSI", "category": "compliance",
            "system_prompt": "You are a senior Australian aged care compliance expert preparing a SIRS 30-day follow-up investigation report.",
            "sections": ["Incident details (category, consumer, staff, when, where)",
                          "Immediate actions taken", "Consumer welfare + family notification",
                          "Staff interviewed and summary", "Root cause analysis",
                          "Systemic issues identified", "Corrective and preventive actions (with owners + due dates)",
                          "Lessons learned", "Board / provider governance review", "ACQSC submission reference"],
            "inputs": [
                {"key": "service_name", "label": "Service name", "type": "text", "required": True},
                {"key": "category", "label": "SIRS category", "type": "text", "required": True},
                {"key": "incident_date", "label": "Incident date", "type": "text", "required": True},
            ],
        },
    },
    "retail": {
        "spill_response_procedure": {
            "label": "Spill Response Procedure",
            "ref_prefix": "SPL", "category": "wellbeing",
            "system_prompt": "You are an Australian retail WHS consultant.",
            "sections": ["Immediate response (cordon area, signage)", "PPE required per substance type",
                          "Spill containment steps", "Cleaning procedure and materials",
                          "Incident reporting trigger", "Disposal requirements (chemical spills)", "Return-to-service check"],
            "inputs": [
                {"key": "substance_types", "label": "Substance types", "type": "textarea", "placeholder": "water, oil, chemical cleaning product, food"},
                {"key": "store_type", "label": "Store type", "type": "select", "options": ["supermarket", "retail", "pharmacy", "bottle shop"]},
            ],
        },
        "customer_aggression_procedure": {
            "label": "Customer Aggression Response Procedure",
            "ref_prefix": "CAR", "category": "wellbeing",
            "system_prompt": "You are an Australian retail WHS expert.",
            "sections": ["Recognition of escalating behaviour", "De-escalation techniques",
                          "When to call security / police (000)", "Employee safety first — don't confront",
                          "Documentation requirements", "Post-incident support (EAP referral)", "Reporting procedure (WHS incident log)"],
            "inputs": [
                {"key": "store_type", "label": "Store type", "type": "text", "required": True},
            ],
        },
        "manual_handling_retail": {
            "label": "Manual Handling Procedure (Retail)",
            "ref_prefix": "MHR", "category": "wellbeing",
            "system_prompt": "You are an Australian retail WHS consultant.",
            "sections": ["Correct lifting technique (step by step)", "Team lift requirements (over 16kg)",
                          "Ladder safety steps", "Trolley and pallet jack operation",
                          "Repetitive task rotation requirements", "Reporting musculoskeletal symptoms"],
            "inputs": [
                {"key": "manual_tasks", "label": "Types of manual tasks", "type": "textarea", "placeholder": "shelf stocking / goods receiving / ladder use / pushing trolleys"},
                {"key": "max_weights", "label": "Maximum product weights typically handled", "type": "text"},
            ],
        },
        "emergency_plan_retail": {
            "label": "Emergency Plan (Retail)",
            "ref_prefix": "EMP", "category": "wellbeing",
            "system_prompt": "You are an Australian retail WHS consultant.",
            "sections": ["Fire response procedure", "Medical emergency response", "Robbery response",
                          "Bomb threat procedure", "Evacuation map instructions", "Staff roles in emergency",
                          "Emergency contact list", "First aid location", "AED location (if applicable)"],
            "inputs": [
                {"key": "store_address", "label": "Store address", "type": "text", "required": True},
                {"key": "layout", "label": "Layout description", "type": "textarea"},
                {"key": "staff_count", "label": "Staff count + typical customer count", "type": "text"},
                {"key": "assembly_point", "label": "Emergency assembly point", "type": "text"},
            ],
        },
        "induction_full_retail": {
            "label": "Retail Staff Induction (Full)",
            "ref_prefix": "IND", "category": "induction",
            "system_prompt": "You are an Australian retail WHS consultant.",
            "sections": ["All hazards for this store", "Emergency procedures", "Manual handling technique",
                          "Spill response", "Working alone procedure", "Reporting a hazard",
                          "Customer aggression response", "PPE location and use"],
            "inputs": [
                {"key": "store_type", "label": "Store type", "type": "text", "required": True},
                {"key": "role", "label": "Role", "type": "select", "options": ["permanent", "part-time"]},
            ],
        },
        "induction_quick_retail": {
            "label": "Retail Quick Induct (3-min Casual)",
            "ref_prefix": "IND", "category": "induction",
            "system_prompt": "You are an Australian retail WHS consultant — produce a 3-minute induction for casual staff.",
            "sections": ["Emergency exits and assembly point", "Most critical hazard for this store",
                          "Spill response — where is the sign and mop", "Who to call if something happens", "Digital sign-off"],
            "inputs": [
                {"key": "store_type", "label": "Store type", "type": "text", "required": True},
            ],
        },
        "lone_worker_procedure": {
            "label": "Lone Worker Procedure",
            "ref_prefix": "LWP", "category": "wellbeing",
            "system_prompt": "You are an Australian retail WHS consultant.",
            "sections": ["Definition of lone worker shifts", "Check-in interval and method",
                          "What to do if check-in is missed (manager)", "Escalation contacts in order",
                          "Emergency procedures for lone worker", "Incident reporting requirements"],
            "inputs": [
                {"key": "store_type", "label": "Store type", "type": "text", "required": True},
                {"key": "lone_shifts", "label": "When are lone shifts typically scheduled?", "type": "text"},
            ],
        },
    },
}


def build_extra_specs():
    """Returns the extra registry slice with prompts compiled."""
    out = {}
    for industry, types in EXTRA_DOC_TYPES.items():
        out[industry] = {}
        for slug, spec in types.items():
            out[industry][slug] = {
                "label": spec["label"],
                "ref_prefix": spec["ref_prefix"],
                "category": spec["category"],
                "system_prompt": spec["system_prompt"],
                "user_prompt_template": _generic_prompt(
                    f"Generate a complete {spec['label']} for an Australian business.",
                    spec["sections"],
                ),
                "inputs": spec["inputs"],
            }
    return out
