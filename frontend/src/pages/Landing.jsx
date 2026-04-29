import { Link } from "react-router-dom";
import Marquee from "react-fast-marquee";
import {
  ShieldCheck, FileText, Warning, IdentificationBadge, ChartLineUp,
  ArrowRight, CheckCircle, HardHat, Buildings, Sparkle, Quotes, CaretDown
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";

const FEATURES = [
  { icon: FileText, title: "Document Generation", body: "AI-built SWMS, risk assessments, emergency procedures and induction packs from 30 seconds of input. Mapped to AS/NZS standards.", tag: "01", to: "/services/swms" },
  { icon: Warning, title: "Incident & Near-Miss", body: "Field-first reporting with photo, voice, and severity-based regulator notification prompts. Closed-loop corrective actions.", tag: "02", to: "/services/incidents" },
  { icon: IdentificationBadge, title: "Licences & People", body: "Every white card, trade ticket, HRWL and first-aid cert tracked. Expiry alerts before WorkSafe ever asks.", tag: "03", to: "/services/people" },
  { icon: ChartLineUp, title: "Compliance Intelligence", body: "Pattern detection across incidents, scoring, and audit prep. \"Your incident rate spikes Friday afternoons.\"", tag: "04", to: "/services/intelligence" },
];

const PARTNERS = ["MASTER BUILDERS", "HIA", "WORKSAFE READY", "JIM'S GROUP", "VIP HOME SERVICES", "TRADIE NATION", "NSW CONSTRUCTION", "BUILDPRO", "SAFEWORK NSW", "FCA"];

const STATS = [
  { v: "12,438", l: "SWMS generated" },
  { v: "94%", l: "Average compliance score" },
  { v: "60s", l: "Median doc time" },
  { v: "1,200+", l: "Crews onboarded" },
];

const TESTIMONIALS = [
  { name: "Dave M.", role: "Roofing contractor, NSW", quote: "My SWMS used to take 3 hours. Now it's 90 seconds. WorkSafe came last month — we passed first time." },
  { name: "Priya S.", role: "Plumbing director, VIC", quote: "Licences expire silently. SafeTradie's the first thing that ever caught a lapsed white card before it cost us a job." },
  { name: "Tom B.", role: "Electrical, QLD", quote: "Incident logging from the ute, photos and all. Closed-loop in the dashboard. Insurer dropped premiums on renewal." },
];

const FAQ = [
  { q: "Are SafeTradie documents accepted by WorkSafe?", a: "Documents are drafted to align with the model WHS Act, model WHS Regulations and AS/NZS standards. Final accountability sits with the PCBU. We strongly recommend a qualified WHS professional reviews high-risk SWMS before use — our WHS Partner Network can help." },
  { q: "Does it work on a phone in the field?", a: "Yes — every page is mobile-first. Incident capture supports rear-camera photos and works on Android and iOS browsers without an app install." },
  { q: "Which trades is SafeTradie built for?", a: "Plumbing, electrical, roofing, carpentry, concreting, painting, tiling, HVAC, demolition, excavation, scaffolding and welding out of the box. The AI adapts to any trade you describe." },
  { q: "What about subcontractors?", a: "You can track subbie licences and insurance in the People register. Our TradeCheck portable credential (rolling out next quarter) will let subbies maintain a single profile across every builder they work for." },
  { q: "Can my WHS consultant white-label it?", a: "Yes — our Partner Network gives independent consultants a co-branded instance with a network dashboard. See the Partners page." },
  { q: "How is pricing structured?", a: "Three tiers from A$79/mo (Solo) to A$299/mo (Network). 14-day trial, no credit card. Annual plans get 2 months free." },
];

const INTEGRATIONS = ["MYOB", "Xero", "ServiceM8", "simPRO", "Tradify", "Procore", "AroFlo", "WorkflowMax"];

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
              <span className="px-2 py-1 bg-warning text-ink label-eyebrow">WHS COMPLIANCE</span>
              <span className="label-eyebrow text-ink">Built for Australian trades</span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95]">
              The compliance<br />operating system<br />for <span className="bg-warning px-2">tradies</span>.
            </h1>
            <p className="mt-8 text-lg max-w-xl text-muted-foreground">
              SWMS in 30 seconds. Incidents from the job site. Every licence tracked.
              An AI safety officer in your pocket — engineered for builders, sparkies, plumbers and roofers.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/register"><Button size="lg" className="btn-sharp bg-ink text-white hover:bg-authority h-14 px-8 text-base" data-testid="hero-start-trial-btn">Start free 14-day trial <ArrowRight className="ml-2" /></Button></Link>
              <Link to="/services/swms"><Button size="lg" variant="outline" className="btn-sharp h-14 px-8 text-base border-ink" data-testid="hero-tour-btn">Take the tour</Button></Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle weight="fill" className="text-ink" /> No credit card</div>
              <div className="flex items-center gap-2"><CheckCircle weight="fill" className="text-ink" /> Cancel anytime</div>
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
                <div className="text-sm opacity-80">Average score across SafeTradie sites</div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-warning border-2 border-ink p-4 hidden lg:block">
              <div className="label-eyebrow">SWMS GENERATED</div>
              <div className="font-display font-black text-3xl">12,438</div>
            </div>
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

      {/* PROBLEM */}
      <section className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="label-eyebrow mb-3">/ The problem</div>
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">WHS paperwork<br />is killing margin.</h2>
          </div>
          <div className="lg:col-span-7 space-y-6 text-base">
            <p className="text-lg">Australian trade businesses lose <strong className="bg-warning px-1">3–6 hours per week</strong> per supervisor on safety paperwork. They lose more when WorkSafe knocks and a SWMS is missing, an induction wasn't logged, or a licence quietly expired six months ago.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border mt-8">
              <div className="bg-background p-6"><div className="font-display font-black text-4xl">A$1.8M</div><div className="label-eyebrow mt-2">Median WHS prosecution</div></div>
              <div className="bg-background p-6"><div className="font-display font-black text-4xl">52%</div><div className="label-eyebrow mt-2">Builders fail first audit</div></div>
              <div className="bg-background p-6"><div className="font-display font-black text-4xl">14 days</div><div className="label-eyebrow mt-2">To respond to a notice</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
            <div className="lg:col-span-4">
              <div className="label-eyebrow mb-3">/ Core stack</div>
              <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Four functions.<br />One system.</h2>
            </div>
            <p className="lg:col-span-7 lg:col-start-6 text-lg text-muted-foreground self-end">
              SafeTradie isn't another checklist app. It's compliance infrastructure — generation, capture, tracking and intelligence working as one connected layer for your business.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            {FEATURES.map((f) => (
              <Link to={f.to} key={f.tag} className="bg-background p-8 lg:p-12 group hover:bg-warning transition-colors duration-200" data-testid={`feature-${f.tag}`}>
                <div className="flex items-start justify-between mb-8">
                  <f.icon size={48} weight="duotone" />
                  <span className="font-mono text-xs text-muted-foreground group-hover:text-ink">/ {f.tag}</span>
                </div>
                <h3 className="font-display text-2xl lg:text-3xl font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground group-hover:text-ink/80">{f.body}</p>
                <div className="mt-6 label-eyebrow flex items-center gap-1 group-hover:text-ink">Learn more <ArrowRight size={12} /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="label-eyebrow mb-3">/ Workflow</div>
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mb-6">From blank page<br />to audit-ready.</h2>
            <p className="text-muted-foreground mb-10">SafeTradie removes the single biggest cost in WHS — writing the documents. The AI knows the legislation. You bring the job.</p>
            <div className="border-l-4 border-warning pl-4">
              <div className="font-mono text-xs">"My SWMS used to take 3 hours. Now it's 90 seconds. WorkSafe came last month — we passed first time."</div>
              <div className="mt-3 label-eyebrow">— DAVE M, ROOFING CONTRACTOR, NSW</div>
            </div>
          </div>
          <div className="lg:col-span-7 space-y-px bg-border border border-border">
            {[
              { step: "01", title: "Describe the job", body: "Trade, scope, site, hazards. Type or talk." },
              { step: "02", title: "AI drafts the document", body: "Claude Sonnet 4.5 generates a compliant SWMS in under a minute." },
              { step: "03", title: "Review, sign, deploy", body: "Edit on phone, push to crew. Auto-logged for audit." },
              { step: "04", title: "Track everything", body: "Licences, incidents, training — one compliance score." },
            ].map((s) => (
              <div key={s.step} className="bg-background p-6 flex gap-6 items-center">
                <div className="font-display font-black text-5xl text-ink/10">{s.step}</div>
                <div>
                  <div className="font-display font-bold text-xl">{s.title}</div>
                  <div className="text-muted-foreground text-sm mt-1">{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-border bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.l}>
              <div className="font-display font-black text-5xl lg:text-6xl text-warning">{s.v}</div>
              <div className="label-eyebrow mt-2 text-white/70">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ The crew speaks</div>
          <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mb-12">Trusted by builders<br />who'd rather be on the tools.</h2>
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

      {/* INTEGRATIONS */}
      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4">
              <div className="label-eyebrow mb-3">/ Integrations</div>
              <h3 className="font-display text-2xl font-bold">Plays nice with your stack.</h3>
              <p className="text-muted-foreground text-sm mt-2">Job-management, accounting and field-service tools — coming Q2.</p>
            </div>
            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
              {INTEGRATIONS.map((i) => (
                <div key={i} className="bg-background py-6 text-center font-display font-bold tracking-tight">{i}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="label-eyebrow mb-3">/ FAQ</div>
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Questions<br />from the site.</h2>
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
            <Link to="/register"><Button size="lg" className="btn-sharp bg-ink text-white hover:bg-authority h-14 px-8 text-base" data-testid="footer-cta-btn">Build my compliance stack <ArrowRight className="ml-2" /></Button></Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
