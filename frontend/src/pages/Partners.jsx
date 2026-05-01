import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, Handshake, ChartLineUp, Buildings, Sparkle } from "@phosphor-icons/react";

const PARTNER_BENEFITS = [
  { icon: Sparkle, t: "AI tooling included", b: "Auto-draft SWMS for client jobs in seconds. Spend more time advising, less time typing." },
  { icon: ChartLineUp, t: "Multi-client dashboard", b: "See compliance status across all your clients in one console. Drill into any one." },
  { icon: Handshake, t: "Recurring revenue split", b: "Earn 30–40% of every client's monthly subscription on top of your billable hours." },
  { icon: Buildings, t: "Co-branded portal", b: "Your logo, your colours, your URL. Clients see your brand — we run the rails." },
];

export default function Partners() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="label-eyebrow mb-3">/ Partner Network</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">A platform<br />for <span className="bg-warning px-2">WHS consultants.</span></h1>
            <p className="mt-8 text-lg text-muted-foreground max-w-2xl">Independent WHS consultants — get a co-branded SafeBase instance, a multi-client console, AI tools that 10× your output, and a recurring software-revenue stream on top of your billable hours.</p>
            <div className="mt-8 flex gap-3">
              <a href="mailto:partners@safebase.com.au"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="partners-cta">Apply to partner <ArrowRight className="ml-2" /></Button></a>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="bg-warning border-2 border-ink p-8">
              <div className="label-eyebrow">/ ECONOMICS</div>
              <div className="mt-2 font-display font-black text-3xl">A$500<span className="text-base font-normal">/mo</span></div>
              <div className="text-sm">subscription per partner</div>
              <div className="mt-4 font-display font-black text-3xl">+30–40%</div>
              <div className="text-sm">share of every client subscription</div>
              <div className="mt-4 font-display font-black text-3xl">15–40</div>
              <div className="text-sm">average clients per partner</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Why partner</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Scale beyond billable hours.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
            {PARTNER_BENEFITS.map((b, i) => (
              <div key={i} className="bg-background p-6">
                <b.icon size={32} weight="duotone" />
                <div className="font-display font-bold text-lg mt-4">{b.t}</div>
                <div className="text-sm text-muted-foreground mt-2">{b.b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="label-eyebrow mb-3">/ Who is it for</div>
            <h2 className="font-display text-3xl font-black tracking-tighter">Scale Your Compliance Practice with SafeBase.</h2>
            <ul className="mt-6 space-y-3 text-muted-foreground">
              <li>· Multi-industry WHS consultants managing 10+ clients manually</li>
              <li>· Boutique compliance consultancies (2–5 staff) hitting capacity</li>
              <li>· Insurance brokers wanting a multi-industry compliance value-add</li>
              <li>· Industry associations offering member benefits across hospitality, transport, healthcare, retail, trades</li>
            </ul>
          </div>
          <div className="bg-ink text-white p-8">
            <div className="label-eyebrow text-warning">/ A typical partner P&L</div>
            <div className="mt-6 space-y-2 font-mono text-sm">
              <div className="flex justify-between border-b border-white/10 py-2"><span>10 clients × A$1,499/mo × 15%</span><span>+A$2,248.50</span></div>
              <div className="flex justify-between border-b border-white/10 py-2"><span>25 clients (mixed industries)</span><span>+A$5,621.25</span></div>
              <div className="flex justify-between border-b border-white/10 py-2"><span>50 clients (franchise roll-out)</span><span>+A$12,742.50</span></div>
              <div className="flex justify-between border-b border-white/10 py-2"><span>Partner subscription</span><span className="text-destructive">−A$1,999/mo + GST</span></div>
              <div className="flex justify-between py-2 text-warning font-bold"><span>Single Healthcare Enterprise client</span><span>+A$2,099.85/mo</span></div>
            </div>
            <p className="mt-4 text-xs text-white/60">A single Healthcare Enterprise client generates A$25,198.20 + GST in annual commission — one conversation with the right aged care organisation pays for your partner subscription more than 14 times over.</p>
          </div>
        </div>
      </section>

      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8"><h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-ink">Ready to multiply your impact?</h2></div>
          <div className="lg:col-span-4 lg:text-right"><a href="mailto:partners@safebase.com.au"><Button className="btn-sharp h-14 px-8 bg-ink text-white hover:bg-authority" data-testid="partners-final-cta">Apply now <ArrowRight className="ml-2" /></Button></a></div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
