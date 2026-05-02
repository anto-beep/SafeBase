import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, FileText, CheckCircle, Sparkle, Lightning, ShieldCheck, Clock, Users } from "@phosphor-icons/react";

const DOC_TYPES = [
  { code: "SWMS", title: "Safe Work Method Statements", body: "High-risk construction work requires a SWMS under WHS Reg 299. Our AI builds them in 60 seconds, mapped to the activity, hierarchy of controls and PPE.", time: "60s", standards: ["WHS Reg 299", "AS/NZS 4801", "Code of Practice"] },
  { code: "RA", title: "Risk Assessments", body: "Hazard identification with likelihood × consequence matrix, control measures aligned to the Hierarchy of Controls, residual risk scoring.", time: "45s", standards: ["AS/NZS ISO 31000", "WHS Act s.19"] },
  { code: "EP", title: "Emergency Procedures", body: "Site-specific evacuation, first aid, fire and incident response plans. Diagrams, contacts, muster points pre-templated.", time: "30s", standards: ["AS 3745", "WHS Reg 43"] },
  { code: "IND", title: "Induction Checklists", body: "Site induction packs covering PPE, hazards, emergency, supervisor contacts. Per-trade and per-site variants generated automatically.", time: "30s", standards: ["WHS Reg 39"] },
  { code: "HSR", title: "Hazardous Substance Register", body: "SDS-aligned register of substances on site with storage, exposure, PPE and disposal controls.", time: "40s", standards: ["WHS Reg 344-348", "GHS"] },
  { code: "TBT", title: "Toolbox Talks", body: "5-minute toolbox talks generated weekly from your incident pattern data and seasonal hazards. Print-ready.", time: "20s", standards: ["Best practice"] },
];

const TRADES = ["Plumbing", "Electrical", "Roofing", "Carpentry", "Concreting", "Painting", "Tiling", "HVAC", "Demolition", "Excavation", "Scaffolding", "Welding", "Glazing", "Steel fixing"];

