import { useState } from "react";
import { Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/Layout";
import { Button } from "@/components/ui/button";
import { Check, X, Minus, ArrowRight } from "@phosphor-icons/react";

const TABS = [
  { slug: "all", label: "All Industries" },
  { slug: "trades", label: "Trades" },
  { slug: "hospitality", label: "Hospitality" },
  { slug: "transport", label: "Transport" },
  { slug: "healthcare", label: "Healthcare" },
  { slug: "retail", label: "Retail" },
];

// Each comparison: rows[] of {feature, safebase, competitor, note?}
// safebase/competitor: 'yes' | 'no' | 'partial'
const COMPARISONS = {
  all: [
    {
      vs: "SafetyCulture",
      tagline: "Generic checklists vs Australian-deep WHS",
      rows: [
        { feature: "Industry-specific dashboards (5 industries)", safebase: "yes", competitor: "no" },
        { feature: "AI document generation per industry", safebase: "yes", competitor: "no" },
        { feature: "Built specifically for Australian WHS law", safebase: "yes", competitor: "partial" },
        { feature: "Per-business pricing (not per-user)", safebase: "yes", competitor: "no" },
        { feature: "AI compliance assistant (Claude 4.5)", safebase: "yes", competitor: "no" },
        { feature: "Generic inspection checklists", safebase: "partial", competitor: "yes" },
      ],
    },
    {
      vs: "WHS Monitor",
      tagline: "Bloated enterprise tool vs lean SMB-focused",
      rows: [
        { feature: "Entry pricing under A$1,000/mo + GST for SMBs", safebase: "yes", competitor: "no" },
        { feature: "AI document generation", safebase: "yes", competitor: "no" },
        { feature: "Multi-industry support", safebase: "yes", competitor: "partial" },
        { feature: "Worker mobile PWA included", safebase: "yes", competitor: "no" },
        { feature: "14-day free trial, no card", safebase: "yes", competitor: "no" },
      ],
    },
    {
      vs: "Paper + spreadsheets",
      tagline: "Where 80% of Australian SMBs still are",
      rows: [
        { feature: "Compliance evidence at audit time", safebase: "yes", competitor: "no" },
        { feature: "Auto-renewal tracking for credentials", safebase: "yes", competitor: "no" },
        { feature: "AI-generated SWMS / RAs / SWPs", safebase: "yes", competitor: "no" },
        { feature: "Real-time compliance score", safebase: "yes", competitor: "no" },
        { feature: "Free ($0)", safebase: "no", competitor: "yes" },
      ],
    },
  ],
  trades: [
    {
      vs: "HazardCo",
      tagline: "Trades-only legacy vs trades + multi-industry future",
      rows: [
        { feature: "AI SWMS generator (Claude 4.5)", safebase: "yes", competitor: "partial" },
        { feature: "20+ HRCW categories with auto-tick", safebase: "yes", competitor: "yes" },
        { feature: "QR site inductions", safebase: "yes", competitor: "yes" },
        { feature: "Audit pack one-click PDF", safebase: "yes", competitor: "no" },
        { feature: "Compliance score with sub-pillars", safebase: "yes", competitor: "no" },
        { feature: "Multi-industry expansion path", safebase: "yes", competitor: "no" },
      ],
    },
    {
      vs: "SafetyCulture",
      tagline: "Generic templates vs trades-deep workflows",
      rows: [
        { feature: "AI SWMS aligned to Reg 299", safebase: "yes", competitor: "no" },
        { feature: "WHS Management Plan generator (≥$250k jobs)", safebase: "yes", competitor: "no" },
        { feature: "Asbestos register module", safebase: "yes", competitor: "no" },
        { feature: "Per-user pricing penalty", safebase: "no", competitor: "yes" },
      ],
    },
    {
      vs: "WHS Shield",
      tagline: "Subbie-only vs full operator + subbie",
      rows: [
        { feature: "Operator-side compliance dashboard", safebase: "yes", competitor: "no" },
        { feature: "Contractor verification (SafeCheck)", safebase: "yes", competitor: "yes" },
        { feature: "Risk register with AI suggestions", safebase: "yes", competitor: "no" },
      ],
    },
  ],
  hospitality: [
    {
      vs: "FoodDocs",
      tagline: "Food safety only vs WHS + Food Safety combined",
      rows: [
        { feature: "Food safety program generator (Std 3.2.1)", safebase: "yes", competitor: "yes" },
        { feature: "WHS incident management included", safebase: "yes", competitor: "no" },
        { feature: "Staff WHS + RSA certs in one place", safebase: "yes", competitor: "no" },
        { feature: "Council inspection pack", safebase: "yes", competitor: "partial" },
        { feature: "Lone-worker module", safebase: "yes", competitor: "no" },
      ],
    },
    {
      vs: "SafetyCulture",
      tagline: "Generic checklists vs hospitality-deep",
      rows: [
        { feature: "HACCP plan AI generator", safebase: "yes", competitor: "no" },
        { feature: "Allergen register", safebase: "yes", competitor: "no" },
        { feature: "Temperature monitoring with IoT add-on", safebase: "yes", competitor: "no" },
        { feature: "Australian state council templates", safebase: "yes", competitor: "no" },
      ],
    },
    {
      vs: "Paper + spreadsheets",
      tagline: "Where 90% of small venues still are",
      rows: [
        { feature: "Tracked temperature logs (3-mo retention)", safebase: "yes", competitor: "no" },
        { feature: "Auto-flagged out-of-range readings", safebase: "yes", competitor: "no" },
        { feature: "Free", safebase: "no", competitor: "yes" },
      ],
    },
  ],
  transport: [
    {
      vs: "WHS Monitor",
      tagline: "Generic WHS vs CoR-deep transport",
      rows: [
        { feature: "Chain of Responsibility module", safebase: "yes", competitor: "partial" },
        { feature: "CoR Management Plan AI generator", safebase: "yes", competitor: "no" },
        { feature: "EWD integration (NHVR-approved)", safebase: "yes", competitor: "no" },
        { feature: "Load Restraint per-trip plan", safebase: "yes", competitor: "no" },
        { feature: "Driver fitness for duty digital form", safebase: "yes", competitor: "no" },
      ],
    },
    {
      vs: "CoR-only tools",
      tagline: "CoR alone vs WHS + CoR + fleet",
      rows: [
        { feature: "WHS incident management included", safebase: "yes", competitor: "no" },
        { feature: "Worker / driver licence tracking", safebase: "yes", competitor: "no" },
        { feature: "CoR audit pack", safebase: "yes", competitor: "yes" },
        { feature: "Fleet vehicle pre-trip inspections", safebase: "yes", competitor: "partial" },
      ],
    },
    {
      vs: "Paper + manual systems",
      tagline: "Where most owner-drivers still are",
      rows: [
        { feature: "Auto driver work-hour compliance check", safebase: "yes", competitor: "no" },
        { feature: "NHVR notification trigger alerts", safebase: "yes", competitor: "no" },
        { feature: "Free", safebase: "no", competitor: "yes" },
      ],
    },
  ],
  healthcare: [
    {
      vs: "Ideagen",
      tagline: "Enterprise complexity vs SMB-friendly clinical compliance",
      rows: [
        { feature: "ACQSC 8 standards evidence pack", safebase: "yes", competitor: "yes" },
        { feature: "AHPRA monitoring (live API check)", safebase: "yes", competitor: "no" },
        { feature: "NDIS Practice Standards module", safebase: "yes", competitor: "yes" },
        { feature: "Entry pricing under A$1,500/mo + GST for independent operators", safebase: "yes", competitor: "no" },
        { feature: "Setup time < 1 hour", safebase: "yes", competitor: "no" },
      ],
    },
    {
      vs: "Generic WHS tools",
      tagline: "WHS only vs WHS + clinical compliance",
      rows: [
        { feature: "Clinical event log", safebase: "yes", competitor: "no" },
        { feature: "Worker screening (NDIS + aged care)", safebase: "yes", competitor: "no" },
        { feature: "Manual handling assessments (clinical)", safebase: "yes", competitor: "no" },
        { feature: "AHPRA registration tracking", safebase: "yes", competitor: "no" },
      ],
    },
    {
      vs: "Manual systems",
      tagline: "Where many small practices still are",
      rows: [
        { feature: "Audit-ready evidence packs", safebase: "yes", competitor: "no" },
        { feature: "Auto credential expiry alerts", safebase: "yes", competitor: "no" },
        { feature: "Free", safebase: "no", competitor: "yes" },
      ],
    },
  ],
  retail: [
    {
      vs: "SafetyCulture",
      tagline: "Per-user costs vs per-business retail compliance",
      rows: [
        { feature: "Lone worker module with check-ins", safebase: "yes", competitor: "no" },
        { feature: "Quick Induct (3-min casual)", safebase: "yes", competitor: "no" },
        { feature: "Customer incident logging", safebase: "yes", competitor: "partial" },
        { feature: "Per-business pricing (not per-user)", safebase: "yes", competitor: "no" },
        { feature: "Bulk QR induction", safebase: "yes", competitor: "no" },
      ],
    },
    {
      vs: "Generic WHS tools",
      tagline: "Generic vs retail-specific",
      rows: [
        { feature: "Roster compliance check", safebase: "yes", competitor: "no" },
        { feature: "Spill response procedures", safebase: "yes", competitor: "partial" },
        { feature: "Customer aggression response procedures", safebase: "yes", competitor: "no" },
      ],
    },
    {
      vs: "Paper + spreadsheets",
      tagline: "Where 70% of SMB retailers still are",
      rows: [
        { feature: "Auto missed-check-in escalation", safebase: "yes", competitor: "no" },
        { feature: "Casual induction tracking", safebase: "yes", competitor: "no" },
        { feature: "Free", safebase: "no", competitor: "yes" },
      ],
    },
  ],
};

const Cell = ({ status }) => {
  if (status === "yes") return <Check weight="bold" className="text-emerald-600" size={20} />;
  if (status === "no") return <X weight="bold" className="text-red-600" size={20} />;
  return <Minus weight="bold" className="text-amber-600" size={20} />;
};

export default function Compare() {
  const [tab, setTab] = useState("all");
  const comparisons = COMPARISONS[tab] || [];

  return (
    <MarketingLayout>
      <section className="bg-ink text-white py-20 px-6" data-testid="compare-hero">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-warning">/ Honest comparison · By industry</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">How SafeBase Compares.<br />By Industry.</h1>
          <p className="text-white/70 mt-6 max-w-2xl">We built SafeBase because existing tools were either generic, trade-specific, or wildly overpriced for small and medium businesses. Here is an honest comparison for your industry.</p>
        </div>
      </section>

      {/* Industry tabs */}
      <section className="border-b border-border sticky top-16 bg-background z-30" data-testid="compare-tabs">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 flex flex-wrap gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => setTab(t.slug)}
              data-testid={`compare-tab-${t.slug}`}
              className={`px-5 py-4 text-sm font-bold uppercase tracking-widest whitespace-nowrap border-b-4 transition-colors ${
                tab === t.slug ? "border-warning text-ink" : "border-transparent text-muted-foreground hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 lg:px-12" data-testid="compare-content">
        <div className="max-w-6xl mx-auto space-y-12">
          {comparisons.map((cmp, idx) => (
            <div key={idx} className="border border-border bg-background" data-testid={`compare-block-${tab}-${idx}`}>
              <div className="border-b border-border p-6 bg-muted">
                <div className="label-eyebrow text-muted-foreground">SafeBase vs {cmp.vs}</div>
                <h2 className="font-display text-3xl font-black tracking-tight mt-2">{cmp.tagline}</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 label-eyebrow">Feature</th>
                    <th className="text-center p-4 label-eyebrow text-warning">SafeBase</th>
                    <th className="text-center p-4 label-eyebrow text-muted-foreground">{cmp.vs}</th>
                  </tr>
                </thead>
                <tbody>
                  {cmp.rows.map((r, ri) => (
                    <tr key={ri} className="border-b border-border last:border-0">
                      <td className="p-4">{r.feature}</td>
                      <td className="text-center p-4"><Cell status={r.safebase} /></td>
                      <td className="text-center p-4"><Cell status={r.competitor} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-white py-16 px-6" data-testid="compare-cta">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="font-display text-3xl lg:text-4xl font-black tracking-tighter">Still comparing?</h3>
          <p className="text-white/70 mt-4">Try SafeBase free for 14 days. Select your industry on signup and we configure everything for you.</p>
          <div className="flex justify-center gap-3 mt-8">
            <Link to="/register"><Button className="btn-sharp h-12 bg-warning text-ink hover:bg-warning/90 uppercase tracking-widest" data-testid="compare-trial-btn">Start Free Trial <ArrowRight className="ml-2" /></Button></Link>
            <Link to="/contact?type=demo"><Button variant="outline" className="btn-sharp h-12 border-white/40 text-white hover:bg-white hover:text-ink uppercase tracking-widest" data-testid="compare-demo-btn">Book a Demo</Button></Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
