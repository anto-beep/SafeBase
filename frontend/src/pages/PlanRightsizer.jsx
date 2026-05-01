/**
 * PlanRightsizer — 3-question wizard that returns the exact SafeBase plan +
 * annual cost + industry-specific ROI + one-click checkout.
 *
 * Question 1: Industry (trades/hospitality/transport/healthcare/retail)
 * Question 2: Team size
 * Question 3: Locations
 *
 * Output: recommended tier card with annual price, annual-equivalent monthly,
 * savings vs monthly, industry-specific risk anchor (ACQSC for healthcare,
 * NHVR for transport, council closure for hospitality, injury claim for
 * retail, WorkSafe fine for trades), and a "Start Free Trial" CTA that
 * deep-links to Register pre-filled with the industry.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { INDUSTRY_PRICING } from "@/data/pricing.config";
import { Button } from "@/components/ui/button";
import { ArrowRight, Compass, CheckCircle } from "@phosphor-icons/react";

const INDUSTRIES = [
  { slug: "trades",       label: "Trades and Construction",  blurb: "Builders, trades, construction companies." },
  { slug: "retail",       label: "Retail",                    blurb: "Single store, chain, franchise retail." },
  { slug: "hospitality",  label: "Hospitality",               blurb: "Restaurants, cafes, bars, hotels, catering." },
  { slug: "transport",    label: "Transport and Logistics",   blurb: "Heavy vehicles, freight, warehousing." },
  { slug: "healthcare",   label: "Healthcare and Aged Care",  blurb: "Allied health, aged care, NDIS, medical." },
];

const RISK_ANCHOR = {
  trades: "Average WorkSafe prosecution: A$116,979. SafeBase is 3.4% of one fine.",
  retail: "One preventable manual-handling claim: A$15,000 – A$50,000. One customer slip-and-fall: A$20,000 – A$100,000.",
  hospitality: "A council food-safety prosecution: A$10,000 – A$50,000. A single day of venue closure: unrecoverable revenue.",
  transport: "One CoR criminal defence: A$50,000 – A$200,000 in legal fees alone. NHVR notifiable occurrence: 24-hour deadline.",
  healthcare: "One ACQSC audit preparation engagement: A$5,000 – A$15,000. AHPRA investigation legal fees: A$5,000 – A$50,000. Loss of registration ends operations.",
};

/**
 * Pick the right tier index (0-3) for the given industry based on team size
 * and location count.
 */
function recommendTier(industrySlug, team, locations) {
  // Normalise the location input (some industries — trades/healthcare — the
  // tier is driven more by team size; hospitality/transport/retail it's more
  // driven by locations).
  const t = Number(team) || 1;
  const l = Number(locations) || 1;

  if (industrySlug === "trades") {
    if (t <= 1) return 0;
    if (t <= 5) return 1;
    if (t <= 20) return 2;
    return 3;
  }
  if (industrySlug === "retail") {
    if (l >= 30 || t > 30) return 3;
    if (l >= 6 || t > 15) return 2;
    if (l >= 2 || t > 5) return 1;
    return 0;
  }
  if (industrySlug === "hospitality") {
    if (l >= 20 || t > 20) return 3;
    if (l >= 6 || t > 8) return 2;
    if (l >= 2 || t > 3) return 1;
    return 0;
  }
  if (industrySlug === "transport") {
    if (t > 25 || l >= 5) return 3;
    if (t > 10 || l >= 3) return 2;
    if (t > 3) return 1;
    return 0;
  }
  if (industrySlug === "healthcare") {
    if (t > 30 || l >= 5) return 3;
    if (t > 15 || l >= 3) return 2;
    if (t > 5) return 1;
    return 0;
  }
  return 0;
}

