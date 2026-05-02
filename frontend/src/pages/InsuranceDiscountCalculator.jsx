/**
 * InsuranceDiscountCalculator — shows the annual insurance premium discount
 * a business can claim by demonstrating a documented WHS system (typically
 * 5-15% depending on insurer class).
 *
 * Inputs: current annual premium, industry, current compliance maturity
 * Outputs: estimated discount %, annual dollar saving, SafeBase cost, net.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "@phosphor-icons/react";

const INDUSTRY_OPTS = [
  { slug: "trades",      label: "Trades and Construction", baseDiscount: 12, safebase: 5990 },
  { slug: "retail",      label: "Retail",                    baseDiscount: 7,  safebase: 7990 },
  { slug: "hospitality", label: "Hospitality",               baseDiscount: 10, safebase: 11990 },
  { slug: "transport",   label: "Transport and Logistics",   baseDiscount: 15, safebase: 14990 },
  { slug: "healthcare",  label: "Healthcare and Aged Care",  baseDiscount: 8,  safebase: 24990 },
];

const MATURITY = [
  { value: 1, label: "Paper-based / ad-hoc",         multiplier: 1.0 },
  { value: 2, label: "Some documents, no system",    multiplier: 0.8 },
  { value: 3, label: "Basic software tools",         multiplier: 0.6 },
  { value: 4, label: "Formal WHS system in place",   multiplier: 0.3 },
];

const fmt = (n) => `A$${Math.round(n).toLocaleString("en-AU")}`;

export default function InsuranceDiscountCalculator() {
  const [industry, setIndustry] = useState("trades");
  const [premium, setPremium] = useState(18000);
  const [maturity, setMaturity] = useState(1);

  const cfg = INDUSTRY_OPTS.find(i => i.slug === industry);
  const mat = MATURITY.find(m => m.value === maturity);

  const result = useMemo(() => {
    const discountPct = cfg.baseDiscount * mat.multiplier;
    const annualSaving = (premium * discountPct) / 100;
    const safebase = cfg.safebase;
    const net = annualSaving - safebase;
    return {
      discountPct: Math.round(discountPct * 10) / 10,
      annualSaving,
      safebase,
      net,
      paysForItself: annualSaving >= safebase,
    };
  }, [industry, premium, maturity, cfg, mat]);

  return (
    <div className="bg-background">
      <MarketingNav />
      <section className="bg-ink text-white py-20 px-6" data-testid="insurance-calc-hero">
        <div className="max-w-5xl mx-auto">
          <div className="label-eyebrow text-warning">/ Insurance premium discount calculator</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">Your WHS System Is Worth Money at Renewal.</h1>
          <p className="text-white/70 mt-4 max-w-3xl">Australian workers compensation and public liability insurers offer 5–15% premium discounts for businesses with documented WHS systems. Most operators never claim it because they don't have the evidence. SafeBase generates that evidence by default.</p>
        </div>
      </section>
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border-2 border-ink p-6 bg-background">
            <div className="label-eyebrow">/ Your inputs</div>
            <div className="mt-6 space-y-6">
              <div>
                <div className="flex justify-between"><label className="label-eyebrow">Industry</label><span className="font-bold">{cfg.label}</span></div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {INDUSTRY_OPTS.map(o => (
                    <button key={o.slug} onClick={() => setIndustry(o.slug)} className={`border-2 text-xs font-bold py-2 px-2 transition-colors ${industry === o.slug ? "bg-ink text-white border-ink" : "border-border hover:border-ink"}`} data-testid={`ins-ind-${o.slug}`}>
                      {o.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-2">Industry avg max discount: {cfg.baseDiscount}% with mature WHS system.</div>
              </div>
              <div>
                <div className="flex justify-between"><label className="label-eyebrow">Current annual premium</label><span className="font-bold">{fmt(premium)}</span></div>
                <Slider value={[premium]} onValueChange={([v]) => setPremium(v)} min={2000} max={200000} step={500} className="mt-3" data-testid="ins-premium" />
                <div className="text-xs text-muted-foreground mt-1">Workers comp + public liability combined.</div>
              </div>
              <div>
                <div className="flex justify-between"><label className="label-eyebrow">Current WHS maturity</label><span className="font-bold">{mat.label}</span></div>
                <Slider value={[maturity]} onValueChange={([v]) => setMaturity(v)} min={1} max={4} step={1} className="mt-3" data-testid="ins-maturity" />
                <div className="text-xs text-muted-foreground mt-1">Higher maturity = smaller additional discount to capture (closer to ceiling).</div>
              </div>
            </div>
          </div>
          <div className="border-2 border-ink p-6 bg-ink text-white" data-testid="insurance-calc-result">
            <div className="label-eyebrow text-warning">/ With SafeBase</div>
            <div className="mt-3">
              <div className="font-display font-black text-5xl tracking-tighter" style={{ color: "#FFCC00" }} data-testid="ins-discount-pct">{result.discountPct}%</div>
              <div className="text-xs text-white/60 mt-1">estimated additional premium discount at next renewal</div>
            </div>
            <div className="mt-6 space-y-2 font-mono text-sm">
              <div className="flex justify-between border-b border-white/10 py-2"><span>Current premium</span><span>{fmt(premium)}/yr</span></div>
              <div className="flex justify-between border-b border-white/10 py-2"><span>Annual premium saving</span><span>{fmt(result.annualSaving)}</span></div>
              <div className="flex justify-between border-b border-white/10 py-2"><span>SafeBase cost</span><span>{fmt(result.safebase)}/yr</span></div>
              <div className="flex justify-between py-2 text-warning font-bold"><span>{result.paysForItself ? "Net annual saving" : "Net annual cost"}</span><span>{fmt(Math.abs(result.net))}</span></div>
            </div>
            <div className="mt-6 text-xs text-white/70 leading-relaxed">
              Discounts are indicative only. Actual discount depends on insurer, broker, claims history and documentation quality. SafeBase automatically generates the evidence pack most Australian insurers request: risk register, SWMS/HACCP plans, incident records, credential register, audit log.
            </div>
            <Link to="/plan-rightsizer"><Button className="btn-sharp w-full h-12 mt-6 bg-warning text-ink hover:bg-white" data-testid="ins-calc-cta">Find your right-size plan <ArrowRight className="ml-2" /></Button></Link>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
