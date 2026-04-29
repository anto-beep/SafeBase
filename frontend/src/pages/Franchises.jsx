import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, Buildings, ChartBar, ShieldCheck } from "@phosphor-icons/react";

export default function Franchises() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <div className="label-eyebrow text-warning mb-3">/ For Franchise Networks</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">One brand.<br />One standard.<br /><span className="bg-warning text-ink px-2">200 franchisees.</span></h1>
            <p className="mt-8 text-lg text-white/70 max-w-2xl">Trade franchise networks have a structural compliance problem — the franchisor is responsible for the brand standard, but every franchisee is an independent business. SafeTradie for Franchises gives you network visibility, master template control, and franchisee-level simplicity.</p>
            <div className="mt-8 flex gap-3">
              <a href="mailto:franchises@safetradie.com.au"><Button className="btn-sharp h-12 bg-warning text-ink hover:bg-white" data-testid="franchise-cta">Talk to us <ArrowRight className="ml-2" /></Button></a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
          <div className="bg-background p-8">
            <Buildings size={36} weight="duotone" />
            <div className="font-display font-bold text-xl mt-4">Network dashboard</div>
            <div className="text-sm text-muted-foreground mt-2">Compliance score, incident heat-map, SWMS coverage and licence currency across every franchisee.</div>
          </div>
          <div className="bg-background p-8">
            <ShieldCheck size={36} weight="duotone" />
            <div className="font-display font-bold text-xl mt-4">Master templates</div>
            <div className="text-sm text-muted-foreground mt-2">Brand-aligned SWMS, induction packs and policies pushed to every franchisee instance with version control.</div>
          </div>
          <div className="bg-background p-8">
            <ChartBar size={36} weight="duotone" />
            <div className="font-display font-bold text-xl mt-4">Network reporting</div>
            <div className="text-sm text-muted-foreground mt-2">Quarterly board reports with risk concentration, leading indicators and benchmark comparisons.</div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="label-eyebrow mb-3">/ Economics</div>
            <h2 className="font-display text-4xl font-black tracking-tighter">200 franchisees ×<br />A$79/mo = <span className="bg-warning px-2">A$189k/yr</span></h2>
            <p className="mt-4 text-muted-foreground">Less than the cost of a single WorkSafe prosecution. Often funded by reduced workers-comp premiums alone.</p>
          </div>
          <div className="lg:col-span-7 bg-ink text-white p-8 font-mono text-sm">
            <div className="label-eyebrow text-warning mb-4">/ INDICATIVE NETWORK ROLLOUT</div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 border-b border-white/10 py-2"><span>Discovery + brand templates</span><span>Wk 1–2</span></div>
              <div className="grid grid-cols-2 border-b border-white/10 py-2"><span>Pilot — 5 franchisees</span><span>Wk 3–4</span></div>
              <div className="grid grid-cols-2 border-b border-white/10 py-2"><span>Network rollout</span><span>Wk 5–10</span></div>
              <div className="grid grid-cols-2 border-b border-white/10 py-2"><span>Quarterly board reporting</span><span>Ongoing</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8"><h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-ink">Brand standard meets network visibility.</h2></div>
          <div className="lg:col-span-4 lg:text-right"><a href="mailto:franchises@safetradie.com.au"><Button className="btn-sharp h-14 px-8 bg-ink text-white hover:bg-authority" data-testid="franchise-final-cta">Talk to us <ArrowRight className="ml-2" /></Button></a></div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