export default function PlanRightsizer() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState("");
  const [team, setTeam] = useState("");
  const [locations, setLocations] = useState("");
  const [showResult, setShowResult] = useState(false);

  const cfg = industry ? INDUSTRY_PRICING[industry] : null;
  const tierIdx = useMemo(() => industry ? recommendTier(industry, team, locations) : null, [industry, team, locations]);

  const onStart = () => {
    setShowResult(true);
  };

  if (showResult && cfg && tierIdx !== null) {
    const annual = cfg.prices.annual[tierIdx];
    const monthly = cfg.prices.monthly[tierIdx];
    const equiv = cfg.prices.annual_equivalent_monthly?.[tierIdx];
    const saving = cfg.prices.annual_saving?.[tierIdx];
    const name = cfg.plan_names[tierIdx];
    const userLimit = cfg.user_limits[tierIdx];
    const features = cfg.features[tierIdx + 1] || [];
    const anchor = RISK_ANCHOR[industry];

    const ctaToRegister = () => navigate(`/register?industry=${industry}&tier=${tierIdx}`);

    return (
      <div className="bg-background">
        <MarketingNav />
        <section className="border-b border-border" data-testid="rightsizer-result">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
            <div className="label-eyebrow mb-3" style={{ color: cfg.accent }}>/ Recommended plan</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter">Your right-size plan is <span style={{ background: cfg.accent }} className="px-2">{name}</span>.</h1>
            <p className="text-lg text-muted-foreground mt-4 max-w-3xl">Based on {team || "your team size"} user{Number(team) === 1 ? "" : "s"} operating across {locations || "your"} location{Number(locations) === 1 ? "" : "s"} in {cfg.label.toLowerCase()}.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
              {/* Price card */}
              <div className="border-2 p-8 bg-ink text-white" style={{ borderColor: cfg.accent }} data-testid="rightsizer-price-card">
                <div className="label-eyebrow text-white/60">/ Plan</div>
                <div className="font-display font-black text-3xl mt-2">{name}</div>
                <div className="text-sm text-white/60 mt-1">{userLimit}</div>
                <div className="mt-6 border-t border-white/20 pt-6">
                  <div className="font-display font-black text-6xl tracking-tighter" style={{ color: cfg.accent }} data-testid="rightsizer-annual-price">A${annual}<span className="text-xl">/yr</span></div>
                  <div className="text-sm text-white/80">+ GST · billed annually</div>
                  {equiv && <div className="text-xs text-white/60 mt-3">Equivalent to A${equiv}/month when billed annually</div>}
                  <div className="text-xs text-white/60 mt-1">A${monthly}/month + GST if paid monthly</div>
                  {saving && <div className="inline-block mt-4 text-xs font-bold px-3 py-1" style={{ background: cfg.accent, color: "#0A0A0A" }}>Save A${saving} + GST annually</div>}
                </div>
                <div className="mt-6">
                  <Button onClick={ctaToRegister} className="btn-sharp h-12 w-full bg-warning text-ink hover:bg-white" data-testid="rightsizer-cta-trial">Start Free Trial <ArrowRight className="ml-2" /></Button>
                  <div className="text-[11px] text-white/50 font-mono mt-2 text-center">14-DAY TRIAL · NO CREDIT CARD · 30-DAY MONEY-BACK</div>
                </div>
              </div>

              {/* Risk anchor + features */}
              <div className="border-2 border-ink p-8 bg-background">
                <div className="label-eyebrow mb-3">/ Why this plan</div>
                <h2 className="font-display font-black text-2xl tracking-tighter">{cfg.roi.headline}</h2>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{anchor}</p>
                <div className="mt-6 border-t border-border pt-6">
                  <div className="label-eyebrow mb-3">/ Included</div>
                  <ul className="space-y-2 text-sm">
                    {features.slice(0, 8).map((f) => (
                      <li key={f} className="flex items-start gap-2"><CheckCircle weight="fill" size={16} className="shrink-0 mt-0.5" style={{ color: cfg.accent }} /><span>{f}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Secondary options */}
            <div className="mt-12 flex flex-wrap gap-3 items-center">
              <button className="text-sm underline text-muted-foreground hover:text-ink" onClick={() => { setShowResult(false); setStep(0); setIndustry(""); setTeam(""); setLocations(""); }} data-testid="rightsizer-restart">← Start over</button>
              <Link to={`/pricing?industry=${industry}`} className="text-sm underline text-muted-foreground hover:text-ink" data-testid="rightsizer-see-all">See all {cfg.label.toLowerCase()} plans</Link>
              <Link to="/book-demo" className="text-sm underline text-muted-foreground hover:text-ink" data-testid="rightsizer-book-demo">Book a demo instead</Link>
            </div>
          </div>
        </section>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className="bg-background">
      <MarketingNav />
      <section className="border-b border-border" data-testid="rightsizer-wizard">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <div className="label-eyebrow mb-3 flex items-center gap-2"><Compass /> / Plan Right-sizer</div>
          <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">Three Questions.<br /><span className="bg-warning px-2">Your Exact Plan.</span></h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl">Skip the four-tier comparison table. Answer three questions and we'll return the right SafeBase plan for your industry, team size, and locations — with the exact annual cost and a one-click free trial.</p>

          {/* Step indicator */}
          <div className="mt-12 flex gap-2" data-testid="rightsizer-steps">
            {[0, 1, 2].map(i => (
              <div key={i} className={`flex-1 h-1 ${i <= step ? "bg-ink" : "bg-border"}`} data-testid={`rightsizer-step-${i}`} />
            ))}
          </div>
          <div className="text-xs font-mono text-muted-foreground mt-2">Step {step + 1} of 3</div>

          {/* Question 1: Industry */}
          {step === 0 && (
            <div className="mt-10" data-testid="rightsizer-q-industry">
              <h2 className="font-display font-black text-3xl tracking-tighter">What industry are you in?</h2>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                {INDUSTRIES.map(i => (
                  <button
                    key={i.slug}
                    onClick={() => { setIndustry(i.slug); setStep(1); }}
                    className={`border-2 p-5 text-left transition-colors hover:bg-ink hover:text-white ${industry === i.slug ? "bg-ink text-white border-ink" : "border-border bg-background"}`}
                    data-testid={`rightsizer-industry-${i.slug}`}
                  >
                    <div className="font-display font-black text-xl">{i.label}</div>
                    <div className="text-sm opacity-70 mt-1">{i.blurb}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 2: Team */}
          {step === 1 && (
            <div className="mt-10" data-testid="rightsizer-q-team">
              <h2 className="font-display font-black text-3xl tracking-tighter">How many people on your team?</h2>
              <p className="text-sm text-muted-foreground mt-2">Owners, permanent staff, regular casuals — anyone who needs access or a compliance record.</p>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
                {["1", "2-5", "6-15", "16-30", "31+"].map((r, i) => {
                  const v = r.includes("-") ? r.split("-")[0] : (r.replace("+", ""));
                  return (
                    <button key={r} onClick={() => { setTeam(r === "31+" ? "40" : v); setStep(2); }} className={`border-2 p-5 text-center transition-colors hover:bg-ink hover:text-white ${team === (r === "31+" ? "40" : v) ? "bg-ink text-white border-ink" : "border-border bg-background"}`} data-testid={`rightsizer-team-${i}`}>
                      <div className="font-display font-black text-2xl">{r}</div>
                      <div className="text-xs mt-1">users</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6">
                <button onClick={() => setStep(0)} className="text-sm underline text-muted-foreground" data-testid="rightsizer-back-0">← Back</button>
              </div>
            </div>
          )}

          {/* Question 3: Locations */}
          {step === 2 && (
            <div className="mt-10" data-testid="rightsizer-q-locations">
              <h2 className="font-display font-black text-3xl tracking-tighter">How many locations?</h2>
              <p className="text-sm text-muted-foreground mt-2">Sites, venues, depots, clinics or stores. Count active locations only.</p>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
                {["1", "2-5", "6-20", "21-50", "50+"].map((r, i) => {
                  const v = r.includes("-") ? r.split("-")[0] : r.replace("+", "");
                  return (
                    <button key={r} onClick={() => { setLocations(r === "50+" ? "80" : v); onStart(); }} className={`border-2 p-5 text-center transition-colors hover:bg-ink hover:text-white ${locations === (r === "50+" ? "80" : v) ? "bg-ink text-white border-ink" : "border-border bg-background"}`} data-testid={`rightsizer-loc-${i}`}>
                      <div className="font-display font-black text-2xl">{r}</div>
                      <div className="text-xs mt-1">locations</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6">
                <button onClick={() => setStep(1)} className="text-sm underline text-muted-foreground" data-testid="rightsizer-back-1">← Back</button>
              </div>
            </div>
          )}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
