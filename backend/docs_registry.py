"""
Document Library doc-type registry.
Each type registers its form fields, AI prompt, PDF renderer, and counter prefix.
Split from docs_module.py for maintainability.
"""
from __future__ import annotations

from typing import Any

from docs_pdf import (
    STATE_REGULATORS,
    render_jsa, render_risk_assessment, render_sssp, render_emergency_plan,
    render_haz_chemicals, render_site_induction, render_confined_space,
    render_toolbox_record,
    render_whs_mgmt_plan, render_asbestos_register, render_ccew,
    render_plumbing_coc, render_hot_work_permit, render_excavation_permit,
    render_lift_plan, render_fall_protection,
    render_gas_compliance, render_pressure_test, render_backflow_test,
    render_tmp, render_plant_prestart, render_scaffold_handover,
    render_heights_permit, render_loto, render_manual_handling_ra,
    render_noise_assessment, render_silica_plan, render_welding_procedure,
    render_test_tag_register, render_fire_safety_plan, render_emp,
)


CATEGORIES = [
    {"id": "safety", "label": "Safety Documents",
     "blurb": "SWMS, JSA, risk assessment, site safety plan, emergency plan",
     "icon": "ShieldCheck"},
    {"id": "worker", "label": "Worker Documents",
     "blurb": "Inductions, fit-for-work, training records",
     "icon": "UserCircle"},
    {"id": "contractor", "label": "Contractor Documents",
     "blurb": "Prequalification, site acknowledgements",
     "icon": "Handshake"},
    {"id": "incident", "label": "Incident Documents",
     "blurb": "Incident + investigation + RTW + register",
     "icon": "Warning"},
    {"id": "plant", "label": "Plant Documents",
     "blurb": "Pre-start, service, test & tag, defect",
     "icon": "Wrench"},
    {"id": "trade", "label": "Trade-Specific Documents",
     "blurb": "CCEW, NOW/COC, gas, pressure, backflow",
     "icon": "Clipboard"},
]


DOC_TYPES: dict[str, dict[str, Any]] = {}


def register_doc_type(spec: dict):
    DOC_TYPES[spec["id"]] = spec


def _f(key, label, type_="text", **kw):
    return {"key": key, "label": label, "type": type_, **kw}


register_doc_type({
    "id": "jsa", "category": "safety",
    "label": "Job Safety Analysis (JSA)",
    "blurb": "Hazard identification for non-HRCW tasks",
    "counter_prefix": "JSA",
    "fields": [
        _f("task", "Task description", "text", required=True),
        _f("site", "Site location"),
        _f("work_date", "Work date", "date"),
        _f("prepared_by", "Prepared by"),
        _f("worker_names", "Workers", "chips"),
        _f("steps", "Steps (with hazards + controls)", "jsa_steps"),
        _f("ppe", "PPE required", "chips"),
    ],
    "ai_prompt": ("Given a JSA task + trade, return JSON: {steps:[{step, hazards:[str], "
                  "controls:[str]}, ...]} with 4-6 steps in logical sequence."),
    "pdf": render_jsa,
})

register_doc_type({
    "id": "risk_assessment", "category": "safety",
    "label": "Risk Assessment",
    "blurb": "Activity risk identification with inherent + residual scoring",
    "counter_prefix": "RA",
    "fields": [
        _f("activity", "Activity", "text", required=True),
        _f("site", "Site"),
        _f("trade", "Trade"),
        _f("prepared_by", "Prepared by"),
        _f("review_date", "Review date", "date"),
        _f("items", "Hazards + controls", "risk_items"),
    ],
    "ai_prompt": ("Given an activity + trade, return JSON: {items:[{hazard, "
                  "inherent_likelihood (1-5), inherent_consequence (1-5), "
                  "controls, residual_likelihood (1-5), residual_consequence (1-5), "
                  "responsible}, ...]} with 4-6 items."),
    "pdf": render_risk_assessment,
})

register_doc_type({
    "id": "sssp", "category": "safety",
    "label": "Site-Specific Safety Plan (SSSP)",
    "blurb": "Single-page site safety summary",
    "counter_prefix": "SSSP",
    "fields": [
        _f("site_name", "Site name", required=True),
        _f("site_address", "Site address"),
        _f("site_state", "Site state", "state"),
        _f("principal_contractor", "Principal contractor"),
        _f("site_supervisor", "Site supervisor"),
        _f("supervisor_phone", "Supervisor phone"),
        _f("nearest_hospital", "Nearest hospital"),
        _f("assembly_point", "Assembly point"),
        _f("first_aider", "First aider on site"),
        _f("hazards", "Site-specific hazards", "chips"),
        _f("site_rules", "Site rules", "chips"),
        _f("ppe", "PPE requirements", "chips"),
        _f("induction_requirements", "Induction requirements", "textarea"),
    ],
    "ai_prompt": ("Given a site name + trade, return JSON: {hazards:[str], "
                  "site_rules:[str], ppe:[str], induction_requirements}"),
    "pdf": render_sssp,
})

