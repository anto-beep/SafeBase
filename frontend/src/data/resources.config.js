/**
 * Industry resources catalog — equal depth across all 5 industries (Part 9).
 *
 * Each industry: 6 articles + 5 templates + 4 regulator links + 3 calculators.
 * Loaded by /resources hub and /resources/:industry pages.
 */
export const INDUSTRY_RESOURCES = {
  trades: {
    label: "Trades & Construction",
    accent: "#FFCC00",
    icon: "🔨",
    articles: [
      { slug: "swms-vs-spa", title: "SWMS vs SWP — when does each apply?", excerpt: "The legal difference between Safe Work Method Statements and Safe Work Procedures, and when Reg 299 forces a SWMS.", read_minutes: 6 },
      { slug: "hrcw-categories", title: "All 19 HRCW categories explained", excerpt: "Complete walkthrough of the High Risk Construction Work categories that trigger mandatory SWMS preparation.", read_minutes: 9 },
      { slug: "subbie-compliance", title: "Subbie compliance: what builders ask for in 2026", excerpt: "What head contractors are now demanding from subcontractors before granting site access.", read_minutes: 5 },
      { slug: "incident-notification-thresholds", title: "Notifiable incident thresholds by state", excerpt: "When you must phone the regulator, when you must notify in writing, and when you don't need to.", read_minutes: 7 },
      { slug: "asbestos-register-requirements", title: "Asbestos register requirements (residential vs commercial)", excerpt: "Practical compliance for builders, demolishers and renovators dealing with pre-1990s buildings.", read_minutes: 8 },
      { slug: "psychosocial-construction", title: "Psychosocial safety in construction — your obligations", excerpt: "The new psychosocial code of practice and what it means for site managers.", read_minutes: 6 },
    ],
    templates: [
      { slug: "swms-blank", title: "Blank SWMS template (Reg 299 aligned)", format: "DOCX" },
      { slug: "toolbox-talk-blank", title: "Toolbox talk blank record", format: "PDF" },
      { slug: "incident-investigation", title: "Incident investigation template", format: "DOCX" },
      { slug: "site-induction-checklist", title: "Site induction checklist", format: "PDF" },
      { slug: "plant-prestart", title: "Plant pre-start checklist", format: "PDF" },
    ],
    regulators: [
      { name: "SafeWork NSW", url: "https://www.safework.nsw.gov.au" },
      { name: "WorkSafe Victoria", url: "https://www.worksafe.vic.gov.au" },
      { name: "Workplace Health & Safety QLD", url: "https://www.worksafe.qld.gov.au" },
      { name: "WorkSafe WA", url: "https://www.commerce.wa.gov.au/worksafe" },
    ],
    calculators: [
      { slug: "fine-calculator-trades", title: "WHS fine calculator (Cat 1/2/3)" },
      { slug: "swms-revision-due", title: "SWMS revision due date calculator" },
      { slug: "asbestos-trigger", title: "Pre-1990s building asbestos trigger" },
    ],
  },
  hospitality: {
    label: "Hospitality",
    accent: "#7C1D3F",
    icon: "🍽️",
    articles: [
      { slug: "haccp-explained", title: "HACCP for Australian venues — the practical version", excerpt: "Standard 3.2.1 in plain English: what your venue actually needs in writing.", read_minutes: 8 },
      { slug: "fss-required-states", title: "Food Safety Supervisor — required by state", excerpt: "Which states require an FSS, what counts as 'on premises', and how to verify a certificate.", read_minutes: 5 },
      { slug: "allergen-disclosure", title: "Allergen disclosure: avoiding the $100k fine", excerpt: "Recent NSW Food Authority prosecutions and the disclosure rules that triggered them.", read_minutes: 6 },
      { slug: "council-inspection-prep", title: "Council inspection — pass first time", excerpt: "What inspectors look for, what trips most venues up, and a realistic prep checklist.", read_minutes: 7 },
      { slug: "rsa-state-comparison", title: "RSA certification — interstate recognition rules", excerpt: "Which RSA certificates work where, and what to do for staff moving states.", read_minutes: 5 },
      { slug: "psychosocial-hospitality", title: "Psychosocial safety in hospitality (bullying, harassment, fatigue)", excerpt: "The 2026 obligations for venue operators around bullying, sexual harassment and fatigue.", read_minutes: 7 },
    ],
    templates: [
      { slug: "haccp-blank", title: "Blank HACCP plan template", format: "DOCX" },
      { slug: "temp-log", title: "Temperature log (90-day printable)", format: "PDF" },
      { slug: "allergen-register", title: "Allergen register template", format: "XLSX" },
      { slug: "fss-policy", title: "FSS appointment letter template", format: "DOCX" },
      { slug: "incident-food-illness", title: "Food illness complaint response form", format: "PDF" },
    ],
    regulators: [
      { name: "NSW Food Authority", url: "https://www.foodauthority.nsw.gov.au" },
      { name: "Department of Health Victoria", url: "https://www.health.vic.gov.au" },
      { name: "Queensland Health (Food Safety)", url: "https://www.health.qld.gov.au/public-health/food-safety" },
      { name: "FSANZ — Food Standards Code", url: "https://www.foodstandards.gov.au" },
    ],
    calculators: [
      { slug: "fine-calculator-hospitality", title: "Food safety fine calculator (state-by-state)" },
      { slug: "haccp-due-date", title: "HACCP review due date calculator" },
      { slug: "council-inspection-readiness", title: "Council inspection readiness scorer" },
    ],
  },
  transport: {
    label: "Transport & Logistics",
    accent: "#0DC4B5",
    icon: "🚛",
    articles: [
      { slug: "cor-explained", title: "Chain of Responsibility — who is in your chain?", excerpt: "Practical breakdown of every party in CoR and the primary duty under HVNL.", read_minutes: 9 },
      { slug: "fatigue-bfm-vs-afm", title: "BFM vs AFM — which is right for you?", excerpt: "The differences in hour limits, paperwork, and audit burden between Standard, BFM and AFM.", read_minutes: 7 },
      { slug: "load-restraint-2025", title: "Load Restraint Guide 2025 — what changed", excerpt: "The performance standard updates and how they affect your existing load plans.", read_minutes: 6 },
      { slug: "scheduler-cor", title: "Scheduler CoR obligations — beyond the driver", excerpt: "Why dispatchers and schedulers are getting prosecuted alongside operators.", read_minutes: 5 },
      { slug: "ewd-transition", title: "EWD transition — paper to electronic work diary", excerpt: "How to transition without breaking compliance — what to ask your EWD provider.", read_minutes: 6 },
      { slug: "psychosocial-transport", title: "Trucker mental health — psychosocial safety", excerpt: "Practical employer obligations + the Trucker's Helpline and EAP support.", read_minutes: 6 },
    ],
    templates: [
      { slug: "cor-plan-blank", title: "Blank CoR Management Plan", format: "DOCX" },
      { slug: "fitness-for-duty", title: "Driver fitness for duty form", format: "PDF" },
      { slug: "pretrip-rigid", title: "Pre-trip inspection (rigid)", format: "PDF" },
      { slug: "pretrip-semi", title: "Pre-trip inspection (semi-trailer)", format: "PDF" },
      { slug: "load-restraint-blank", title: "Load restraint plan template", format: "DOCX" },
    ],
    regulators: [
      { name: "NHVR — National Heavy Vehicle Regulator", url: "https://www.nhvr.gov.au" },
      { name: "NHVAS Accreditation", url: "https://www.nhvr.gov.au/safety-accreditation-compliance/national-heavy-vehicle-accreditation-scheme" },
      { name: "Load Restraint Guide", url: "https://www.nhvr.gov.au/road-access/restricted-access-vehicles/load-restraint-guide" },
      { name: "Comcare (federal)", url: "https://www.comcare.gov.au" },
    ],
    calculators: [
      { slug: "fine-calculator-transport", title: "HVNL fine calculator" },
      { slug: "fatigue-hours-checker", title: "Driver hours / rest calculator (Standard / BFM / AFM)" },
      { slug: "mass-overload-calculator", title: "Mass / overload calculator" },
    ],
  },
  healthcare: {
    label: "Healthcare & Aged Care",
    accent: "#2196A6",
    icon: "🏥",
    articles: [
      { slug: "acqsc-strengthened-standards", title: "Strengthened Aged Care Quality Standards — your evidence checklist", excerpt: "The 8 new standards in plain English with the evidence ACQSC actually wants to see.", read_minutes: 9 },
      { slug: "ndis-practice-standards-2026", title: "NDIS Practice Standards 2026 — what changed", excerpt: "The 2026 update to NDIS Practice Standards and the impact on existing registrations.", read_minutes: 8 },
      { slug: "ahpra-register-monitoring", title: "AHPRA monitoring — daily checks for managers", excerpt: "Why daily AHPRA register checks are now considered industry standard.", read_minutes: 6 },
      { slug: "manual-handling-clinical", title: "Manual handling injuries — the real cost", excerpt: "Clinical sector manual handling injury rates and the controls that actually reduce them.", read_minutes: 7 },
      { slug: "violence-aggression-clinical", title: "Violence and aggression — your duty of care", excerpt: "Healthcare-specific de-escalation protocols and post-incident support obligations.", read_minutes: 7 },
      { slug: "psychosocial-healthcare", title: "Psychosocial safety in healthcare — secondary trauma", excerpt: "Burnout, moral injury, secondary trauma — your WHS obligations and supports.", read_minutes: 7 },
    ],
    templates: [
      { slug: "manual-handling-ra", title: "Manual handling risk assessment", format: "DOCX" },
      { slug: "infection-control-policy", title: "Infection control policy template", format: "DOCX" },
      { slug: "acqsc-evidence-checklist", title: "ACQSC 8-standard evidence checklist", format: "PDF" },
      { slug: "ndis-screening-record", title: "NDIS Worker Screening tracking sheet", format: "XLSX" },
      { slug: "clinical-event-form", title: "Clinical event reporting form", format: "PDF" },
    ],
    regulators: [
      { name: "ACQSC — Aged Care Quality and Safety Commission", url: "https://www.agedcarequality.gov.au" },
      { name: "NDIS Quality and Safeguards Commission", url: "https://www.ndiscommission.gov.au" },
      { name: "AHPRA — Health Practitioner Registration", url: "https://www.ahpra.gov.au" },
      { name: "Safe Work Australia (Healthcare Code)", url: "https://www.safeworkaustralia.gov.au" },
    ],
    calculators: [
      { slug: "fine-calculator-healthcare", title: "Healthcare WHS fine calculator" },
      { slug: "ahpra-renewal-tracker", title: "AHPRA renewal countdown tracker" },
      { slug: "screening-renewal-calendar", title: "NDIS / aged care screening renewal calendar" },
    ],
  },
  retail: {
    label: "Retail",
    accent: "#A855F7",
    icon: "🛍️",
    articles: [
      { slug: "lone-worker-checkin", title: "Lone worker check-in — the practical setup", excerpt: "What a defensible lone worker check-in system looks like, and why text alone isn't enough.", read_minutes: 6 },
      { slug: "robbery-response", title: "Robbery response — protecting staff first", excerpt: "Police-aligned protocols for armed and unarmed robbery in retail environments.", read_minutes: 5 },
      { slug: "casual-induction-3min", title: "The 3-minute casual induction (and why it works)", excerpt: "Quick-induct for casual / fill-in shifts that ticks every WHS compliance box.", read_minutes: 4 },
      { slug: "manual-handling-retail", title: "Manual handling injuries in retail — the data", excerpt: "Where retail injuries actually happen — and the engineering controls that stop them.", read_minutes: 6 },
      { slug: "customer-aggression", title: "Customer aggression — staff protection obligations", excerpt: "Your psychosocial safety duties around abusive and aggressive customers.", read_minutes: 6 },
      { slug: "franchise-network-compliance", title: "Franchise compliance — network-level visibility", excerpt: "How franchisors can prove WHS due diligence across all stores without micromanaging.", read_minutes: 7 },
    ],
    templates: [
      { slug: "working-alone-ra", title: "Working alone risk assessment", format: "DOCX" },
      { slug: "spill-response-poster", title: "Spill response laminate (A4 poster)", format: "PDF" },
      { slug: "emergency-plan-blank", title: "Emergency plan template", format: "DOCX" },
      { slug: "casual-induction-blank", title: "Casual quick-induct (3-min)", format: "PDF" },
      { slug: "incident-customer", title: "Customer incident report form", format: "PDF" },
    ],
    regulators: [
      { name: "SafeWork NSW", url: "https://www.safework.nsw.gov.au" },
      { name: "WorkSafe Victoria", url: "https://www.worksafe.vic.gov.au" },
      { name: "WorkSafe QLD", url: "https://www.worksafe.qld.gov.au" },
      { name: "Australian Retailers Association", url: "https://www.retail.org.au" },
    ],
    calculators: [
      { slug: "fine-calculator-retail", title: "Retail WHS fine calculator" },
      { slug: "lone-worker-risk-scorer", title: "Lone worker risk scorer" },
      { slug: "induction-coverage", title: "Roster induction coverage scorer" },
    ],
  },
};

export const INDUSTRY_LIST = Object.entries(INDUSTRY_RESOURCES).map(([slug, v]) => ({
  slug, ...v,
}));
