import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, FileText, HardHat, IdentificationBadge, Student, Buildings, UserCircleGear, Lightning, CheckCircle } from "@phosphor-icons/react";

const PRODUCTS = [
  { code: "01", icon: FileText, name: "SafeBase Core", tagline: "The foundation everything else is built on.", to: "/services/swms", price: "from A$399/month + GST",
    what: "Compliance documents, incident management, credential tracking, compliance dashboard, audit preparation — configured for your industry.",
    who: "Any Australian business with WHS obligations. 1–50 staff.",
    ai: ["Voice-to-incident-report", "AI document generation for every industry", "Pattern detection", "Expiry alerts"] },
  { code: "02", icon: HardHat, name: "SafeInduct", tagline: "Every worker and contractor inducted. Every induction recorded. Zero paperwork.", to: "/products/tradeinduct", price: "A$199/month + GST · included from Tier 2",
    what: "QR-based induction system for sites, venues, depots, clinics and stores. AI-generated location-specific inductions.",
    who: "Any business that inducts workers, contractors, agency staff or casuals.",
    ai: ["Workers scan QR", "3-minute AI induction", "Auto-added to register with timestamp", "Credential photo capture"] },
  { code: "03", icon: IdentificationBadge, name: "SafeCheck", tagline: "Your entire compliance record. One QR code. Works across every industry.", to: "/products/tradecheck", price: "A$249/month + GST · included from Tier 3",
    what: "Portable compliance credential — verified licences, AHPRA registrations, RSA certificates, insurances and heavy-vehicle endorsements in one QR code.",
    who: "Contractors who want frictionless work; businesses that need to verify credentials fast.",
    ai: ["AI verifies insurance adequacy", "Authenticity check", "Expiry monitoring and alerts", "One-tap verification requests"] },
  { code: "04", icon: Student, name: "SafeBase Academy", tagline: "Industry-specific training with compliance evidence.", to: "/products/academy", price: "A$349/month up to 10 workers · included from Tier 3",
    what: "Mobile-first microlearning and full certification courses built specifically for each industry. Completion syncs to your compliance dashboard.",
    who: "Businesses needing auditable worker training records across any industry.",
    ai: ["AI builds modules from your documents", "Adaptive questions vary each attempt", "Completion tracked to compliance score", "Multi-language translation"] },
  { code: "05", icon: Buildings, name: "SafeBase for Franchises", tagline: "One compliance standard. Every location. Every industry.", to: "/franchises", price: "from A$119–A$169/mo per location · setup from A$20,000 + GST",
    what: "Network-level compliance dashboard for franchisors; pre-loaded templates for franchisees.",
    who: "Franchise networks across trades, hospitality, retail and healthcare.",
    ai: ["Network compliance score", "Cross-location pattern detection", "Master template version control", "Board-ready reporting"] },
  { code: "06", icon: UserCircleGear, name: "WHS Consulting", tagline: "AI does the documents. Experts do the judgement.", to: "/consulting", price: "Setup from A$2,500 · Retainer from A$1,800/month + GST",
    what: "Human WHS expert support powered by SafeBase data — setup, retainer, investigation, regulator audit prep.",
    who: "Businesses that want human expertise alongside the software.",
    ai: ["Advisors work inside your data", "Faster, sharper advice", "Half the cost of traditional consultants", "Integrated report delivery"] },
];

const DATA_FLOW = [
  { step: "Worker or contractor scans QR code", product: "SafeInduct" },
  { step: "SafeCheck verifies their credentials", product: "SafeCheck" },
  { step: "Induction record saved", product: "SafeBase Core" },
  { step: "Industry-specific documents pre-loaded", product: "SafeBase Core" },
  { step: "Incident register activated for location", product: "SafeBase Core" },
  { step: "Compliance score updated", product: "Intelligence Layer" },
];

