import { Link } from "react-router-dom";
import Marquee from "react-fast-marquee";
import {
  FileText, Warning, IdentificationBadge, ChartLineUp, ArrowRight, CheckCircle,
  HardHat, Sparkle, Quotes, Siren, Student, Buildings, UserCircleGear, Graph
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";

const ECOSYSTEM = [
  { icon: FileText, title: "SafeBase Core", body: "WHS & Incident Management — SWMS, licences, compliance dashboard.", to: "/services/swms" },
  { icon: HardHat, title: "TradeInduct", body: "QR site inductions. Subbies scan, complete, done in 3 minutes.", to: "/products/tradeinduct" },
  { icon: IdentificationBadge, title: "TradeCheck", body: "Portable contractor credentials. One QR = full compliance record.", to: "/products/tradecheck" },
  { icon: Student, title: "SafeBase Academy", body: "AI safety microlearning. Turn your SWMS into training in 60s.", to: "/products/academy" },
  { icon: Buildings, title: "SafeBase for Franchises", body: "Network compliance dashboard + franchisee instances.", to: "/franchises" },
  { icon: UserCircleGear, title: "WHS Consulting", body: "Human experts working directly inside your SafeBase data.", to: "/consulting" },
];

const PAINS = [
  { icon: Siren, title: "No SWMS when the inspector arrives", body: "Fines up to A$2.3M per breach under the model WHS Act." },
  { icon: IdentificationBadge, title: "Expired licences on site", body: "You're the PCBU. You're liable — even when a subbie lapses." },
  { icon: Warning, title: "Incident with no record", body: "No record means no cover. Your insurer will walk." },
];

const STEPS = [
  { n: "01", t: "Set up in 10 minutes", b: "Trades, workers, sites, vehicles — guided wizard does the heavy lifting." },
  { n: "02", t: "AI runs compliance", b: "SWMS drafted, licences tracked, incidents logged — on autopilot." },
  { n: "03", t: "Audit-ready in 2 minutes", b: "WorkSafe visit? Export your complete evidence pack with one click." },
];

const TESTIMONIALS = [
  { name: "Dave M.", role: "Electrical contractor, NSW", quote: "My SWMS used to take 3 hours. Now it's 90 seconds. WorkSafe came last month — we passed first time." },
  { name: "Priya S.", role: "Plumbing director, VIC", quote: "Licences expire silently. SafeBase's the first tool that ever caught a lapsed white card before it cost us a job." },
  { name: "Tom B.", role: "Builder, QLD", quote: "Incident logging from the ute, photos and all. Insurer dropped premiums on renewal. Pays for itself." },
];

const PARTNERS = ["MASTER ELECTRICIANS AUSTRALIA", "MASTER PLUMBERS", "HIA", "MASTER BUILDERS", "NECA", "PIPA", "WORKSAFE READY", "TRADIE NATION"];

const FAQ = [
  { q: "Is there a free trial?", a: "Yes — 14 days full access, no credit card required." },
  { q: "Is my data stored in Australia?", a: "Yes — hosted in AWS Sydney region." },
  { q: "Does it cover every state?", a: "Built for every Australian WHS jurisdiction, including Victoria's OHS Act 2004." },
  { q: "Do workers need their own login?", a: "Workers use the mobile app for incidents and inductions. Only admins consume user seats." },
  { q: "What if I need help beyond the software?", a: "Our WHS Consulting services pair qualified human advisors with your SafeBase data — from A$1,800/month + GST." },
];

export default function Landing() {
  return (
    <div className="bg-background text-foreground">
      <MarketingNav />

      {/* HERO */}
      <section className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-1 bg-warning text-ink label-eyebrow">AUSTRALIA'S ONLY WHS PLATFORM BUILT FOR TRADES</span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95]">
              Australia's only WHS platform<br />built for <span className="bg-warning px-2">trades.</span><br />Powered by AI.
            </h1>
            <p className="mt-8 text-lg max-w-xl text-muted-foreground">
              SWMS in 3 minutes. Incidents reported by voice. Licences tracked automatically. Built for electricians, plumbers and builders — not paperwork.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/register"><Button size="lg" className="btn-sharp bg-ink text-white hover:bg-authority h-14 px-8 text-base" data-testid="hero-start-trial-btn">Start free trial <ArrowRight className="ml-2" /></Button></Link>
              <a href="mailto:hello@safebase.com.au?subject=Book a demo"><Button size="lg" variant="outline" className="btn-sharp h-14 px-8 text-base border-ink" data-testid="hero-demo-btn">Book a demo</Button></a>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2"><CheckCircle weight="fill" className="text-ink" /> 14-day free trial</div>
              <div className="flex items-center gap-2"><CheckCircle weight="fill" className="text-ink" /> No credit card</div>
              <div className="flex items-center gap-2"><CheckCircle weight="fill" className="text-ink" /> AS/NZS aligned</div>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] border-4 border-ink overflow-hidden">
              <img src="https://static.prod-images.emergentagent.com/jobs/659c908f-1335-49c4-b758-9667bc1b32d0/images/b8670e675aef15a8286aa972f30754d3de0ca5d2d17a657baaef5de1580b5e13.png" alt="Australian construction site" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="label-eyebrow text-warning">LIVE COMPLIANCE</div>
                <div className="font-display font-black text-3xl mt-1">94%</div>
                <div className="text-sm opacity-80">Average score across SafeBase sites</div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-warning border-2 border-ink p-4 hidden lg:block">
              <div className="label-eyebrow">SWMS GENERATED</div>
              <div className="font-display font-black text-3xl">50,000+</div>
            </div>
          </div>
        </div>
      </section>

      {/* STAT BAR */}
      <section className="border-b border-border bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center lg:text-left">
          <div><div className="font-display font-black text-3xl text-warning">50,000+</div><div className="label-eyebrow text-white/60 mt-1">SWMS Generated</div></div>
          <div><div className="font-display font-black text-3xl text-warning">446,000</div><div className="label-eyebrow text-white/60 mt-1">AU Trade Businesses</div></div>
          <div><div className="font-display font-black text-3xl text-warning">A$116,979</div><div className="label-eyebrow text-white/60 mt-1">Average WHS Fine</div></div>
          <div><div className="font-display font-black text-3xl text-warning">51%</div><div className="label-eyebrow text-white/60 mt-1">Prosecutions Target Small Biz</div></div>
        </div>
      </section>

      {/* PAIN */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
            <div className="lg:col-span-5">
              <div className="label-eyebrow mb-3">/ The reality</div>
              <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">WorkSafe doesn't care<br />that you're busy.</h2>
            </div>
            <p className="lg:col-span-7 text-lg text-muted-foreground self-end">In 2024, SafeWork SA secured its highest number of convictions in 10 years. The average fine was A$116,979. <strong className="text-foreground">Over half the prosecutions targeted small businesses.</strong></p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {PAINS.map((p) => (
              <div key={p.title} className="bg-background p-8 hover:bg-ink hover:text-white transition-colors group">
                <p.icon size={40} weight="duotone" className="text-destructive group-hover:text-warning" />
                <div className="font-display font-bold text-xl mt-4">{p.title}</div>
                <div className="text-sm text-muted-foreground mt-2 group-hover:text-white/70">{p.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ECOSYSTEM */}
      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            <div className="lg:col-span-6">
              <div className="label-eyebrow mb-3">/ The ecosystem</div>
              <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Six connected products.<br />One compliance ecosystem.</h2>
            </div>
            <p className="lg:col-span-6 text-lg text-muted-foreground self-end">SafeBase isn't just software — it's the infrastructure layer that connects your entire compliance operation. Every product feeds the next.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
            {ECOSYSTEM.map((e) => (
              <Link key={e.title} to={e.to} className="bg-background p-8 hover:bg-warning transition-colors group" data-testid={`eco-${e.title.replace(/\s+/g, '-').toLowerCase()}`}>
                <e.icon size={40} weight="duotone" />
                <div className="font-display font-bold text-xl mt-4">{e.title}</div>
                <div className="text-sm text-muted-foreground mt-2 group-hover:text-ink/80">{e.body}</div>
                <div className="mt-6 label-eyebrow flex items-center gap-1 group-hover:text-ink">Learn more <ArrowRight size={12} /></div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/ecosystem"><Button variant="outline" className="btn-sharp border-ink h-12 px-6" data-testid="cta-ecosystem">See how the ecosystem connects <ArrowRight className="ml-2" /></Button></Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ How it works</div>
          <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mb-12">From blank page to audit-ready.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-background p-8">
                <div className="font-display font-black text-6xl text-warning">{s.n}</div>
                <div className="font-display font-bold text-xl mt-3">{s.t}</div>
                <div className="text-sm text-muted-foreground mt-2">{s.b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-b border-border py-6 bg-ink">
        <Marquee speed={40} gradient={false} pauseOnHover>
          {PARTNERS.map((p, i) => (
            <div key={i} className="mx-12 font-display font-bold tracking-[0.2em] text-white/70 text-sm">{p}</div>
          ))}
        </Marquee>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ The crew speaks</div>
          <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mb-12">Trusted by Australian businesses<br />across five industries.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-background p-8 flex flex-col">
                <Quotes size={32} weight="duotone" className="text-warning" />
                <p className="mt-4 flex-1">"{t.quote}"</p>
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="font-bold">{t.name}</div>
                  <div className="label-eyebrow">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="text-center mb-12">
            <div className="label-eyebrow mb-3">/ Pricing</div>
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Simple pricing.<br />No per-user fees on our first three plans.</h2>
            <p className="text-sm text-muted-foreground mt-3">All prices exclude GST.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
            {[
              { n: "Solo Tradie", p: "799", u: "1 user", features: ["Unlimited SWMS", "Incident register", "10 worker profiles", "Licence tracking"] },
              { n: "Small Team", p: "1,599", u: "up to 5 users", features: ["Everything in Solo Tradie", "Contractor compliance", "AI pattern detection", "SafeInduct included"] },
              { n: "Growing Business", p: "2,499", u: "up to 20 users", highlight: true, features: ["Everything in Small Team", "Multi-site", "SafeCheck included", "SafeBase Academy included"] },
              { n: "Enterprise", p: "3,999", u: "up to 50 users", accent: true, features: ["All add-ons included", "Dedicated Account Manager", "API · SSO · Webhooks", "Quarterly Business Reviews"] },
            ].map((t) => (
              <div
                key={t.n}
                className={`p-8 flex flex-col ${t.highlight ? "bg-ink text-white" : t.accent ? "bg-[#1B3A5C] text-white" : "bg-background"}`}
                data-testid={`pricing-preview-${t.n.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {t.highlight && <div className="label-eyebrow text-warning mb-3">MOST POPULAR</div>}
                {t.accent && <div className="label-eyebrow text-warning mb-3">FOR LARGER OPERATIONS</div>}
                <div className="font-display font-bold text-2xl">{t.n}</div>
                <div className={`text-sm mt-1 ${t.highlight || t.accent ? "text-white/60" : "text-muted-foreground"}`}>{t.u}</div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-xl">A$</span><span className="font-display font-black text-5xl">{t.p}</span>
                  <span className={t.highlight || t.accent ? "text-white/60" : "text-muted-foreground"}>/mo</span>
                </div>
                <div className={`text-xs mt-1 ${t.highlight || t.accent ? "text-white/60" : "text-muted-foreground"}`}>+ GST</div>
                <ul className="mt-6 space-y-2 text-sm">
                  {t.features.map((f) => <li key={f} className="flex gap-2"><CheckCircle weight="fill" className={`shrink-0 ${t.highlight ? "text-warning" : t.accent ? "text-warning" : "text-ink"}`} />{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-muted-foreground text-sm">All plans include free SWMS generation, incident register, and licence tracking. 14-day free trial. No credit card required.<br />Pay annually and save — Solo Tradie A$7,990/yr · Small Team A$15,990/yr · Growing Business A$24,990/yr · Enterprise A$39,990/yr (all + GST)</p>
          <div className="mt-8 text-center flex flex-wrap gap-3 justify-center">
            <Link to="/pricing"><Button className="btn-sharp bg-ink text-white hover:bg-authority h-12 px-6" data-testid="cta-pricing">See full pricing <ArrowRight className="ml-2" /></Button></Link>
            <Link to="/enterprise"><Button variant="outline" className="btn-sharp border-[#1B3A5C] text-[#1B3A5C] hover:bg-[#1B3A5C] hover:text-white h-12 px-6" data-testid="cta-enterprise">Enterprise & demo <ArrowRight className="ml-2" /></Button></Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="label-eyebrow mb-3">/ FAQ</div>
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Questions from the site.</h2>
          </div>
          <div className="lg:col-span-8">
            <Accordion type="single" collapsible className="border border-border">
              {FAQ.map((f, i) => (
                <AccordionItem key={i} value={`q${i}`} className="border-b border-border last:border-0" data-testid={`faq-item-${i}`}>
                  <AccordionTrigger className="px-6 py-5 text-left font-display font-bold text-lg hover:bg-muted hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <h2 className="font-display text-4xl lg:text-6xl font-black tracking-tighter text-ink">Stop chasing paperwork.<br />Start running the site.</h2>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <Link to="/register"><Button size="lg" className="btn-sharp bg-ink text-white hover:bg-authority h-14 px-8 text-base" data-testid="footer-cta-btn">Start free trial <ArrowRight className="ml-2" /></Button></Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
