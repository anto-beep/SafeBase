/**
 * Per-industry pricing configuration — Part 6 of the multi-industry brief.
 *
 * Trades + Retail share the same price table per spec.
 * Hospitality, Transport, Healthcare each have their own premium pricing.
 *
 * `tier_slug` maps to the Stripe Checkout tier registered in
 * /app/backend/routes/billing.py — backend was extended to add the new
 * industry slugs alongside the original trades slugs.
 */

const FEATURES_BY_INDUSTRY = {
  trades: {
    1: ["Unlimited AI SWMS generation", "Incident & near-miss register", "Up to 10 worker profiles", "Licence and credential tracking", "Basic compliance dashboard", "Audit prep PDF export", "Mobile app access", "Email support"],
    2: ["Everything in tier 1", "Contractor compliance capture", "AI incident pattern detection", "Up to 5 sites", "TradeInduct QR inductions", "Toolbox Talks", "Plant register", "Priority chat + email"],
    3: ["Everything in tier 2", "Unlimited sites", "TradeCheck — included", "Academy (10 workers)", "Risk register", "Hazardous substances + SDS", "Advanced analytics", "Legislative alerts", "Phone support"],
    4: ["Everything in tier 3", "Up to 50 users", "Dedicated CSM", "Multi-site rollups", "API access", "Custom SSO", "SLA support", "Onboarding workshop"],
  },
  hospitality: {
    1: ["Unlimited HACCP plans (AI)", "Temperature monitoring + alerts", "Allergen register", "RSA + Food Handler tracking", "Cleaning schedules", "Council inspection pack", "Up to 10 team profiles", "Email support"],
    2: ["Everything in tier 1", "Contractor compliance capture", "AI incident pattern detection", "Up to 5 venues", "VenueInduct QR inductions", "Supplier management", "Liquor approved manager tracking", "Priority chat + email"],
    3: ["Everything in tier 2", "Unlimited venues", "VenueCheck — included", "Academy (10 team)", "Risk register", "Multi-venue rollups", "Advanced analytics", "Legislative alerts", "Phone support"],
    4: ["Everything in tier 3", "Up to 50 users", "Dedicated CSM", "Multi-region rollups", "API access", "Custom SSO", "SLA support", "Onboarding workshop"],
  },
  transport: {
    1: ["Unlimited AI CoR plans", "Fitness for Duty (daily)", "Pre-trip inspection records", "Load restraint records", "Heavy vehicle licence tracking", "Up to 5 driver profiles", "Mobile app", "Email support"],
    2: ["Everything in tier 1", "Up to 5 vehicles + drivers", "Fatigue management module", "FleetInduct QR inductions", "Driver work diary summary", "Maintenance log", "Priority support"],
    3: ["Everything in tier 2", "Unlimited fleet", "FleetCheck — included", "Academy (10 drivers)", "Scheduling compliance check", "NHVR notification prompts", "Multi-depot rollups", "Phone support"],
    4: ["Everything in tier 3", "Up to 50 users", "Dedicated CSM", "Custom CoR plan templates", "API access", "Custom SSO", "SLA support", "Onboarding workshop"],
  },
  healthcare: {
    1: ["AHPRA registration tracking", "Worker screening (NDIS / Aged Care)", "Manual handling assessments", "Vaccination register", "Up to 10 staff profiles", "Mobile app", "Email support"],
    2: ["Everything in tier 1", "Up to 5 clinics", "ClinicInduct QR inductions", "Clinical event log", "Patient aggression module", "ACQSC / NDIS evidence pack", "Priority support"],
    3: ["Everything in tier 2", "Unlimited clinics", "ClinicCheck — included", "Academy (10 staff)", "8 Standards tracker (ACQSC)", "NDIS Practice Standards tracker", "Multi-site rollups", "Phone support"],
    4: ["Everything in tier 3", "Up to 50 users", "Dedicated CSM", "Custom care quality templates", "API access", "Custom SSO", "SLA support", "Onboarding workshop"],
  },
  retail: {
    1: ["Unlimited Quick Induct (casuals)", "Lone Worker Check-In", "Customer incident log", "Roster compliance", "Hazard register", "Up to 10 staff profiles", "Mobile app", "Email support"],
    2: ["Everything in tier 1", "Up to 5 stores", "StoreInduct QR inductions", "Bulk QR induction", "RSA tracking (bottle shop)", "Forklift licence tracking", "Priority support"],
    3: ["Everything in tier 2", "Unlimited stores", "StoreCheck — included", "Academy (10 team)", "Multi-store rollups", "Area-manager dashboard", "Advanced analytics", "Phone support"],
    4: ["Everything in tier 3", "Up to 50 users", "Dedicated CSM", "Custom franchise templates", "API access", "Custom SSO", "SLA support", "Onboarding workshop"],
  },
};

