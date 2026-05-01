import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { INDUSTRIES } from "@/data/industries.config";

// Terminology map — the minimum vocabulary the dashboard swaps per industry.
// Everything is pre-tuned for Australian English + the voice of each vertical.
const TERMINOLOGY = {
  trades: {
    slug: "trades",
    greeting: "tradie",
    site_singular: "site",
    site_plural: "sites",
    worker_singular: "tradie",
    worker_plural: "crew",
    primary_doc_label: "Active SWMS",
    primary_doc_cta_label: "Generate SWMS",
    primary_doc_cta_blurb: "AI-built Safe Work Method Statement in 60 seconds.",
    primary_doc_route: "/dashboard/swms/new",
    starter_title: "Start with a compliant SWMS",
    starter_blurb: "Electricians, plumbers, builders and scaffolders use SafeBase's SWMS generator to hit Reg 299 in under a minute.",
    starter_actions: [
      { label: "Generate SWMS", to: "/dashboard/swms/new", testid: "starter-swms" },
      { label: "Open SWMS library", to: "/dashboard/swms", testid: "starter-swms-lib" },
    ],
  },
  hospitality: {
    slug: "hospitality",
    greeting: "chef",
    site_singular: "venue",
    site_plural: "venues",
    worker_singular: "team member",
    worker_plural: "team",
    primary_doc_label: "HACCP & plans",
    primary_doc_cta_label: "Create HACCP plan",
    primary_doc_cta_blurb: "AI-built food-safety plan covering Std 3.2.1 critical control points.",
    primary_doc_route: "/dashboard/document-library",
    starter_title: "Food safety + WHS in one system",
    starter_blurb: "Council inspection next week? Start a HACCP plan, begin temperature monitoring, and log your first allergen register.",
    starter_actions: [
      { label: "Create HACCP plan", to: "/dashboard/document-library", testid: "starter-haccp" },
      { label: "Temperature log", to: "/dashboard/document-library", testid: "starter-temp-log" },
      { label: "Allergen register", to: "/dashboard/document-library", testid: "starter-allergen" },
    ],
  },
  transport: {
    slug: "transport",
    greeting: "there",
    site_singular: "depot",
    site_plural: "depots",
    worker_singular: "driver",
    worker_plural: "drivers",
    primary_doc_label: "Active trip plans",
    primary_doc_cta_label: "Generate CoR plan",
    primary_doc_cta_blurb: "AI-built Chain of Responsibility plan aligned to NHVR guidance.",
    primary_doc_route: "/dashboard/document-library",
    starter_title: "Prove Chain of Responsibility compliance",
    starter_blurb: "Schedulers, loaders, operators — every party in the chain needs evidence. Start with a CoR plan, then log fitness-for-duty declarations per trip.",
    starter_actions: [
      { label: "Create CoR plan", to: "/dashboard/document-library", testid: "starter-cor" },
      { label: "Fitness for duty", to: "/dashboard/document-library", testid: "starter-ffd" },
      { label: "Load restraint record", to: "/dashboard/document-library", testid: "starter-lrr" },
    ],
  },
  healthcare: {
    slug: "healthcare",
    greeting: "there",
    site_singular: "clinic",
    site_plural: "clinics",
    worker_singular: "clinician",
    worker_plural: "team",
    primary_doc_label: "AHPRA & compliance",
    primary_doc_cta_label: "Track AHPRA registrations",
    primary_doc_cta_blurb: "Never miss a lapse — alerted at 60, 30 and 14 days before expiry.",
    primary_doc_route: "/dashboard/document-library",
    starter_title: "ACQSC, NDIS & AHPRA — one source of truth",
    starter_blurb: "The new Aged Care Act 2024 is live. Start your AHPRA register, worker screenings, and clinical adverse-event log.",
    starter_actions: [
      { label: "AHPRA register", to: "/dashboard/document-library", testid: "starter-ahpra" },
      { label: "Worker screening", to: "/dashboard/document-library", testid: "starter-wsr" },
      { label: "Adverse-event report", to: "/dashboard/document-library", testid: "starter-clinical" },
    ],
  },
  retail: {
    slug: "retail",
    greeting: "there",
    site_singular: "store",
    site_plural: "stores",
    worker_singular: "team member",
    worker_plural: "team",
    primary_doc_label: "Inductions & logs",
    primary_doc_cta_label: "Quick-induct a casual",
    primary_doc_cta_blurb: "3-minute QR-code induction. Record is permanent.",
    primary_doc_route: "/dashboard/document-library",
    starter_title: "Built for high-turnover retail",
    starter_blurb: "Every casual inducted. Every lone worker checked in. Every customer incident captured.",
    starter_actions: [
      { label: "Quick-induct (casual)", to: "/dashboard/document-library", testid: "starter-quick-induct" },
      { label: "Lone worker log", to: "/dashboard/document-library", testid: "starter-lone-worker" },
      { label: "Customer incident", to: "/dashboard/document-library", testid: "starter-customer-incident" },
    ],
  },
};

export default function useIndustry() {
  const { user } = useAuth();
  const slug = (user?.industry && TERMINOLOGY[user.industry]) ? user.industry : "trades";

  return useMemo(() => {
    const t = TERMINOLOGY[slug];
    const meta = INDUSTRIES[slug] || INDUSTRIES.trades;
    return {
      slug,
      term: t,
      meta,
      // Convenience getter so callers can say `t("site_plural")` too
      t: (key) => t[key] ?? key,
    };
  }, [slug]);
}

export { TERMINOLOGY };
