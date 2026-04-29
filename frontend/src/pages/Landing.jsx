import { Link } from "react-router-dom";
import Marquee from "react-fast-marquee";
import {
  ShieldCheck, FileText, Warning, IdentificationBadge, ChartLineUp,
  ArrowRight, CheckCircle, HardHat, Lightning, Buildings, Sparkle
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: FileText, title: "Document Generation", body: "AI-built SWMS, risk assessments, emergency procedures and induction packs from 30 seconds of input. Mapped to AS/NZS standards.", tag: "01" },
  { icon: Warning, title: "Incident & Near-Miss", body: "Field-first reporting with photo, voice, and severity-based regulator notification prompts. Closed-loop corrective actions.", tag: "02" },
  { icon: IdentificationBadge, title: "Licences & People", body: "Every white card, trade ticket, HRWL and first-aid cert tracked. Expiry alerts before WorkSafe ever asks.", tag: "03" },
  { icon: ChartLineUp, title: "Compliance Intelligence", body: "Pattern detection across incidents, scoring, and audit prep. \"Your incident rate spikes Friday afternoons.\"", tag: "04" },
];

const PARTNERS = ["MASTER BUILDERS", "HIA", "WORKSAFE READY", "JIM'S GROUP", "VIP HOME SERVICES", "TRADIE NATION", "NSW CONSTRUCTION", "BUILDPRO"];

const PRICING = [
  { name: "Solo", price: "A$79", period: "/mo", features: ["Up to 3 workers", "Unlimited SWMS", "Incident register", "Email support"], cta: "Start Free Trial" },
  { name: "Crew", price: "A$149", period: "/mo", highlight: true, features: ["Up to 15 workers", "Everything in Solo", "Compliance intelligence", "Audit pack export", "Priority support"], cta: "Most Popular" },
  { name: "Network", price: "A$299", period: "/mo", features: ["Unlimited workers", "Multi-site dashboards", "Subcontractor compliance", "Dedicated WHS partner"], cta: "Talk to us" },
];

export default function Landing() {
  return (
    <div className="bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
            <div className="w-8 h-8 bg-ink flex items-center justify-center"><HardHat weight="fill" className="text-warning" size={20} /></div>
            <span className="font-display font-black text-lg tracking-tight">SAFETRADIE</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 label-eyebrow">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" className="btn-sharp" data-testid="nav-login-btn">Log in</Button></Link>
            <Link to="/register"><Button className="btn-sharp bg-ink text-white hover:bg-authority" data-testid="nav-register-btn">Get Started <ArrowRight className="ml-1" /></Button></Link>
          </div>
        </div>
      </header>

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
              <a href="#features"><Button size="lg" variant="outline" className="btn-sharp h-14 px-8 text-base border-ink" data-testid="hero-tour-btn">Take the tour</Button></a>
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

      {/* FEATURES */}
      <section id="features" className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
            <div className="lg:col-span-4">
              <div className="label-eyebrow mb-3">Core stack</div>
              <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Four functions.<br />One system.</h2>
            </div>
            <p className="lg:col-span-7 lg:col-start-6 text-lg text-muted-foreground self-end">
              SafeTradie isn't another checklist app. It's compliance infrastructure — generation, capture, tracking and intelligence working as one connected layer for your business.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            {FEATURES.map((f) => (
              <div key={f.tag} className="bg-background p-8 lg:p-12 group hover:bg-warning transition-colors duration-200" data-testid={`feature-${f.tag}`}>
                <div className="flex items-start justify-between mb-8">
                  <f.icon size={48} weight="duotone" />
                  <span className="font-mono text-xs text-muted-foreground group-hover:text-ink">/ {f.tag}</span>
                </div>
                <h3 className="font-display text-2xl lg:text-3xl font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground group-hover:text-ink/80">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="label-eyebrow mb-3">Workflow</div>
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

      {/* PRICING */}
      <section id="pricing" className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="text-center mb-16">
            <div className="label-eyebrow mb-3">Pricing</div>
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Less than one WorkSafe fine.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {PRICING.map((p) => (
              <div key={p.name} className={`p-8 ${p.highlight ? 'bg-ink text-white' : 'bg-background'}`} data-testid={`pricing-${p.name.toLowerCase()}`}>
                {p.highlight && <div className="label-eyebrow text-warning mb-4">MOST POPULAR</div>}
                <div className="font-display font-bold text-2xl">{p.name}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display font-black text-5xl">{p.price}</span>
                  <span className={p.highlight ? 'text-white/60' : 'text-muted-foreground'}>{p.period}</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2"><CheckCircle weight="fill" className={p.highlight ? 'text-warning shrink-0' : 'text-ink shrink-0'} />{f}</li>)}
                </ul>
                <Link to="/register" className="block mt-8">
                  <Button className={`w-full btn-sharp h-12 ${p.highlight ? 'bg-warning text-ink hover:bg-white' : 'bg-ink text-white hover:bg-authority'}`} data-testid={`pricing-cta-${p.name.toLowerCase()}`}>{p.cta}</Button>
                </Link>
              </div>
            ))}
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

      {/* FOOTER */}
      <footer className="bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-warning flex items-center justify-center"><HardHat weight="fill" className="text-ink" size={20} /></div>
              <span className="font-display font-black text-lg">SAFETRADIE</span>
            </div>
            <p className="text-sm text-white/60 max-w-xs">Compliance infrastructure for Australian trade businesses.</p>
          </div>
          <div>
            <div className="label-eyebrow text-white/60 mb-3">Product</div>
            <ul className="space-y-2 text-sm">
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><Link to="/login">Log in</Link></li>
            </ul>
          </div>
          <div>
            <div className="label-eyebrow text-white/60 mb-3">Legal</div>
            <ul className="space-y-2 text-sm">
              <li>Privacy</li><li>Terms</li><li>WHS Disclaimer</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">© {new Date().getFullYear()} SafeTradie · Australia</div>
      </footer>
    </div>
  );
}
