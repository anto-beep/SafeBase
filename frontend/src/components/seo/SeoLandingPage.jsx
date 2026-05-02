/**
 * SeoLandingPage — shared component for industry-specific SEO landing pages.
 * Used by NDIS / CoR / HACCP / Retail / Trades compliance-software pages.
 *
 * Each variant passes a set of copy props; the page embeds the Plan Right-sizer
 * recommendation inline for direct conversion.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";

export default function SeoLandingPage({
  testid,
  eyebrow,
  headline,
  subheadline,
  industry,          // "healthcare" / "transport" / "hospitality" etc.
  accent,            // hex
  painPoints,        // [{title, body}, ...]
  featureList,       // ["feature 1", "feature 2", ...]
  regulators,        // ["AHPRA", "ACQSC", "NDIS Commission"]
  plans,             // [{name, annual, monthly}]
  faq,               // [{q, a}]
  roiAnchor,         // string — regulator-grounded dollar quote
}) {
  const [team, setTeam] = useState("");
  const [locations, setLocations] = useState("");
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(false);

  const findPlan = async () => {
    if (!team || !locations) return;
    setLoading(true);
    try {
      const API = process.env.REACT_APP_BACKEND_URL;
      const { data } = await axios.get(`${API}/api/plan-rightsizer/recommend`, {
        params: { industry, team, locations },
      });
      setRec(data);
      // Persist for Register prefill — mirrors Plan Right-sizer behaviour.
      try {
        localStorage.setItem("safebase_rightsizer", JSON.stringify({
          industry, team, locations, savedAt: Date.now(),
        }));
      } catch (e) { /* ignore */ }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background" data-testid={testid}>
      <MarketingNav />

      {/* HERO */}
      <section className="bg-ink text-white py-20 px-6" data-testid={`${testid}-hero`}>
        <div className="max-w-5xl mx-auto">
          <div className="label-eyebrow" style={{ color: accent }}>/ {eyebrow}</div>
          <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter mt-3 leading-[0.95]">{headline}</h1>
          <p className="text-white/70 mt-6 max-w-3xl text-lg">{subheadline}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {regulators.map(r => <span key={r} className="text-xs px-3 py-1 border border-white/30 font-mono">{r}</span>)}
          </div>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link to="/plan-rightsizer"><Button className="btn-sharp h-12 bg-warning text-ink hover:bg-white" data-testid={`${testid}-hero-cta`}>Find your plan in 3 questions <ArrowRight className="ml-2" /></Button></Link>
            <Link to="/book-demo"><Button variant="outline" className="btn-sharp h-12 border-white/40 text-white hover:bg-white hover:text-ink">Book a demo</Button></Link>
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="py-20 px-6 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="label-eyebrow mb-3">/ The compliance problem</div>
          <h2 className="font-display text-4xl font-black tracking-tighter">Why most {industry} operators fail audit prep.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border mt-10">
            {painPoints.map((p) => (
              <div key={p.title} className="bg-background p-6">
                <h3 className="font-display font-bold text-lg">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-6 border-b border-border bg-muted/40">
        <div className="max-w-5xl mx-auto">
          <div className="label-eyebrow mb-3">/ Purpose-built for your industry</div>
          <h2 className="font-display text-4xl font-black tracking-tighter">What SafeBase covers out of the box.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-10">
            {featureList.map(f => (
              <div key={f} className="flex items-start gap-3 bg-background border border-border p-4">
                <CheckCircle weight="fill" size={18} className="shrink-0 mt-0.5" style={{ color: accent }} />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INLINE RIGHT-SIZER */}
      <section className="py-20 px-6 border-b border-border" data-testid={`${testid}-inline-rightsizer`}>
        <div className="max-w-3xl mx-auto">
          <div className="label-eyebrow mb-3">/ Your right-size plan</div>
          <h2 className="font-display text-4xl font-black tracking-tighter">Answer two questions. See your exact plan.</h2>
          <p className="text-muted-foreground mt-3">{roiAnchor}</p>
          <div className="mt-8 bg-background border-2 border-ink p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-eyebrow">Team size</label>
                <input type="number" min="1" max="200" value={team} onChange={(e) => setTeam(e.target.value)} className="mt-2 w-full h-12 border-2 border-ink px-3 font-mono" data-testid={`${testid}-team`} />
              </div>
              <div>
                <label className="label-eyebrow">Locations</label>
                <input type="number" min="1" max="200" value={locations} onChange={(e) => setLocations(e.target.value)} className="mt-2 w-full h-12 border-2 border-ink px-3 font-mono" data-testid={`${testid}-locations`} />
              </div>
            </div>
            <Button disabled={loading || !team || !locations} onClick={findPlan} className="btn-sharp w-full h-12 mt-4 bg-ink text-white hover:bg-authority" data-testid={`${testid}-rec-btn`}>
              {loading ? "Calculating…" : "See my plan"} <ArrowRight className="ml-2" />
            </Button>
          </div>
          {rec && (
            <div className="mt-6 bg-ink text-white p-6 border-2 border-ink" data-testid={`${testid}-rec-result`}>
              <div className="label-eyebrow" style={{ color: accent }}>/ Your plan</div>
              <div className="font-display font-black text-3xl tracking-tighter mt-2">{rec.plan_name}</div>
              <div className="text-sm text-white/60 mt-1">{rec.user_limit} · {rec.industry_label}</div>
              <div className="font-display font-black text-5xl tracking-tighter mt-4" style={{ color: accent }}>A${rec.annual_aud_ex_gst.toLocaleString("en-AU")}<span className="text-lg">/yr + GST</span></div>
              <div className="text-xs text-white/70 mt-1">or A${rec.monthly_aud_ex_gst.toLocaleString("en-AU")}/mo + GST · save A${rec.annual_saving_aud.toLocaleString("en-AU")} annually</div>
              <div className="text-xs text-white/80 mt-3 leading-relaxed">{rec.risk_anchor}</div>
              <Link to={rec.cta_register_url}>
                <Button className="btn-sharp w-full h-12 mt-6 bg-warning text-ink hover:bg-white" data-testid={`${testid}-rec-cta`}>Start Free Trial <ArrowRight className="ml-2" /></Button>
              </Link>
              <div className="text-[11px] font-mono text-white/50 text-center mt-2">14-DAY TRIAL · NO CREDIT CARD · 30-DAY MONEY-BACK</div>
            </div>
          )}
        </div>
      </section>

      {/* PLAN PREVIEW — show entry + enterprise tier for this industry */}
      {plans && plans.length > 0 && (
        <section className="py-16 px-6 border-b border-border bg-background" data-testid={`${testid}-plans`}>
          <div className="max-w-5xl mx-auto">
            <div className="label-eyebrow mb-3">/ Plans for this industry</div>
            <h2 className="font-display text-3xl font-black tracking-tighter">Pricing without games.</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {plans.map((p) => (
                <div key={p.name} className="border-2 border-ink bg-white p-6" data-testid={`${testid}-plan-${p.name.toLowerCase().replace(/\s+/g,'-')}`}>
                  <div className="label-eyebrow">{p.name}</div>
                  <div className="font-display font-black text-5xl tracking-tighter mt-3" style={{ color: accent }}>A${p.annual}<span className="text-lg text-ink"> /yr + GST</span></div>
                  <div className="text-xs text-muted-foreground mt-1">or A${p.monthly}/mo + GST</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="label-eyebrow mb-3">/ FAQ</div>
          <h2 className="font-display text-4xl font-black tracking-tighter">Common questions</h2>
          <div className="mt-10 space-y-6">
            {faq.map((q) => (
              <div key={q.q} className="border-b border-border pb-6">
                <h3 className="font-display font-bold text-lg">{q.q}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{q.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