register_doc_type({
    "id": "emergency_plan", "category": "safety",
    "label": "Emergency Plan",
    "blurb": "Emergency response procedures (WHS Reg 43 — required for every workplace)",
    "counter_prefix": "EP",
    "fields": [
        _f("site_name", "Site name", required=True),
        _f("site_address", "Site address"),
        _f("site_state", "Site state", "state"),
        _f("prepared_by", "Prepared by"),
        _f("nearest_hospital", "Nearest hospital"),
        _f("assembly_point", "Assembly point"),
        _f("emergency_contacts", "Emergency contacts (name/role/phone)", "contacts"),
        _f("evacuation_procedure", "Evacuation procedure", "textarea"),
        _f("emergency_equipment", "Emergency equipment (equipment/location)", "equipment"),
        _f("procedures", "Specific procedures", "emergency_procs"),
    ],
    "ai_prompt": ("Given a site name + state, return JSON: {evacuation_procedure, "
                  "procedures:{fire, medical, chemical_spill, electric_shock, "
                  "fall_from_height, structural_collapse, flood}}"),
    "pdf": render_emergency_plan,
})

register_doc_type({
    "id": "hazardous_chemicals", "category": "safety",
    "label": "Hazardous Chemicals Register",
    "blurb": "SDS register (WHS Regulations Reg 346)",
    "counter_prefix": "HCR",
    "fields": [
        _f("company_name", "Business name", required=True),
        _f("site_location", "Site / location"),
        _f("prepared_by", "Compiled by"),
        _f("review_date", "Review date", "date"),
        _f("chemicals", "Chemicals (product/manufacturer/SDS/class/location)", "chemicals"),
    ],
    "ai_prompt": None,
    "pdf": render_haz_chemicals,
})

register_doc_type({
    "id": "site_induction", "category": "worker",
    "label": "Site Induction Checklist",
    "blurb": "Worker induction record (WHS Regulations Reg 316-317)",
    "counter_prefix": "IND",
    "fields": [
        _f("worker_name", "Worker name", required=True),
        _f("worker_role", "Trade / role"),
        _f("site_name", "Site"),
        _f("inducted_by", "Inducted by"),
        _f("induction_date", "Induction date", "date"),
        _f("checklist", "Checklist (item / done)", "checklist"),
        _f("signature_data", "Signature (typed or drawn)"),
        _f("signed_at", "Signed at", "datetime"),
    ],
    "ai_prompt": None,
    "pdf": render_site_induction,
})

register_doc_type({
    "id": "confined_space_permit", "category": "safety",
    "label": "Confined Space Entry Permit",
    "blurb": "Entry permit (WHS Regulations Reg 66-77)",
    "counter_prefix": "CSP",
    "fields": [
        _f("space_id", "Space name/ID", required=True),
        _f("location", "Location"),
        _f("work_description", "Nature of work", "textarea"),
        _f("entry_datetime", "Date/time of entry", "datetime"),
        _f("duration", "Duration of permit"),
        _f("authorised_workers", "Authorised workers", "chips"),
        _f("atmosphere", "Atmospheric testing", "atmosphere"),
        _f("entry_controls", "Entry controls", "chips"),
        _f("standby_person", "Standby person"),
        _f("communication", "Communication method"),
        _f("emergency_procedures", "Emergency procedures", "textarea"),
        _f("authorised_by", "Authorised by"),
        _f("authorised_by_signature", "Auth signature / ID"),
        _f("authorised_at", "Authorised at", "datetime"),
        _f("rescinded_at", "Rescinded at", "datetime"),
    ],
    "ai_prompt": None,
    "pdf": render_confined_space,
})

register_doc_type({
    "id": "toolbox_talk_record", "category": "safety",
    "label": "Toolbox Talk Record",
    "blurb": "Pre-start safety briefing",
    "counter_prefix": "TBT",
    "fields": [
        _f("topic", "Topic", required=True),
        _f("site", "Site"),
        _f("talk_date", "Date", "date"),
        _f("conducted_by", "Conducted by"),
        _f("duration_mins", "Duration (mins)", "number"),
        _f("key_points", "Key points", "chips"),
        _f("discussion", "Worker questions / discussion", "textarea"),
        _f("attendees", "Attendees", "attendees"),
    ],
    "ai_prompt": ("Given a topic + trade, return JSON: {key_points:[str (5-7 items)], "
                  "discussion: short paragraph}"),
    "pdf": render_toolbox_record,
})