export const INDUSTRY_PRICING = {
  trades: {
    label: "Trades & Construction",
    accent: "#FFCC00",
    plan_names: ["Solo Tradie", "Small Team", "Growing Business", "Enterprise"],
    prices: {
      monthly: ["249", "499", "799", "1,299"],
      annual:  ["2,490", "4,990", "7,990", "12,990"],
    },
    slugs: {
      monthly: ["sole_trader_monthly", "small_business_monthly", "growing_business_monthly", "enterprise_monthly"],
      annual:  ["sole_trader_annual", "small_business_annual", "growing_business_annual", "enterprise_annual"],
    },
    roi: {
      headline: "SafeBase costs A$2,988/year + GST.",
      body: "The average WorkSafe fine is A$116,979. That's 2.6% of one fine. Every year.",
    },
    value_callout: "Solo Tradie includes unlimited AI SWMS generation, incident register, licence tracking and worker management. From A$249/month + GST.",
    features: FEATURES_BY_INDUSTRY.trades,
  },
  retail: {
    label: "Retail",
    accent: "#A855F7",
    plan_names: ["Single Store", "Small Chain", "Multi-Store", "Enterprise"],
    prices: {
      monthly: ["249", "499", "799", "1,299"],
      annual:  ["2,490", "4,990", "7,990", "12,990"],
    },
    slugs: {  // shares with trades pricing
      monthly: ["sole_trader_monthly", "small_business_monthly", "growing_business_monthly", "enterprise_monthly"],
      annual:  ["sole_trader_annual", "small_business_annual", "growing_business_annual", "enterprise_annual"],
    },
    roi: {
      headline: "SafeBase costs A$2,988/year + GST.",
      body: "One preventable workplace injury claim typically costs A$15,000–50,000 in direct costs — before legal fees and premium increases.",
    },
    value_callout: "Single Store includes Lone Worker Check-In, Quick Induct (casuals), customer incident log and roster compliance. From A$249/month + GST.",
    features: FEATURES_BY_INDUSTRY.retail,
  },
  hospitality: {
    label: "Hospitality",
    accent: "#E87722",
    plan_names: ["Single Venue", "Small Group", "Multi-Venue", "Enterprise"],
    prices: {
      monthly: ["299", "579", "899", "1,499"],
      annual:  ["2,990", "5,790", "8,990", "14,990"],
    },
    slugs: {
      monthly: ["hosp_single_monthly", "hosp_small_monthly", "hosp_multi_monthly", "hosp_enterprise_monthly"],
      annual:  ["hosp_single_annual", "hosp_small_annual", "hosp_multi_annual", "hosp_enterprise_annual"],
    },
    roi: {
      headline: "Replaces 3 tools — WHS + Food Safety + cert tracker.",
      body: "Most venues pay A$400–600/month across three separate apps. SafeBase replaces all three from A$299/month + GST. One subscription. One login.",
    },
    value_callout: "Single Venue includes Food Safety, HACCP Plans, Temperature Monitoring, RSA + Food Handler Tracking, Council Inspection Prep AND full WHS compliance. Two platforms in one. From A$299/month + GST.",
    features: FEATURES_BY_INDUSTRY.hospitality,
  },
  transport: {
    label: "Transport & Logistics",
    accent: "#0DC4B5",
    plan_names: ["Owner-Operator", "Small Fleet", "Growing Fleet", "Enterprise"],
    prices: {
      monthly: ["349", "649", "999", "1,699"],
      annual:  ["3,490", "6,490", "9,990", "16,990"],
    },
    slugs: {
      monthly: ["trans_owner_monthly", "trans_small_monthly", "trans_growing_monthly", "trans_enterprise_monthly"],
      annual:  ["trans_owner_annual", "trans_small_annual", "trans_growing_annual", "trans_enterprise_annual"],
    },
    roi: {
      headline: "One CoR prosecution = hundreds of thousands + criminal charges.",
      body: "Operators, schedulers, freight managers — every party in the chain is exposed. SafeBase costs A$4,188/year + GST. Not optional.",
    },
    value_callout: "Owner-Operator includes Fatigue Management, Fitness for Duty Declarations, Pre-Trip Inspections, Load Restraint Records, CoR Management Plan AND full WHS. From A$349/month + GST.",
    features: FEATURES_BY_INDUSTRY.transport,
  },
  healthcare: {
    label: "Healthcare & Aged Care",
    accent: "#2196A6",
    plan_names: ["Solo Practice", "Small Practice", "Multi-Site", "Enterprise"],
    prices: {
      monthly: ["399", "749", "1,199", "1,999"],
      annual:  ["3,990", "7,490", "11,990", "19,990"],
    },
    slugs: {
      monthly: ["health_solo_monthly", "health_small_monthly", "health_multi_monthly", "health_enterprise_monthly"],
      annual:  ["health_solo_annual", "health_small_annual", "health_multi_annual", "health_enterprise_annual"],
    },
    roi: {
      headline: "ACQSC notice. AHPRA investigation. NDIS audit finding. Any one ends your registration.",
      body: "SafeBase costs A$4,788/year + GST to maintain audit-ready compliance documentation every day — not just at audit time.",
    },
    value_callout: "Solo Practice includes AHPRA Tracking, Worker Screening Management, Quality Standards Documentation, Clinical Incident Management AND full WHS compliance. From A$399/month + GST.",
    features: FEATURES_BY_INDUSTRY.healthcare,
  },
};

export const INDUSTRY_LIST = ["trades", "hospitality", "transport", "healthcare", "retail"];
