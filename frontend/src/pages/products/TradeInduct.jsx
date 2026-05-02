import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, QrCode, CheckCircle, DeviceMobile, Users } from "@phosphor-icons/react";

const STEPS = [
  { n: "01", t: "Create a location", b: "Site, venue, depot, clinic, or store. AI suggests location-specific hazards automatically." },
  { n: "02", t: "AI generates the induction", b: "Emergency procedures, PPE, rules, high-risk areas — configured for your industry in 30 seconds." },
  { n: "03", t: "Print the QR code", b: "Stick it at the entrance. Workers, contractors, and casuals scan and get inducted on arrival." },
  { n: "04", t: "Auto-register", b: "Every induction logs with timestamp, role, credentials photo — permanent and audit-ready." },
];

export default function TradeInduct() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="label-eyebrow mb-3">/ SafeInduct</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">QR-Based Inductions<br />for Every<br /><span className="bg-warning px-2">Industry.</span></h1>
            <p className="mt-8 text-lg text-muted-foreground max-w-2xl">Construction workers on site. Casual staff in a venue. Contractor drivers at a depot. Agency nurses at a clinic. Every induction recorded, every industry served, one platform.</p>
            <p className="mt-4 text-sm text-muted-foreground">A$299/month + GST standalone. Included from Tier 2 on every industry plan.</p>
            <div className="mt-8 flex gap-3">
              <Link to="/register"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="induct-cta">Start Free Trial <ArrowRight className="ml-2" /></Button></Link>
            </div>
          </div>
          <div className="lg:col-span-5 flex items-center justify-center p-8 bg-warning border-4 border-ink aspect-square relative">
            <div className="text-center">
              <QrCode size={200} weight="bold" className="mx-auto text-ink" />
              <div className="label-eyebrow mt-4">/ SCAN TO INDUCT</div>
              <div className="font-display font-black text-xl mt-1">14 Crown St, Sydney</div>
            </div>
            <div className="absolute -top-3 -right-3 bg-ink text-warning px-3 py-1 label-eyebrow border-2 border-warning">LIVE</div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ How it works</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Four steps. Zero paperwork.</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-border border border-border">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-background p-6">
                <div className="font-display font-black text-5xl text-warning">{s.n}</div>
                <div className="font-display font-bold text-lg mt-3">{s.t}</div>
                <div className="text-sm text-muted-foreground mt-2">{s.b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="label-eyebrow text-warning mb-3">/ What subbies see</div>
            <h2 className="font-display text-4xl font-black tracking-tighter">3-minute induction. Phone-native.</h2>
            <p className="mt-4 text-white/70">Subbie scans the QR → 5 sections of site-specific content → 3–5 confirmation questions → photo of white card → digital signature → done.</p>
          </div>
          <div className="lg:col-span-7">
            <div className="bg-background text-foreground border-4 border-warning p-6 max-w-md">
              <DeviceMobile weight="duotone" className="text-ink" size={28} />
              <div className="label-eyebrow mt-3">/ WELCOME</div>
              <div className="font-display font-black text-2xl mt-1">14 Crown St — Safety Induction</div>
              <div className="mt-4 h-1 bg-muted"><div className="h-1 bg-ink w-3/5" /></div>
              <div className="mt-4 text-sm">
                <div className="font-bold">3 / 5 — Emergency procedures</div>
                <div className="text-muted-foreground mt-1">Muster point is the SW corner of the lot. Primary first-aid kit is in the site office. Fire extinguisher near the main sub-board.</div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <div className="bg-muted p-3 text-center font-mono text-xs">BACK</div>
                <div className="bg-ink text-white p-3 text-center font-mono text-xs">CONTINUE →</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            <div className="bg-background p-8">
              <Users size={36} weight="duotone" />
              <div className="font-display font-bold text-xl mt-4">Site register</div>
              <div className="text-sm text-muted-foreground mt-2">Every person inducted, timestamped, trade, company. Filterable, exportable.</div>
            </div>
            <div className="bg-background p-8">
              <CheckCircle size={36} weight="duotone" />
              <div className="font-display font-bold text-xl mt-4">Credential capture</div>
              <div className="text-sm text-muted-foreground mt-2">Subbies photograph their white card. Stored, timestamped, linked to induction record.</div>
            </div>
            <div className="bg-background p-8">
              <QrCode size={36} weight="duotone" />
              <div className="font-display font-bold text-xl mt-4">Unique per site</div>
              <div className="text-sm text-muted-foreground mt-2">Every site gets its own QR and its own induction content. Print on sign, done.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-ink">A$299/mo + GST standalone. Included free from Tier 2 on every industry plan.</h2>
          </div>
          <div className="lg:col-span-4 lg:text-right"><Link to="/register"><Button className="btn-sharp h-14 px-8 bg-ink text-white hover:bg-authority" data-testid="induct-final-cta">Start free trial <ArrowRight className="ml-2" /></Button></Link></div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
