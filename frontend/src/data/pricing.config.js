/**
 * Per-industry pricing configuration — Iter40 definitive pricing.
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
      monthly: ["599", "1,199", "1,899", "2,999"],
      annual:  ["5,990", "11,990", "18,990", "29,990"],
      annual_equivalent_monthly: ["499.17", "999.17", "1,582.50", "2,499.17"],
      annual_saving: ["1,198", "2,398", "3,798", "5,998"],
    },
    slugs: {
      monthly: ["sole_trader_monthly", "small_business_monthly", "growing_business_monthly", "enterprise_monthly"],
      annual:  ["sole_trader_annual", "small_business_annual", "growing_business_annual", "enterprise_annual"],
    },
    roi: {
      headline: "A$5,990/year + GST. 5.1% of one WorkSafe prosecution.",
      body: "The average WorkSafe prosecution results in a fine of A$116,979. SafeBase Solo Tradie represents 5.1 percent of one fine — with every SWMS generated in 60 seconds, every licence expiry tracked, and your complete audit pack ready in under two minutes. A WHS consultant charges A$150 to A$300 per hour. SafeBase generates a compliant SWMS — work that takes a consultant one to two hours — in 60 seconds, every time, at any hour of the day.",
    },
    value_callout: "Growing Business includes A$1,047/month of add-on value — SafeInduct (A$249), SafeCheck (A$299), SafeBase Academy up to 10 workers (A$399). That is A$12,564 + GST in annual add-on value included at no additional cost.",
    features: FEATURES_BY_INDUSTRY.trades,
  },
  retail: {
    label: "Retail",
    accent: "#A855F7",
    plan_names: ["Single Store", "Small Chain", "Multi-Store", "Enterprise"],
    user_limits: ["Up to 5 users", "Up to 15 users", "Up to 30 users", "Up to 50 users"],
    prices: {
      monthly: ["799", "1,599", "2,499", "3,999"],
      annual:  ["7,990", "15,990", "24,990", "39,990"],
      annual_equivalent_monthly: ["665.83", "1,332.50", "2,082.50", "3,332.50"],
      annual_saving: ["1,598", "3,198", "4,998", "7,998"],
    },
    slugs: {
      monthly: ["retail_single_monthly", "retail_small_monthly", "retail_multi_monthly", "retail_enterprise_monthly"],
      annual:  ["retail_single_annual", "retail_small_annual", "retail_multi_annual", "retail_enterprise_annual"],
    },
    roi: {
      headline: "Less than one preventable injury claim.",
      body: "One workers compensation claim from a preventable manual handling injury costs A$15,000 to A$50,000 before legal fees. One customer slip-and-fall with no documented incident procedure costs A$20,000 to A$100,000 in public liability. One lone worker incident with no check-in system creates direct regulatory liability and a WorkCover claim that dwarfs years of SafeBase subscriptions. SafeBase Single Store at A$7,990/year + GST covers lone worker safety, casual staff inductions, customer injury records, manual handling procedures, and complete WHS compliance — less than the excess on most retail public liability policies.",
    },
    value_callout: "Multi-Store includes A$1,047/month of add-on value — SafeInduct (A$249), SafeCheck (A$299), SafeBase Academy (A$399). That is A$12,564 + GST in annual add-on value included. Lone worker safety, casual inductions, customer injury tracking, and full WHS compliance in one subscription.",
    features: FEATURES_BY_INDUSTRY.retail,
  },
  hospitality: {
    label: "Hospitality",
    accent: "#0F4C5C",
    plan_names: ["Single Venue", "Small Group", "Multi-Venue", "Enterprise"],
    user_limits: ["Up to 3 users", "Up to 8 users", "Up to 20 users", "Up to 50 users"],
    prices: {
      monthly: ["1,199", "2,299", "3,499", "5,499"],
      annual:  ["11,990", "22,990", "34,990", "54,990"],
      annual_equivalent_monthly: ["999.17", "1,915.83", "2,915.83", "4,582.50"],
      annual_saving: ["2,398", "4,598", "6,998", "10,998"],
    },
    slugs: {
      monthly: ["hosp_single_monthly", "hosp_small_monthly", "hosp_multi_monthly", "hosp_enterprise_monthly"],
      annual:  ["hosp_single_annual", "hosp_small_annual", "hosp_multi_annual", "hosp_enterprise_annual"],
    },
    roi: {
      headline: "Less than three days of venue closure.",
      body: "A food safety incident can close a venue for days or weeks. A single council prosecution costs A$10,000 to A$50,000. A venue closure costs weeks of revenue that will not be recovered. Hospitality businesses currently spend A$400 to A$700 per month across fragmented tools that do not connect — a WHS platform, a food safety app, and a certificate tracker that share no data and produce no unified audit pack. SafeBase Single Venue at A$11,990/year + GST delivers HACCP plans, Standard 3.2.2A evidence records, FSS and RSA management, temperature monitoring, allergen registers, council inspection packs, and complete WHS compliance in one platform. The annual cost is less than three days of revenue for most venues.",
    },
    value_callout: "Multi-Venue includes A$1,175/month of add-on value — SafeInduct (A$249), SafeCheck (A$299), SafeBase Academy (A$399), Council Inspection Pack (A$79), Liquor and RSA Management (A$129). That is A$14,100 + GST in annual add-on value included. Your WHS platform, food safety system, and certificate management are unified in one subscription.",
    features: FEATURES_BY_INDUSTRY.hospitality,
  },
  transport: {
    label: "Transport and Logistics",
    accent: "#0DC4B5",
    plan_names: ["Owner-Operator", "Small Fleet", "Growing Fleet", "Enterprise"],
    user_limits: ["Up to 3 users", "Up to 10 users", "Up to 25 users", "Up to 50 users"],
    prices: {
      monthly: ["1,499", "2,799", "4,299", "6,999"],
      annual:  ["14,990", "27,990", "42,990", "69,990"],
      annual_equivalent_monthly: ["1,249.17", "2,332.50", "3,582.50", "5,832.50"],
      annual_saving: ["2,998", "5,598", "8,598", "13,998"],
    },
    slugs: {
      monthly: ["trans_owner_monthly", "trans_small_monthly", "trans_growing_monthly", "trans_enterprise_monthly"],
      annual:  ["trans_owner_annual", "trans_small_annual", "trans_growing_annual", "trans_enterprise_annual"],
    },
    roi: {
      headline: "Less than one month of CoR legal fees.",
      body: "Chain of Responsibility prosecution under the Heavy Vehicle National Law is not a regulatory fine. It is criminal liability for individuals — directors, schedulers, fleet managers, and operators personally. One criminal defence costs A$50,000 to A$200,000 in legal fees before any finding. Transport operators currently pay A$600 to A$1,000 per month across separate EWD systems, telematics platforms, WHS tools, and CoR documentation services that do not connect. SafeBase Owner-Operator at A$14,990/year + GST delivers a complete, auditable CoR Management Plan, fatigue compliance records, vehicle inspection history, load restraint documentation, driver credentials, and full WHS compliance — everything an NHVR officer requests, produced in under two minutes. The annual cost is less than one month of legal fees in a CoR prosecution.",
    },
    value_callout: "Growing Fleet includes A$1,176/month of add-on value — SafeInduct (A$249), SafeCheck (A$299), SafeBase Academy (A$399), CoR Audit Pack (A$129), Telematics Integration (A$179) — excluding EWD integration. That is A$14,112 + GST in annual add-on value included.",
    features: FEATURES_BY_INDUSTRY.transport,
  },
  healthcare: {
    label: "Healthcare and Aged Care",
    accent: "#2196A6",
    plan_names: ["Solo Practice", "Small Practice", "Multi-Site", "Enterprise"],
    user_limits: ["Up to 5 users", "Up to 15 users", "Up to 30 users", "Up to 60 users"],
    prices: {
      monthly: ["2,499", "4,999", "7,999", "17,999"],
      annual:  ["24,990", "49,990", "79,990", "179,990"],
      annual_equivalent_monthly: ["2,082.50", "4,165.83", "6,665.83", "14,999.17"],
      annual_saving: ["4,998", "9,998", "15,998", "35,998"],
    },
    slugs: {
      monthly: ["health_solo_monthly", "health_small_monthly", "health_multi_monthly", "health_enterprise_monthly"],
      annual:  ["health_solo_annual", "health_small_annual", "health_multi_annual", "health_enterprise_annual"],
    },
    roi: {
      headline: "Less than two ACQSC audit engagements.",
      body: "A healthcare governance consultant on retainer costs A$3,000 to A$8,000 per month. ACQSC audit preparation costs A$5,000 to A$15,000 per engagement. NDIS Commission audit preparation costs A$5,000 to A$20,000 per cycle. AHPRA monitoring across a clinical team costs A$2,000 to A$5,000 per year if done rigorously. AHPRA investigation legal costs range A$5,000 to A$50,000 before any finding. Large multi-site healthcare organisations spend A$80,000 to A$200,000 per year across fragmented compliance services. SafeBase Solo Practice at A$24,990/year + GST costs less than three ACQSC audit preparation engagements — and eliminates the need for them by maintaining audit-ready evidence continuously.",
    },
    value_callout: "Multi-Site includes A$2,494/month of add-on value — SafeInduct (A$249), SafeCheck (A$299), SafeBase Academy (A$399), AHPRA Monitor (A$349), SIRS and NDIS Engine (A$399), QI Reporting (A$349), ACQSC Audit Packs unlimited (A$799). That is A$29,928 + GST in annual add-on value included. Less than two consultant engagements annually, delivering continuous compliance every day of the year.",
    features: FEATURES_BY_INDUSTRY.healthcare,
  },
};

export const INDUSTRY_LIST = ["trades", "hospitality", "transport", "healthcare", "retail"];

// Entry-price summary for the homepage "priced for your industry" section.
export const INDUSTRY_ENTRY_PRICES = [
  { slug: "trades",       label: "Trades and Construction", annual: "5,990",  monthly: "599",   note: "5.1% of one WorkSafe prosecution." },
  { slug: "retail",       label: "Retail",                  annual: "7,990",  monthly: "799",   note: "Less than one preventable injury claim." },
  { slug: "hospitality",  label: "Hospitality",             annual: "11,990", monthly: "1,199", note: "Less than three days of venue closure." },
  { slug: "transport",    label: "Transport and Logistics", annual: "14,990", monthly: "1,499", note: "Less than one month of CoR legal fees." },
  { slug: "healthcare",   label: "Healthcare and Aged Care", annual: "24,990", monthly: "2,499", note: "Less than two ACQSC engagements." },
];

// Add-on pricing (monthly, + GST).
export const ADDON_PRICING = {
  safeinduct: 249,
  safecheck: 299,
  academy_10: 399,
  academy_30: 699,
  academy_60: 999,
  white_label_partner: 2499,
  consulting_retainer_min: 2500,
  consulting_retainer_max: 4000,
};