export default function Ecosystem() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <div className="label-eyebrow mb-3">/ How it works</div>
          <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">Not six products.<br /><span className="bg-warning px-2">One ecosystem.</span></h1>
          <p className="mt-8 text-lg text-muted-foreground max-w-3xl">Most trade businesses manage safety in fragments — a folder for SWMS, a spreadsheet for licences, a text message for incidents. SafeBase connects every part of your compliance operation into one intelligent system. Every product feeds data to the next. Every worker interaction improves the AI. Every completed job makes your audit trail stronger.</p>
        </div>
      </section>

      {/* ECOSYSTEM MAP */}
      <section className="border-b border-border bg-ink text-white relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 relative">
          <div className="label-eyebrow text-warning mb-3">/ Ecosystem map</div>
          <h2 className="font-display text-3xl lg:text-4xl font-black tracking-tighter mb-12">Every product feeds the core.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-6">
              <div className="bg-warning text-ink p-4 border-2 border-warning"><HardHat weight="fill" /><div className="font-display font-bold mt-2">SafeInduct</div><div className="text-xs">→ feeds induction records</div></div>
              <div className="bg-warning text-ink p-4 border-2 border-warning"><IdentificationBadge weight="fill" /><div className="font-display font-bold mt-2">SafeCheck</div><div className="text-xs">→ feeds contractor compliance</div></div>
              <div className="bg-warning text-ink p-4 border-2 border-warning"><Student weight="fill" /><div className="font-display font-bold mt-2">Academy</div><div className="text-xs">→ feeds training completion</div></div>
            </div>
            <div className="text-center">
              <div className="inline-block bg-white text-ink border-4 border-warning p-8">
                <FileText size={48} weight="fill" className="mx-auto" />
                <div className="font-display font-black text-2xl mt-3">SafeBase Core</div>
                <div className="text-xs mt-1">Compliance Engine</div>
              </div>
              <div className="mt-4 label-eyebrow text-warning">↑ ↓ data flow ↑ ↓</div>
            </div>
            <div className="space-y-6">
              <div className="bg-warning text-ink p-4 border-2 border-warning"><Buildings weight="fill" /><div className="font-display font-bold mt-2">Franchises</div><div className="text-xs">← pulls network data</div></div>
              <div className="bg-warning text-ink p-4 border-2 border-warning"><UserCircleGear weight="fill" /><div className="font-display font-bold mt-2">WHS Consulting</div><div className="text-xs">← reads for expert review</div></div>
              <div className="bg-warning text-ink p-4 border-2 border-warning"><Lightning weight="fill" /><div className="font-display font-bold mt-2">Insurance Partner</div><div className="text-xs">← reads compliance score</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT DEEP DIVES */}
      {PRODUCTS.map((p, i) => (
        <section key={p.code} className={`border-b border-border ${i % 2 === 1 ? "bg-muted" : ""}`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3">
                <span className="font-mono label-eyebrow">/ {p.code}</span>
                <p.icon size={36} weight="duotone" />
              </div>
              <h3 className="font-display text-3xl lg:text-4xl font-black tracking-tighter mt-4">{p.name}</h3>
              <p className="mt-3 font-display text-xl">{p.tagline}</p>
              <div className="mt-4 bg-ink text-warning px-2 py-1 inline-block font-mono text-xs">{p.price}</div>
              <div className="mt-8">
                <Link to={p.to}><Button className="btn-sharp bg-ink text-white hover:bg-authority h-12 px-5" data-testid={`eco-deep-${p.code}`}>Learn more <ArrowRight className="ml-2" /></Button></Link>
              </div>
            </div>
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-background border border-border p-6">
                <div className="label-eyebrow">/ What it does</div>
                <div className="mt-2">{p.what}</div>
              </div>
              <div className="bg-background border border-border p-6">
                <div className="label-eyebrow">/ Who it's for</div>
                <div className="mt-2">{p.who}</div>
              </div>
              <div className="bg-background border border-border p-6">
                <div className="label-eyebrow">/ AI features</div>
                <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {p.ai.map((a) => <li key={a} className="flex gap-2"><CheckCircle weight="fill" className="shrink-0 text-ink" /><span className="text-sm">{a}</span></li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* DATA FLOW */}
      <section className="border-b border-border bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow text-warning mb-3">/ One event, six products</div>
          <h2 className="font-display text-3xl lg:text-5xl font-black tracking-tighter mb-12">When a subbie arrives on site.</h2>
          <div className="space-y-1">
            {DATA_FLOW.map((d, i) => (
              <div key={i} className="grid grid-cols-12 py-4 border-b border-white/10 gap-4 items-center">
                <div className="col-span-1 font-display font-black text-2xl text-warning">{String(i + 1).padStart(2, "0")}</div>
                <div className="col-span-8">{d.step}</div>
                <div className="col-span-3 text-right label-eyebrow text-warning">{d.product}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8"><h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-ink">Start with Core. Add what you need.<br />The ecosystem grows with you.</h2></div>
          <div className="lg:col-span-4 lg:text-right"><Link to="/register"><Button className="btn-sharp h-14 px-8 bg-ink text-white hover:bg-authority" data-testid="eco-final-cta">Start from A$399/mo + GST <ArrowRight className="ml-2" /></Button></Link></div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
