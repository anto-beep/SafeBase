import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle, Warning, IdentificationBadge, FileText, Brain,
  Clipboard, Handshake, Quotes, ShieldCheck, ChartLineUp, Microphone,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import IndustryDashboardPreview from "@/components/marketing/IndustryDashboardPreview";
import ProductTour from "@/components/marketing/ProductTour";
import { INDUSTRIES, INDUSTRY_LIST } from "@/data/industries.config";
import { Icon } from "@/components/industry/IndustryPage";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAINS = [
  { icon: FileText, title: "No documentation", body: "Whether you run a kitchen, a depot, a clinic, a store, or a construction site — the obligation to identify and manage workplace risks is identical. So is the penalty for failing to document it." },
  { icon: IdentificationBadge, title: "Expired credentials", body: "An RSA certificate. An AHPRA registration. A heavy vehicle licence. A food safety supervisor certificate. When a credential lapses and an incident follows, the liability is the employer's." },
  { icon: Warning, title: "No investigation record", body: "Regulators ask three questions after every incident: what did you do to prevent it, what did you do when it occurred, and what changed afterwards. The burden of proof is yours." },
];

const CORE = [
  { icon: Microphone, title: "AI Incident Management", body: "Voice-to-incident in under two minutes. Every industry." },
  { icon: ShieldCheck, title: "Risk Register", body: "Every hazard. Every control. Every review." },
  { icon: IdentificationBadge, title: "Worker Credential Tracking", body: "Every licence, certificate, and expiry alert." },
  { icon: ChartLineUp, title: "Compliance Score and Dashboard", body: "One number that tells you where you stand." },
  { icon: Clipboard, title: "Audit Preparation", body: "Inspector-ready pack generated in under two minutes." },
  { icon: FileText, title: "AI Document Generation", body: "35+ industry-specific compliance documents." },
  { icon: Handshake, title: "Contractor Management", body: "Verify every contractor credential before they arrive." },
  { icon: Brain, title: "Psychosocial Safety", body: "The hazard category most platforms ignore." },
];

const STEPS = [
  { n: "01", t: "Select your industry", b: "SafeBase loads your industry's compliance framework — documents, credentials, hazard libraries, and regulatory references all adapt automatically." },
  { n: "02", t: "Add your team and locations", b: "Workers, credentials, sites, venues, depots, or clinics configured in under ten minutes." },
  { n: "03", t: "Compliance operates continuously", b: "Credential expiry alerts. Voice-reported incidents. AI-generated documents. Audit packs ready in under two minutes. Always." },
];

// Entry-price cards — pulled from the central pricing config.
import { INDUSTRY_ENTRY_PRICES } from "@/data/pricing.config";

const HOMEPAGE_TESTIMONIALS = [
  { quote: "Managing food safety, RSA tracking, and WHS across three separate systems was unsustainable. SafeBase replaced all of them. Council inspections no longer require a week of preparation.", who: "Venue Owner, Multi-Site Group, Sydney, NSW", industry: "Hospitality" },
  { quote: "Two registered clinicians had lapsed AHPRA registrations before SafeBase. We had no mechanism tracking it. That risk no longer exists.", who: "Practice Manager, Allied Health, Melbourne, VIC", industry: "Healthcare and Aged Care" },
  { quote: "Our CoR compliance documentation was inadequate. SafeBase produced an audit-ready evidence pack in under two minutes that satisfied the NHVR officer.", who: "Operations Manager, Interstate Freight, Brisbane, QLD", industry: "Transport and Logistics" },
];