register_doc_type({
    "id": "whs_mgmt_plan", "category": "safety",
    "label": "WHS Management Plan",
    "blurb": "Principal Contractor WHS plan (WHS Reg 309 — required for construction projects > A$250k)",
    "counter_prefix": "WMP",
    "fields": [
        _f("project_name", "Project name", required=True),
        _f("principal_contractor", "Principal contractor"),
        _f("site_address", "Site address"),
        _f("site_state", "Site state", "state"),
        _f("project_value", "Project value (A$)"),
        _f("project_duration", "Project duration"),
        _f("prepared_by", "Prepared by"),
        _f("review_date", "Review date", "date"),
        _f("scope_of_work", "Scope of work", "textarea"),
        _f("key_personnel", "Key personnel (name/role/phone)", "contacts"),
        _f("responsibilities", "WHS responsibilities (role/responsibility)", "responsibilities"),
        _f("risk_management_approach", "Risk management approach", "textarea"),
        _f("consultation_arrangements", "Consultation arrangements", "textarea"),
        _f("training_requirements", "Training requirements", "chips"),
        _f("monitoring_review", "Monitoring & review", "textarea"),
    ],
    "ai_prompt": ("Given a project name + trade, return JSON: {scope_of_work, "
                  "risk_management_approach, consultation_arrangements, "
                  "training_requirements:[str], monitoring_review}"),
    "pdf": render_whs_mgmt_plan,
})

register_doc_type({
    "id": "asbestos_register", "category": "safety",
    "label": "Asbestos Register",
    "blurb": "ACM register — mandatory for pre-2004 workplaces (WHS Reg 425)",
    "counter_prefix": "ASB",
    "fields": [
        _f("site_name", "Site name", required=True),
        _f("site_address", "Site address"),
        _f("prepared_by", "Prepared by"),
        _f("assessor_name", "Competent assessor name"),
        _f("inspection_date", "Inspection date", "date"),
        _f("next_review", "Next review date", "date"),
        _f("items", "ACM items (location/material/friable/condition/risk/control/accessible)",
           "asbestos_items"),
    ],
    "ai_prompt": None,
    "pdf": render_asbestos_register,
})

register_doc_type({
    "id": "ccew", "category": "trade",
    "label": "Certificate of Compliance — Electrical Work (CCEW)",
    "blurb": "NSW electrical certificate (AS/NZS 3000)",
    "counter_prefix": "CCEW",
    "fields": [
        _f("licensee_name", "Licensee name", required=True),
        _f("licence_no", "Licence number"),
        _f("contractor_name", "Contractor / company"),
        _f("customer_name", "Customer"),
        _f("site_address", "Site address"),
        _f("work_type", "Work type"),
        _f("installation_type", "Installation type"),
        _f("work_date", "Work date", "date"),
        _f("scope", "Scope of work", "textarea"),
        _f("tested_items", "Tested items", "chips"),
        _f("test_results", "Test results (test/result)", "test_results"),
        _f("compliance_statement", "Compliance statement", "textarea"),
        _f("signed_by", "Signed by"),
        _f("signature", "Signature / ID"),
        _f("signed_at", "Signed at", "datetime"),
    ],
    "ai_prompt": None,
    "pdf": render_ccew,
})

register_doc_type({
    "id": "plumbing_coc", "category": "trade",
    "label": "Plumbing NOW / Certificate of Compliance",
    "blurb": "Notice of Work & Certificate of Compliance (AS/NZS 3500)",
    "counter_prefix": "PLB",
    "fields": [
        _f("licensee_name", "Licensee name", required=True),
        _f("licence_no", "Licence number"),
        _f("company_name", "Company"),
        _f("job_site", "Job site"),
        _f("job_type", "Job type (sanitary/water/drain/gas)"),
        _f("authority", "Council / authority"),
        _f("inspection_required", "Inspection required (Y/N)"),
        _f("work_date", "Work date", "date"),
        _f("now_reference", "NOW reference"),
        _f("scope", "Scope of work", "textarea"),
        _f("work_items", "Work items (item/standard/result)", "plumbing_items"),
        _f("compliance_statement", "Compliance statement", "textarea"),
        _f("signed_by", "Signed by"),
        _f("signature", "Signature / ID"),
        _f("signed_at", "Signed at", "datetime"),
    ],
    "ai_prompt": None,
    "pdf": render_plumbing_coc,
})

