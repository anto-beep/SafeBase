import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, Cube, Compass, Heart, Trophy } from "@phosphor-icons/react";

const VALUES = [
  { icon: Cube, t: "Built for how each industry actually operates", b: "A food safety audit pack for a cafe is not the same as a CoR evidence file for a transport operator. SafeBase is purpose-built for each industry — not adapted from something designed for someone else." },
  { icon: Compass, t: "Compliance is not paperwork", b: "We measure success in incidents avoided, not documents stored. Our AI removes busywork — not adds another spreadsheet." },
  { icon: Heart, t: "Evidence, not fear", b: "Every claim on this platform is specific. Every regulatory reference is accurate. We tell you what is true — and we make the right thing the easy thing." },
  { icon: Trophy, t: "Independent and Australian", b: "Bootstrapped, founder-owned, headquartered in Sydney. All data hosted in AWS Sydney. Privacy Act compliant." },
];

const TIMELINE = [
  { y: "2024", t: "Founding", b: "SafeBase launched after prosecution data exposed how badly small and medium businesses were served by enterprise WHS tools." },
  { y: "2025", t: "AI Documentation", b: "Claude Sonnet 4.5 integration shipped. Median SWMS time dropped from 3 hours to 60 seconds. AI document factory expanded to 35+ templates." },
  { y: "2026", t: "Five Industries", b: "Hospitality, Transport, Healthcare, and Retail joined Trades on the SafeBase platform. Cross-Industry Compliance Inbox launched." },
  { y: "2027", t: "Franchise Edition", b: "National franchise network rollouts across hospitality, retail, and healthcare." },
];

export default function About() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <div className="label-eyebrow mb-3">/ About</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">Built for Every<br />Australian Business<br /><span className="bg-warning px-2">That Has WHS Obligations.</span></h1>
            <p className="mt-8 text-lg text-muted-foreground max-w-3xl">
              SafeBase was built from a straightforward observation: 994,178 employing businesses in Australia have identical WHS obligations under the law. The tools that existed were either enterprise platforms too expensive and complex for small and medium businesses, or generic tools with no understanding of how individual industries actually operate.
            </p>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
              SafeBase was built to be different. Five industries. One platform. Every compliance obligation addressed with the specificity that each industry requires — not adapted from something designed for someone else.
            </p>
          </div>
          <div className="lg:col-span-5 self-end">
            <img src="https://images.unsplash.com/photo-1659353590864-c3314d25a261?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHw0fHxjb25zdHJ1Y3Rpb24lMjB3b3JrZXIlMjB0YWJsZXR8ZW58MHx8fHwxNzc3NDczMzA1fDA&ixlib=rb-4.1.0&q=85" alt="Australian workplace" className="w-full aspect-square object-cover border-4 border-ink" />
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ What we believe</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Why AI Changes Everything for Compliance Management.</h2>
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

      <section className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-20">
          <div className="label-eyebrow mb-3">/ Commitment</div>
          <p className="text-xl leading-relaxed">Australian owned. Australian operated. All data hosted in AWS Sydney. Privacy Act compliant. No data sold to third parties. 30-day money-back guarantee on every plan.</p>
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
