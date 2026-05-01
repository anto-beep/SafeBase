/**
 * Per-industry pricing configuration — Iter37 pricing update.
 *
 * Annual is the DEFAULT shown across the platform. Monthly is secondary.
 * Every price is followed by "+ GST" everywhere it is rendered.
 *
 * `slugs.annual` / `slugs.monthly` map to Stripe Checkout tiers registered
 * in /app/backend/routes/billing.py.
 */

const FEATURES_BY_INDUSTRY = {
  trades: {
    1: ["Unlimited AI SWMS generation", "Incident and near-miss register", "Up to 10 worker profiles", "Licence and credential tracking", "Compliance dashboard", "Audit prep PDF export", "Mobile app access", "Email support"],
    2: ["Everything in tier 1", "Up to 5 users", "Contractor compliance capture", "AI incident pattern detection", "Up to 5 sites", "SafeInduct QR inductions included", "Toolbox Talks", "Plant register", "Priority chat and email"],
    3: ["Everything in tier 2", "Up to 20 users", "Unlimited sites", "SafeCheck included", "SafeBase Academy (10 workers) included", "Risk register", "Hazardous substances and SDS", "Advanced analytics", "Legislative alerts", "Phone support"],
    4: ["Everything in tier 3", "Up to 50 users", "Dedicated Account Manager", "Multi-site rollups", "API access", "Custom SSO", "SLA support", "Onboarding workshop"],
  },
  hospitality: {
    1: ["Unlimited HACCP plans (AI)", "Temperature monitoring with alerts", "Allergen register", "RSA and Food Handler tracking", "Cleaning schedules", "Council inspection pack", "Up to 3 users", "Email support"],
    2: ["Everything in tier 1", "Up to 8 users", "Contractor compliance capture", "AI incident pattern detection", "Up to 5 venues", "SafeInduct included", "Supplier management", "Liquor Approved Manager tracking", "Priority chat and email"],
    3: ["Everything in tier 2", "Up to 20 users", "Unlimited venues", "SafeCheck included", "SafeBase Academy included", "Council Inspection Pack included", "Liquor and RSA Management included", "Advanced analytics", "Legislative alerts", "Phone support"],
    4: ["Everything in tier 3", "Up to 50 users", "Dedicated Account Manager", "Multi-region rollups", "API access", "Custom SSO", "SLA support", "Onboarding workshop"],
  },
  transport: {
    1: ["Unlimited AI CoR plans", "Fitness for Duty (daily)", "Pre-trip inspection records", "Load restraint records", "Heavy vehicle licence tracking", "Up to 3 users", "Mobile app", "Email support"],
    2: ["Everything in tier 1", "Up to 10 users", "Up to 5 vehicles and drivers", "Fatigue management module", "SafeInduct included", "Driver work diary summary", "Maintenance log", "Priority support"],
    3: ["Everything in tier 2", "Up to 25 users", "Unlimited fleet", "SafeCheck included", "SafeBase Academy included", "CoR Audit Pack included", "Scheduling compliance check", "NHVR notification prompts", "Multi-depot rollups", "Phone support"],
    4: ["Everything in tier 3", "Up to 50 users", "Dedicated Account Manager", "Custom CoR plan templates", "API access", "Custom SSO", "SLA support", "Onboarding workshop"],
  },
  healthcare: {
    1: ["AHPRA registration tracking", "Worker screening (NDIS and Aged Care)", "Manual handling assessments", "Vaccination register", "Up to 5 users", "Mobile app", "Email support"],
    2: ["Everything in tier 1", "Up to 15 users", "Up to 5 clinics", "SafeInduct included", "Clinical event log", "Patient aggression module", "ACQSC and NDIS evidence pack", "Priority support"],
    3: ["Everything in tier 2", "Up to 30 users", "Unlimited clinics", "SafeCheck included", "SafeBase Academy included", "AHPRA Monitor included", "SIRS and NDIS Engine included", "QI Reporting included", "ACQSC Audit Packs unlimited", "Multi-site rollups", "Phone support"],
    4: ["Everything in tier 3", "Up to 60 users", "Dedicated Account Manager", "All add-ons included", "Custom care quality templates", "API access", "Custom SSO", "SLA support", "Onboarding workshop"],
  },
  retail: {
    1: ["Unlimited Quick Induct (casuals)", "Lone Worker check-in", "Customer incident log", "Roster compliance", "Hazard register", "Up to 5 users", "Mobile app", "Email support"],
    2: ["Everything in tier 1", "Up to 15 users", "Up to 5 stores", "SafeInduct included", "Bulk QR induction", "RSA tracking (bottle shop)", "Forklift licence tracking", "Priority support"],
    3: ["Everything in tier 2", "Up to 30 users", "Unlimited stores", "SafeCheck included", "SafeBase Academy included", "Multi-store rollups", "Area manager dashboard", "Advanced analytics", "Phone support"],
    4: ["Everything in tier 3", "Up to 50 users", "Dedicated Account Manager", "Custom franchise templates", "API access", "Custom SSO", "SLA support", "Onboarding workshop"],
  },
};