register_doc_type({
    "id": "hot_work_permit", "category": "safety",
    "label": "Hot Work Permit",
    "blurb": "Welding / cutting / grinding — fire risk control",
    "counter_prefix": "HWP",
    "fields": [
        _f("location", "Location", required=True),
        _f("work_description", "Nature of work", "textarea"),
        _f("start_datetime", "Start date/time", "datetime"),
        _f("duration", "Duration"),
        _f("authorised_workers", "Authorised workers", "chips"),
        _f("fire_watch_person", "Fire watch person"),
        _f("extinguisher_on_site", "Extinguisher on site"),
        _f("post_work_watch_mins", "Post-work watch (mins)", "number"),
        _f("precautions", "Pre-start precautions (item/done)", "checklist"),
        _f("atmosphere_tested", "Atmosphere tested (Y/N)"),
        _f("atmosphere_tested_by", "Tested by"),
        _f("atmosphere_tested_at", "Test time", "datetime"),
        _f("emergency_procedures", "Emergency procedures", "textarea"),
        _f("authorised_by", "Authorised by"),
        _f("authorised_by_signature", "Auth signature / ID"),
        _f("authorised_at", "Authorised at", "datetime"),
        _f("rescinded_at", "Rescinded at", "datetime"),
    ],
    "ai_prompt": None,
    "pdf": render_hot_work_permit,
})

register_doc_type({
    "id": "excavation_permit", "category": "safety",
    "label": "Excavation Permit",
    "blurb": "Ground disturbance control (WHS Reg 304)",
    "counter_prefix": "EXP",
    "fields": [
        _f("location", "Location", required=True),
        _f("work_description", "Nature of work", "textarea"),
        _f("depth_metres", "Depth (metres)", "number"),
        _f("start_datetime", "Start date/time", "datetime"),
        _f("duration", "Duration"),
        _f("services_checked", "Services check — DBYD (item/done)", "checklist"),
        _f("barricades", "Barricades & signage", "chips"),
        _f("spoil_location", "Spoil location", "textarea"),
        _f("plant_equipment", "Plant & equipment", "chips"),
        _f("authorised_workers", "Authorised workers", "chips"),
        _f("emergency_procedures", "Emergency procedures", "textarea"),
        _f("authorised_by", "Authorised by"),
        _f("authorised_by_signature", "Auth signature / ID"),
        _f("authorised_at", "Authorised at", "datetime"),
        _f("rescinded_at", "Rescinded at", "datetime"),
    ],
    "ai_prompt": None,
    "pdf": render_excavation_permit,
})

register_doc_type({
    "id": "lift_plan", "category": "plant",
    "label": "Lift Plan",
    "blurb": "Crane / lifting operations — AS 2550",
    "counter_prefix": "LIFT",
    "fields": [
        _f("site", "Site", required=True),
        _f("lift_date", "Lift date", "date"),
        _f("load_description", "Load description"),
        _f("load_weight_kg", "Load weight (kg)", "number"),
        _f("working_radius", "Working radius (m)"),
        _f("lift_height", "Lift height (m)"),
        _f("crane_type", "Crane type"),
        _f("crane_capacity_kg", "Crane capacity (kg)", "number"),
        _f("capacity_utilised", "Capacity utilised (%)"),
        _f("rigging_config", "Rigging configuration"),
        _f("dogger_name", "Dogger name"),
        _f("rigger_name", "Rigger name"),
        _f("crane_operator", "Crane operator"),
        _f("lift_sequence", "Lift sequence", "textarea"),
        _f("hazards", "Hazards", "chips"),
        _f("controls", "Controls", "chips"),
        _f("exclusion_zone", "Exclusion zone", "textarea"),
        _f("prepared_by", "Prepared by"),
        _f("approved_by", "Approved by"),
        _f("approved_at", "Approved at", "datetime"),
    ],
    "ai_prompt": ("Given a load description + crane type, return JSON: "
                  "{hazards:[str], controls:[str], lift_sequence, exclusion_zone}"),
    "pdf": render_lift_plan,
})

register_doc_type({
    "id": "fall_protection", "category": "safety",
    "label": "Fall Protection Plan",
    "blurb": "Working at heights (WHS Reg 78)",
    "counter_prefix": "FPP",
    "fields": [
        _f("site", "Site", required=True),
        _f("work_area", "Work area"),
        _f("height_metres", "Height (metres)", "number"),
        _f("work_date", "Work date", "date"),
        _f("work_description", "Nature of work", "textarea"),
        _f("edge_protection", "Edge protection", "chips"),
        _f("fall_arrest_systems", "Fall arrest systems", "chips"),
        _f("anchor_points", "Anchor points", "textarea"),
        _f("rescue_plan", "Rescue plan", "textarea"),
        _f("authorised_workers", "Authorised workers", "chips"),
        _f("pre_start_check", "Pre-start check (item/done)", "checklist"),
        _f("prepared_by", "Prepared by"),
        _f("approved_by", "Approved by"),
        _f("approved_at", "Approved at", "datetime"),
    ],
    "ai_prompt": ("Given a work area + height, return JSON: {edge_protection:[str], "
                  "fall_arrest_systems:[str], anchor_points, rescue_plan}"),
    "pdf": render_fall_protection,
})

