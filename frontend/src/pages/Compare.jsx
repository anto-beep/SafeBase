import { Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/Layout";
import { COMPETITORS } from "@/content/marketingData";
import { Button } from "@/components/ui/button";
import { Check, X, Star, ArrowRight } from "@phosphor-icons/react";

const FEATURE_ROWS = [
  { key: "swms_ai", label: "AI SWMS generation (Claude 4.5)" },
  { key: "incident_register", label: "Incident register + investigation" },
  { key: "licence_tracking", label: "Worker licence tracking" },
  { key: "toolbox_talks", label: "Toolbox talks module" },
  { key: "risk_register", label: "Risk register (5×5 matrix)" },
  { key: "plant_register", label: "Plant & equipment register" },
  { key: "substances", label: "Hazardous substances + SDS" },
  { key: "inspections", label: "Inspections & checklists" },
  { key: "academy", label: "Built-in training academy" },
  { key: "worker_pwa", label: "Worker mobile app (PWA)" },
  { key: "partner_portal", label: "Consultant white-label portal" },
  { key: "tradecheck", label: "TradeCheck marketplace" },
  { key: "ai_insights", label: "AI insights on reports" },
  { key: "australian_legislation", label: "Australian legislation focus" },
];

export default function Compare() {
  return (
    <MarketingLayout>
      <section className="bg-ink text-white py-20 px-6" data-testid="compare-hero">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-warning">/ Competitor comparison</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">SafeTradie vs the rest.</h1>
          <p className="text-white/70 max-w-2xl mt-4">Honest, side-by-side comparison against the 4 platforms Aussie tradies most often consider. Data verified as of February 2026 from public pricing.</p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8">
            {COMPETITORS.map((c, i) => (
              <div key={c.name} className={`border p-4 ${i === 0 ? "border-ink bg-warning" : "border-border bg-background"}`} data-testid={`compare-summary-${c.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className={`label-eyebrow ${i === 0 ? "text-ink" : "text-muted-foreground"}`}>{i === 0 ? "OUR PICK" : "Competitor"}</div>
                <div className="font-display text-lg font-black tracking-tight mt-1">{c.name}</div>
                <div className="text-xs mt-1 line-clamp-2">{c.tagline}</div>
                <div className="font-display text-xl font-black mt-3">{c.price}</div>
                <div className="flex items-center gap-1 mt-1"><Star weight="fill" className="text-warning" size={14} /><span className="text-xs">{c.rating}/5</span></div>
              </div>
            ))}
          </div>

          {/* Feature table */}
          <div className="border-2 border-ink overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-ink text-warning">
                <tr>
                  <th className="text-left px-4 py-3 label-eyebrow">Feature</th>
                  {COMPETITORS.map((c, i) => (
                    <th key={c.name} className={`px-4 py-3 label-eyebrow ${i === 0 ? "bg-warning text-ink" : ""}`}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row) => (
                  <tr key={row.key} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    {COMPETITORS.map((c, i) => (
                      <td key={c.name} className={`px-4 py-3 text-center ${i === 0 ? "bg-warning/20" : ""}`}>
                        {c.features[row.key] ? <Check weight="bold" className="text-emerald-600 mx-auto" /> : <X className="text-red-600 mx-auto" />}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t-2 border-ink bg-muted">
                  <td className="px-4 py-3 font-bold">Price per user (A$/mo)</td>
                  {COMPETITORS.map((c, i) => (
                    <td key={c.name} className={`px-4 py-3 text-center font-bold ${i === 0 ? "bg-warning" : ""}`}>A${c.features.price_per_user}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 border border-border p-6 bg-background">
            <div className="label-eyebrow text-muted-foreground">/ Why the difference?</div>
            <h3 className="font-display text-2xl font-black tracking-tighter mt-2">SafeTradie is the only platform purpose-built for Australian tradies — not re-skinned enterprise EHS.</h3>
            <p className="text-muted-foreground mt-3">Enterprise platforms (HammerTech, Donesafe) charge A$15-20k/yr minimum and assume you have a safety manager. Single-purpose tools (HazardCo) miss plant and substances. SafeTradie is the only platform that ships AI SWMS, worker mobile app, consultant portal AND a marketplace — from A$249/mo + GST, with a dedicated Enterprise tier at A$1,299/mo + GST for 50-user operations.</p>
          </div>

          <div className="mt-8 text-center">
            <Link to="/register"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="compare-cta">Start 14-day free trial <ArrowRight className="ml-1" /></Button></Link>
            <div className="text-xs text-muted-foreground mt-2">No credit card required.</div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
