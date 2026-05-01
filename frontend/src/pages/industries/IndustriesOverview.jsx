import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { INDUSTRIES } from "@/data/industries.config";
import { Icon } from "@/components/industry/IndustryPage";

const OVERVIEW = [
  {
    key: "trades",
    problem: "446,000 trade businesses. Most managing WHS with paper and folders.",
    features: ["SWMS generation", "Voice-to-incident", "Licence tracking"],
    regs: ["WHS Regulations Reg 299", "State WHS Acts", "Safe Work Australia CoP"],
  },
  {
    key: "hospitality",
    problem: "2,818 injuries per 100,000 workers. Food safety and WHS — two systems, one business.",
    features: ["Temperature monitoring", "Food handler tracking", "HACCP plans"],
    regs: ["Food Standards Code", "Standard 3.2.2A", "State WHS Acts"],
  },
  {
    key: "transport",
    problem: "Everyone in the chain is accountable. Most can't prove it.",
    features: ["Fatigue management", "Vehicle inspections", "CoR Management Plan"],
    regs: ["Heavy Vehicle National Law", "Chain of Responsibility", "State WHS Acts"],
  },
  {
    key: "healthcare",
    problem: "Dual compliance obligations. New Aged Care Act 2024. Stronger enforcement.",
    features: ["AHPRA tracking", "Quality Standards compliance", "Clinical incident management"],
    regs: ["Aged Care Act 2024", "NDIS Practice Standards", "AHPRA", "State WHS Acts"],
  },
  {
    key: "retail",
    problem: "High casual turnover. Persistent induction and credential gaps.",
    features: ["Quick Induct", "Lone worker safety", "Multi-site management"],
    regs: ["State WHS Acts", "SafeWork industry guidance", "Retail awards"],
  },
];

export default function IndustriesOverview() {
  return (
    <>
      <MarketingNav />
      <main data-testid="industries-overview">
        {/* Hero */}
        <section className="bg-gradient-to-br from-[#0A1F44] to-[#0E2C5C] text-white py-24 lg:py-32">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95] max-w-4xl">
              WHS Compliance Built for Your Industry
            </h1>
            <p className="text-lg lg:text-xl text-white/80 mt-8 max-w-3xl leading-relaxed">
              Select your industry to see how SafeBase is configured for your specific compliance obligations, documents, credentials, and regulatory requirements.
            </p>
          </div>
        </section>

        {/* Five industry cards stacked */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-6">
            {OVERVIEW.map((row) => {
              const ind = INDUSTRIES[row.key];
              const c = ind.color;
              return (
                <Link
                  key={row.key}
                  to={`/industries/${ind.slug}`}
                  className="block group"
                  data-testid={`overview-card-${row.key}`}
                >
                  <div className={`bg-gradient-to-br ${c.from} ${c.to} text-white p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center hover:scale-[1.005] transition-transform`}>
                    <div className="lg:col-span-3 flex items-start gap-4">
                      <div className={`w-14 h-14 ${c.accent} text-ink flex items-center justify-center shrink-0`}>
                        <Icon name={ind.icon} size={28} weight="bold" />
                      </div>
                      <div>
                        <div className={`label-eyebrow ${c.accentText}`}>{ind.badge}</div>
                        <h2 className="font-display text-2xl lg:text-3xl font-black tracking-tight mt-1">{ind.name}</h2>
                      </div>
                    </div>
                    <div className="lg:col-span-5">
                      <p className="text-base text-white/80 leading-relaxed">{row.problem}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {row.features.map((f, i) => (
                          <span key={i} className="text-xs font-mono px-2 py-1 bg-white/10 border border-white/20">{f}</span>
                        ))}
                      </div>
                    </div>
                    <div className="lg:col-span-3 text-xs font-mono text-white/60 space-y-1">
                      {row.regs.map((r, i) => (<div key={i}>· {r}</div>))}
                    </div>
                    <div className="lg:col-span-1 flex justify-end">
                      <Button className={`btn-sharp ${c.accent} text-ink hover:opacity-90 uppercase tracking-widest font-bold`}>
                        See <ArrowRight className="ml-1" />
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Don't see your industry */}
        <section className="py-24 bg-muted/40">
          <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
            <h2 className="font-display text-3xl lg:text-4xl font-black tracking-tighter">Don't see your industry?</h2>
            <p className="text-lg text-muted-foreground mt-6 leading-relaxed">
              SafeBase's core WHS compliance features — incident management, risk register, worker credentials, compliance dashboard, and document generation — work for any Australian business with employees. Start a free trial and select the closest industry. You can configure the content libraries from there.
            </p>
            <Link to="/register">
              <Button size="lg" className="btn-sharp bg-ink text-white hover:bg-authority uppercase tracking-widest font-bold mt-8 h-14 px-8" data-testid="overview-cta">
                Start Free Trial <ArrowRight className="ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
