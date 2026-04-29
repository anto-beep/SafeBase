import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { CheckCircle, X, ArrowRight } from "@phosphor-icons/react";

const TIERS = [
  {
    name: "Solo", price: "79", description: "For owner-operators and crews of 1–3.",
    features: { "Workers": "3", "Documents/mo": "Unlimited", "Incidents": "Unlimited", "Licence tracking": true, "Compliance score": true, "AI Intelligence": false, "Audit pack export": false, "Subbie compliance": false, "White-label": false, "Priority support": false },
  },
  {
    name: "Crew", price: "149", description: "For SMEs scaling 4–15 workers.", highlight: true,
    features: { "Workers": "15", "Documents/mo": "Unlimited", "Incidents": "Unlimited", "Licence tracking": true, "Compliance score": true, "AI Intelligence": true, "Audit pack export": true, "Subbie compliance": true, "White-label": false, "Priority support": false },
  },
  {
    name: "Network", price: "299", description: "For multi-site builders and franchisees.",
    features: { "Workers": "Unlimited", "Documents/mo": "Unlimited", "Incidents": "Unlimited", "Licence tracking": true, "Compliance score": true, "AI Intelligence": true, "Audit pack export": true, "Subbie compliance": true, "White-label": "Optional", "Priority support": true },
  },
];

const ROWS = ["Workers", "Documents/mo", "Incidents", "Licence tracking", "Compliance score", "AI Intelligence", "Audit pack export", "Subbie compliance", "White-label", "Priority support"];

const ADDONS = [
  { name: "Implementation pack", price: "A$800 once", body: "We configure your trade-specific SWMS library, induction templates and crew accounts." },
  { name: "WHS Audit prep", price: "A$1,500", body: "Full mock audit by a qualified WHS consultant. Gap closure plan included." },
  { name: "Incident investigation", price: "A$500/incident", body: "ICAM-style investigation with corrective action plan and regulator liaison." },
  { name: "Monthly compliance retainer", price: "A$300/mo", body: "Monthly review of your incidents, scoring and risk hot-spots by a WHS partner." },
];

function Cell({ v }) {
  if (v === true) return <CheckCircle weight="fill" className="text-ink" />;
  if (v === false) return <X className="text-muted-foreground/40" />;
  return <span className="font-mono text-sm">{v}</span>;
}

export default function Pricing() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 text-center">
          <div className="label-eyebrow mb-3">/ Pricing</div>
          <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter">Less than a single<br />WorkSafe fine.</h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">14-day free trial, no credit card. Annual plans get 2 months free. Pricing in AUD, ex-GST.</p>
        </div>
      </section>

      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {TIERS.map((t) => (
              <div key={t.name} className={`p-8 ${t.highlight ? "bg-ink text-white" : "bg-background"}`} data-testid={`pricing-tier-${t.name.toLowerCase()}`}>
                {t.highlight && <div className="label-eyebrow text-warning mb-4">MOST POPULAR</div>}
                <div className="font-display font-bold text-2xl">{t.name}</div>
                <div className={`mt-2 text-sm ${t.highlight ? "text-white/60" : "text-muted-foreground"}`}>{t.description}</div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-2xl">A$</span><span className="font-display font-black text-6xl">{t.price}</span>
                  <span className={t.highlight ? "text-white/60" : "text-muted-foreground"}>/mo</span>
                </div>
                <Link to="/register" className="block mt-6">
                  <Button className={`w-full btn-sharp h-12 ${t.highlight ? "bg-warning text-ink hover:bg-white" : "bg-ink text-white hover:bg-authority"}`} data-testid={`pricing-cta-${t.name.toLowerCase()}`}>
                    Start free trial <ArrowRight className="ml-2" />
                  </Button>
                </Link>
                <ul className="mt-6 space-y-2 text-sm">
                  {Object.entries(t.features).slice(0, 6).map(([k, v]) => (
                    <li key={k} className="flex items-center gap-2"><CheckCircle weight="fill" className={t.highlight ? "text-warning shrink-0" : "text-ink shrink-0"} />{k}{typeof v === "string" ? ` (${v})` : ""}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Compare</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-8">Feature breakdown.</h2>
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink text-white">
                <tr>
                  <th className="text-left px-4 py-4 label-eyebrow text-warning">Feature</th>
                  {TIERS.map((t) => <th key={t.name} className="px-4 py-4 label-eyebrow text-warning">{t.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r} className="border-t border-border">
                    <td className="px-4 py-3 font-bold">{r}</td>
                    {TIERS.map((t) => <td key={t.name} className="px-4 py-3 text-center">{<Cell v={t.features[r]} />}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Professional services</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Need a hand? Tap the partner network.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
            {ADDONS.map((a) => (
              <div key={a.name} className="bg-background p-6">
                <div className="font-display font-bold text-lg">{a.name}</div>
                <div className="font-mono text-warning bg-ink px-2 py-1 inline-block text-xs mt-2">{a.price}</div>
                <div className="text-sm text-muted-foreground mt-3">{a.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 text-center">
          <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Try every feature.<br />Free for 14 days.</h2>
          <Link to="/register" className="inline-block mt-8"><Button className="btn-sharp h-14 px-8 bg-warning text-ink hover:bg-white" data-testid="pricing-final-cta">Start now <ArrowRight className="ml-2" /></Button></Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