register_doc_type({
    "id": "gas_compliance", "category": "trade",
    "label": "Gas Compliance Certificate",
    "blurb": "AS/NZS 5601 — State gas regulations (gasfitting work)",
    "counter_prefix": "GAS",
    "fields": [
        _f("licensee_name", "Licensee name", required=True),
        _f("licence_no", "Licence number"),
        _f("company_name", "Company"),
        _f("customer_name", "Customer"),
        _f("site_address", "Site address"),
        _f("gas_type", "Gas type (NG/LPG)"),
        _f("appliance_type", "Appliance type"),
        _f("appliance_model", "Appliance model / serial"),
        _f("work_date", "Work date", "date"),
        _f("scope", "Scope of work", "textarea"),
        _f("tests", "Tests performed (test/result)", "test_results"),
        _f("compliance_statement", "Compliance statement", "textarea"),
        _f("signed_by", "Signed by"),
        _f("signature", "Signature / ID"),
        _f("signed_at", "Signed at", "datetime"),
    ],
    "ai_prompt": None,
    "pdf": render_gas_compliance,
})

register_doc_type({
    "id": "pressure_test", "category": "trade",
    "label": "Pressure Test Record",
    "blurb": "AS/NZS 3500 · AS 4041 — Pipe pressure testing",
    "counter_prefix": "PT",
    "fields": [
        _f("project", "Project / site", required=True),
        _f("client", "Client"),
        _f("system_tested", "System tested"),
        _f("test_standard", "Test standard"),
        _f("pipe_material", "Pipe material / size"),
        _f("test_date", "Test date", "date"),
        _f("test_medium", "Test medium (air/water/gas)"),
        _f("test_pressure_kpa", "Test pressure (kPa)", "number"),
        _f("hold_mins", "Hold duration (mins)", "number"),
        _f("start_pressure", "Start pressure (kPa)", "number"),
        _f("end_pressure", "End pressure (kPa)", "number"),
        _f("ambient_temp", "Ambient temp (°C)"),
        _f("result", "Result (pass/fail)"),
        _f("observations", "Observations", "textarea"),
        _f("tested_by", "Tested by"),
        _f("tester_licence", "Licence / accreditation"),
        _f("signature", "Signature"),
        _f("signed_at", "Signed at", "datetime"),
    ],
    "ai_prompt": None,
    "pdf": render_pressure_test,
})

register_doc_type({
    "id": "backflow_test", "category": "trade",
    "label": "Backflow Prevention Test Report",
    "blurb": "AS/NZS 2845.3 — Annual device testing",
    "counter_prefix": "BFT",
    "fields": [
        _f("site", "Site / customer", required=True),
        _f("site_address", "Site address"),
        _f("hazard_rating", "Hazard rating (low/med/high)"),
        _f("device_type", "Device type"),
        _f("device_model", "Device make / model"),
        _f("device_serial", "Device serial"),
        _f("install_location", "Install location"),
        _f("test_date", "Test date", "date"),
        _f("tests", "Test results (test/required/actual/result)", "backflow_tests"),
        _f("kit_model", "Test kit make / model"),
        _f("kit_calibration", "Kit calibration date", "date"),
        _f("next_test_due", "Next test due", "date"),
        _f("overall_result", "Overall result (pass/fail)"),
        _f("tester_name", "Tester name"),
        _f("tester_licence", "Licence number"),
        _f("signature", "Signature"),
        _f("signed_at", "Signed at", "datetime"),
    ],
    "ai_prompt": None,
    "pdf": render_backflow_test,
})