export const INDUSTRY_PRICING = {
  trades: {
    label: "Trades and Construction",
    accent: "#FFCC00",
    plan_names: ["Solo Tradie", "Small Team", "Growing Business", "Enterprise"],
    user_limits: ["1 user", "Up to 5 users", "Up to 20 users", "Up to 50 users"],
    prices: {
      monthly: ["399", "799", "1,299", "2,199"],
      annual:  ["3,990", "7,990", "12,990", "21,990"],
      annual_equivalent_monthly: ["332.50", "665.83", "1,082.50", "1,832.50"],
      annual_saving: ["798", "1,598", "2,598", "4,398"],
    },
    slugs: {
      monthly: ["sole_trader_monthly", "small_business_monthly", "growing_business_monthly", "enterprise_monthly"],
      annual:  ["sole_trader_annual", "small_business_annual", "growing_business_annual", "enterprise_annual"],
    },
    roi: {
      headline: "A$3,990/year + GST. 3.4% of one WorkSafe fine.",
      body: "The average WorkSafe prosecution results in a fine of A$116,979. For 3.4 percent of one fine, every SWMS is generated in 60 seconds, every licence expiry is tracked, and your complete audit pack is ready in under two minutes. The economics are not complicated.",
    },
    value_callout: "Growing Business includes A$797/month of add-on value — SafeInduct (A$199), SafeCheck (A$249), SafeBase Academy up to 10 workers (A$349). That is A$9,564 + GST in annual add-on value included at no extra cost.",
    features: FEATURES_BY_INDUSTRY.trades,
  },
  retail: {
    label: "Retail",
    accent: "#A855F7",
    plan_names: ["Single Store", "Small Chain", "Multi-Store", "Enterprise"],
    user_limits: ["Up to 5 users", "Up to 15 users", "Up to 30 users", "Up to 50 users"],
    prices: {
      monthly: ["549", "1,099", "1,699", "2,799"],
      annual:  ["5,490", "10,990", "16,990", "27,990"],
      annual_equivalent_monthly: ["457.50", "915.83", "1,415.83", "2,332.50"],
      annual_saving: ["1,098", "2,198", "3,398", "5,598"],
    },
    slugs: {
      monthly: ["retail_single_monthly", "retail_small_monthly", "retail_multi_monthly", "retail_enterprise_monthly"],
      annual:  ["retail_single_annual", "retail_small_annual", "retail_multi_annual", "retail_enterprise_annual"],
    },
    roi: {
      headline: "Less than one preventable injury claim.",
      body: "One workers compensation claim from a preventable manual handling injury costs A$15,000 to A$50,000 before legal fees. One customer slip-and-fall claim costs A$20,000 to A$100,000 in public liability. SafeBase Single Store at A$5,490/year + GST covers lone worker safety, casual staff inductions, manual handling procedures, customer injury records, and complete WHS compliance.",
    },
    value_callout: "Multi-Store includes A$797/month of add-on value — SafeInduct (A$199), SafeCheck (A$249), SafeBase Academy (A$349). That is A$9,564 + GST in annual add-on value included. Lone worker, casual inductions, customer injury tracking, and full WHS — one subscription.",
    features: FEATURES_BY_INDUSTRY.retail,
  },
  hospitality: {
    label: "Hospitality",
    accent: "#0F4C5C",
    plan_names: ["Single Venue", "Small Group", "Multi-Venue", "Enterprise"],
    user_limits: ["Up to 3 users", "Up to 8 users", "Up to 20 users", "Up to 50 users"],
    prices: {
      monthly: ["799", "1,499", "2,299", "3,799"],
      annual:  ["7,990", "14,990", "22,990", "37,990"],
      annual_equivalent_monthly: ["665.83", "1,249.17", "1,915.83", "3,165.83"],
      annual_saving: ["1,598", "2,998", "4,598", "7,598"],
    },
    slugs: {
      monthly: ["hosp_single_monthly", "hosp_small_monthly", "hosp_multi_monthly", "hosp_enterprise_monthly"],
      annual:  ["hosp_single_annual", "hosp_small_annual", "hosp_multi_annual", "hosp_enterprise_annual"],
    },
    roi: {
      headline: "Less than one day of venue closure.",
      body: "A food safety incident can close a venue for days or weeks. A council prosecution costs A$10,000 to A$50,000. Hospitality businesses currently pay A$400 to A$700 per month across three fragmented tools that do not connect. SafeBase Single Venue at A$7,990/year + GST replaces all three — HACCP plans, Standard 3.2.2A evidence records, RSA management, temperature monitoring, allergen registers, council inspection packs, and complete WHS compliance — in one platform.",
    },
    value_callout: "Multi-Venue includes A$896/month of add-on value — SafeInduct (A$199), SafeCheck (A$249), SafeBase Academy (A$349), Council Inspection Pack (A$59), Liquor and RSA Management (A$99). That is A$10,752 + GST in annual add-on value included. Plus you have replaced your WHS tool, your food safety platform, and your certificate tracker with one integrated system.",
    features: FEATURES_BY_INDUSTRY.hospitality,
  },
  transport: {
    label: "Transport and Logistics",
    accent: "#0DC4B5",
    plan_names: ["Owner-Operator", "Small Fleet", "Growing Fleet", "Enterprise"],
    user_limits: ["Up to 3 users", "Up to 10 users", "Up to 25 users", "Up to 50 users"],
    prices: {
      monthly: ["999", "1,799", "2,799", "4,499"],
      annual:  ["9,990", "17,990", "27,990", "44,990"],
      annual_equivalent_monthly: ["832.50", "1,499.17", "2,332.50", "3,749.17"],
      annual_saving: ["1,998", "3,598", "5,598", "8,998"],
    },
    slugs: {
      monthly: ["trans_owner_monthly", "trans_small_monthly", "trans_growing_monthly", "trans_enterprise_monthly"],
      annual:  ["trans_owner_annual", "trans_small_annual", "trans_growing_annual", "trans_enterprise_annual"],
    },
    roi: {
      headline: "Less than one week of CoR legal fees.",
      body: "Chain of Responsibility prosecution under the Heavy Vehicle National Law is criminal liability for individuals. Directors. Schedulers. Fleet managers. One criminal defence costs A$50,000 to A$200,000 in legal fees before any finding is made. SafeBase Owner-Operator at A$9,990/year + GST provides a complete, auditable CoR Management Plan, fatigue compliance records, vehicle inspection history, load restraint documentation, and driver credentials — everything an NHVR officer requests, produced in under two minutes.",
    },
    value_callout: "Growing Fleet includes A$896/month of add-on value — SafeInduct (A$199), SafeCheck (A$249), SafeBase Academy (A$349), CoR Audit Pack (A$99). That is A$10,752 + GST in annual add-on value included. WHS, CoR, fleet, and fatigue compliance in one subscription.",
    features: FEATURES_BY_INDUSTRY.transport,
  },
  healthcare: {
    label: "Healthcare and Aged Care",
    accent: "#2196A6",
    plan_names: ["Solo Practice", "Small Practice", "Multi-Site", "Enterprise"],
    user_limits: ["Up to 5 users", "Up to 15 users", "Up to 30 users", "Up to 60 users"],
    prices: {
      monthly: ["1,499", "2,799", "4,499", "13,999"],
      annual:  ["14,990", "27,990", "44,990", "139,990"],
      annual_equivalent_monthly: ["1,249.17", "2,332.50", "3,749.17", "11,665.83"],
      annual_saving: ["2,998", "5,598", "8,998", "27,998"],
    },
    slugs: {
      monthly: ["health_solo_monthly", "health_small_monthly", "health_multi_monthly", "health_enterprise_monthly"],
      annual:  ["health_solo_annual", "health_small_annual", "health_multi_annual", "health_enterprise_annual"],
    },
    roi: {
      headline: "Less than one ACQSC audit engagement.",
      body: "A healthcare governance consultant on retainer costs A$3,000 to A$8,000 per month. ACQSC audit preparation costs A$5,000 to A$15,000 per engagement. NDIS Commission audit preparation costs A$5,000 to A$20,000 per cycle. AHPRA investigation legal costs range A$5,000 to A$50,000. SafeBase Solo Practice at A$14,990/year + GST automates AHPRA monitoring, SIRS classification, NDIS compliance documentation, quality standards evidence management, and full WHS compliance — continuously, not just at audit time. For healthcare providers, the question is not whether they can afford SafeBase. It is whether they can afford not to have it.",
    },
    value_callout: "Multi-Site includes A$2,188/month of add-on value — SafeInduct (A$199), SafeCheck (A$249), SafeBase Academy (A$349), AHPRA Monitor (A$249), SIRS and NDIS Engine (A$299), QI Reporting (A$249), ACQSC Audit Packs unlimited (A$599). That is A$26,256 + GST in annual add-on value included. Less than three consultant engagements per year — providing continuous compliance every day of the year.",
    features: FEATURES_BY_INDUSTRY.healthcare,
  },
};

export const INDUSTRY_LIST = ["trades", "hospitality", "transport", "healthcare", "retail"];

// Entry-price summary for the homepage "priced for your industry" section.
export const INDUSTRY_ENTRY_PRICES = [
  { slug: "trades",       label: "Trades and Construction", annual: "3,990",  monthly: "399",   note: "3.4% of one WorkSafe fine." },
  { slug: "retail",       label: "Retail",                  annual: "5,490",  monthly: "549",   note: "Less than one preventable injury claim." },
  { slug: "hospitality",  label: "Hospitality",             annual: "7,990",  monthly: "799",   note: "Less than one day of venue closure." },
  { slug: "transport",    label: "Transport and Logistics", annual: "9,990",  monthly: "999",   note: "Less than one week of CoR legal fees." },
  { slug: "healthcare",   label: "Healthcare and Aged Care", annual: "14,990", monthly: "1,499", note: "Less than one ACQSC audit engagement." },
];
