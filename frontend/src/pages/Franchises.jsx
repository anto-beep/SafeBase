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
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">One safety standard.<br />Every franchisee.<br /><span className="bg-warning text-ink px-2">Zero excuses.</span></h1>
            <p className="mt-8 text-lg text-white/70 max-w-2xl">Give your network the WHS compliance system your brand demands — without making franchisees figure it out themselves.</p>
            <div className="mt-8 flex gap-3">
              <a href="mailto:franchises@safebase.com.au"><Button className="btn-sharp h-12 bg-warning text-ink hover:bg-white" data-testid="franchise-cta">Book a network demo <ArrowRight className="ml-2" /></Button></a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="label-eyebrow mb-3">/ The problem</div>
            <h2 className="font-display text-4xl font-black tracking-tighter">Your brand on the news.</h2>
          </div>
          <p className="lg:col-span-7 text-lg text-muted-foreground self-end">When a franchisee has a WorkSafe incident, it's your brand on the news. But right now you have no real visibility. Some use a folder. Some use nothing. You have 80 franchisees and 80 different approaches to safety. The average WHS fine is A$116,979. You cannot afford to find out the hard way.</p>
        </div>
      </section>

      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ How it works</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Three moves. Network-wide impact.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {[
              { n: "01", t: "You set the standard", b: "Upload your master SWMS library, safety policies, training requirements — once." },
              { n: "02", t: "Franchisees get SafeBase", b: "Pre-configured to your brand standards. They just add workers and sites." },
              { n: "03", t: "You see everything", b: "Compliance scores, incident rates, credentials, training — real-time across the network." },
            ].map((s) => (
              <div key={s.n} className="bg-background p-6">
                <div className="font-display font-black text-5xl text-warning">{s.n}</div>
                <div className="font-display font-bold text-lg mt-3">{s.t}</div>
                <div className="text-sm text-muted-foreground mt-2">{s.b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Franchisor dashboard</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Network compliance at a glance.</h2>
          <div className="bg-ink text-white p-8 border-4 border-warning">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div><div className="label-eyebrow text-warning">NETWORK SCORE</div><div className="font-display font-black text-5xl mt-2">91<span className="text-xl">/100</span></div></div>
              <div><div className="label-eyebrow text-warning">COMPLIANT</div><div className="font-display font-black text-5xl mt-2">47<span className="text-xl">/50</span></div></div>
              <div><div className="label-eyebrow text-warning">OVERDUE ACTIONS</div><div className="font-display font-black text-5xl mt-2 text-destructive">3</div></div>
              <div><div className="label-eyebrow text-warning">INCIDENTS · YTD</div><div className="font-display font-black text-5xl mt-2">28</div></div>
            </div>
            <div className="text-white/60 text-sm">Top 5 risk areas across network (AI identified): Working at Heights, Manual Handling, Electrical, PPE compliance, Site Housekeeping.</div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Pricing</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Scales with your network.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {[
              { n: "1 – 49 locations", p: "A$199", u: "/location/mo" },
              { n: "50 – 199 locations", p: "A$179", u: "/location/mo" },
              { n: "200+ locations", p: "A$149", u: "/location/mo" },
            ].map((t) => (
              <div key={t.n} className="bg-background p-8">
                <div className="label-eyebrow">{t.n}</div>
                <div className="font-display font-black text-5xl mt-3">{t.p}<span className="text-xl font-normal text-muted-foreground">{t.u}</span></div>
                <div className="text-xs text-muted-foreground mt-2">+ GST</div>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-warning border-2 border-ink p-4 text-center font-bold">Franchisor network dashboard included. Network setup from A$20,000 + GST (master template library + configuration + onboarding support across every industry).</div>
        </div>
      </section>

      <section className="border-b border-border bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="label-eyebrow text-warning mb-3">/ ROI case</div>
            <h2 className="font-display text-4xl font-black tracking-tighter">A$19,900/mo vs one prosecution.</h2>
          </div>
          <div className="lg:col-span-7 space-y-2 font-mono text-sm">
            <div className="flex justify-between border-b border-white/10 py-3"><span>SafeBase 100-location network (A$199 × 100)</span><span>A$19,900/mo + GST</span></div>
            <div className="flex justify-between border-b border-white/10 py-3"><span>Annual platform cost</span><span>A$238,800/yr + GST</span></div>
            <div className="flex justify-between border-b border-white/10 py-3"><span>50-199 locations</span><span>A$179/location + GST</span></div>
            <div className="flex justify-between border-b border-white/10 py-3"><span>200+ locations</span><span>A$149/location + GST</span></div>
            <div className="flex justify-between py-3 text-warning font-bold"><span>One regulatory prosecution across your network costs more than a decade of SafeBase for every location you operate.</span><span></span></div>
          </div>
        </div>
      </section>

      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8"><h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-ink">Ready to protect your brand?</h2></div>
          <div className="lg:col-span-4 lg:text-right"><a href="mailto:franchises@safebase.com.au"><Button className="btn-sharp h-14 px-8 bg-ink text-white hover:bg-authority" data-testid="franchise-final-cta">Book a network demo <ArrowRight className="ml-2" /></Button></a></div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
