/**
 * IndustryRiskCalculator — 5-industry ROI / risk quantification tool.
 *
 * Each industry tab inputs key drivers and returns:
 *   - Monthly exposure (AUD) without SafeBase
 *   - Annual SafeBase cost
 *   - Net ROI multiplier
 *   - One risk anchor statement
 *
 * Trades:      WorkSafe fine exposure × probability × team size
 * Retail:      injury + slip-claim exposure per store
 * Hospitality: closure days + council fine per venue
 * Transport:   CoR legal-fee exposure × driver-count
 * Healthcare:  consultant retainer + audit prep displaced
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "@phosphor-icons/react";

const fmt = (n) => `A$${Math.round(n).toLocaleString("en-AU")}`;

function Row({ label, value, accent, testid }) {
  return (
    <div className="flex justify-between py-3 border-b border-white/10 text-sm" data-testid={testid}>
      <span className="text-white/70">{label}</span>
      <span className={`font-mono font-bold ${accent ? "text-warning" : ""}`}>{value}</span>
    </div>
  );
}

function Calculator({ industry, inputs, compute, annualSafebase, anchor, ctaPath }) {
  const [values, setValues] = useState(inputs.map(i => i.default));
  const result = compute(values);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="border-2 border-ink p-6 bg-background">
        <div className="label-eyebrow">/ Inputs</div>
        <div className="mt-6 space-y-6">
          {inputs.map((inp, idx) => (
            <div key={inp.key}>
              <div className="flex justify-between"><label className="label-eyebrow">{inp.label}</label><span className="font-bold">{inp.format ? inp.format(values[idx]) : values[idx]}</span></div>
              <Slider value={[values[idx]]} onValueChange={([v]) => setValues(values.map((x, i) => i === idx ? v : x))} min={inp.min} max={inp.max} step={inp.step || 1} className="mt-3" data-testid={`risk-${industry}-${inp.key}`} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>{inp.format ? inp.format(inp.min) : inp.min}</span><span>{inp.format ? inp.format(inp.max) : inp.max}</span></div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-2 border-ink p-6 bg-ink text-white flex flex-col" data-testid={`risk-${industry}-result`}>
        <div className="label-eyebrow text-warning">/ Your exposure</div>
        <div className="mt-4">
          <Row label="Monthly exposure" value={fmt(result.monthly)} accent testid={`risk-${industry}-monthly`} />
          <Row label="Annual exposure" value={fmt(result.annual)} testid={`risk-${industry}-annual`} />
          <Row label="Annual SafeBase cost" value={fmt(annualSafebase)} testid={`risk-${industry}-cost`} />
          <Row label="ROI multiple" value={`${(result.annual / annualSafebase).toFixed(1)}x`} accent testid={`risk-${industry}-roi`} />
        </div>
        <div className="mt-6 pt-6 border-t border-white/20 text-sm text-white/80 leading-relaxed">
          {anchor}
        </div>
        <div className="mt-auto pt-6">
          <Link to={ctaPath}><Button className="btn-sharp w-full h-12 bg-warning text-ink hover:bg-white" data-testid={`risk-${industry}-cta`}>Find your right-size plan <ArrowRight className="ml-2" /></Button></Link>
        </div>
      </div>
    </div>
  );
}

export default function IndustryRiskCalculator() {
  return (
    <div className="bg-background">
      <MarketingNav />
      <section className="bg-ink text-white py-20 px-6" data-testid="risk-calc-hero">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-warning">/ Industry risk calculator</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">Quantify Your Compliance Exposure.</h1>
          <p className="text-white/70 max-w-3xl mt-4">Select your industry and move the sliders to match your business. See the monthly exposure, annual SafeBase cost, and ROI multiple — grounded in published Australian regulator data.</p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="trades" className="w-full">
            <TabsList className="flex-wrap h-auto bg-muted border-2 border-ink p-1 rounded-none">
              <TabsTrigger value="trades" data-testid="risk-tab-trades" className="rounded-none data-[state=active]:bg-ink data-[state=active]:text-warning">Trades</TabsTrigger>
              <TabsTrigger value="retail" data-testid="risk-tab-retail" className="rounded-none data-[state=active]:bg-ink data-[state=active]:text-warning">Retail</TabsTrigger>
              <TabsTrigger value="hospitality" data-testid="risk-tab-hospitality" className="rounded-none data-[state=active]:bg-ink data-[state=active]:text-warning">Hospitality</TabsTrigger>
              <TabsTrigger value="transport" data-testid="risk-tab-transport" className="rounded-none data-[state=active]:bg-ink data-[state=active]:text-warning">Transport</TabsTrigger>
              <TabsTrigger value="healthcare" data-testid="risk-tab-healthcare" className="rounded-none data-[state=active]:bg-ink data-[state=active]:text-warning">Healthcare</TabsTrigger>
            </TabsList>

            <TabsContent value="trades" className="mt-8">
              <Calculator
                industry="trades"
                annualSafebase={3990}
                ctaPath="/plan-rightsizer"
                anchor={<span>Average WorkSafe prosecution: <strong className="text-warning">A$116,979</strong>. Cat-1 WHS breach: up to A$3.9m + imprisonment. SafeBase Solo Tradie (A$3,990/year + GST) is 3.4% of one average prosecution.</span>}
                inputs={[
                  { key: "workers", label: "Active workers", min: 1, max: 50, default: 5 },
                  { key: "sites", label: "Concurrent sites", min: 1, max: 30, default: 3 },
                  { key: "hazard", label: "Site hazard level (1 low - 10 catastrophic)", min: 1, max: 10, default: 6 },
                ]}
                compute={([workers, sites, hazard]) => {
                  // Illustrative probability × consequence × team size
                  const pFine = (0.002 + 0.0008 * hazard) * Math.min(workers, 30);
                  const expFine = 116979 * pFine;
                  const downtime = 1200 * sites * (hazard / 10);
                  const annual = expFine + downtime * 12;
                  return { monthly: annual / 12, annual };
                }}
              />
            </TabsContent>

            <TabsContent value="retail" className="mt-8">
              <Calculator
                industry="retail"
                annualSafebase={5490}
                ctaPath="/plan-rightsizer"
                anchor={<span>One preventable manual-handling claim: <strong className="text-warning">A$15,000 – A$50,000</strong> before legal fees. Customer slip-and-fall public-liability claim: A$20,000 – A$100,000. SafeBase Single Store (A$5,490/year + GST) is less than one excess on most retail public-liability policies.</span>}
                inputs={[
                  { key: "stores", label: "Active stores", min: 1, max: 50, default: 3 },
                  { key: "casuals", label: "Casual staff turnover/year per store", min: 1, max: 60, default: 12 },
                  { key: "footfall", label: "Monthly footfall per store (thousands)", min: 1, max: 100, default: 8 },
                ]}
                compute={([stores, casuals, footfall]) => {
                  const claimP = 0.015 + casuals * 0.0005;
                  const handlingExp = 30000 * claimP * stores;
                  const slipExp = 40000 * (footfall / 1000) * stores;
                  const annual = handlingExp + slipExp;
                  return { monthly: annual / 12, annual };
                }}
              />
            </TabsContent>

            <TabsContent value="hospitality" className="mt-8">
              <Calculator
                industry="hospitality"
                annualSafebase={7990}
                ctaPath="/plan-rightsizer"
                anchor={<span>Council food-safety prosecution: <strong className="text-warning">A$10,000 – A$50,000</strong>. A single day of venue closure is unrecoverable revenue. Hospitality businesses currently pay A$400 – A$700/month across three fragmented tools. SafeBase Single Venue (A$7,990/year + GST) replaces all of them.</span>}
                inputs={[
                  { key: "venues", label: "Number of venues", min: 1, max: 20, default: 2 },
                  { key: "avgDaily", label: "Avg daily revenue per venue (A$)", min: 1000, max: 30000, default: 6500, step: 500, format: (n) => `A$${n.toLocaleString("en-AU")}` },
                  { key: "closureRisk", label: "Closure risk (% chance in 12 months)", min: 1, max: 40, default: 8, format: (n) => `${n}%` },
                ]}
                compute={([venues, avgDaily, closureRisk]) => {
                  const closureDays = 3 * (closureRisk / 100);
                  const revenueExp = closureDays * avgDaily * venues;
                  const prosecutionExp = 20000 * (closureRisk / 100) * venues;
                  const annual = revenueExp + prosecutionExp;
                  return { monthly: annual / 12, annual };
                }}
              />
            </TabsContent>

            <TabsContent value="transport" className="mt-8">
              <Calculator
                industry="transport"
                annualSafebase={9990}
                ctaPath="/plan-rightsizer"
                anchor={<span>CoR (Chain of Responsibility) criminal liability attaches to directors, schedulers, fleet managers personally. One CoR criminal defence: <strong className="text-warning">A$50,000 – A$200,000</strong> in legal fees before any finding. SafeBase Owner-Operator (A$9,990/year + GST) is less than one week of legal defence.</span>}
                inputs={[
                  { key: "drivers", label: "Drivers", min: 1, max: 50, default: 5 },
                  { key: "vehicles", label: "Heavy vehicles", min: 1, max: 40, default: 4 },
                  { key: "fatigueRisk", label: "Long-haul fatigue exposure (1-10)", min: 1, max: 10, default: 6 },
                ]}
                compute={([drivers, vehicles, fatigueRisk]) => {
                  const pCorProsecution = 0.01 + 0.005 * fatigueRisk;
                  const corExp = 125000 * pCorProsecution;
                  const nhvr = 8000 * vehicles * (fatigueRisk / 10);
                  const annual = corExp + nhvr + 3000 * drivers;
                  return { monthly: annual / 12, annual };
                }}
              />
            </TabsContent>

            <TabsContent value="healthcare" className="mt-8">
              <Calculator
                industry="healthcare"
                annualSafebase={14990}
                ctaPath="/plan-rightsizer"
                anchor={<span>Healthcare governance consultant retainer: <strong className="text-warning">A$3,000 – A$8,000/month</strong>. ACQSC audit preparation: A$5,000 – A$15,000 per engagement. AHPRA investigation legal costs: A$5,000 – A$50,000. SafeBase Solo Practice (A$14,990/year + GST) replaces the retainer and the audit prep engagement — continuously.</span>}
                inputs={[
                  { key: "clinicians", label: "Registered clinicians", min: 1, max: 60, default: 8 },
                  { key: "sites", label: "Sites / service locations", min: 1, max: 20, default: 2 },
                  { key: "ndisMix", label: "% revenue from NDIS / Aged Care", min: 0, max: 100, default: 50, format: (n) => `${n}%` },
                ]}
                compute={([clinicians, sites, ndisMix]) => {
                  const retainer = 5000 * 12;
                  const auditPrep = 10000 * sites;
                  const ahpraProb = 0.03 * clinicians * (ndisMix / 100 + 0.5);
                  const ahpraExp = 20000 * ahpraProb;
                  const annual = retainer + auditPrep + ahpraExp;
                  return { monthly: annual / 12, annual };
                }}
              />
            </TabsContent>
          </Tabs>

          <div className="max-w-3xl mx-auto text-center mt-16 border-2 border-warning bg-warning/20 p-8">
            <h2 className="font-display text-3xl font-black tracking-tighter">Three questions. Your exact plan.</h2>
            <p className="text-sm mt-3 text-ink/80">Skip the comparison table. Answer three questions and we'll return the right SafeBase plan for your industry, team size and locations.</p>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <Link to="/plan-rightsizer"><Button className="btn-sharp bg-ink text-white hover:bg-authority" data-testid="risk-calc-rightsizer-cta">Find your right-size plan <ArrowRight className="ml-1" /></Button></Link>
              <Link to="/book-demo"><Button variant="outline" className="btn-sharp border-ink" data-testid="risk-calc-demo-cta">Book a demo</Button></Link>
            </div>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
