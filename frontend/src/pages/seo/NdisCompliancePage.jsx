/**
 * NDIS Compliance Software — SEO landing page.
 * Target keyword: "NDIS compliance software Australia"
 */
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export default function NdisCompliancePage() {
  return (
    <SeoLandingPage
      testid="seo-ndis"
      eyebrow="NDIS compliance software"
      headline={<>NDIS Compliance Software. Built for Australian Providers.</>}
      subheadline="Every NDIS provider in Australia has identical obligations under the NDIS Practice Standards and the NDIS (Provider Registration and Practice Standards) Rules. SafeBase automates the evidence, the notifications, and the audit pack."
      industry="healthcare"
      accent="#2196A6"
      regulators={["NDIS Commission", "AHPRA", "NDIS Quality and Safeguards Framework"]}
      roiAnchor="NDIS Commission audit preparation costs A$5,000 to A$20,000 per cycle. SafeBase Solo Practice at A$14,990/year + GST replaces that engagement and delivers continuous evidence."
      painPoints={[
        { title: "Reportable incident 24-hour window", body: "Serious incidents require notification to the NDIS Commission within 24 hours. Most providers miss the clock because the category matrix is complex." },
        { title: "Worker screening lapses", body: "A worker whose NDIS clearance lapses exposes the provider to regulatory action and participant safety risk. Manual tracking fails." },
        { title: "Audit evidence scattered everywhere", body: "Policies in SharePoint. Training records in the LMS. Incidents in paper. When the audit arrives, assembly takes weeks." },
      ]}
      featureList={[
        "NDIS reportable incident engine — 24h and 5-day deadlines auto-classified",
        "Worker screening register with expiry alerts (NDIS, AHPRA, WWCC)",
        "NDIS Practice Standards evidence mapping (1-6)",
        "Participant incident log with restrictive-practice flagging",
        "AI-generated Positive Behaviour Support plans",
        "Compliance Inbox — every open deadline ranked by severity",
        "Audit pack generator — one click, inspector-ready PDF",
        "Works alongside your existing CRM, HRIS and financial system",
      ]}
      plans={[
        { name: "Solo Practice", annual: "14,990", monthly: "1,499" },
        { name: "Multi-Site", annual: "44,990", monthly: "4,499" },
      ]}
      faq={[
        { q: "Does SafeBase integrate with the NDIS Commission portal?", a: "SafeBase generates the evidence and fills the forms; the final submission to the NDIS Commission portal is human-confirmed so control over what is submitted stays with you." },
        { q: "Is SafeBase suitable for both registered and unregistered providers?", a: "Yes — unregistered providers still have a duty of care and participant safety obligations. SafeBase configures based on your registration status." },
        { q: "What happens if I am audited tomorrow?", a: "Generate an audit pack from the Compliance Inbox — the inspector-ready PDF bundles policies, incidents, screening records, evidence items, and training completion." },
      ]}
    />
  );
}
