/**
 * CredentialExpiryCalculator — per-industry calculator of the annual cost of
 * lapsed credentials (licences, AHPRA, RSA, heavy-vehicle endorsements).
 *
 * Inputs: industry, worker count, estimated % of workers with active credentials
 * Outputs: annual hidden cost of lapses (replacement fees + downtime + legal)
 *          + what SafeBase's auto-expiry system prevents.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "@phosphor-icons/react";

const INDUSTRY_DATA = {
  trades:      { label: "Trades and Construction", credType: "trade licences, white cards, HR licences", lapseCost: 850, downtimeDays: 3, legalRisk: 8000, safebaseCost: 5990 },
  retail:      { label: "Retail",                    credType: "RSA, bottle-shop licences, forklift", lapseCost: 420, downtimeDays: 1, legalRisk: 3500, safebaseCost: 7990 },
  hospitality: { label: "Hospitality",               credType: "Food Safety Supervisor, RSA, liquor", lapseCost: 520, downtimeDays: 2, legalRisk: 15000, safebaseCost: 11990 },
  transport:   { label: "Transport and Logistics",   credType: "HR/MC licences, HVA endorsements, fatigue", lapseCost: 720, downtimeDays: 4, legalRisk: 35000, safebaseCost: 14990 },
  healthcare:  { label: "Healthcare and Aged Care",  credType: "AHPRA, NDIS clearance, aged-care screening", lapseCost: 1450, downtimeDays: 0, legalRisk: 28000, safebaseCost: 24990 },
};

const fmt = (n) => `A$${Math.round(n).toLocaleString("en-AU")}`;

export default function CredentialExpiryCalculator() {
  const [industry, setIndustry] = useState("trades");
  const [workers, setWorkers] = useState(10);
  const [credsPerWorker, setCredsPerWorker] = useState(2);
  const [lapseRate, setLapseRate] = useState(8);

  const d = INDUSTRY_DATA[industry];

  const result = useMemo(() => {
    const totalCreds = workers * credsPerWorker;
    const lapsesPerYear = totalCreds * (lapseRate / 100);
    const replacementCost = lapsesPerYear * d.lapseCost;
    const downtimeCost = lapsesPerYear * d.downtimeDays * 800; // A$800/day lost revenue/worker
    const legalExposure = lapsesPerYear * 0.15 * d.legalRisk;
    const total = replacementCost + downtimeCost + legalExposure;
    return {
      totalCreds,
      lapsesPerYear: Math.round(lapsesPerYear * 10) / 10,
      replacementCost,
      downtimeCost,
      legalExposure,
      total,
      roiMultiple: total / d.safebaseCost,
    };
  }, [industry, workers, credsPerWorker, lapseRate, d]);

  return (
    <div className="bg-background">
      <MarketingNav />
      <section className="bg-ink text-white py-20 px-6" data-testid="cred-calc-hero">
        <div className="max-w-5xl mx-auto">
          <div className="label-eyebrow text-warning">/ Credential Expiry Cost Calculator</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">What Lapsed Credentials Really Cost You.</h1>
          <p className="text-white/70 mt-4 max-w-3xl">Replacement fees are the easy-to-see cost. Downtime, rework, and legal exposure from working without a current credential are where the real damage sits. Move the sliders.</p>
        </div>
      </section>
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border-2 border-ink p-6 bg-background">
            <div className="label-eyebrow">/ Your business</div>
            <div className="mt-6 space-y-6">
              <div>
                <div className="flex justify-between"><label className="label-eyebrow">Industry</label><span className="font-bold">{d.label}</span></div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {Object.entries(INDUSTRY_DATA).map(([k, v]) => (
                    <button key={k} onClick={() => setIndustry(k)} className={`border-2 text-xs font-bold py-2 px-2 transition-colors ${industry === k ? "bg-ink text-white border-ink" : "border-border hover:border-ink"}`} data-testid={`cred-ind-${k}`}>
                      {v.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-2">Credentials tracked: {d.credType}.</div>
              </div>
              <div>
                <div className="flex justify-between"><label className="label-eyebrow">Workers tracked</label><span className="font-bold">{workers}</span></div>
                <Slider value={[workers]} onValueChange={([v]) => setWorkers(v)} min={1} max={100} step={1} className="mt-3" data-testid="cred-workers" />
              </div>
              <div>
                <div className="flex justify-between"><label className="label-eyebrow">Credentials per worker</label><span className="font-bold">{credsPerWorker}</span></div>
                <Slider value={[credsPerWorker]} onValueChange={([v]) => setCredsPerWorker(v)} min={1} max={6} step={1} className="mt-3" data-testid="cred-per-worker" />
              </div>
              <div>
                <div className="flex justify-between"><label className="label-eyebrow">Annual lapse rate</label><span className="font-bold">{lapseRate}%</span></div>
                <Slider value={[lapseRate]} onValueChange={([v]) => setLapseRate(v)} min={1} max={30} step={1} className="mt-3" data-testid="cred-lapse-rate" />
                <div className="text-xs text-muted-foreground mt-1">Industry average: 8–15% without automated expiry tracking.</div>
              </div>
            </div>
          </div>
          <div className="border-2 border-ink p-6 bg-ink text-white" data-testid="cred-calc-result">
            <div className="label-eyebrow text-warning">/ Annual hidden cost</div>
            <div className="font-display font-black text-5xl tracking-tighter mt-3" style={{ color: "#FFCC00" }} data-testid="cred-total">{fmt(result.total)}</div>
            <div className="text-xs text-white/60 mt-1">per year, before SafeBase</div>
            <div className="mt-6 space-y-2 font-mono text-sm">
              <div className="flex justify-between border-b border-white/10 py-2"><span>Credentials tracked</span><span>{result.totalCreds}</span></div>
              <div className="flex justify-between border-b border-white/10 py-2"><span>Expected lapses/yr</span><span>{result.lapsesPerYear}</span></div>
              <div className="flex justify-between border-b border-white/10 py-2"><span>Replacement fees</span><span>{fmt(result.replacementCost)}</span></div>
              <div className="flex justify-between border-b border-white/10 py-2"><span>Downtime cost</span><span>{fmt(result.downtimeCost)}</span></div>
              <div className="flex justify-between border-b border-white/10 py-2"><span>Expected legal exposure</span><span>{fmt(result.legalExposure)}</span></div>
              <div className="flex justify-between border-b border-white/10 py-2"><span>SafeBase entry plan</span><span>{fmt(d.safebaseCost)}/yr</span></div>
              <div className="flex justify-between py-2 text-warning font-bold"><span>ROI multiple</span><span>{result.roiMultiple.toFixed(1)}x</span></div>
            </div>
            <Link to="/plan-rightsizer"><Button className="btn-sharp w-full h-12 mt-6 bg-warning text-ink hover:bg-white" data-testid="cred-calc-cta">Find your right-size plan <ArrowRight className="ml-2" /></Button></Link>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
