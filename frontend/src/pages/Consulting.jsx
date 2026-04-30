import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, UserCircleGear, CheckCircle, Brain } from "@phosphor-icons/react";

const SERVICES = [
  { n: "01", name: "WHS System Setup", price: "A$2,000 – 4,000", timeline: "5 business days", cta: "Book Setup Service",
    includes: ["Complete SafeTradie configuration for your trade", "SWMS library creation (up to 20 SWMS)", "Incident register setup", "Compliance framework review", "2-hour handover session"] },
  { n: "02", name: "Monthly Compliance Retainer", price: "A$600 – 900/month", timeline: "Ongoing", cta: "Start Retainer",
    includes: ["Monthly review of incident data & score", "Risk flagging & recommendations", "One on-call question per month", "Monthly written compliance summary"] },
  { n: "03", name: "Incident Investigation", price: "A$750 – 2,000", timeline: "Per incident", cta: "Request Investigation",
    includes: ["Qualified investigator review", "Root cause analysis", "Investigation report", "Regulatory notification support", "Corrective action advice"] },
  { n: "04", name: "WorkSafe Audit Preparation", price: "A$1,200 – 2,500", timeline: "2 business days", cta: "Book Audit Prep",
    includes: ["Full compliance review using SafeTradie data", "Mock audit walkthrough", "Document gap analysis", "Inspector-interaction coaching", "Audit pack preparation"] },
];

const COMPARE = [
  ["Hours spent finding your records", "2–3 hours", "0 — data already in SafeTradie"],
  ["Time to produce audit pack", "4–6 hours", "2 minutes (automated)"],
  ["Monthly retainer cost", "A$1,500 – 3,000", "A$600 – 900"],
  ["AI-powered pattern detection", "No", "Yes"],
  ["Available 24/7 for document gen", "No", "Yes"],
];

export default function Consulting() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <div className="label-eyebrow mb-3">/ WHS Consulting</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">AI does the<br />documents.<br /><span className="bg-warning px-2">Experts</span><br />do the judgement.</h1>
            <p className="mt-8 text-lg text-muted-foreground max-w-2xl">SafeTradie's consulting services pair your compliance data with qualified WHS advisors who know Australian trades law inside out.</p>
            <div className="mt-8 flex gap-3">
              <a href="mailto:consulting@safetradie.com.au"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="consult-cta">Book a free discovery call <ArrowRight className="ml-2" /></Button></a>
            </div>
          </div>
          <div className="lg:col-span-5 bg-ink text-white p-8 flex flex-col justify-center">
            <UserCircleGear size={48} weight="duotone" className="text-warning" />
            <div className="label-eyebrow text-warning mt-4">/ FIRST CALL</div>
            <div className="font-display font-black text-3xl mt-2">FREE 30-minute<br />discovery call.</div>
            <div className="text-white/70 mt-3 text-sm">No sales pressure. We'll tell you whether you need consulting or whether the platform alone does it.</div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Services</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Four ways to engage.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            {SERVICES.map((s) => (
              <div key={s.n} className="bg-background p-8">
                <div className="flex items-start justify-between">
                  <div className="font-mono label-eyebrow">/ {s.n}</div>
                  <div className="bg-ink text-warning px-2 py-1 font-mono text-xs">{s.timeline}</div>
                </div>
                <div className="font-display font-bold text-2xl mt-4">{s.name}</div>
                <div className="font-display font-black text-warning bg-ink inline-block px-2 py-1 mt-3">{s.price}</div>
                <ul className="mt-5 space-y-2 text-sm">
                  {s.includes.map((inc) => <li key={inc} className="flex gap-2"><CheckCircle weight="fill" className="text-ink shrink-0" />{inc}</li>)}
                </ul>
                <a href="mailto:consulting@safetradie.com.au"><Button variant="outline" className="btn-sharp border-ink w-full mt-6 h-11" data-testid={`consult-${s.n}`}>{s.cta} <ArrowRight className="ml-2" /></Button></a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
            <div className="lg:col-span-5">
              <div className="label-eyebrow mb-3">/ Why it works</div>
              <h2 className="font-display text-4xl font-black tracking-tighter">Our advisors work inside your SafeTradie data.</h2>
            </div>
            <p className="lg:col-span-7 text-muted-foreground self-end text-lg">Before they pick up the phone, they see your incident patterns, compliance score, SWMS history. Faster, sharper advice at lower cost than a traditional consultant charging A$150-200/hour for time spent finding information you already have.</p>
          </div>
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink text-white">
                <tr>
                  <th className="text-left px-4 py-4 label-eyebrow text-warning">Comparison</th>
                  <th className="text-left px-4 py-4 label-eyebrow text-warning">Traditional WHS Consultant</th>
                  <th className="text-left px-4 py-4 label-eyebrow text-warning">SafeTradie Consulting</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((r) => (
                  <tr key={r[0]} className="border-t border-border bg-background">
                    <td className="px-4 py-3 font-bold">{r[0]}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r[1]}</td>
                    <td className="px-4 py-3 font-bold">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8"><h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-ink">30 minutes. Free. No obligations.</h2></div>
          <div className="lg:col-span-4 lg:text-right"><a href="mailto:consulting@safetradie.com.au"><Button className="btn-sharp h-14 px-8 bg-ink text-white hover:bg-authority" data-testid="consult-final-cta">Book discovery call <ArrowRight className="ml-2" /></Button></a></div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