export default function Landing() {
  const { token } = useAuth();
  const [activeIndustry, setActiveIndustry] = useState("trades");
  const [liveSignals, setLiveSignals] = useState({});
  const ind = INDUSTRIES[activeIndustry];

  // Lazy-fetch live signal when the user switches to a tab for the first time.
  useEffect(() => {
    if (liveSignals[activeIndustry]) return;
    let cancelled = false;
    axios.get(`${API}/public/industry-signal/${activeIndustry}`)
      .then((r) => { if (!cancelled) setLiveSignals((p) => ({ ...p, [activeIndustry]: r.data })); })
      .catch(() => { /* silent — config fallback already renders */ });
    return () => { cancelled = true; };
  }, [activeIndustry, liveSignals]);

  // Prefer live data over config fallback when available.
  const signal = liveSignals[activeIndustry]
    ? { pulse: liveSignals[activeIndustry].pulse, featured: liveSignals[activeIndustry].featured, live: liveSignals[activeIndustry].live }
    : (ind.signal ? { ...ind.signal, live: false } : null);

  return (
    <>
      <MarketingNav />
      <main>
        {/* Hero with industry tabs */}
        <section className="bg-gradient-to-br from-[#0A1F44] to-[#0E2C5C] text-white py-24 lg:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95] max-w-5xl">
              <span className="block">Every Industry. Every Obligation.</span>
              <span className="block text-warning">One Platform.</span>
            </h1>
            <p className="text-lg lg:text-xl text-white/80 mt-8 max-w-3xl leading-relaxed">
              SafeBase is Australia's AI-powered WHS and compliance platform for hospitality, transport, healthcare, retail and trades. Every industry operates within its own configured ecosystem — documents, credentials, dashboards, and regulatory references built specifically for how your business operates.
            </p>

            {/* Industry tabs */}
            <div className="flex flex-wrap gap-2 mt-10" data-testid="home-industry-tabs">
              {INDUSTRY_LIST.map((i) => (
                <button
                  key={i.slug}
                  onClick={() => setActiveIndustry(i.slug)}
                  data-testid={`home-industry-tab-${i.slug}`}
                  className={`btn-sharp px-4 py-2 text-sm font-mono uppercase tracking-widest border transition-colors ${
                    activeIndustry === i.slug
                      ? `${i.color.accent} text-ink border-transparent`
                      : "border-white/30 text-white hover:bg-white/10"
                  }`}
                >
                  {i.nav}
                </button>
              ))}
            </div>

            {/* Live preview block reflecting selected industry */}
            <div className={`mt-8 bg-gradient-to-br ${ind.color.from} ${ind.color.to} border border-white/10 p-8 max-w-4xl`} data-testid="home-industry-preview">
              <div className="flex items-center gap-2 mb-3">
                <span className={`label-eyebrow ${ind.color.accentText}`}>{ind.badge}</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-white/10 border border-white/20 text-white/80" data-testid="home-industry-live-badge">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
                </span>
              </div>
              <div className="font-display text-2xl lg:text-3xl font-black tracking-tight">
                {ind.hero.headline.join(" ")}
              </div>
              <p className="text-white/80 mt-4 text-sm leading-relaxed">{ind.hero.subheadline}</p>

              {signal && (
                <div className="mt-6 bg-black/30 border border-white/15 p-4" data-testid="home-industry-signal">
                  <div data-testid={`home-industry-featured-${ind.slug}`}>
                    <div className={`label-eyebrow ${ind.color.accentText} text-[10px]`}>Spotlight</div>
                    <div className="text-sm text-white/90 mt-1.5 leading-snug">{signal.featured}</div>
                  </div>
                </div>
              )}

              <Link to={`/industries/${ind.slug}`} className="inline-flex items-center mt-5">
                <Button className={`btn-sharp ${ind.color.accent} text-ink uppercase tracking-widest font-bold`} data-testid={`home-see-${ind.slug}`}>
                  See {ind.nav} features <ArrowRight className="ml-2" />
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-3 mt-10">
              <Link to={token ? "/pricing" : "/register"}>
                <Button size="lg" className="btn-sharp bg-warning text-ink hover:opacity-90 uppercase tracking-widest font-bold h-12 px-6" data-testid="home-cta-primary">
                  {token ? "Choose Plan" : "Start Free Trial"} <ArrowRight className="ml-2" />
                </Button>
              </Link>
              <a href="#industries">
                <Button size="lg" variant="outline" className="btn-sharp border-white text-white hover:bg-white hover:text-ink uppercase tracking-widest h-12 px-6" data-testid="home-cta-secondary">
                  Choose Your Industry
                </Button>
              </a>
            </div>
          </div>

          <div className="bg-warning text-ink py-4 mt-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-mono">
              <div>994,178 employing businesses in Australia</div>
              <div>Every one has WHS obligations</div>
              <div>Average fine: A$116,979</div>
              <div>One platform. Five industries.</div>
            </div>
          </div>
        </section>

        {/* Fear */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">The WHS Act Applies to Every Business. Every Industry. Every Day.</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {PAINS.map((p, i) => (
                <div key={i} className="border-l-4 border-red-600 bg-red-50/40 dark:bg-red-950/20 p-6" data-testid={`home-fear-${i}`}>
                  <p.icon size={32} className="text-red-600" />
                  <h3 className="font-display text-xl font-black tracking-tight mt-4">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Industries grid */}
        <section id="industries" className="py-24 bg-muted/40">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="label-eyebrow mb-3">/ Industries</div>
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">Built for Your Industry. Not Adapted for It.</h2>
            <p className="text-lg text-muted-foreground mt-6 max-w-3xl">Select your industry on signup. SafeBase configures every feature, document, credential type, dashboard, and regulatory reference to match your compliance obligations from day one.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {INDUSTRY_LIST.map((i) => (
                <Link
                  key={i.slug}
                  to={`/industries/${i.slug}`}
                  className={`block bg-gradient-to-br ${i.color.from} ${i.color.to} text-white p-7 hover:scale-[1.02] transition-transform`}
                  data-testid={`home-industry-card-${i.slug}`}
                >
                  <div className={`w-12 h-12 ${i.color.accent} text-ink flex items-center justify-center mb-5`}>
                    <Icon name={i.icon} size={24} weight="bold" />
                  </div>
                  <div className={`label-eyebrow ${i.color.accentText} mb-2`}>{i.badge}</div>
                  <div className="font-display text-xl font-black tracking-tight">{i.hero.headline.join(" ")}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {i.features.blocks.slice(0, 3).map((b, j) => (
                      <span key={j} className="text-[11px] font-mono px-2 py-1 bg-white/10 border border-white/20">{b.title.split(".")[0]}</span>
                    ))}
                  </div>
                  <div className={`mt-6 inline-flex items-center text-sm font-mono uppercase tracking-widest ${i.color.accentText}`}>
                    See {i.nav} features <ArrowRight className="ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* STAT BAR — national scale anchor */}
        <section className="bg-ink text-white border-b border-warning/40" data-testid="home-stat-bar">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center lg:text-left font-mono">
            <div><div className="font-display font-black text-3xl text-warning">994,178</div><div className="text-xs text-white/60 uppercase tracking-widest mt-1">Employing businesses · AU</div></div>
            <div><div className="font-display font-black text-3xl text-warning">Every one</div><div className="text-xs text-white/60 uppercase tracking-widest mt-1">Has WHS obligations</div></div>
            <div><div className="font-display font-black text-3xl text-warning">A$116,979</div><div className="text-xs text-white/60 uppercase tracking-widest mt-1">Avg WorkSafe prosecution</div></div>
            <div><div className="font-display font-black text-3xl text-warning">One platform</div><div className="text-xs text-white/60 uppercase tracking-widest mt-1">Five industries</div></div>
          </div>
        </section>

        {/* THE RISK — why this matters */}
        <section className="py-24 bg-background border-b border-border" data-testid="home-the-risk">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="label-eyebrow mb-3">/ The WHS Act applies to every business</div>
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">The WHS Act Applies to Every Business. Every Industry. Every Day.</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="border-l-4 border-destructive pl-6 py-2">
                <div className="font-display font-black text-xl">No documentation</div>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">Whether you run a kitchen, a depot, a clinic, a store, or a construction site — the obligation to identify and record workplace risks applies equally. So does the penalty for failing to demonstrate it.</p>
              </div>
              <div className="border-l-4 border-destructive pl-6 py-2">
                <div className="font-display font-black text-xl">Expired credentials</div>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">An RSA certificate. An AHPRA registration. A heavy vehicle licence. A food safety supervisor certificate. When a credential lapses and an incident occurs, the liability is the employer's.</p>
              </div>
              <div className="border-l-4 border-destructive pl-6 py-2">
                <div className="font-display font-black text-xl">No investigation record</div>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">Every regulator asks three questions: what was done to prevent it, what was done when it occurred, and what changed afterwards. The burden of proof rests with the business.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Core platform */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">Every Industry. One Compliance Engine.</h2>
            <p className="text-lg text-muted-foreground mt-6 max-w-3xl">These capabilities are included with every SafeBase plan, regardless of industry.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              {CORE.map((c, i) => (
                <div key={i} className="border border-border p-5" data-testid={`home-core-${i}`}>
                  <c.icon size={24} weight="bold" className="text-ink" />
                  <div className="font-display font-black tracking-tight mt-3 text-sm">{c.title}</div>
                  <div className="text-xs text-muted-foreground mt-2">{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INDUSTRY DASHBOARD PREVIEW — interactive switcher per industry */}
        <IndustryDashboardPreview />

        {/* PRODUCT TOUR — real captured screenshots, switchable across all 5 industries */}
        <ProductTour switcher />

        {/* How it works */}
        <section className="py-24 bg-ink text-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">Configured for Your Industry in Minutes.</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {STEPS.map((s, i) => (
                <div key={i} className="border border-white/20 p-7" data-testid={`home-step-${i}`}>
                  <div className="font-mono text-warning text-xs uppercase tracking-widest">Step {s.n}</div>
                  <div className="font-display text-2xl font-black tracking-tight mt-2">{s.t}</div>
                  <div className="text-sm text-white/70 mt-4 leading-relaxed">{s.b}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing preview — five industry entry prices */}
        <section className="py-24 bg-muted/40">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">Priced for Your Industry. Justified by the Risk.</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-12">
              {INDUSTRY_ENTRY_PRICES.map((t) => (
                <Link to={`/industries/${t.slug}`} key={t.slug} className="bg-background border border-border p-6 hover:border-ink transition-colors" data-testid={`home-tier-${t.slug}`}>
                  <div className="label-eyebrow">{t.label}</div>
                  <div className="font-display text-2xl font-black tracking-tight mt-3">From A${t.monthly}/month + GST</div>
                  <div className="text-xs font-mono text-muted-foreground mt-1">or A${t.annual}/year + GST (save 2 months)</div>
                  <div className="text-xs text-muted-foreground mt-4 leading-relaxed">{t.note}</div>
                </Link>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-6">All plans include a 14-day free trial. No credit card required. All prices + GST.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/plan-rightsizer"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="home-rightsizer-cta">Find your right-size plan (3 questions) <ArrowRight className="ml-2" /></Button></Link>
              <Link to="/risk-calculator"><Button variant="outline" className="btn-sharp h-12 border-ink" data-testid="home-risk-cta">Calculate your risk exposure</Button></Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {HOMEPAGE_TESTIMONIALS.map((t, i) => (
                <div key={i} className="border border-border p-7" data-testid={`home-testimonial-${i}`}>
                  <Quotes size={32} weight="fill" className="text-ink/20" />
                  <p className="text-base mt-4 leading-relaxed">"{t.quote}"</p>
                  <div className="label-eyebrow text-muted-foreground mt-6">— {t.who}</div>
                  <div className="text-xs font-mono text-warning mt-1">{t.industry}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-gradient-to-br from-[#0A1F44] to-[#0E2C5C] text-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
            <h2 className="font-display text-4xl lg:text-6xl font-black tracking-tighter">Your Industry. Your Compliance. Your Platform.</h2>
            <p className="text-lg text-white/80 mt-6 leading-relaxed">{token ? "Pick a plan for every industry you operate in. Monthly or annual, your choice." : "Start your free trial today. Select your industry on signup and SafeBase configures everything in under ten minutes."}</p>
            <Link to={token ? "/pricing" : "/register"}>
              <Button size="lg" className="btn-sharp bg-warning text-ink hover:opacity-90 uppercase tracking-widest font-bold mt-8 h-14 px-8 text-base" data-testid="home-final-cta">
                {token ? "Choose Plan" : "Start Free Trial"} <ArrowRight className="ml-2" />
              </Button>
            </Link>
            <p className="text-xs font-mono text-white/60 mt-6 uppercase tracking-widest">{token ? "Monthly or annual · Per-industry billing · Manage from your dashboard" : "14-day free trial · No credit card required · Australian data hosting · Cancel anytime"}</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
