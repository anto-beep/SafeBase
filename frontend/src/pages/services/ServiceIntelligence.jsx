import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, ChartLineUp, Brain, Eye, Lightning, Lightbulb } from "@phosphor-icons/react";

const INSIGHTS = [
  { tag: "PATTERN", text: "Your incident rate has increased 40% on Friday afternoons." },
  { tag: "RISK", text: "Worker @Tom has had 3 near-misses in the past month — recommend 1:1 toolbox talk." },
  { tag: "TREND", text: "Manual handling makes up 38% of your incidents — generate a tailored toolbox talk?" },
  { tag: "EXPIRY", text: "5 white cards expire in next 60 days. 3 first-aid certs in next 90 days." },
  { tag: "AUDIT", text: "Compliance score dropped 6 pts this week. Likely cause: 2 SWMS overdue for review." },
  { tag: "BENCHMARK", text: "You're in the top 18% of NSW roofers for SWMS coverage. Above average for incident closure rate." },
];

export default function ServiceIntelligence() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border bg-ink text-white">
        <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative">
          <div className="lg:col-span-7">
            <div className="label-eyebrow text-warning mb-3">/ 04 Compliance Intelligence</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">The AI<br />layer that<br /><span className="bg-warning text-ink px-2">sees patterns</span><br />you can't.</h1>
            <p className="mt-8 text-lg text-white/70 max-w-2xl">No small business owner has time to sift through six months of incident logs to find a Friday-afternoon trend. SafeTradie's intelligence layer does it continuously — and tells you what to do about it.</p>
            <div className="mt-8 flex gap-3">
              <Link to="/register"><Button className="btn-sharp h-12 bg-warning text-ink hover:bg-white" data-testid="intel-cta">Start free trial <ArrowRight className="ml-2" /></Button></Link>
            </div>
          </div>
          <div className="lg:col-span-5 bg-background text-foreground p-8 border-2 border-warning">
            <div className="label-eyebrow mb-4">/ COMPLIANCE SCORE</div>
            <div className="font-display font-black text-7xl text-ink">86</div>
            <div className="label-eyebrow mt-1">Audit ready</div>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between border-b border-border py-1"><span>Documents</span><span className="font-mono">+24 pts</span></div>
              <div className="flex justify-between border-b border-border py-1"><span>Licences current</span><span className="font-mono">+22 pts</span></div>
              <div className="flex justify-between border-b border-border py-1"><span>Incidents closed</span><span className="font-mono">+18 pts</span></div>
              <div className="flex justify-between border-b border-border py-1"><span>Inductions logged</span><span className="font-mono">+22 pts</span></div>
              <div className="flex justify-between py-1 text-destructive"><span>Open serious incident</span><span className="font-mono">-6 pts</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Live insights feed</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Insight, not just data.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            {INSIGHTS.map((i, idx) => (
              <div key={idx} className="bg-background p-6 flex gap-4">
                <Lightbulb size={28} weight="duotone" className="text-warning shrink-0" />
                <div>
                  <div className="label-eyebrow">{i.tag}</div>
                  <div className="mt-1">{i.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            <div className="bg-background p-8">
              <Brain size={36} weight="duotone" />
              <div className="font-display font-bold text-xl mt-4">Pattern detection</div>
              <div className="text-sm text-muted-foreground mt-2">Cross-site, cross-trade, cross-time analysis surfaces hidden risk concentrations.</div>
            </div>
            <div className="bg-background p-8">
              <Eye size={36} weight="duotone" />
              <div className="font-display font-bold text-xl mt-4">Audit prep</div>
              <div className="text-sm text-muted-foreground mt-2">One-click export of your compliance evidence pack: SWMS, inductions, incidents, licences.</div>
            </div>
            <div className="bg-background p-8">
              <Lightning size={36} weight="duotone" />
              <div className="font-display font-bold text-xl mt-4">Legislative alerts</div>
              <div className="text-sm text-muted-foreground mt-2">When SafeWork or your state regulator changes a code, we tell you what it means for your business.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8"><h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-ink">Insight that prevents the next incident.</h2></div>
          <div className="lg:col-span-4 lg:text-right"><Link to="/register"><Button className="btn-sharp h-14 px-8 bg-ink text-white hover:bg-authority" data-testid="intel-final-cta">Start free trial <ArrowRight className="ml-2" /></Button></Link></div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
