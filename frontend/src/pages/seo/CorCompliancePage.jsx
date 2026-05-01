/**
 * CoR Compliance Software — SEO landing page.
 */
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export default function CorCompliancePage() {
  return (
    <SeoLandingPage
      testid="seo-cor"
      eyebrow="CoR compliance software"
      headline={<>Chain of Responsibility Software. Criminal-Liability Grade.</>}
      subheadline="Heavy Vehicle National Law places criminal liability on directors, schedulers, and fleet managers personally. Documentation is not paperwork — it is your defence. SafeBase builds that defence continuously."
      industry="transport"
      accent="#0DC4B5"
      regulators={["NHVR", "HVNL", "State Road Transport Authorities"]}
      roiAnchor="One CoR criminal defence costs A$50,000 to A$200,000 in legal fees before any finding is made. SafeBase Owner-Operator at A$9,990/year + GST is less than one week of legal fees."
      painPoints={[
        { title: "Fatigue records scattered across paper diaries", body: "NHVR expects auditable fatigue records for every driver, every day. Paper-diary backup is increasingly rejected as evidence." },
        { title: "NHVR Notifiable Occurrences 24h deadline", body: "Serious occurrences require notification within 24 hours. Missed deadlines escalate the regulatory response." },
        { title: "Executive due-diligence log missing", body: "Section 26C imposes positive due-diligence obligations on executives. Without a log, there is no defence." },
      ]}
      featureList={[
        "CoR Management Plan generator (AI, industry-specific)",
        "Fatigue / EWD log with auto-breach detection (Std / BFM / AFM)",
        "Pre-trip vehicle inspection records with defect tracking",
        "Load restraint records and mass-management declarations",
        "NHVR Notifiable Occurrence engine — 24h deadline auto-set",
        "Executive s26C due-diligence log",
        "Fleet vehicle register with service and rego expiry alerts",
        "Driver credential register (HR/MC, HVA, medical, fatigue)",
      ]}
      plans={[
        { name: "Owner-Operator", annual: "9,990", monthly: "999" },
        { name: "Growing Fleet", annual: "27,990", monthly: "2,799" },
      ]}
      faq={[
        { q: "Does SafeBase replace my EWD (Electronic Work Diary)?", a: "No — SafeBase ingests from approved EWD providers via the integration webhook so your fatigue data flows into the compliance record automatically while you retain your approved EWD." },
        { q: "Is SafeBase NHVAS-aligned?", a: "Yes — the Transport Safety Management Plan and audit prep pack are built to align with NHVAS Fatigue, Mass, and Maintenance modules." },
        { q: "Can multiple depots share one account?", a: "Yes — Growing Fleet supports multi-depot rollups with per-depot reporting." },
      ]}
    />
  );
}
