import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, HardHat, Compass, Heart, Trophy } from "@phosphor-icons/react";

const VALUES = [
  { icon: HardHat, t: "Built for the boots", b: "Every feature has been pressure-tested on a real Australian site. If a tradie can't use it with one hand and a glove, we redesign it." },
  { icon: Compass, t: "Compliance ≠ paperwork", b: "We measure success in incidents avoided, not documents stored. Our AI exists to remove busywork — not to add another spreadsheet." },
  { icon: Heart, t: "Field-honest", b: "We don't sell fear. We won't tell you 'WorkSafe is coming for you.' We tell you what's true — and we make the right thing the easy thing." },
  { icon: Trophy, t: "Independent + Australian", b: "Bootstrapped, founder-owned, headquartered in Sydney. No VC pressure to upsell every feature." },
];

const TIMELINE = [
  { y: "2024", t: "Founding", b: "SafeBase launched after a roofing prosecution in NSW exposed how badly small builders are served by enterprise WHS tools." },
  { y: "2025", t: "AI Documentation", b: "Claude Sonnet 4.5 integration ships. Median SWMS time drops from 3 hours to 60 seconds." },
  { y: "2026", t: "Partner Network", b: "First 20 WHS consultants onboarded. Multi-client console launches." },
  { y: "2027", t: "Franchise Edition", b: "First national franchise network rolls out across 200+ sites." },
];

export default function About() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <div className="label-eyebrow mb-3">/ About</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">We build<br />compliance<br /><span className="bg-warning px-2">for tradies.</span></h1>
            <p className="mt-8 text-lg text-muted-foreground max-w-2xl">SafeBase is a Sydney-based compliance infrastructure company building the operating system for Australian trade businesses. Documents, incidents, licences and intelligence — one platform.</p>
          </div>
          <div className="lg:col-span-5 self-end">
            <img src="https://images.unsplash.com/photo-1659353590864-c3314d25a261?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHw0fHxjb25zdHJ1Y3Rpb24lMjB3b3JrZXIlMjB0YWJsZXR8ZW58MHx8fHwxNzc3NDczMzA1fDA&ixlib=rb-4.1.0&q=85" alt="Worker on site" className="w-full aspect-square object-cover border-4 border-ink" />
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ What we believe</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Four operating principles.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            {VALUES.map((v) => (
              <div key={v.t} className="bg-background p-8">
                <v.icon size={36} weight="duotone" />
                <div className="font-display font-bold text-xl mt-4">{v.t}</div>
                <div className="text-muted-foreground mt-2">{v.b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow text-warning mb-3">/ Roadmap</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Where we've been. Where we're going.</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-white/10 border border-white/10">
            {TIMELINE.map((t) => (
              <div key={t.y} className="bg-ink p-6">
                <div className="font-display font-black text-4xl text-warning">{t.y}</div>
                <div className="font-display font-bold text-lg mt-2">{t.t}</div>
                <div className="text-sm text-white/60 mt-2">{t.b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8"><h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-ink">Want to build with us?</h2></div>
          <div className="lg:col-span-4 lg:text-right"><a href="mailto:hello@safebase.com.au"><Button className="btn-sharp h-14 px-8 bg-ink text-white hover:bg-authority" data-testid="about-final-cta">Get in touch <ArrowRight className="ml-2" /></Button></a></div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
