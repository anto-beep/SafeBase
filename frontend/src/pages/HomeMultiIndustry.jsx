import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle, Warning, IdentificationBadge, FileText, Brain,
  Clipboard, Handshake, Quotes, ShieldCheck, ChartLineUp, Microphone,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { INDUSTRIES, INDUSTRY_LIST } from "@/data/industries.config";
import { Icon } from "@/components/industry/IndustryPage";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAINS = [
  { icon: FileText, title: "No documentation", body: "The obligation to manage and record risks applies whether you run a cafe, a truck, a clinic, or a construction site. The fine for getting it wrong applies too." },
  { icon: IdentificationBadge, title: "Expired credentials", body: "An electrician with a lapsed licence. A nurse with an expired AHPRA registration. A driver with no current medical certificate. The liability is yours, not theirs." },
  { icon: Warning, title: "No investigation", body: "When something goes wrong, the regulator asks: What did you do to prevent it? What did you do when it happened? What did you change? Can you prove it?" },
];

const CORE = [
  { icon: Microphone, title: "AI Incident Management", body: "Voice-to-incident in 90 seconds." },
  { icon: ShieldCheck, title: "Risk Register (5×5 matrix)", body: "Every hazard. Every control. Every review." },
  { icon: IdentificationBadge, title: "Worker Credential Tracking", body: "Every licence, certificate, and expiry alert." },
  { icon: ChartLineUp, title: "Compliance Dashboard & Score", body: "One number that tells you where you stand." },
  { icon: Clipboard, title: "Audit Preparation Pack", body: "Inspector-ready PDF in under 2 minutes." },
  { icon: FileText, title: "AI Document Generation", body: "31+ compliance documents, generated for your industry." },
  { icon: Handshake, title: "Contractor Management (SafeCheck)", body: "Verify every subbie before they reach site." },
  { icon: Brain, title: "Psychosocial Safety Module", body: "The hazard category most platforms ignore." },
];

const STEPS = [
  { n: "01", t: "Select your industry", b: "SafeBase configures everything for you — content libraries, documents, hazard categories, credential types." },
  { n: "02", t: "Add your team and sites", b: "Workers, credentials, sites, and equipment set up in 10 minutes." },
  { n: "03", t: "Compliance runs in the background", b: "Alerts before expiries. Incidents captured by voice. Audit packs generated in minutes." },
];

const TIERS = [
  { name: "Sole Trader", price: "A$249/month + GST" },
  { name: "Small Business", price: "A$499/month + GST" },
  { name: "Growing Business", price: "A$799/month + GST" },
  { name: "Enterprise", price: "A$1,299/month + GST" },
];

const HOMEPAGE_TESTIMONIALS = [
  { quote: "Before SafeBase I was spending 45 minutes writing a SWMS for every job. Now it takes 60 seconds and I know it's compliant.", who: "Electrician, Melbourne, VIC", industry: "Trades" },
  { quote: "Temperature logs that actually get done. Council inspector said it was the most organised cafe she'd visited.", who: "Cafe owner, Brisbane, QLD", industry: "Hospitality" },
  { quote: "Every AHPRA registration tracked. Every expiry alerted. The peace of mind alone is worth the subscription.", who: "Practice manager, allied health, Sydney, NSW", industry: "Healthcare" },
];

export default function Landing() {
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
              <span className="block">WHS Compliance for Every</span>
              <span className="block">Australian Business.</span>
              <span className="block text-warning">Powered by AI.</span>
            </h1>
            <p className="text-lg lg:text-xl text-white/80 mt-8 max-w-3xl leading-relaxed">
              One platform for trades, hospitality, transport, healthcare, and retail. Every obligation documented, tracked, and audit-ready. From A$249/month + GST.
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
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/30 border border-white/15 p-4" data-testid="home-industry-signal">
                  <div data-testid={`home-industry-pulse-${ind.slug}`}>
                    <div className={`label-eyebrow ${ind.color.accentText} text-[10px] flex items-center gap-1.5`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      {signal.live ? "Network pulse · live" : "Network pulse"}
                    </div>
                    <div className="text-sm font-mono text-white mt-1.5 leading-snug">{signal.pulse}</div>
                  </div>
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
              <Link to="/register">
                <Button size="lg" className="btn-sharp bg-warning text-ink hover:opacity-90 uppercase tracking-widest font-bold h-12 px-6" data-testid="home-cta-primary">
                  Start Free Trial <ArrowRight className="ml-2" />
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
              <div>Average WHS fine: A$116,979</div>
              <div>51% of prosecutions target small business</div>
            </div>
          </div>
        </section>

        {/* Fear */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">The WHS Act Applies to Every Business. Every Industry.</h2>
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
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">Built for Your Industry. Not Adapted For It.</h2>
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

        {/* Core platform */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">Every Industry. One Compliance Engine.</h2>
            <p className="text-lg text-muted-foreground mt-6 max-w-3xl">These features come with every SafeBase plan, regardless of industry.</p>
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

        {/* How it works */}
        <section className="py-24 bg-ink text-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">How It Works</h2>
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

        {/* Pricing preview */}
        <section className="py-24 bg-muted/40">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
              {TIERS.map((t, i) => (
                <div key={i} className="bg-background border border-border p-7" data-testid={`home-tier-${i}`}>
                  <div className="label-eyebrow">{t.name}</div>
                  <div className="font-display text-2xl font-black tracking-tight mt-3">{t.price}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-6">All industries. All plans. 14-day free trial. No credit card.</p>
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
            <p className="text-lg text-white/80 mt-6 leading-relaxed">Start your free trial today. Select your industry and SafeBase configures itself for you.</p>
            <Link to="/register">
              <Button size="lg" className="btn-sharp bg-warning text-ink hover:opacity-90 uppercase tracking-widest font-bold mt-8 h-14 px-8 text-base" data-testid="home-final-cta">
                Start Free Trial <ArrowRight className="ml-2" />
              </Button>
            </Link>
            <p className="text-xs font-mono text-white/60 mt-6 uppercase tracking-widest">No credit card · 14-day trial · Australian data · Cancel anytime</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
