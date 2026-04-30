import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/Layout";
import { FINE_CATEGORIES, STATE_GUIDES } from "@/content/marketingData";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calculator, ArrowRight, Warning } from "@phosphor-icons/react";

export default function FineCalculator() {
  const [state, setState] = useState("NSW");
  const [category, setCategory] = useState("cat_2");
  const [entityType, setEntityType] = useState("individual");
  const [severity, setSeverity] = useState([50]);
  const [firstOffence, setFirstOffence] = useState(true);

  const result = useMemo(() => {
    const cat = FINE_CATEGORIES[category];
    const min = entityType === "individual" ? cat.individual_min : cat.corporate_min;
    const max = entityType === "individual" ? cat.individual_max : cat.corporate_max;
    const sev = severity[0] / 100;
    let estimate = Math.round(min + (max - min) * sev);
    // first offence reduction
    if (firstOffence) estimate = Math.round(estimate * 0.7);
    return { estimate, min, max, cat };
  }, [category, entityType, severity, firstOffence]);

  const fmt = (n) => `A$${n.toLocaleString("en-AU")}`;

  return (
    <MarketingLayout>
      <section className="bg-ink text-white py-20 px-6" data-testid="fine-calc-hero">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-warning">/ Fine calculator</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">How much does a WHS breach cost?</h1>
          <p className="text-white/70 max-w-2xl mt-4">A rough estimator based on published Australian civil penalties. For illustration only — actual penalties depend on many factors and judicial discretion. Always get legal advice.</p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="border-2 border-ink p-6 bg-background">
            <div className="label-eyebrow flex items-center gap-2"><Calculator />Inputs</div>

            <div className="mt-6">
              <label className="label-eyebrow">State / territory</label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="fine-state"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATE_GUIDES).map(([c, g]) => <SelectItem key={c} value={c}>{c} · {g.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="mt-4">
              <label className="label-eyebrow">Breach category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="fine-category"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(FINE_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="mt-4">
              <label className="label-eyebrow">Who's liable</label>
              <div className="mt-2 grid grid-cols-2 border border-ink">
                <button onClick={() => setEntityType("individual")} data-testid="fine-entity-individual" className={`px-4 py-3 ${entityType === "individual" ? "bg-ink text-warning" : "hover:bg-muted"}`}>Individual (officer)</button>
                <button onClick={() => setEntityType("corporate")} data-testid="fine-entity-corporate" className={`px-4 py-3 ${entityType === "corporate" ? "bg-ink text-warning" : "hover:bg-muted"}`}>Corporate (PCBU)</button>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between"><label className="label-eyebrow">Severity</label><span className="font-bold">{severity[0]}%</span></div>
              <Slider value={severity} onValueChange={setSeverity} max={100} step={5} className="mt-3" data-testid="fine-severity" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Minor</span><span>Catastrophic</span></div>
            </div>

            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input type="checkbox" checked={firstOffence} onChange={(e) => setFirstOffence(e.target.checked)} data-testid="fine-first-offence" />
              <span className="text-sm">First offence (−30% estimate)</span>
            </label>
          </div>

          <div className="border-2 border-ink p-6 bg-ink text-white flex flex-col" data-testid="fine-result">
            <div className="label-eyebrow text-warning">/ Estimated fine</div>
            <div className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-4" data-testid="fine-estimate-value">{fmt(result.estimate)}</div>
            <div className="text-sm text-white/70 mt-2">{result.cat.label} · {entityType} · {state}</div>

            <div className="mt-6 border-t border-white/20 pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-white/60">Statutory range</span><span>{fmt(result.min)} — {fmt(result.max)}</span></div>
              {result.cat.jail && <div className="flex justify-between text-red-300"><span className="text-white/60">Possible imprisonment</span><span className="font-bold">{result.cat.jail}</span></div>}
              {firstOffence && <div className="flex justify-between text-emerald-300"><span className="text-white/60">First-offence discount</span><span>−30%</span></div>}
            </div>

            <div className="mt-auto pt-6 border-t border-white/20">
              <div className="flex items-start gap-3 text-xs text-white/70">
                <Warning className="text-warning shrink-0 mt-0.5" />
                <p>Estimate only. Courts consider remorse, cooperation, prior compliance, financial circumstances and deterrence. Get legal advice from a WHS lawyer if you're facing prosecution.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto text-center mt-12 border-2 border-warning bg-warning/20 p-8">
          <div className="label-eyebrow">/ Avoid the fine</div>
          <h2 className="font-display text-3xl font-black tracking-tighter mt-2">A{' '}SafeTradie subscription costs A$1,800/yr. A category-1 fine is A$3.9m.</h2>
          <Link to="/register"><Button className="btn-sharp mt-6 bg-ink text-white hover:bg-authority" data-testid="fine-calc-cta">Start 14-day free trial <ArrowRight className="ml-1" /></Button></Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
