/**
 * SafeBase — multi-industry config (single source of truth).
 * Each entry powers /industries/<slug> via the shared IndustryPage template.
 *
 * Tone is verbatim from the build brief — keep copy as-is.
 */

export const INDUSTRY_BADGE_COLORS = {
  trades: { from: "from-[#0A1F44]", to: "to-[#0E2C5C]", accent: "bg-[#0DC4B5]", accentText: "text-[#0DC4B5]" },
  hospitality: { from: "from-[#5B2A0A]", to: "to-[#0A1F44]", accent: "bg-[#F59E0B]", accentText: "text-[#F59E0B]" },
  transport: { from: "from-[#0E3B3B]", to: "to-[#0A1F44]", accent: "bg-[#0DC4B5]", accentText: "text-[#0DC4B5]" },
  healthcare: { from: "from-[#1E3A8A]", to: "to-[#0A1F44]", accent: "bg-[#60A5FA]", accentText: "text-[#60A5FA]" },
  retail: { from: "from-[#4C1D95]", to: "to-[#0A1F44]", accent: "bg-[#A855F7]", accentText: "text-[#A855F7]" },
};

export const INDUSTRIES = {
  // ────────────────────────────────  TRADES  ────────────────────────────────
  trades: {
    slug: "trades",
    name: "Trades and Construction",
    badge: "Trades and Construction",
    nav: "Trades",
    icon: "HardHat",
    color: INDUSTRY_BADGE_COLORS.trades,
    signal: {
      pulse: "1,247 trade businesses onboarded this quarter",
      featured: "Featured this month: Sydney builder passes WorkSafe audit in 92 seconds — no binders, no scramble",
    },
    hero: {
      headline: ["Australia's WHS Platform", "Built For Trades. Finally."],
      subheadline:
        "SWMS in 60 seconds. Incidents reported by voice. Licences tracked automatically. WorkSafe visits? Audit pack ready in 2 minutes.",
      ctaPrimary: "Start Free 14-Day Trial",
      ctaSecondary: "See How It Works",
    },
    statBar: [
      "446,000 trade businesses in Australia",
      "51% of WHS prosecutions target small businesses",
      "Average fine: A$116,979",
      "0 purpose-built AI platforms before SafeBase",
    ],
    fear: {
      headline: "WorkSafe Doesn't Care That You're Busy",
      subheadline:
        "In 2024, SafeWork SA secured its highest conviction rate in over a decade. The average fine was A$116,979. Over half of all prosecutions were aimed at small businesses just like yours.",
      pains: [
        { icon: "Warning", title: "No SWMS on site", body: "Up to A$2.3M fine for a Category 1 breach. An inspector doesn't need to witness an incident — just the absence of a document." },
        { icon: "Clock", title: "Expired licences", body: "If your apprentice's white card expired and something happens, you're liable. Do you know when every licence on your team expires?" },
        { icon: "FileText", title: "Incident with no record", body: "No investigation record. No corrective action. No sign that you managed the risk. Your insurer and the regulator will both notice." },
      ],
      footnote: "SafeBase was built because these situations are preventable. Every one of them.",
    },
    features: {
      headline: "What SafeBase Does For Trades",
      blocks: [
        { icon: "Lightning", title: "SWMS in 60 seconds", body: "Select your trade and activity. AI generates a compliant Safe Work Method Statement using the official Safe Work Australia template structure — hazards, controls using the hierarchy, PPE, worker sign-off. All 19 High Risk Construction Work categories covered. Pre-loaded templates for electricians, plumbers, builders, roofers, concreters, and more.", proof: "Compliant with WHS Regulations Reg 299 and WorkSafe Victoria OHS Regulations 2017" },
        { icon: "Microphone", title: "Log an incident in 90 seconds. By voice.", body: "Worker taps a button on their phone, speaks for 60 seconds. AI transcribes, classifies, and formats a complete incident report. Notifiability check fires automatically — if you need to call WorkSafe, SafeBase tells you immediately with the right phone number for your state." },
        { icon: "ShieldCheck", title: "Never miss an expiry again", body: "White cards, electrical licences, plumbing licences, gas licences, high risk work licences, first aid certificates — tracked for every worker. Alerts sent to you and the worker at 60, 30, 14 and 7 days before expiry. Jake's EWP licence expires in 12 days and he has two jobs that require it? SafeBase tells you before it becomes a problem." },
        { icon: "Clipboard", title: "WorkSafe visits? You're ready in 2 minutes.", body: "Generate a complete audit pack as a PDF in under 2 minutes: SWMS register, incident history, worker credential summary, training records, corrective action register. Formatted for WorkSafe inspectors. No scrambling through folders. No missing documents." },
        { icon: "Handshake", title: "Every subbie verified before they set foot on site", body: "SafeCheck gives every subcontractor a verified compliance profile — licence status, insurance currency, white card, trading history. Builders request it instantly. Subbies maintain one profile that works everywhere. AI checks if their insurance coverage is adequate for the scope of work." },
        { icon: "Brain", title: "Patterns you'd never see in a spreadsheet", body: "4 near-misses involving electrical hazards in 60 days — all on Fridays after 2pm. SafeBase spots it and suggests a pre-weekend toolbox talk. Your incident history becomes intelligence, not just records." },
      ],
    },
    types: {
      headline: "Every Trade. Every Obligation.",
      grid: [
        { name: "Electricians", note: "SWMS for live work, underground cabling, solar installation · CCEW tracking · Electrical licence expiry · ESV/ESO compliance" },
        { name: "Plumbers", note: "SWMS for confined space drainage, gas fitting, hot water installation · Plumbing compliance certificates · VBA360 integration guidance · Gas test records" },
        { name: "Builders", note: "WHS Management Plan · Formwork SWMS · Height work edge protection · Subcontractor prequalification · Site Safety Plan" },
        { name: "Roofers", note: "Working at heights SWMS · Edge protection · Harness and anchor tracking · Fragile roof procedures" },
        { name: "Concreters", note: "Formwork and tilt-up SWMS · Silica dust management · Reinforcement hazards · Pour safety procedures" },
        { name: "Carpenters", note: "Structural framing SWMS · Height work · Power tool procedures · Roof truss erection" },
        { name: "Scaffolders", note: "Scaffold erection SWMS · HRWL tracking · Load calculations · Principal contractor documentation" },
        { name: "Demolition", note: "Asbestos awareness · Demolition SWMS · Structural engineering sign-off · Notifiable incident procedures" },
        { name: "Landscapers", note: "Chemical handling · Plant operation · Manual handling · Confined space irrigation" },
        { name: "Cleaners", note: "Hazardous chemicals register · SDS library · Working alone safety · Slip and trip management" },
      ],
    },
    docs: {
      headline: "Every Document You Need. Generated by AI.",
      groups: [
        { title: "Safety Documents", items: ["Safe Work Method Statement (SWMS)", "Job Safety Analysis (JSA)", "Site-Specific Safety Plan (SSSP)", "WHS Management Plan", "Emergency Plan / Emergency Response Plan", "Risk Assessment", "Confined Space Entry Permit", "Safe Work Procedure"] },
        { title: "Worker Documents", items: ["Site Induction Record", "General Construction Induction Record", "White Card Sighting Record", "High Risk Work Licence Record", "Training Record", "Fit for Work Declaration"] },
        { title: "Trade-Specific", items: ["Certificate of Compliance — Electrical (CCEW)", "Certificate of Compliance — Plumbing", "Gas Compliance Certificate", "Pressure Test Record", "Test and Tag Record", "Traffic Management Plan"] },
        { title: "Compliance Documents", items: ["Annual WHS Review Report", "Audit Preparation Pack", "Corrective Action Register", "Notifiable Incident Register"] },
      ],
    },
    association: {
      headline: "Built Around How Trades Actually Work",
      body: "SafeBase was developed with input from electricians, plumbers, and builders across Australia. The content libraries, hazard categories, and document templates are built for Australian WHS law — not adapted from overseas tools or repurposed from a generic compliance platform.",
      logoCaption: "Members of the following associations can use SafeBase:",
      logos: ["Master Electricians Australia", "Master Plumbers", "HIA", "Master Builders Association", "NECA"],
    },
    pricing: {
      headline: "6.9% Of One Fine. Every Year.",
      tiers: [
        { name: "Solo Tradie", price: "A$799/month + GST" },
        { name: "Small Team", price: "A$1,599/month + GST" },
        { name: "Growing Business", price: "A$2,499/month + GST" },
      ],
      footnote: "All plans include SWMS generation, incident management, and licence tracking. 14-day free trial. No credit card required.",
      roi: "SafeBase for a solo tradie costs A$7,990/year + GST. The average WorkSafe fine is A$116,979. You do the maths — that's 6.9% of one fine, with compliance running every single day.",
      cta: "Start Free Trial",
    },
    testimonials: [
      { quote: "Before SafeBase I was spending 45 minutes writing a SWMS for every new job. Now it takes 60 seconds and I know it's compliant. First time I've felt ready for a WorkSafe visit in 15 years of business.", who: "Electrician, Melbourne, VIC" },
      { quote: "My apprentice's white card expired and I had no idea. SafeBase would have told me 30 days before. Now I use it for every credential on the team.", who: "Plumber, Brisbane, QLD" },
      { quote: "We had a WorkSafe inspector on site last month. Pulled up the audit pack in 90 seconds. Inspector said it was the most organised small builder they'd visited.", who: "Builder, Sydney, NSW" },
    ],
    finalCta: {
      headline: "Every Tradie Deserves A System That Works.",
      body: "Stop managing compliance with folders, spreadsheets, and hope. Start your free trial today — no credit card, no setup fees, no lock-in. Your first SWMS is ready in 60 seconds.",
      cta: "Start My Free Trial",
      subtext: "14-day free trial · Cancel anytime · Australian data hosting",
    },
  },

  // ──────────────────────────────  HOSPITALITY  ─────────────────────────────
  hospitality: {
    slug: "hospitality",
    name: "Hospitality",
    badge: "Hospitality",
    nav: "Hospitality",
    icon: "ChefHat",
    color: INDUSTRY_BADGE_COLORS.hospitality,
    signal: {
      pulse: "247 venues joined this week — 43 cafes, 61 restaurants, 29 bars, 114 others",
      featured: "Featured this month: Brisbane cafe group cuts council inspection prep from 6 hours to 4 minutes",
    },
    hero: {
      headline: ["WHS and Food Safety Compliance", "for Hospitality. Done."],
      subheadline:
        "From kitchen hazards and food handler tracking to RSA certificates and temperature logs — SafeBase manages every compliance obligation your venue has. All in one place.",
      ctaPrimary: "Start Free Trial for Hospitality",
      ctaSecondary: "See Food Safety Features",
    },
    statBar: [
      "900,000 hospitality workers in Australia",
      "2,818 injuries per 100,000 workers",
      "A$1B+ in compliance losses in 2022",
      "Most venues manage compliance with paper and hope",
    ],
    fear: {
      headline: "Running a Venue Is Hard Enough. Compliance Shouldn't Make It Harder.",
      subheadline: "",
      pains: [
        { icon: "Thermometer", title: "Temperature failure at 2am", body: "Your cool room temperature crept above 5°C overnight. Nobody noticed until the morning service. No temperature log. No corrective action record. Council inspector next week." },
        { icon: "Certificate", title: "RSA expired — nobody knew", body: "Your best bartender's RSA expired three months ago. If something happens on their shift, your liquor licence is at risk. Do you know the expiry date of every certificate on your team?" },
        { icon: "ForkKnife", title: "Customer illness complaint", body: "A customer reports illness they believe is linked to your food. Do you have a food safety incident record? Temperature logs? HACCP documentation? Your food safety plan?" },
      ],
      footnote: "",
    },
    features: {
      headline: "What SafeBase Does for Hospitality",
      blocks: [
        { icon: "Thermometer", title: "Temperature logs that actually get done", body: "Configure monitoring schedules for every piece of refrigeration equipment. Staff complete temperature checks on their phone in 10 seconds. AI alerts you when a reading is outside safe range — before it becomes a food safety incident. Export temperature logs for council inspections instantly." },
        { icon: "ForkKnife", title: "HACCP plans generated by AI", body: "Select your food service type — raw meat, hot food service, buffet, catering, or cold display. AI generates a HACCP plan covering critical control points, monitoring procedures, and corrective actions. Reviewed and updated when your processes change. Always ready for a council inspection." },
        { icon: "IdentificationBadge", title: "Every RSA, food handler, and food safety supervisor tracked", body: "RSA, food handler certificates, food safety supervisor designation, first aid, and liquor approved manager certifications — tracked for every team member with alerts before they expire. Under Standard 3.2.2A, you need at least one Food Safety Supervisor. SafeBase tells you if yours is current." },
        { icon: "Warning", title: "Injuries AND food safety events — one system", body: "Log WHS incidents — burns, slips, manual handling injuries — alongside food safety events: customer illness complaints, contamination findings, allergen incidents, temperature failures. Every record permanent, auditable, and formatted for council and regulator review." },
        { icon: "Detective", title: "Allergen records that protect your customers and your business", body: "Maintain a menu allergen register covering all 14 major allergens. Track staff allergen awareness training. Log allergen incidents. When a customer with a nut allergy has a reaction, your records show you had a system — and followed it." },
        { icon: "Broom", title: "Cleaning records council inspectors actually want to see", body: "Configurable cleaning schedules for every area — kitchen benches, cool room, grease traps, exhaust canopy. Staff tick off completions on their phone. Photo evidence optional. Overdue tasks flag instantly. Export for compliance inspections in seconds." },
      ],
    },
    types: {
      headline: "Built for Every Type of Venue",
      grid: [
        { name: "Restaurants and cafes", note: "" },
        { name: "Bars and pubs", note: "" },
        { name: "Hotels and accommodation", note: "" },
        { name: "Fast food and takeaway", note: "" },
        { name: "Catering businesses", note: "" },
        { name: "Event venues", note: "" },
        { name: "Food trucks", note: "" },
        { name: "Bakeries and food manufacturers", note: "" },
        { name: "Coffee shops", note: "" },
      ],
    },
    obligations: {
      headline: "Every Compliance Obligation. One Platform.",
      cols: [
        { title: "WHS Compliance", items: ["Manual handling risk assessment", "Slip and trip hazard management", "Burns and heat hazard controls", "Chemical hazard register (cleaning products)", "Working in heat (kitchens)", "Psychosocial safety (bullying & harassment)", "Emergency plan", "Staff induction records", "Incident and injury register", "WorkSafe notification (if required)"] },
        { title: "Food Safety Compliance", items: ["HACCP plan (Standard 3.2.1)", "Temperature monitoring records", "Food handler certificates (Standard 3.2.2)", "Food Safety Supervisor designation (NSW, QLD, ACT, NT — mandatory)", "Allergen register", "Cleaning and sanitation schedules", "Supplier management records", "Council inspection preparation", "Food safety incident records", "Corrective action register"] },
      ],
    },
    docs: {
      headline: "Documents Generated for Hospitality",
      groups: [
        { title: "All Hospitality Documents", items: ["Emergency Plan (WHS Reg 43)", "Safe Work Procedure — Kitchen safety", "Safe Work Procedure — Manual handling", "Safe Work Procedure — Chemical handling", "Safe Work Procedure — Working alone", "HACCP Plan (by food type)", "Food Safety Program (Standard 3.2.1)", "Temperature Monitoring Log", "Allergen Register", "Cleaning and Sanitation Schedule", "Supplier Delivery Record", "Food Safety Incident Report", "Staff Induction Checklist", "Annual WHS Review Report", "Council Inspection Audit Pack"] },
      ],
    },
    pricing: {
      headline: "One System for WHS and Food Safety",
      tiers: [],
      footnote: "Most venues pay separately for a WHS tool and a food safety tool — if they pay for anything at all. SafeBase includes both. From A$1,499/month + GST.",
      cta: "Start Free Trial for Hospitality",
    },
    finalCta: {
      headline: "Every Venue Deserves A Compliance System That Works.",
      body: "Start your free trial today — no credit card, no setup fees, no lock-in.",
      cta: "Start Free Trial for Hospitality",
      subtext: "14-day free trial · No credit card · Australian data hosting",
    },
  },

  // ──────────────────────────────  TRANSPORT  ───────────────────────────────
  transport: {
    slug: "transport",
    name: "Transport and Logistics",
    badge: "Transport and Logistics",
    nav: "Transport",
    icon: "Truck",
    color: INDUSTRY_BADGE_COLORS.transport,
    signal: {
      pulse: "83 operators onboarded this month · 3 multi-chain freight groups this week",
      featured: "Featured this month: Regional freight operator generates full CoR Management Plan in 14 minutes",
    },
    hero: {
      headline: ["WHS and Chain of Responsibility", "Compliance for Transport. All In One."],
      subheadline:
        "Fatigue management, vehicle inspections, driver credentials, load restraint records, and your CoR Management Plan — tracked, documented, and audit-ready.",
      ctaPrimary: "Start Free Trial for Transport",
      ctaSecondary: "See CoR Features",
    },
    statBar: [
      "1.2 million transport workers in Australia",
      "Transport is one of Australia's highest-risk industries",
      "CoR holds every party in the chain accountable",
      "Penalties include criminal prosecution",
    ],
    fear: {
      headline: "In Transport, Everyone In The Chain Is Accountable. Are You Ready?",
      subheadline:
        "Under Chain of Responsibility laws, it is not enough to say the driver made the decision. If your scheduling created pressure that led to a fatigued driver, you are liable. If your loading practices contributed to a mass violation, you are liable. If your maintenance records cannot demonstrate the vehicle was roadworthy, you are liable.",
      pains: [
        { icon: "Clock", title: "Fatigue — everyone's responsibility", body: "Schedulers and employers must ensure work and rest hours comply with fatigue laws, and that drivers are not pressured to drive when tired. One incident linked to fatigue can result in criminal prosecution for the business — not just the driver." },
        { icon: "Truck", title: "Vehicle defects", body: "Operators must maintain vehicles to required standards and prevent unsafe vehicles from entering the road network. Incomplete or missing maintenance records are a direct CoR liability." },
        { icon: "Scales", title: "Load compliance", body: "Everyone in the chain must ensure vehicles are not overloaded and loads are properly secured. The loader, the scheduler, and the operator all share this obligation." },
      ],
      footnote: "",
    },
    features: {
      headline: "What SafeBase Does for Transport",
      blocks: [
        { icon: "Clock", title: "Fatigue compliance that works before the driver starts the engine", body: "Drivers complete a pre-trip fitness for duty declaration on their phone before every shift — hours of sleep, hours awake, medications, physical condition. If a driver is unfit, the trip cannot commence and the supervisor is notified immediately. Work and rest hours tracked per driver with standard hours and BFM/AFM compliance checks. Scheduling alerts tell you before you create a fatigue breach — not after." },
        { icon: "Truck", title: "Vehicle inspections that actually protect you", body: "Structured pre-trip checklists for every vehicle class — rigid truck, semi, B-train, van. Lights, tyres, brakes, coupling, load restraint. Pass or fail per item. Any fail automatically places the vehicle out of service. Maintenance schedules tracked. All records permanent, timestamped, and available for NHVR inspection instantly." },
        { icon: "FileText", title: "Your CoR Management Plan. Generated by AI.", body: "AI generates a complete Chain of Responsibility Management Plan covering all six elements required by NHVR guidance: fatigue management, speed management, mass and dimension, load restraint, vehicle standards, and scheduling and dispatch. Reviewed annually or after any CoR incident. Formatted for NHVR audit submission." },
        { icon: "IdentificationBadge", title: "Every licence, medical, and certification tracked", body: "Heavy vehicle licences (HR, HC, MC), dangerous goods certificates, professional driver medical certificates, fatigue management training, and forklift licences — tracked for every driver and operator. Alerts before expiry. If a driver's licence expires before their next scheduled shift, SafeBase tells you in advance." },
        { icon: "Scales", title: "Load records that prove compliance", body: "For every load: cargo type, mass, restraint method, number of restraint points, and photo of secured load. Loader name and signature captured. Compliance with the Load Restraint Guide 3rd Edition confirmed per load. Every record linked to the relevant trip and driver." },
        { icon: "Warning", title: "WHS incidents and CoR events — one investigation workflow", body: "Log vehicle accidents, near-misses, fatigue events, load failures, roadside inspection notices, and speed violations in the same system as WHS incidents. NHVR notification prompts where required. Root cause analysis, corrective actions, and close-out workflow. Every record available for NHVR and WHS regulator review." },
      ],
    },
    chain: {
      headline: "If You're In The Chain, You Have Obligations.",
      caption: "SafeBase helps every party in the chain document their compliance and demonstrate due diligence.",
      nodes: [
        { role: "Consignor", obligation: "Ensure the freight description matches reality and the loading method is safe." },
        { role: "Freight Manager", obligation: "Verify all parties below have systems and time to comply." },
        { role: "Scheduler", obligation: "Build trip plans that don't pressure drivers to breach fatigue or speed laws." },
        { role: "Loader / Packer", obligation: "Confirm mass, dimension, and restraint comply before vehicle departs." },
        { role: "Operator", obligation: "Maintain vehicles, train drivers, and document every safety system." },
        { role: "Driver", obligation: "Drive lawfully and refuse trips that breach rest, mass, or roadworthiness." },
        { role: "Consignee", obligation: "Provide safe receipt windows that don't create pressure on the chain above." },
      ],
    },
    types: {
      headline: "Built for Every Transport Operation",
      grid: [
        { name: "Owner-operators (solo truck drivers)", note: "" },
        { name: "Small trucking companies (2–20 vehicles)", note: "" },
        { name: "Freight brokers and managers", note: "" },
        { name: "Warehouse and distribution centres", note: "" },
        { name: "Courier and last-mile delivery", note: "" },
        { name: "Refrigerated transport operators", note: "" },
        { name: "Dangerous goods transport", note: "" },
        { name: "Agricultural freight", note: "" },
        { name: "Bulk liquid and tanker operations", note: "" },
      ],
    },
    docs: {
      headline: "Documents Generated for Transport",
      groups: [
        { title: "All Transport Documents", items: ["CoR Management Plan", "Fatigue Management Policy", "Driver Fitness for Duty Declaration (per trip)", "Vehicle Pre-Trip Inspection Record (per trip)", "Vehicle Maintenance Log", "Load Restraint Record (per load)", "Driver Work Diary Summary", "Safe Work Procedure — Loading and unloading", "Safe Work Procedure — Coupling and uncoupling", "Safe Work Procedure — Working at height on vehicles", "Emergency Plan", "CoR Incident Report", "Staff Induction Record", "Annual WHS and CoR Review Report"] },
      ],
    },
    pricing: {
      headline: "WHS and CoR Compliance. One Subscription.",
      tiers: [],
      footnote: "Every party in the chain needs to demonstrate compliance. SafeBase gives drivers, schedulers, operators, and managers the tools to do that — without multiple systems, without paperwork, and without hoping nobody checks. From A$1,499/month + GST.",
      cta: "Start Free Trial for Transport",
    },
    finalCta: {
      headline: "Every Operator. Every Party In The Chain.",
      body: "Start your free trial today and document your compliance — before NHVR comes knocking.",
      cta: "Start Free Trial for Transport",
      subtext: "14-day free trial · No credit card · Australian data hosting",
    },
  },

  // ─────────────────────────────  HEALTHCARE  ───────────────────────────────
  healthcare: {
    slug: "healthcare",
    name: "Healthcare and Aged Care",
    badge: "Healthcare and Aged Care",
    nav: "Healthcare",
    icon: "HeartStraight",
    color: INDUSTRY_BADGE_COLORS.healthcare,
    signal: {
      pulse: "196 practices + aged care providers joined this month — ahead of Aged Care Act 2024 go-live",
      featured: "Featured this month: Allied health group tracks 47 AHPRA registrations across 4 clinics — zero lapses",
    },
    hero: {
      headline: ["WHS and Care Quality Compliance", "for Healthcare. Simplified."],
      subheadline:
        "AHPRA registration tracking, Aged Care Quality Standards documentation, NDIS Practice Standards compliance, worker screening records, and incident management — all in one platform.",
      ctaPrimary: "Start Free Trial for Healthcare",
      ctaSecondary: "See Care Quality Features",
    },
    statBar: [
      "New Aged Care Act 2024 — effective 1 November 2025",
      "Stronger ACQSC enforcement powers",
      "NDIS supports 692,823 participants",
      "AHPRA registers 800,000+ health practitioners",
    ],
    fear: {
      headline: "Two Compliance Regimes. Double The Risk If You Get It Wrong.",
      subheadline:
        "Healthcare and aged care providers face compliance obligations from two directions simultaneously. Safe Work Australia and state WHS regulators require the same WHS compliance as any employer. The Aged Care Quality and Safety Commission, the NDIS Commission, and AHPRA layer additional obligations on top. The new Aged Care Act 2024 — effective 1 November 2025 — gives the ACQSC significantly stronger enforcement powers. Accountability now extends to governing bodies, staff, and contractors.",
      pains: [
        { icon: "IdentificationBadge", title: "AHPRA registration lapsed", body: "A clinician whose registration lapsed continued practising. The ACQSC investigation found no monitoring system was in place. Regulatory action followed. Do you know the expiry date of every AHPRA registration on your team?" },
        { icon: "Clipboard", title: "ACQSC audit — no evidence", body: "Auditors arrive. You know you deliver good care. But your compliance evidence is spread across spreadsheets, folders, and email. You cannot produce the documentation the Strengthened Quality Standards require. A non-conformance notice is issued." },
        { icon: "UserCircle", title: "Worker screening gap", body: "Under the new Aged Care Act, worker screening requirements changed from 1 November 2025. A support worker without a current screening clearance worked a shift. The organisation had no automated tracking." },
      ],
      footnote: "",
    },
    features: {
      headline: "What SafeBase Does for Healthcare",
      blocks: [
        { icon: "IdentificationBadge", title: "Every AHPRA registration tracked. Every expiry alerted.", body: "AHPRA registrations, NDIS Worker Screening Checks, Aged Care worker screening, Working with Children Checks, vaccination records, professional indemnity insurance, and clinical competency certifications — all tracked per staff member with expiry alerts at 60, 30, and 14 days. AI links: 'Dr Chen's AHPRA registration expires in 21 days. She has 47 appointments scheduled after expiry.' One alert. Zero surprises." },
        { icon: "Trophy", title: "Strengthened Quality Standards evidence — organised and audit-ready", body: "All 8 Strengthened Aged Care Quality Standards tracked in SafeBase. For each standard: upload compliance evidence, link to incident records and training completion, record assessment dates, track non-conformances and corrective actions. When the ACQSC arrives, generate a compliance evidence pack per standard in minutes — not days." },
        { icon: "Clipboard", title: "NDIS compliance documentation that survives an audit", body: "All four core NDIS Practice Standards modules tracked — Rights and Responsibility, Governance and Operational Management, Provision of Supports, Support Provision Environment. Evidence uploaded and linked. Corrective actions managed. Supplementary modules (High Intensity Supports, Specialist Behaviour Support) available for registered providers who need them." },
        { icon: "FirstAidKit", title: "WHS incidents AND clinical events. One investigation system.", body: "Medication errors, patient falls, pressure injuries, unexpected deterioration, aggression incidents, and WHS injuries are all managed in one workflow. Severity classification using the Australian Commission on Safety and Quality in Health Care scale. Sentinel event notification prompts. Root cause analysis. Corrective actions tracked to closure." },
        { icon: "Person", title: "The highest injury risk in healthcare. Managed proactively.", body: "Nurses and support workers have the highest manual handling injury rate of any occupation in Australia. SafeBase generates Safe Work Procedures for hoist transfers, bed mobility, shower assists, and walking support. Links worker completion of manual handling training to their credential record. Flags when a worker's manual handling training is overdue." },
        { icon: "Brain", title: "Burnout, aggression, and moral injury. Managed — not ignored.", body: "Healthcare workers face psychosocial risks that most WHS platforms don't address. SafeBase includes a dedicated psychosocial risk register for client-initiated aggression, vicarious trauma, moral injury, and burnout. Anonymous reporting for staff concerns. Nurse and Midwife Support: 1800 667 877 always visible. Incident tracking for aggressive behaviour events." },
      ],
    },
    types: {
      headline: "Built for Every Healthcare Setting",
      grid: [
        { name: "Private allied health practices", note: "Physio, OT, speech, psychology" },
        { name: "Residential aged care facilities", note: "" },
        { name: "Home care providers", note: "" },
        { name: "Disability support organisations (NDIS)", note: "" },
        { name: "Community health services", note: "" },
        { name: "Medical centres and GP practices", note: "" },
        { name: "Dental practices", note: "" },
        { name: "Nursing agencies and workforce businesses", note: "" },
        { name: "Mental health services", note: "" },
      ],
    },
    framework: {
      headline: "Every Regulator. Every Obligation. One System.",
      cols: [
        { title: "WHS Obligations", items: ["Safe Work Australia Model CoP — Healthcare and Social Assistance", "Manual handling risk management", "Psychosocial safety obligations", "Incident reporting (notifiable incidents)", "Emergency planning", "Worker credential verification", "Contractor management"] },
        { title: "Aged Care", items: ["Aged Care Act 2024 (from 1 Nov 2025)", "Strengthened Aged Care Quality Standards", "ACQSC audit obligations", "Worker screening requirements (updated 1 Nov 2025)", "Support at Home compliance (from 1 Nov 2025)"] },
        { title: "NDIS and Allied Health", items: ["NDIS Practice Standards", "NDIS Worker Screening (risk-assessed roles)", "AHPRA registration requirements", "Professional indemnity insurance tracking", "Continuing professional development records"] },
      ],
    },
    docs: {
      headline: "Documents Generated for Healthcare",
      groups: [
        { title: "All Healthcare Documents", items: ["Emergency Plan", "Safe Work Procedure — Hoist transfer", "Safe Work Procedure — Manual handling", "Safe Work Procedure — Aggressive behaviour response", "Safe Work Procedure — Lone worker", "Risk Assessment — Manual handling", "Psychosocial Risk Register", "WHS Incident Report", "Clinical / Adverse Event Report", "Worker Screening Records", "AHPRA Registration Record", "Staff Induction Record", "Annual WHS Review", "Quality Standards Evidence Pack (per standard, ACQSC format)", "NDIS Compliance Evidence Pack", "Corrective Action Register"] },
      ],
    },
    pricing: {
      headline: "Compliance That Moves As Fast As Your Team Does.",
      tiers: [],
      footnote: "Healthcare providers cannot afford compliance gaps. The ACQSC has stronger enforcement powers than ever before. SafeBase gives you the documentation infrastructure to demonstrate compliance — continuously, not just at audit time. From A$2,499/month + GST.",
      cta: "Start Free Trial for Healthcare",
    },
    finalCta: {
      headline: "Care Quality. WHS. AHPRA. All In One Place.",
      body: "Start your free trial today — no credit card, no setup fees, Privacy Act compliant.",
      cta: "Start Free Trial for Healthcare",
      subtext: "14-day free trial · No credit card · Australian data hosting · Privacy Act compliant",
    },
  },

  // ───────────────────────────────  RETAIL  ─────────────────────────────────
  retail: {
    slug: "retail",
    name: "Retail",
    badge: "Retail",
    nav: "Retail",
    icon: "ShoppingBag",
    color: INDUSTRY_BADGE_COLORS.retail,
    signal: {
      pulse: "312 retailers + 4 franchise networks onboarded this week",
      featured: "Featured this month: 112-location franchise group inducts 840 seasonal casuals in 48 hours via QR",
    },
    hero: {
      headline: ["WHS Compliance for Retail.", "Simple Enough For Every Shift."],
      subheadline:
        "High staff turnover, casual workforces, and multiple locations — retail compliance is hard. SafeBase makes it simple. Induct a casual worker in 3 minutes. Track every certificate. Keep lone workers safe.",
      ctaPrimary: "Start Free Trial for Retail",
      ctaSecondary: "See Retail Features",
    },
    statBar: [
      "Over 1.4 million retail workers in Australia",
      "Slips, trips and falls — the #1 retail injury",
      "High casual workforce = persistent induction challenge",
      "Manual handling injuries cost the industry millions annually",
    ],
    fear: {
      headline: "High Turnover. Casual Workforce. Compliance That Can't Keep Up.",
      subheadline: "",
      pains: [
        { icon: "UserCircle", title: "Casual started without an induction", body: "It's Friday night. A casual worker started their first shift. Nobody could find the induction checklist. They slipped on a wet floor near the cool room. No induction record. No evidence of training. The claim proceeds." },
        { icon: "Moon", title: "Lone worker — no check-in", body: "Closing shift. One team member on site. No check-in system. Something happened at 10pm. The first anyone knew was the morning opener at 7am." },
        { icon: "Person", title: "Manual handling injury from delivery", body: "A staff member injured their back unloading a delivery. No manual handling training record. No safe work procedure for goods receiving. Workers compensation claim filed. Investigation found no evidence of a safety system." },
      ],
      footnote: "",
    },
    features: {
      headline: "What SafeBase Does for Retail",
      blocks: [
        { icon: "QrCode", title: "Induct a casual worker in 3 minutes. Every time.", body: "Retail has Australia's most transient workforce. SafeBase's Quick Induct is built for it. New casual staff scan a QR code on their phone, complete a 3-minute digital induction covering emergency exits, hazards, spill response, and reporting. Sign-off recorded permanently. Induct up to 20 casuals at once using QR code at the team briefing. Every record permanent and auditable." },
        { icon: "Bell", title: "Every lone worker checked in. Every shift.", body: "Retail workers frequently work alone on early and closing shifts. SafeBase's Lone Worker Check-In requires staff to confirm they are safe at configurable intervals. Missed check-in? SMS alert to the nominated supervisor. No response in 15 minutes? Escalation protocol activates. Works via app or SMS — no smartphone required." },
        { icon: "Warning", title: "Customer injuries. Staff injuries. All captured.", body: "Retail incidents involve customers as well as workers. SafeBase captures both: worker injuries, customer injuries on premises, near-misses, and property damage. Voice-to-report on mobile. Photo evidence. Notifiability check. Investigation workflow. Corrective actions tracked to closure." },
        { icon: "ShieldWarning", title: "Slips, trips, manual handling, and working alone — all managed", body: "The top retail hazards are loaded into SafeBase's risk register with pre-populated controls. Spill response procedure. Manual handling technique. Safe use of ladders for high shelving. Cool room entry. Working alone at night. Each hazard has a pre-built Safe Work Procedure ready to review, sign off, and implement." },
        { icon: "IdentificationBadge", title: "RSA, first aid, and forklift licences — tracked for every team member", body: "Responsible Service of Alcohol for bottle shop and liquor section staff. First aid certificates — at least one per shift. Forklift licences for stockroom operations. Tracked per worker with expiry alerts. Assign required credentials by role — when a new staff member joins, SafeBase automatically shows which credentials they need." },
        { icon: "Buildings", title: "One account. Every store.", body: "Retail groups and franchise networks manage all locations from one SafeBase account. Head office sets compliance standards and induction content. Each store manages its own incidents, hazards, and staff. Head office sees compliance scores across the network. Low-scoring stores flagged for attention before an inspector notices." },
      ],
    },
    types: {
      headline: "Built for Every Retail Operation",
      grid: [
        { name: "Independent retail stores", note: "" },
        { name: "Multi-site retail groups", note: "" },
        { name: "Franchise retail networks", note: "" },
        { name: "Supermarkets and grocery", note: "" },
        { name: "Bottle shops and liquor retail", note: "" },
        { name: "Fashion and apparel", note: "" },
        { name: "Hardware and trade retail", note: "" },
        { name: "Pharmacy and health retail", note: "" },
        { name: "Electronics retail", note: "" },
        { name: "Sporting goods", note: "" },
      ],
    },
    franchise: {
      headline: "Running a Retail Franchise Network? SafeBase Was Built For You.",
      body:
        "Every franchisee has a different approach to safety. Some are thorough. Some have nothing. You have 80 locations and no visibility. One incident becomes your brand's headline.",
      bullets: [
        "One safety standard loaded into every franchisee's account",
        "Real-time compliance scores across your entire network",
        "Alerts when any location falls below your required standard",
        "Incident visibility across all stores",
        "Bulk staff induction for seasonal hiring",
      ],
      pricing: "A$99/month + GST per franchisee. Volume pricing available for networks of 50 or more locations.",
      cta: "Book a Network Demo",
    },
    docs: {
      headline: "Documents Generated for Retail",
      groups: [
        { title: "All Retail Documents", items: ["Emergency Plan", "Safe Work Procedure — Spill response", "Safe Work Procedure — Manual handling (shelf stacking, goods receiving)", "Safe Work Procedure — Ladder use", "Safe Work Procedure — Working alone", "Safe Work Procedure — Customer aggression", "Safe Work Procedure — Cool room entry", "Safe Work Procedure — Cash handling", "Staff Induction Checklist (full)", "Casual Quick Induct Record", "Hazard Register", "Lone Worker Check-In Log", "Incident Report", "First Aid Record", "Annual WHS Review"] },
      ],
    },
    pricing: {
      headline: "Simple Enough for Any Shift. Powerful Enough for Any Network.",
      tiers: [],
      footnote: "From a single store to a 200-location franchise network — SafeBase scales with you. Every team member inducted. Every certificate tracked. Every lone worker safe. From A$999/month + GST.",
      cta: "Start Free Trial for Retail",
    },
    finalCta: {
      headline: "Every Shift. Every Store. Every Worker.",
      body: "Start your free trial today and bring retail compliance into one system.",
      cta: "Start Free Trial for Retail",
      subtext: "14-day free trial · No credit card · Australian data hosting",
    },
  },
};

export const INDUSTRY_LIST = Object.values(INDUSTRIES);