export default function ServiceSwms() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="label-eyebrow mb-3">/ 01 Documentation Generation</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">SWMS in <span className="bg-warning px-2">60 seconds.</span><br />Not 3 hours.</h1>
            <p className="mt-8 text-lg text-muted-foreground max-w-2xl">Claude Sonnet 4.5 reads your job description and generates an Australian-compliant Safe Work Method Statement, risk assessment, emergency procedure or hazardous substance register — ready to print, sign and deploy on site.</p>
            <div className="mt-8 flex gap-3">
              <Link to="/register"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="swms-cta-trial">Try it free <ArrowRight className="ml-2" /></Button></Link>
              <Link to="/pricing"><Button variant="outline" className="btn-sharp h-12 border-ink">See pricing</Button></Link>
            </div>
          </div>
          <div className="lg:col-span-5 bg-ink text-white p-8 border-2 border-ink relative">
            <div className="label-eyebrow text-warning mb-4">/ SAMPLE OUTPUT</div>
            <div className="font-mono text-xs leading-relaxed space-y-1 max-h-72 overflow-hidden">
              <div className="text-warning"># SWMS — Roof tiling, 2-storey residential</div>
              <div>## Scope of Work</div>
              <div className="text-white/70">Removal and replacement of terracotta tiles…</div>
              <div className="mt-2">## Hazard Identification</div>
              <div className="text-white/70">| Hazard | Risk | Control |</div>
              <div className="text-white/70">| Falls from heights | High | Edge protection, harness AS/NZS 1891 |</div>
              <div className="text-white/70">| Manual handling | Medium | Mechanical lifting, two-person carry |</div>
              <div className="mt-2">## PPE</div>
              <div className="text-white/70">- Hard hat AS/NZS 1801</div>
              <div className="text-white/70">- Safety glasses AS/NZS 1337</div>
              <div className="text-white/70">- Fall arrest harness AS/NZS 1891.1</div>
            </div>
            <div className="absolute -top-3 -right-3 bg-warning text-ink px-3 py-1 label-eyebrow border-2 border-ink">CLAUDE SONNET 4.5</div>
          </div>
        </div>
      </section>

      {/* DOC TYPES */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            <div className="lg:col-span-5">
              <div className="label-eyebrow mb-3">/ Document library</div>
              <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Six core documents.<br />All AI-built.</h2>
            </div>
            <p className="lg:col-span-7 text-lg text-muted-foreground self-end">Every safety document a small Australian trade business needs — generated, versioned, searchable, and audit-exportable.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
            {DOC_TYPES.map((d) => (
              <div key={d.code} className="bg-background p-8 hover:bg-warning transition-colors group" data-testid={`doc-type-${d.code}`}>
                <div className="flex items-center justify-between">
                  <FileText size={32} weight="duotone" />
                  <span className="font-mono text-xs">{d.code}</span>
                </div>
                <h3 className="font-display text-xl font-bold mt-6">{d.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-ink/80">{d.body}</p>
                <div className="mt-6 pt-4 border-t border-border group-hover:border-ink/30">
                  <div className="flex items-center gap-2 label-eyebrow"><Clock size={12} />~{d.time}</div>
                  <div className="text-[11px] mt-2 space-x-2">{d.standards.map((s) => <span key={s} className="bg-ink text-warning px-1 py-0.5 font-mono">{s}</span>)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS DEEP */}
      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ How it works</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">From phone to printed pack.</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-border border border-border">
            {[
              { n: "01", t: "Capture context", b: "Trade, scope, site, hazards. 5 fields. Voice or type." },
              { n: "02", t: "AI drafts", b: "Claude Sonnet 4.5 generates structured markdown with tables, controls and PPE." },
              { n: "03", t: "Review & edit", b: "Inline edit on phone. AI suggests missing controls." },
              { n: "04", t: "Sign & log", b: "Worker signatures captured. Audit trail stored permanently." },
            ].map((s) => (
              <div key={s.n} className="bg-background p-6">
                <div className="font-display font-black text-5xl text-warning">{s.n}</div>
                <div className="font-display font-bold text-lg mt-3">{s.t}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRADES */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="label-eyebrow mb-3">/ Built for every trade</div>
            <h2 className="font-display text-4xl font-black tracking-tighter">Plug your trade in.<br />The AI knows the rest.</h2>
            <p className="mt-4 text-muted-foreground">Hazards, controls, PPE and standards adapt automatically.</p>
          </div>
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-px bg-border border border-border">
            {TRADES.map((t) => (
              <div key={t} className="bg-background py-4 px-4 font-display font-bold flex items-center gap-2 hover:bg-warning"><CheckCircle weight="fill" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ECOSYSTEM — moved from former /ecosystem page (Feb 2026) */}
      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            <div className="lg:col-span-5">
              <div className="label-eyebrow mb-3">/ The SafeBase ecosystem</div>
              <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Six products. One platform. Every industry.</h2>
            </div>
            <p className="lg:col-span-7 text-lg text-muted-foreground self-end">SafeBase is not a single tool — it is a layered compliance ecosystem. Core is the foundation. SafeInduct, SafeCheck and Academy add specialised capability. Franchise and Consulting extend the platform outward. Every product works on every industry.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
            {[
              { code: "01", t: "SafeBase Core", d: "Compliance documents, incident management, credential tracking, risk register — configured for your industry.", p: "from A$599/mo + GST" },
              { code: "02", t: "SafeInduct", d: "QR-based inductions for sites, venues, depots, clinics and stores. AI-generated location-specific inductions.", p: "A$249/mo + GST · included Tier 2+" },
              { code: "03", t: "SafeCheck", d: "Portable compliance credential — verified licences, AHPRA, RSA certificates and insurances in one QR code.", p: "A$299/mo + GST · included Tier 3+" },
              { code: "04", t: "SafeBase Academy", d: "Industry-specific microlearning and full certification courses. Completion syncs to your compliance dashboard.", p: "from A$399/mo + GST · included Tier 3+" },
              { code: "05", t: "SafeBase for Franchises", d: "One compliance standard across every franchise location. Master template library, network-wide dashboards.", p: "from A$119/mo per location + GST" },
              { code: "06", t: "WHS Consulting", d: "Human WHS expert support powered by SafeBase data — setup, retainer, investigation, regulator audit prep.", p: "from A$1,800/mo + GST" },
            ].map((prod) => (
              <div key={prod.code} className="bg-background p-8" data-testid={`swms-eco-${prod.code}`}>
                <div className="font-mono text-xs text-muted-foreground">{prod.code}</div>
                <h3 className="font-display text-xl font-bold mt-2">{prod.t}</h3>
                <p className="text-sm text-muted-foreground mt-2">{prod.d}</p>
                <div className="text-xs font-mono mt-4 border-t border-border pt-3">{prod.p}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <div className="label-eyebrow text-warning mb-3">/ READY TO DRAFT?</div>
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Generate your first SWMS now.</h2>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <Link to="/register"><Button className="btn-sharp h-14 px-8 bg-warning text-ink hover:bg-white" data-testid="swms-final-cta">Start free trial <ArrowRight className="ml-2" /></Button></Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
