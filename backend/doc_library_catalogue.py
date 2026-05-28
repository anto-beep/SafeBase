"""
SafeBase Doc Library — master catalogue.

Compact source of truth for all ~280 system document templates across the
five industries. Each row is (name, status_requirement, regulation) and is
grouped under (industry, category). Phase-2 seeding takes this catalogue,
calls Claude in small batches to produce a fields_schema + ai_prompt_template
per row, and inserts into the document_templates collection.

Status requirements: "mandatory" | "recommended" | "optional"
"""
from __future__ import annotations


M = "mandatory"
R = "recommended"
O = "optional"


CATALOGUE: dict[str, dict[str, list[tuple[str, str, str]]]] = {
    "trades": {
        "High-Risk SWMS": [
            ("Working at Heights (>2m) SWMS", M, "WHS Reg 299 / 291"),
            ("Telecommunications Tower SWMS", M, "WHS Reg 299"),
            ("Demolition of Load-Bearing Structures SWMS", M, "WHS Reg 299"),
            ("Asbestos Disturbance SWMS", M, "WHS Reg 299 + Asbestos COP"),
            ("Structural Alteration / Temporary Supports SWMS", M, "WHS Reg 299"),
            ("Confined Space Entry SWMS", M, "WHS Reg 66-77"),
            ("Excavation / Trenching >1.5m SWMS", M, "WHS Reg 299 + Excavation COP"),
            ("Tunnel Work SWMS", M, "WHS Reg 299"),
            ("Use of Explosives SWMS", M, "WHS Reg 299"),
            ("Pressurised Gas Mains SWMS", M, "WHS Reg 299"),
            ("Chemical/Fuel/Refrigerant Lines SWMS", M, "WHS Reg 299"),
            ("Energised Electrical SWMS", M, "WHS Reg 299 + AS/NZS 4836"),
            ("Artificial Temperature Extremes SWMS", M, "WHS Reg 299"),
            ("Work In/Near Water SWMS", M, "WHS Reg 299"),
            ("Roadway/Railway Adjacent SWMS", M, "WHS Reg 299"),
            ("Powered Mobile Plant SWMS", M, "WHS Reg 299"),
            ("Tilt-up/Precast Concrete SWMS", M, "WHS Reg 299 + Tilt-up COP"),
            ("Diving Work SWMS", M, "WHS Reg 299"),
            ("Contaminated/Flammable Atmospheres SWMS", M, "WHS Reg 299"),
        ],
        "WHS Management Plans & Site": [
            ("WHS Management Plan", M, "WHS Reg 309"),
            ("Site Safety Rules", R, "WHS Act s.19"),
            ("Site Induction Pack", M, "WHS Reg 309"),
            ("Visitor Sign-in & Induction", R, "WHS Act s.19"),
            ("Traffic Management Plan", M, "WHS Reg 309 + Traffic COP"),
            ("Emergency Response Plan", M, "WHS Reg 43"),
            ("Site Evacuation Diagram", M, "AS 3745:2010"),
            ("First Aid Plan", M, "WHS Reg 42"),
        ],
        "Worker, Competency & Contractor": [
            ("White Card Register", M, "CPCCWHS1001"),
            ("HRWL Register", M, "WHS Reg 81-86"),
            ("Trade Licence Register", M, "State licensing acts"),
            ("Electrician CCEW Register", M, "AS/NZS 3017"),
            ("Plumber Compliance Certificate Register", M, "State plumbing acts"),
            ("Gas Compliance Certificate Register", M, "Gas Safety Acts"),
            ("Subcontractor Pre-qualification Questionnaire", R, "WHS Act s.46-47"),
            ("Subcontractor Agreement", R, "WHS Act s.46"),
            ("Insurance Verification Register", R, "WHS Act s.46"),
            ("Toolbox Talk Record", R, "WHS Act s.47 (Consultation)"),
        ],
        "Plant, Equipment & Test-and-Tag": [
            ("Plant Register", M, "WHS Reg 203"),
            ("Pre-start Inspection Form", M, "WHS Reg 213"),
            ("Maintenance Log", M, "WHS Reg 213"),
            ("Test & Tag Register", M, "AS/NZS 3760"),
            ("RCD Test Log", M, "AS/NZS 3760"),
            ("Plant Item Risk Assessment", M, "WHS Reg 213"),
        ],
        "Permits": [
            ("Confined Space Entry Permit", M, "WHS Reg 67"),
            ("Hot Work Permit", M, "Hot Work COP"),
            ("Working at Heights Permit", R, "WHS Reg 78-80"),
            ("Excavation Permit", R, "Excavation COP"),
        ],
        "Hazardous Substances & Asbestos": [
            ("Asbestos Register & Management Plan", M, "Asbestos COP + WHS Reg 425-434"),
            ("Hazardous Chemical Register + SDS Index", M, "WHS Reg 344-345"),
            ("Silica Dust Control Plan", M, "WHS Reg 49 + Silica COP"),
        ],
        "Policies & Procedures": [
            ("Drug & Alcohol Policy", R, "WHS Act s.28"),
            ("Fatigue Management Policy", R, "WHS Act s.19"),
            ("Manual Handling Procedure", M, "Hazardous Manual Tasks COP"),
            ("Working at Heights Procedure", M, "WHS Reg 78-80"),
            ("Mental Health & Wellbeing Policy", R, "Managing Psychosocial Hazards COP"),
        ],
        "Incident, Audit & Inspection": [
            ("Incident Report", M, "WHS Reg 35-39"),
            ("Notifiable Incident Notification", M, "WHS Act s.35-39"),
            ("Site Inspection Checklist", R, "WHS Reg 38"),
            ("Internal WHS Audit", R, "AS/NZS 4801"),
            ("WorkSafe Inspection Preparation Pack", R, "WHS Act s.157-158"),
        ],
    },
    "hospitality": {
        "Food Safety Programs & HACCP": [
            ("Food Safety Program", M, "FSANZ Std 3.2.1"),
            ("HACCP Plan with CCP Register", M, "FSANZ Std 3.2.2 cl.7"),
            ("Cleaning & Sanitising Schedule", M, "FSANZ Std 3.2.2 cl.20"),
            ("Temperature Log Pack", M, "FSANZ Std 3.2.2 cl.5-11"),
            ("Calibration Log", M, "FSANZ Std 3.2.2"),
            ("Food Safety Supervisor Register", M, "FSANZ Std 3.2.2A"),
            ("Standard 3.2.2A Evidence Tool Workbook", M, "FSANZ Std 3.2.2A"),
            ("Food Recall Plan", M, "FSANZ Std 3.2.2 cl.13"),
        ],
        "Allergen / PEAL": [
            ("PEAL Allergen Matrix", M, "FSANZ Std 1.2.3 + Schedule 9"),
            ("Allergen Incident Report", R, "FSANZ Std 1.2.3"),
            ("Customer Allergen Disclosure Form", R, "FSANZ Std 1.2.3"),
            ("Allergen Cross-Contact Cleaning SOP", M, "FSANZ Std 3.2.2"),
            ("Ingredient Label Verification Log", R, "FSANZ Std 1.2.3"),
        ],
        "Worker, Training & Inductions": [
            ("Food Handler Training Register", M, "FSANZ Std 3.2.2 cl.15"),
            ("FSS Certificate Register", M, "FSANZ Std 3.2.2A"),
            ("RSA Certificate Register", M, "State Liquor Acts"),
            ("Casual Worker Induction", R, "WHS Reg 39"),
            ("Staff Health Declaration Form", M, "FSANZ Std 3.2.2 cl.15"),
            ("Manual Handling Induction", R, "Hazardous Manual Tasks COP"),
        ],
        "Liquor, RSA & Council": [
            ("Liquor Licence Register", M, "State Liquor Acts"),
            ("RSA Register", M, "State Liquor Acts"),
            ("State Liquor Incident Register", M, "State Liquor Acts"),
            ("Council Inspection Pack", R, "Food Act (state-specific)"),
            ("Food Business Notification", M, "Food Act + FSANZ Std 3.2.2"),
        ],
        "Supplier & Inventory": [
            ("Approved Supplier List", R, "FSANZ Std 3.2.2 cl.5"),
            ("Supplier Specification Sheet", R, "FSANZ Std 3.2.2"),
            ("Goods-Receival Inspection Log", M, "FSANZ Std 3.2.2 cl.5"),
            ("Stock Recall Record", M, "FSANZ Std 3.2.2 cl.13"),
        ],
        "Kitchen, FOH & Equipment": [
            ("Pest Control Service Record", M, "FSANZ Std 3.2.2 cl.24"),
            ("Equipment Maintenance Log", M, "FSANZ Std 3.2.2"),
            ("Gas Appliance Compliance Certificate", M, "Gas Safety Acts"),
            ("Grease Trap Pump-out Record", M, "State trade waste acts"),
            ("Daily Cleaning Checklist", M, "FSANZ Std 3.2.2 cl.20"),
            ("Deep-Clean Schedule", R, "FSANZ Std 3.2.2 cl.20"),
        ],
        "Customer & Incident": [
            ("Customer Injury Report", M, "WHS Act + Liability"),
            ("Food Complaint Log", M, "FSANZ Std 3.2.2 cl.13"),
            ("Customer Aggression Incident Report", R, "Managing Psychosocial Hazards COP"),
            ("Notifiable Foodborne Illness Notification", M, "Food Act + FSANZ Std 3.2.2"),
        ],
        "WHS & Emergency": [
            ("Manual Handling Risk Assessment", M, "Hazardous Manual Tasks COP"),
            ("Slips/Trips/Falls Plan", M, "WHS Reg 39-40"),
            ("Knife Safety SOP", R, "WHS Reg 39"),
            ("Chemical Register & SDS Folder", M, "WHS Reg 344-345"),
            ("Emergency Evacuation Procedure", M, "AS 3745:2010"),
            ("Burns First Aid SOP", R, "First Aid COP"),
            ("Lone Worker Close-down Procedure", R, "WHS Reg 48"),
        ],
    },
    "transport": {
        "CoR & Safety Management System": [
            ("CoR Management Plan", M, "HVNL Pt 1A"),
            ("CoR Party Identification Register", M, "HVNL"),
            ("Contract Review Checklist", R, "HVNL"),
            ("Safety Management System Manual", M, "HVNL"),
            ("Executive Officer Due Diligence Register", M, "HVNL"),
            ("Transport Activities Risk Register", M, "HVNL"),
            ("Internal Audit Register", R, "HVNL"),
        ],
        "Fatigue Management": [
            ("Fatigue Management Policy", M, "HVNL Ch 6"),
            ("National Driver Work Diary Template", M, "HVNL Ch 6"),
            ("EWD Approval & Induction Record", M, "HVNL Ch 6"),
            ("Fatigue Risk Assessment", M, "HVNL Ch 6"),
            ("Scheduling & Rostering Procedure", M, "HVNL Ch 6"),
            ("Personal Use Exemption Register", R, "HVNL"),
            ("Fitness-for-Duty Declaration", R, "HVNL"),
        ],
        "Vehicle, Mass, Maintenance": [
            ("Pre-trip Inspection Form", M, "HVNL maintenance duty"),
            ("Daily Defect Report", M, "HVNL"),
            ("Maintenance Schedule", M, "HVNL"),
            ("Roadworthiness Records", M, "HVNL"),
            ("Tyre/Brake Inspection Register", M, "HVNL"),
            ("Mass/Container Weight Declaration", M, "HVNL Ch 4"),
            ("Vehicle Registration Register", M, "HVNL"),
            ("Telematics/EWD Audit Log", M, "HVNL Ch 6"),
        ],
        "Driver Credentials & Health": [
            ("HC/MC/HR Licence Register", M, "Road Transport Act"),
            ("Medical Certificate Register", M, "Assessing Fitness to Drive"),
            ("Drug & Alcohol Testing Register", M, "HVNL"),
            ("Fitness-for-Duty Procedure", M, "HVNL"),
            ("Driver Induction Pack", M, "HVNL"),
            ("Driver Performance Review", R, "HVNL"),
        ],
        "NHVAS → HVA Transition": [
            ("NHVAS Mass Management Audit Pack", M, "NHVAS Mass Standards"),
            ("NHVAS Maintenance Management Audit Pack", M, "NHVAS Maintenance Standards"),
            ("NHVAS BFM/AFM Audit Pack", M, "NHVAS BFM/AFM Standards"),
            ("HVA-Readiness Gap Analysis", R, "HVNL 2026"),
        ],
        "Load Restraint & Access": [
            ("Load Restraint Plan", M, "NTC Load Restraint Guide"),
            ("Container Weight Declaration", M, "HVNL Ch 4"),
            ("Oversize/Overmass Permit Register", M, "HVNL"),
            ("PBS Vehicle Register", R, "HVNL PBS Scheme"),
            ("Route Access Compliance Log", M, "HVNL Ch 4"),
        ],
        "Dangerous Goods": [
            ("DG Transport Documentation", M, "ADG Code"),
            ("DG Emergency Information Records", M, "ADG Code"),
            ("DG Driver Licence Register", M, "ADG Code"),
            ("Vehicle Placarding Check", M, "ADG Code"),
            ("DG Segregation Plan", M, "ADG Code"),
        ],
        "Incident & Notification": [
            ("Incident / Notifiable Incident Report", M, "HVNL + WHS Reg 35"),
            ("NHVR Notification", M, "HVNL"),
            ("Police Notification Record", M, "HVNL"),
            ("Insurance Claim Pack", R, "HVNL"),
            ("Root-Cause Investigation Report", R, "HVNL"),
            ("Corrective Action Register", M, "HVNL"),
        ],
    },
    "healthcare": {
        "Aged Care Quality Standards": [
            ("Standard 1 Evidence Pack (The Individual)", M, "Aged Care Act 2024 Std 1"),
            ("Standard 2 Evidence Pack (The Organisation)", M, "Aged Care Act 2024 Std 2"),
            ("Standard 3 Evidence Pack (The Care and Services)", M, "Aged Care Act 2024 Std 3"),
            ("Standard 4 Evidence Pack (The Environment)", M, "Aged Care Act 2024 Std 4"),
            ("Standard 5 Evidence Pack (Clinical Care)", M, "Aged Care Act 2024 Std 5"),
            ("Standard 6 Evidence Pack (Food and Nutrition)", M, "Aged Care Act 2024 Std 6"),
            ("Standard 7 Evidence Pack (The Residential Community)", M, "Aged Care Act 2024 Std 7"),
            ("Strengthened Quality Standards Self-Assessment Tool", M, "Aged Care Act 2024"),
        ],
        "SIRS & Incident Management": [
            ("SIRS P1 Notification (24h)", M, "Aged Care Act 2024 s.16"),
            ("SIRS P2 Notification (30d)", M, "Aged Care Act 2024 s.16"),
            ("SIRS Decision Record", M, "Aged Care Act 2024 s.16"),
            ("SIRS 60-day Final Report", M, "Aged Care Act 2024 s.16"),
            ("Incident Investigation Report", M, "Aged Care Act 2024"),
            ("Incident Management System Manual", M, "Aged Care Act 2024 s.16"),
            ("IMS Worker Training Register", M, "Aged Care Act 2024"),
            ("Restrictive Practice Use Register", M, "Aged Care Rules 2025"),
        ],
        "NDIS Compliance": [
            ("NDIS Practice Standards Core Module Evidence Pack", M, "NDIS Rules 2018"),
            ("Module 2A Behaviour Support Evidence Pack", M, "NDIS Rules 2018"),
            ("Reportable Incident Notification", M, "NDIS Act s.73Z"),
            ("Behaviour Support Plan & Interim BSP", M, "NDIS Restrictive Practices Rules 2018"),
            ("Regulated Restrictive Practice Monthly Report", M, "NDIS Rules 2018"),
            ("State RP Authorisation Evidence", M, "State authorisation laws"),
            ("NDIS Code of Conduct Acknowledgement Register", M, "NDIS Rules 2018"),
            ("Worker Orientation Completion Register", M, "NDIS Rules 2018"),
        ],
        "Aged Care Act 2024 & Rights": [
            ("Statement of Rights Acknowledgement", M, "Aged Care Act 2024"),
            ("Service Agreement", M, "Aged Care Act 2024"),
            ("Statement of Principles Policy", M, "Aged Care Act 2024"),
            ("Provider Registration Renewal Pack", M, "Aged Care Act 2024"),
            ("Code of Conduct Acknowledgement", M, "Aged Care Act 2024"),
        ],
        "Worker Screening & AHPRA": [
            ("Police Certificate Register", M, "Aged Care Rules 2025"),
            ("NDIS Worker Screening Register", M, "NDIS Worker Screening Rules"),
            ("Statutory Declaration Pack", R, "Aged Care Rules 2025"),
            ("AHPRA Registration Verification Log", M, "Health Practitioner Regulation National Law"),
            ("Conditions/Undertakings Register", M, "National Law"),
            ("Working with Children Check Register", M, "State WWCC Acts"),
        ],
        "Quality Indicators": [
            ("QI Quarterly Submission Pack", M, "QI Program Manual 4.0"),
            ("QI Data Collection Tool", M, "QI Program Manual 4.0"),
            ("Trend & Benchmark Report", R, "QI Program Manual 4.0"),
            ("Care-Minute/Staffing Evidence Pack", M, "Aged Care Act 2024"),
        ],
        "Clinical SWPs": [
            ("Medication Administration SWP & S8 Register", M, "Aged Care Act 2024 Std 5"),
            ("Wound Care SWP", M, "Aged Care Act 2024 Std 5"),
            ("Manual Handling Risk Assessment", M, "Hazardous Manual Tasks COP"),
            ("Pressure Injury Prevention Plan", M, "Aged Care Act 2024 Std 5"),
            ("Falls Risk Assessment & Prevention Plan", M, "Aged Care Act 2024 Std 5"),
            ("Infection Prevention & Control Plan", M, "NHMRC Guidelines"),
            ("Clinical Deterioration & Escalation SOP", M, "Aged Care Act 2024 Std 5"),
            ("Open Disclosure Record", M, "National Open Disclosure Framework"),
        ],
        "Training & Competency": [
            ("Mandatory Training Matrix", M, "Aged Care Act 2024"),
            ("Competency Assessment Tools", M, "Aged Care Act 2024"),
            ("CPD Log", M, "AHPRA + Aged Care Act 2024"),
            ("Toolbox Talk Records", R, "WHS Act"),
        ],
        "WHS & Lone Worker": [
            ("Lone Worker / Community-Care Procedure", M, "WHS Reg 48"),
            ("Workplace Violence & Aggression Risk Assessment", M, "Managing Psychosocial Hazards COP"),
            ("Slips/Trips/Falls Plan", M, "WHS Reg 39-40"),
            ("Sharps Injury Procedure", M, "NHMRC Guidelines"),
        ],
        "Privacy, Consent & Complaints": [
            ("Privacy Policy", M, "Privacy Act 1988 + APPs"),
            ("Consent Forms", M, "Aged Care Act 2024"),
            ("Feedback & Complaints Register", M, "Aged Care Act 2024"),
        ],
    },
    "retail": {
        "Lone Worker": [
            ("Lone Worker Policy", M, "WHS Reg 48"),
            ("Lone Worker Risk Assessment", M, "WHS Reg 48"),
            ("Check-in / Welfare Procedure", M, "WHS Reg 48"),
            ("Duress Alarm Procedure & Test Log", M, "WHS Reg 48"),
            ("Close-down / Open-up Procedure", M, "WHS Reg 48"),
        ],
        "Worker": [
            ("Quick Induction Record", M, "WHS Reg 39"),
            ("Casual Worker Induction", M, "WHS Reg 39"),
            ("Training Records Register", M, "WHS Reg 39"),
            ("Roster Compliance Check", R, "Fair Work Act"),
            ("Position Description", R, "Fair Work Act"),
            ("Worker Handbook Acknowledgement", R, "Fair Work Act"),
        ],
        "Customer & Public Liability": [
            ("Customer Injury Report", M, "WHS Act + Liability"),
            ("Customer Aggression Incident Report", M, "Managing Psychosocial Hazards COP"),
            ("Public Liability Claim Pack", R, "Liability insurance"),
            ("Slip/Trip/Fall Investigation", M, "WHS Reg 40"),
        ],
        "Multi-Store / Franchise": [
            ("Franchise Compliance Pack", R, "Franchising Code of Conduct"),
            ("Head Office WHS Directive Register", R, "Model WHS Act"),
            ("Multi-Site Audit Roll-up", R, "WHS Act"),
        ],
        "Age-Restricted Sales": [
            ("Tobacco Licence Register", M, "Public Health (Tobacco and Other Products) Act 2023"),
            ("Tobacco Sales Compliance SOP", M, "Public Health (Tobacco and Other Products) Act 2023"),
            ("Vape Pharmacy-Only Compliance Notice", M, "Therapeutic Goods (Vaping Reforms) Act 2024"),
            ("Alcohol RSA Register", M, "State Liquor Acts"),
            ("Proof of Age Sign Pack", M, "State Liquor Acts"),
            ("Controlled-Purchase Response Procedure", R, "Public Health Acts"),
        ],
        "WHS, Stock & Emergency": [
            ("Manual Handling Procedure", M, "Hazardous Manual Tasks COP"),
            ("Spill Response SOP", M, "WHS Reg 344-345"),
            ("Fire / Emergency Evacuation Procedure", M, "AS 3745:2010"),
            ("Bomb Threat Procedure", R, "Crimes Act"),
            ("Armed Hold-up Procedure", R, "Managing Psychosocial Hazards COP"),
            ("Cash Handling SOP", R, "SWA Cash Handling Guide"),
            ("Stocktake Procedure", O, "Internal control"),
            ("Theft Prevention Plan", R, "WHS Act + insurance"),
            ("Security Procedures", R, "WHS Act"),
            ("First Aid Plan", M, "WHS Reg 42"),
        ],
        "Audit & Inspection": [
            ("Daily Store Open Check", M, "WHS Act"),
            ("Weekly Safety Walk", R, "WHS Act"),
            ("Monthly Compliance Audit", R, "WHS Act"),
            ("Liquor/Tobacco Inspector Visit Log", M, "State Liquor + Tobacco Acts"),
            ("Internal Multi-Store Audit", R, "WHS Act"),
            ("Regulator Inspection Pack", R, "WHS Act"),
        ],
    },
}


def flatten() -> list[dict]:
    """Yield {industry, category, name, status_requirement, regulation}."""
    out = []
    for industry, cats in CATALOGUE.items():
        for cat, rows in cats.items():
            for name, status, reg in rows:
                out.append({
                    "industry": industry,
                    "category": cat,
                    "name": name,
                    "status_requirement": status,
                    "regulation": reg,
                })
    return out


def count() -> tuple[int, dict[str, int]]:
    per_industry = {ind: sum(len(rows) for rows in cats.values())
                     for ind, cats in CATALOGUE.items()}
    return sum(per_industry.values()), per_industry


if __name__ == "__main__":
    total, per = count()
    print(f"Total templates: {total}")
    for ind, n in per.items():
        print(f"  {ind}: {n}")
