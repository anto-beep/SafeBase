/**
 * Per-industry product page configuration (Part 7 of multi-industry brief).
 *
 * Replaces the standalone Features page. Each industry page has 12 sections:
 *   1. Hero
 *   2. Problem (3 pain cards)
 *   3. Features (organised by category)
 *   4. Documents generated (AI doc list)
 *   5. SafeBase Academy
 *   6. Add-ons available
 *   7. Dashboard preview
 *   8. Compliance obligations
 *   9. Pricing
 *  10. Resources preview
 *  11. Testimonials
 *  12. Final CTA
 */
export const INDUSTRY_PAGE_CONFIG = {
  trades: {
    label: "Trades & Construction",
    accent: "#FFCC00",
    icon: "🔨",
    hero: {
      tagline: "Built for Australian tradespeople.",
      headline: "WHS compliance that finally fits how your trade actually runs.",
      sub: "SWMS, incidents, licences, inspections, audit packs — generated, tracked, and audit-ready in minutes.",
      stats: [
        { value: "19", label: "HRCW categories" },
        { value: "<60s", label: "AI SWMS generation" },
        { value: "$799", label: "from /month + GST" },
        { value: "100k+", label: "tradies served" },
      ],
    },
    problems: [
      { title: "SWMS take half a day", body: "Reg 299 demands one for every HRCW activity. Most tradies write them once and recycle." },
      { title: "Lost paperwork at audit time", body: "When SafeWork comes calling, you've got a year of half-completed forms and no chain of evidence." },
      { title: "Subbie verification is a phone game", body: "Builders demand White Card, public liability, trade licence — and you're chasing three subbies for screenshots." },
    ],
    features: {
      "Core WHS": ["AI SWMS generator (Claude 4.5)", "19 HRCW categories with auto-tick", "Reg 299 alignment", "Risk register (5×5)", "Toolbox talks", "WHS Management Plan ≥$250k jobs"],
      "Trades-specific": ["Plant register", "Hazardous substances + SDS", "Asbestos register", "First aid + PPE", "Inspections per state"],
      "Documents": ["SWMS / SWP / RA", "WHS Mgmt Plan", "Toolbox talk records", "Inspection records", "Incident investigations", "Audit pack PDF"],
      "Add-ons": ["SafeInduct (QR site inductions)", "SafeCheck (subbie verification)", "Academy (worker training)"],
    },
    documents: ["SWMS", "Safe Work Procedure", "Risk Assessment", "WHS Management Plan", "Toolbox Talk record", "Plant pre-start", "Asbestos register"],
    academy_modules: ["Working at Heights", "Confined Space Entry", "Electrical Safety", "SWMS Preparation", "WHS for Supervisors"],
    addons_highlight: ["safeinduct_trades", "safecheck_trades", "academy_trades", "whs_consulting_retainer"],
    obligations: [
      { regulator: "SafeWork NSW / WorkSafe Vic / WHSQ / WorkSafe WA / SA / TAS / NT / ACT", basis: "Model WHS Act + Reg 299 (HRCW SWMS)" },
      { regulator: "ASIC / ATO", basis: "ABN active + workers comp" },
      { regulator: "State licensing boards", basis: "Trade licence currency" },
    ],
    pricing_anchor: "From A$799/month + GST — no per-user costs, no setup fees.",
    final_cta: "Tradies who try SafeBase rarely go back to paperwork.",
  },
  hospitality: {
    label: "Hospitality",
    accent: "#7C1D3F",
    icon: "🍽️",
    hero: {
      tagline: "Built for Australian venues.",
      headline: "WHS + Food Safety in one platform — pass council inspection first time.",
      sub: "HACCP, allergens, temperature logs, RSA, FSS — generated, tracked, and inspection-ready.",
      stats: [
        { value: "Std 3.2.1", label: "FSANZ aligned" },
        { value: "90 days", label: "temp log retention" },
        { value: "$1,499", label: "from /month + GST" },
        { value: "RSA + FSS", label: "tracking built-in" },
      ],
    },
    problems: [
      { title: "HACCP plans gather dust", body: "You wrote one when the council asked for it three years ago. Today's menu doesn't match it." },
      { title: "Temp logs are paper, and most are blank", body: "Your fridges run 24/7 but the log only gets touched at inspection time." },
      { title: "Allergen disclosure is one mistake from a $100k fine", body: "NSW Food Authority prosecutions are public. The pattern is always the same: gaps in disclosure procedure." },
    ],
    features: {
      "WHS + Food Safety": ["HACCP plan AI generator", "Allergen register", "Temperature monitoring", "Cleaning schedule", "Council inspection pack", "Food safety incident response"],
      "Hospitality-specific": ["RSA tracking per staff", "FSS appointment + cert renewal", "Pest control records", "Supplier accreditation", "Customer illness complaint workflow"],
      "Documents": ["Food Safety Program (Std 3.2.1)", "HACCP Plan", "Allergen Mgmt Plan", "Cleaning & Sanitation", "Council Inspection Pack", "Staff induction"],
      "Add-ons": ["SafeInduct — Hospitality", "SafeCheck — Hospitality", "Academy — Hospitality", "Temperature Sensor IoT", "Council Inspection Pack"],
    },
    documents: ["Food Safety Program", "HACCP Plan", "Allergen Management Plan", "Temperature Monitoring Procedure", "Cleaning & Sanitation", "Food Safety Incident Response", "RSA Liquor Policy", "Staff Induction", "Council Inspection Audit Pack"],
    academy_modules: ["Food Handler Certification", "Food Safety Supervisor Foundation", "Responsible Service of Alcohol", "WHS for Venue Managers"],
    addons_highlight: ["safeinduct_hospitality", "safecheck_hospitality", "academy_hospitality", "temperature_sensors", "council_inspection_pack"],
    obligations: [
      { regulator: "FSANZ Food Standards Code 3.2.1 / 3.2.2A", basis: "Class 1 food businesses" },
      { regulator: "NSW Food Authority / Vic DHHS / QLD Health / WA Health / SA Health", basis: "State-specific food safety" },
      { regulator: "Liquor & Gaming NSW / Vic / QLD / Liquor SA / RSA WA", basis: "Liquor licence + RSA" },
      { regulator: "SafeWork (state)", basis: "WHS Act for staff safety" },
    ],
    pricing_anchor: "From A$1,499/month + GST — covers WHS AND Food Safety AND RSA tracking.",
    final_cta: "Stop juggling Food Safety, WHS and RSA across three systems.",
  },
  transport: {
    label: "Transport & Logistics",
    accent: "#0DC4B5",
    icon: "🚛",
    hero: {
      tagline: "Built for Australian heavy-vehicle operators.",
      headline: "WHS + Chain of Responsibility in one platform — survive an NHVR audit without panic.",
      sub: "CoR plans, fatigue, load restraint, pre-trips — generated, tracked, and audit-ready.",
      stats: [
        { value: "HVNL", label: "primary-duty aligned" },
        { value: "3 years", label: "fatigue record retention" },
        { value: "$1,499", label: "from /month + GST" },
        { value: "Std/BFM/AFM", label: "all options supported" },
      ],
    },
    problems: [
      { title: "CoR plans you can't actually run", body: "The compliance binder says one thing. The schedule says another. The driver is doing whatever fits the deadline." },
      { title: "Fatigue paperwork is a nightmare", body: "Driver work diaries are paper, the scheduler doesn't see breaches until the auditor does." },
      { title: "One incident from a prosecution", body: "NHVR prosecutions are public — and they hit schedulers, loaders and operators. Not just drivers." },
    ],
    features: {
      "WHS + CoR": ["CoR Management Plan AI generator", "Fatigue management policy", "Load restraint plans", "Pre-trip inspections", "Drug & alcohol policy", "Vehicle maintenance procedure"],
      "Transport-specific": ["Driver licence + medical tracking", "Fitness for duty per trip", "EWD integration", "NHVAS framework", "Mass / dimension management"],
      "Documents": ["CoR Plan", "Fatigue Policy", "Pre-trip inspection", "Load restraint plan", "Vehicle maintenance", "Transport SMS"],
      "Add-ons": ["SafeInduct — Transport", "SafeCheck — Transport", "Academy — Transport", "EWD Integration", "NHVAS Pack", "CoR Audit Pack"],
    },
    documents: ["CoR Management Plan", "Fatigue Management Policy", "Driver Fitness for Duty", "Vehicle Pre-Trip Inspection", "Load Restraint Plan", "Drug & Alcohol Policy", "Vehicle Maintenance Procedure", "Transport SMS"],
    academy_modules: ["Chain of Responsibility — Full", "Fatigue Management for Drivers", "Load Restraint", "CoR for Schedulers"],
    addons_highlight: ["safeinduct_transport", "safecheck_transport", "academy_transport", "ewd_integration", "cor_audit_pack"],
    obligations: [
      { regulator: "NHVR — National Heavy Vehicle Regulator", basis: "HVNL primary duty + CoR" },
      { regulator: "NHVAS", basis: "Fatigue / Maintenance / Mass Management accreditation" },
      { regulator: "SafeWork (state)", basis: "WHS Act for driver safety" },
      { regulator: "Comcare", basis: "Federal-jurisdiction operators" },
    ],
    pricing_anchor: "From A$1,499/month + GST — covers CoR, WHS, and fleet.",
    final_cta: "NHVR audits don't wait for your paperwork to catch up.",
  },
  healthcare: {
    label: "Healthcare & Aged Care",
    accent: "#2196A6",
    icon: "🏥",
    hero: {
      tagline: "Built for Australian healthcare and aged care.",
      headline: "WHS + Care Quality in one platform — survive ACQSC and NDIS audits.",
      sub: "ACQSC evidence, NDIS Practice Standards, manual handling, infection control, AHPRA monitoring.",
      stats: [
        { value: "8 standards", label: "ACQSC aligned" },
        { value: "Daily", label: "AHPRA register checks" },
        { value: "$2,499", label: "from /month + GST" },
        { value: "<1hr", label: "to onboard" },
      ],
    },
    problems: [
      { title: "ACQSC audit is binders of evidence", body: "8 standards × dozens of evidence types. Most providers spend weeks compiling evidence packs by hand." },
      { title: "Worker screening lapses are everywhere", body: "NDIS Worker Screening, aged-care screening, AHPRA — all expire on different days, and one gap is a registration risk." },
      { title: "Manual handling injuries are still #1", body: "Despite hoists everywhere, manual handling is still the leading injury cause in clinical settings." },
    ],
    features: {
      "WHS + Care Quality": ["Manual handling RA generator", "Infection control policy", "Violence & aggression SWPs", "ACQSC evidence packs", "NDIS Practice Standards module", "Clinical event log"],
      "Healthcare-specific": ["AHPRA daily monitoring", "NDIS Worker Screening tracking", "Aged care screening tracking", "Vaccination tracking", "Psychosocial RA"],
      "Documents": ["Manual Handling RA", "SWP Hoist Transfer", "SWP Aggressive Behaviour", "Infection Control Policy", "ACQSC Evidence Pack", "NDIS Compliance Pack", "Worker Screening Record"],
      "Add-ons": ["SafeInduct — Healthcare", "SafeCheck — Healthcare", "Academy — Healthcare", "ACQSC Pack", "AHPRA Monitoring", "NDIS Pack"],
    },
    documents: ["Manual Handling Risk Assessment", "SWP Hoist Transfer", "SWP Aggressive Behaviour", "Infection Control Policy", "ACQSC Quality Standard Evidence Pack", "NDIS Compliance Evidence Pack", "Worker Screening Compliance Record", "Psychosocial Risk Assessment"],
    academy_modules: ["Manual Handling for Healthcare", "Violence and Aggression Management", "Infection Control", "Aged Care Quality Standards", "NDIS Practice Standards"],
    addons_highlight: ["safeinduct_healthcare", "safecheck_healthcare", "academy_healthcare", "acqsc_audit_pack", "ahpra_monitoring", "ndis_support"],
    obligations: [
      { regulator: "ACQSC — Aged Care Quality and Safety Commission", basis: "Aged Care Act 2024 + 8 Strengthened Standards" },
      { regulator: "NDIS Quality and Safeguards Commission", basis: "NDIS Practice Standards + Worker Screening" },
      { regulator: "AHPRA", basis: "Health Practitioner Regulation National Law" },
      { regulator: "SafeWork (state)", basis: "WHS Act for clinician safety" },
    ],
    pricing_anchor: "From A$2,499/month + GST — covers WHS AND Care Quality AND credential monitoring.",
    final_cta: "ACQSC and NDIS auditors don't accept 'we're working on it'.",
  },
  retail: {
    label: "Retail",
    accent: "#A855F7",
    icon: "🛍️",
    hero: {
      tagline: "Built for Australian retail.",
      headline: "Lone-worker safety + casual induction at scale, without per-user costs.",
      sub: "Quick-induct casuals in 3 minutes, check in lone workers automatically, log every customer incident.",
      stats: [
        { value: "3-min", label: "casual induction" },
        { value: "Per-business", label: "pricing (no per-user)" },
        { value: "$999", label: "from /month + GST" },
        { value: "Bulk QR", label: "induction" },
      ],
    },
    problems: [
      { title: "Casual inductions take all day", body: "You hire a fill-in for one shift. The induction takes longer than the shift." },
      { title: "Lone workers get forgotten", body: "Late-shift staff at small stores have no formal check-in. One missed shift, and nobody notices for hours." },
      { title: "Customer incidents pile up", body: "Slip-and-fall claims that turn into legal cases — and you have no documented cleaning logs to defend yourself." },
    ],
    features: {
      "WHS + Retail": ["Lone worker check-in", "Quick-induct (3-min casual)", "Bulk QR induction", "Customer incident logging", "Spill response procedure", "Cash handling safety"],
      "Retail-specific": ["Roster compliance check", "Working alone RA", "Customer aggression response", "Manual handling for retail", "Emergency plan"],
      "Documents": ["Working Alone RA", "Spill Response", "Customer Aggression Procedure", "Manual Handling (Retail)", "Emergency Plan", "Lone Worker Procedure", "Quick Induct"],
      "Add-ons": ["SafeInduct — Retail", "SafeCheck — Retail", "Academy — Retail", "Franchise Network"],
    },
    documents: ["Working Alone Risk Assessment", "Spill Response Procedure", "Customer Aggression Response", "Manual Handling (Retail)", "Emergency Plan (Retail)", "Staff Induction (Full)", "Quick Induct (Casual)", "Lone Worker Procedure"],
    academy_modules: ["WHS for Retail Team Leaders", "Manual Handling in Retail", "Working Alone Safety"],
    addons_highlight: ["safeinduct_retail", "safecheck_retail", "academy_retail", "franchise_network"],
    obligations: [
      { regulator: "SafeWork (state)", basis: "WHS Act + lone-worker code" },
      { regulator: "Fair Work Ombudsman", basis: "Casual employment + induction obligations" },
      { regulator: "ACCC / state consumer law", basis: "Customer safety duty of care" },
    ],
    pricing_anchor: "From A$999/month + GST — for the whole store, no per-staff costs.",
    final_cta: "Casual hire to ASIC audit — covered.",
  },
};