register_doc_type({
    "id": "tmp", "category": "safety",
    "label": "Traffic Management Plan (TMP)",
    "blurb": "AS 1742.3 · State TMP guidelines",
    "counter_prefix": "TMP",
    "fields": [
        _f("project_name", "Project", required=True),
        _f("site_address", "Site address"),
        _f("authority", "Controlling authority / council"),
        _f("road_class", "Road classification"),
        _f("speed_zone", "Speed zone (km/h)", "number"),
        _f("work_hours", "Work hours"),
        _f("start_date", "Start date", "date"),
        _f("end_date", "End date", "date"),
        _f("scope", "Scope of work", "textarea"),
        _f("traffic_controls", "Traffic controls", "chips"),
        _f("signage", "Signage & devices (device/location/qty)", "tmp_signage"),
        _f("pedestrian_management", "Pedestrian management", "textarea"),
        _f("emergency_access", "Emergency access", "textarea"),
        _f("designer_name", "TMP designer name"),
        _f("designer_ticket", "Designer ticket (RIIWHS302D)"),
        _f("approved_by", "Approved by"),
        _f("approved_at", "Approved at", "datetime"),
    ],
    "ai_prompt": ("Given a project + road class, return JSON: {traffic_controls:[str], "
                  "pedestrian_management, emergency_access}"),
    "pdf": render_tmp,
})

register_doc_type({
    "id": "plant_prestart", "category": "plant",
    "label": "Plant / Equipment Pre-Start Check",
    "blurb": "WHS Reg 213 — Daily plant inspection",
    "counter_prefix": "PPS",
    "fields": [
        _f("plant_name", "Plant / equipment", required=True),
        _f("plant_serial", "Serial / plant number"),
        _f("operator_name", "Operator"),
        _f("operator_licence", "Operator ticket / HR licence"),
        _f("hours_start", "Hours / km start"),
        _f("site", "Site"),
        _f("check_date", "Check date", "date"),
        _f("checks", "Pre-start checks (item/done)", "checklist"),
        _f("defects", "Defects identified", "chips"),
        _f("corrective_action", "Corrective action", "textarea"),
        _f("fit_declaration", "Operator declaration (fit/unfit)"),
        _f("supervisor_signature", "Supervisor signature"),
        _f("signed_at", "Signed at", "datetime"),
    ],
    "ai_prompt": None,
    "pdf": render_plant_prestart,
})

register_doc_type({
    "id": "scaffold_handover", "category": "plant",
    "label": "Scaffold Handover Certificate",
    "blurb": "AS/NZS 4576 · AS/NZS 1576 — Scaffold inspection",
    "counter_prefix": "SCF",
    "fields": [
        _f("project", "Project", required=True),
        _f("site_address", "Site address"),
        _f("principal_contractor", "Principal contractor"),
        _f("scaffold_type", "Scaffold type"),
        _f("max_swl", "Max SWL (kg/m²)", "number"),
        _f("load_class", "Load class (light/medium/heavy)"),
        _f("height", "Scaffold height (m)", "number"),
        _f("scaffolder_name", "Scaffolder name"),
        _f("scaffolder_ticket", "Ticket class (basic/int/adv)"),
        _f("scaffolder_ticket_no", "Ticket number"),
        _f("scaffold_company", "Scaffold company"),
        _f("erected_date", "Date erected", "date"),
        _f("inspection_checks", "Inspection checklist (item/done)", "checklist"),
        _f("restrictions", "Defects / restrictions", "chips"),
        _f("handed_to", "Handed to (PC/Builder rep)"),
        _f("scaffolder_signature", "Signed (scaffolder)"),
        _f("recipient_signature", "Signed (recipient)"),
        _f("next_inspection", "Next inspection due", "date"),
    ],
    "ai_prompt": None,
    "pdf": render_scaffold_handover,
})

register_doc_type({
    "id": "heights_permit", "category": "safety",
    "label": "Working at Heights Permit",
    "blurb": "WHS Reg 78 — Hierarchy of control for fall risks",
    "counter_prefix": "WAH",
    "fields": [
        _f("location", "Location", required=True),
        _f("work_description", "Nature of work", "textarea"),
        _f("height_metres", "Height above ground (m)", "number"),
        _f("start_datetime", "Start date/time", "datetime"),
        _f("duration", "Duration"),
        _f("authorised_workers", "Authorised workers", "chips"),
        _f("access_method", "Access method", "textarea"),
        _f("controls", "Fall prevention / arrest controls", "chips"),
        _f("rescue_plan", "Rescue plan", "textarea"),
        _f("pre_start_check", "Pre-start check (item/done)", "checklist"),
        _f("authorised_by", "Authorised by"),
        _f("authorised_by_signature", "Auth signature / ID"),
        _f("authorised_at", "Authorised at", "datetime"),
        _f("rescinded_at", "Rescinded at", "datetime"),
    ],
    "ai_prompt": None,
    "pdf": render_heights_permit,
})

register_doc_type({
    "id": "loto", "category": "safety",
    "label": "Lock-Out / Tag-Out Permit",
    "blurb": "AS/NZS 4024 — Isolation of hazardous energy",
    "counter_prefix": "LOTO",
    "fields": [
        _f("system", "Plant / system", required=True),
        _f("location", "Location"),
        _f("work_description", "Nature of work", "textarea"),
        _f("energy_sources", "Energy sources (all types)"),
        _f("start_datetime", "Start date/time", "datetime"),
        _f("isolation_points", "Isolation points (point/type/device/verified_by)", "loto_points"),
        _f("stored_energy_steps", "Stored-energy dissipation", "textarea"),
        _f("zero_energy_test", "Zero-energy verification", "textarea"),
        _f("authorised_workers", "Authorised workers", "chips"),
        _f("personnel_clear", "All personnel clear (Y/N)"),
        _f("removal_by", "Locks/tags removed by"),
        _f("reinstated_at", "Reinstated at", "datetime"),
        _f("authorised_by", "Authorised by"),
        _f("authorised_by_signature", "Auth signature / ID"),
        _f("authorised_at", "Authorised at", "datetime"),
    ],
    "ai_prompt": None,
    "pdf": render_loto,
})

register_doc_type({
    "id": "manual_handling_ra", "category": "safety",
    "label": "Manual Handling Risk Assessment",
    "blurb": "WHS Reg 60 — Hazardous manual tasks",
    "counter_prefix": "MHR",
    "fields": [
        _f("task", "Task", required=True),
        _f("site", "Site"),
        _f("assessed_by", "Assessed by"),
        _f("assessment_date", "Assessment date", "date"),
        _f("task_description", "Task description", "textarea"),
        _f("factors", "Risk factors — ManTRA (factor/rating/detail)", "mh_factors"),
        _f("controls", "Controls (hierarchy/control/responsible)", "mh_controls"),
        _f("residual_risk", "Residual risk", "textarea"),
        _f("review_date", "Review date", "date"),
        _f("approved_by", "Approved by"),
    ],
    "ai_prompt": ("Given a task description, return JSON: {factors:[{factor,rating,detail}], "
                  "controls:[{hierarchy,control,responsible}], residual_risk}"),
    "pdf": render_manual_handling_ra,
})

register_doc_type({
    "id": "noise_assessment", "category": "safety",
    "label": "Noise Assessment",
    "blurb": "WHS Reg 56-58 · AS/NZS 1269 (exposure standard 85 dB(A))",
    "counter_prefix": "NOISE",
    "fields": [
        _f("site", "Site", required=True),
        _f("assessor_name", "Assessor"),
        _f("meter_model", "Sound level meter"),
        _f("meter_calibration", "Meter calibration date", "date"),
        _f("assessment_date", "Assessment date", "date"),
        _f("measurements", "Measurements (source/location/dB(A)/duration/exposure)", "noise_measurements"),
        _f("exceedances", "Exceedances", "textarea"),
        _f("controls", "Controls", "chips"),
        _f("ppe", "PPE / hearing protection", "chips"),
        _f("audio_count", "Workers to be audiometry-tested", "number"),
        _f("audio_scheduled", "Testing scheduled for", "date"),
        _f("approved_by", "Approved by"),
        _f("review_date", "Review date", "date"),
    ],
    "ai_prompt": None,
    "pdf": render_noise_assessment,
})

register_doc_type({
    "id": "silica_plan", "category": "safety",
    "label": "Silica / Dust Control Plan",
    "blurb": "WHS Reg 49-50 — WES 0.05 mg/m³ silica dust",
    "counter_prefix": "SIL",
    "fields": [
        _f("project", "Project / site", required=True),
        _f("site_address", "Site address"),
        _f("trade", "Trade"),
        _f("prepared_by", "Prepared by"),
        _f("review_date", "Review date", "date"),
        _f("tasks", "Silica-generating tasks (task/material/duration/exposure)", "silica_tasks"),
        _f("engineering_controls", "Engineering controls", "chips"),
        _f("admin_controls", "Administrative controls", "chips"),
        _f("rpe", "RPE required (task/rpe_type/APF)", "rpe_items"),
        _f("air_monitoring", "Air monitoring", "textarea"),
        _f("health_monitoring", "Health monitoring", "textarea"),
        _f("training", "Training requirements", "chips"),
    ],
    "ai_prompt": ("Given a trade + tasks, return JSON: {engineering_controls:[str], "
                  "admin_controls:[str], air_monitoring, health_monitoring, training:[str]}"),
    "pdf": render_silica_plan,
})

register_doc_type({
    "id": "welding_procedure", "category": "trade",
    "label": "Welding Procedure Specification (WPS)",
    "blurb": "AS/NZS 3834 · AS/NZS 1554",
    "counter_prefix": "WPS",
    "fields": [
        _f("wps_number", "WPS number", required=True),
        _f("project", "Project"),
        _f("welding_process", "Welding process (MIG/TIG/MMAW/FCAW)"),
        _f("parent_material", "Parent material / grade"),
        _f("joint_type", "Joint type"),
        _f("position", "Position (1F/2F/3G etc.)"),
        _f("thickness_range", "Thickness range (mm)"),
        _f("filler", "Filler metal / classification"),
        _f("shielding", "Shielding gas / flux"),
        _f("current", "Current / polarity"),
        _f("voltage", "Voltage (V)"),
        _f("amperage", "Amperage (A)"),
        _f("travel_speed", "Travel speed (mm/min)"),
        _f("preheat", "Preheat (°C)"),
        _f("interpass", "Interpass max (°C)"),
        _f("pwht", "Post-weld heat treatment"),
        _f("special_instructions", "Special instructions", "textarea"),
        _f("ndt", "NDT requirements", "chips"),
        _f("welder_name", "Qualified welder name"),
        _f("welder_ticket", "Welder ticket / certificate"),
        _f("standard", "Qualified to standard"),
        _f("qualified_by", "Qualified by"),
        _f("qualified_date", "Date", "date"),
    ],
    "ai_prompt": None,
    "pdf": render_welding_procedure,
})

register_doc_type({
    "id": "test_tag_register", "category": "trade",
    "label": "Electrical Test & Tag Register",
    "blurb": "AS/NZS 3760 — In-service safety testing",
    "counter_prefix": "TT",
    "fields": [
        _f("company_name", "Business", required=True),
        _f("site_location", "Site / location"),
        _f("tester_name", "Tester name"),
        _f("tester_competency", "Tester competency (RII / electrician)"),
        _f("kit_model", "Test kit / PAT model"),
        _f("kit_calibration", "Kit calibration date", "date"),
        _f("frequency_months", "Frequency (months)", "number"),
        _f("next_audit", "Next scheduled audit", "date"),
        _f("items", "Appliances (asset_id/description/location/class/test_date/result/next_test)",
           "test_tag_items"),
    ],
    "ai_prompt": None,
    "pdf": render_test_tag_register,
})

register_doc_type({
    "id": "fire_safety_plan", "category": "safety",
    "label": "Fire Safety Plan",
    "blurb": "BCA / NCC · AS 3745 — Emergency plans for facilities",
    "counter_prefix": "FSP",
    "fields": [
        _f("site_name", "Site name", required=True),
        _f("site_address", "Site address"),
        _f("building_class", "Building class (BCA)"),
        _f("prepared_by", "Prepared by"),
        _f("review_date", "Review date", "date"),
        _f("fire_risks", "Fire risks", "chips"),
        _f("prevention_measures", "Fire prevention measures", "chips"),
        _f("detection_systems", "Detection systems (system/location/last_service/next_service)",
           "fire_detection"),
        _f("equipment", "Fire-fighting equipment (equipment/location/qty/last_inspection)",
           "fire_equipment"),
        _f("evacuation_procedure", "Evacuation procedure", "textarea"),
        _f("assembly_points", "Assembly points", "chips"),
        _f("wardens", "Fire warden(s) (name/role/phone)", "contacts"),
        _f("training", "Training", "textarea"),
    ],
    "ai_prompt": ("Given a site + building class, return JSON: {fire_risks:[str], "
                  "prevention_measures:[str], evacuation_procedure, training}"),
    "pdf": render_fire_safety_plan,
})

register_doc_type({
    "id": "emp", "category": "safety",
    "label": "Environmental Management Plan (EMP)",
    "blurb": "ISO 14001 · EPA state guidelines",
    "counter_prefix": "EMP",
    "fields": [
        _f("project", "Project", required=True),
        _f("site_address", "Site address"),
        _f("site_state", "Site state", "state"),
        _f("prepared_by", "Prepared by"),
        _f("review_date", "Review date", "date"),
        _f("aspects", "Aspects & impacts (aspect/impact/rating/control)", "emp_aspects"),
        _f("sediment_controls", "Sediment & erosion controls", "chips"),
        _f("waste_streams", "Waste streams (stream/disposal/contractor)", "waste_streams"),
        _f("water_air_quality", "Water & air quality", "textarea"),
        _f("noise_vibration", "Noise & vibration management", "textarea"),
        _f("incident_response", "Incident response", "textarea"),
        _f("compliance_items", "Compliance register (requirement/source/responsible)", "emp_compliance"),
        _f("approved_by", "Approved by"),
        _f("approved_at", "Approved at", "datetime"),
    ],
    "ai_prompt": ("Given a project + state, return JSON: {aspects:[{aspect,impact,rating,control}], "
                  "sediment_controls:[str], water_air_quality, noise_vibration, incident_response}"),
    "pdf": render_emp,
})




