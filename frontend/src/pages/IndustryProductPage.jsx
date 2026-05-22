import { Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, FileText, GraduationCap, Plug, ChartBar, ShieldCheck, Quotes, BookOpen, Sparkle } from "@phosphor-icons/react";
import { INDUSTRY_PAGE_CONFIG } from "@/data/industry-pages.config";
import { INDUSTRY_RESOURCES } from "@/data/resources.config";
import IndustryDashboardPreview from "@/components/industry/IndustryDashboardPreview";
import ProductTour from "@/components/marketing/ProductTour";

const TESTIMONIALS = {
  trades: [
    { quote: "We replaced a $700/yr SWMS template subscription and HazardCo with SafeBase. Generates better SWMS in under a minute.", name: "Liam · Electrical contractor (NSW)" },
    { quote: "First SafeWork audit since switching to SafeBase. Pulled the audit pack in 3 minutes. Auditor commented on how organised it was.", name: "Tony · Concreting + formwork (VIC)" },
    { quote: "I used to dread renewals. Now everything's on the dashboard with red/amber/green so I just clear the red items.", name: "Pria · Plumbing co-owner (QLD)" },
  ],
  hospitality: [
    { quote: "Council inspector said our HACCP plan was the best they'd seen this year. We literally generated it in SafeBase that week.", name: "Sam · Cafe owner (Melbourne)" },
    { quote: "Two of my casuals walked out without an RSA last year. SafeBase wouldn't even let them clock in for shifts where alcohol was served.", name: "Anika · Pub manager (NSW)" },
    { quote: "Allergen disclosure is the thing that keeps me up at night. SafeBase has it locked down across my three venues.", name: "Marco · Restaurant group (VIC)" },
  ],
  transport: [
    { quote: "First NHVR audit since switching. Pulled the CoR pack in minutes. Auditor signed it off same day.", name: "Dave · Owner-operator (QLD)" },
    { quote: "I run scheduling. SafeBase flags fatigue breaches before I push the trip. Used to find them at audit time.", name: "Karen · Scheduler, regional fleet" },
    { quote: "We chose SafeBase over a $1,200/mo enterprise platform. Same compliance result. Different price.", name: "Owner · Mid-sized fleet (NSW)" },
  ],
  healthcare: [
    { quote: "ACQSC audit went from a month of binders to a 2-hour evidence review. Genuinely changed how we operate.", name: "Director · Aged care provider (VIC)" },
    { quote: "AHPRA monitoring caught a lapsed registration before our agency staff worked a shift. That alone paid for the year.", name: "Clinical manager · NDIS provider (NSW)" },
    { quote: "Manual handling injuries dropped 60% the year we rolled out the SafeBase clinical SWPs.", name: "RN · Multi-site practice (QLD)" },
  ],
  retail: [
    { quote: "I induct casuals in 3 minutes now. Used to take half an hour. The induction is BETTER not worse.", name: "Manager · Convenience store chain" },
    { quote: "Lone worker check-ins were a spreadsheet. Now they're automated. The day my night-shift didn't check in, escalation worked.", name: "Owner · Suburban liquor store (VIC)" },
    { quote: "Slip-and-fall claim came in. Pulled the cleaning log instantly from SafeBase. Claim withdrawn.", name: "Group manager · Multi-store retail" },
  ],
};

export default function IndustryProductPage({ industry }) {
  const cfg = INDUSTRY_PAGE_CONFIG[industry];
  if (!cfg) return null;
  const resources = INDUSTRY_RESOURCES[industry];
  const testimonials = TESTIMONIALS[industry] || [];

  return (
    <MarketingLayout>
      {/* 1. HERO */}
      <section className="bg-ink text-white py-20 px-6" data-testid={`industry-hero-${industry}`} style={{ borderBottom: `6px solid ${cfg.accent}` }}>
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow" style={{ color: cfg.accent }}>/ {cfg.hero.tagline}</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-4">
            <span className="mr-3">{cfg.icon}</span>{cfg.hero.headline}
          </h1>
          <p className="text-lg text-white/70 mt-6 max-w-3xl">{cfg.hero.sub}</p>
          <div className="flex gap-3 mt-8">
            <Link to="/register"><Button className="btn-sharp h-12 bg-warning text-ink hover:bg-warning/90 uppercase tracking-widest" data-testid={`industry-trial-${industry}`}>Start Free Trial <ArrowRight className="ml-2" /></Button></Link>
            <Link to="/contact?type=demo"><Button variant="outline" className="btn-sharp h-12 border-white/40 text-white hover:bg-white hover:text-ink uppercase tracking-widest">Book a Demo</Button></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 border-t border-white/20 pt-8">
            {cfg.hero.stats.map((s, i) => (
              <div key={i}>
                <div className="text-3xl font-display font-black" style={{ color: cfg.accent }}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/60 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. PROBLEMS */}
      <IndustryDashboardPreview slug={industry} accent={cfg.accent} />
      <section className="py-16 px-6 lg:px-12" data-testid={`industry-problems-${industry}`}>
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-muted-foreground">/ The problem</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-3">If this sounds familiar.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {cfg.problems.map((p, i) => (
              <div key={i} className="border border-border bg-background p-6">
                <div className="text-3xl font-display font-black text-red-600">0{i+1}</div>
                <h3 className="font-display text-xl font-black tracking-tight mt-3">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-3">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. ALL FEATURES (replaces Features page) */}
      <section className="py-16 px-6 lg:px-12 bg-muted" data-testid={`industry-features-${industry}`}>
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-muted-foreground">/ Everything included</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-3">All features.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {Object.entries(cfg.features).map(([cat, items]) => (
              <div key={cat} className="bg-background border border-border p-5">
                <h3 className="font-display text-lg font-black tracking-tight border-b border-border pb-2">{cat}</h3>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {items.map((it, i) => <li key={i} className="flex items-start gap-1.5"><Check size={14} weight="bold" className="text-emerald-600 shrink-0 mt-0.5" /><span>{it}</span></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. DOCUMENTS GENERATED */}
      <section className="py-16 px-6 lg:px-12" data-testid={`industry-documents-${industry}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2"><FileText weight="bold" className="text-warning" size={22} /><h2 className="font-display text-4xl font-black tracking-tighter">AI-generated documents.</h2></div>
          <p className="text-muted-foreground mt-3 max-w-2xl">Every document is generated from scratch by Claude Sonnet 4.5 based on your inputs. No static templates. Each gets a unique reference and lives in your Document Library.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-8">
            {cfg.documents.map((d, i) => (
              <div key={i} className="border border-border bg-background p-4 flex items-center gap-3" data-testid={`doc-${i}`}>
                <FileText size={18} className="text-warning shrink-0" />
                <span className="text-sm font-bold">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. ACADEMY */}
      <section className="py-16 px-6 lg:px-12 bg-muted" data-testid={`industry-academy-${industry}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2"><GraduationCap weight="bold" className="text-warning" size={22} /><h2 className="font-display text-4xl font-black tracking-tighter">SafeBase Academy.</h2></div>
          <p className="text-muted-foreground mt-3 max-w-2xl">Industry-specific microlearning + full courses with assessment + certificate. Completions sync to your compliance score and audit pack automatically.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {cfg.academy_modules.map((m, i) => (
              <div key={i} className="bg-background border border-border p-4">
                <Sparkle size={14} className="text-warning" />
                <div className="text-sm font-bold mt-2">{m}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">Full course · cert on completion</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. ADD-ONS */}
      <section className="py-16 px-6 lg:px-12" data-testid={`industry-addons-${industry}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2"><Plug weight="bold" className="text-warning" size={22} /><h2 className="font-display text-4xl font-black tracking-tighter">Apps & add-ons.</h2></div>
          <p className="text-muted-foreground mt-3 max-w-2xl">Activate or deactivate any time. Many included in mid-tier plans.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {cfg.addons_highlight.map((slug) => (
              <div key={slug} className="bg-background border border-border p-5" data-testid={`addon-highlight-${slug}`}>
                <div className="text-sm font-bold capitalize">{slug.replace(/_/g, " ")}</div>
                <div className="text-xs text-muted-foreground mt-1">See marketplace inside the app for current pricing.</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. DASHBOARD PREVIEW */}
      <section className="py-16 px-6 lg:px-12 bg-ink text-white" data-testid={`industry-dashboard-preview-${industry}`}>
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow" style={{ color: cfg.accent }}>/ Dashboard preview</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-3">Industry-specific dashboard.</h2>
          <p className="text-white/70 mt-3 max-w-2xl">Every widget on your dashboard is built for {cfg.label.toLowerCase()} — not generic checklists adapted from another industry.</p>
          <div className="mt-10 border border-white/20 bg-ink/40 p-6 lg:p-10" style={{ borderTop: `4px solid ${cfg.accent}` }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cfg.hero.stats.map((s, i) => (
                <div key={i} className="bg-ink border border-white/10 p-4">
                  <ChartBar size={14} style={{ color: cfg.accent }} />
                  <div className="font-display text-2xl font-black mt-2">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. COMPLIANCE OBLIGATIONS */}
      <section className="py-16 px-6 lg:px-12" data-testid={`industry-obligations-${industry}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2"><ShieldCheck weight="bold" className="text-warning" size={22} /><h2 className="font-display text-4xl font-black tracking-tighter">Compliance obligations.</h2></div>
          <p className="text-muted-foreground mt-3 max-w-2xl">{cfg.label} businesses operate under multiple Australian regulators. SafeBase addresses each one.</p>
          <div className="mt-8 border border-border bg-background overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted">
                <th className="text-left p-4 label-eyebrow">Regulator / law</th>
                <th className="text-left p-4 label-eyebrow">What it covers</th>
              </tr></thead>
              <tbody>
                {cfg.obligations.map((o, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="p-4 font-bold">{o.regulator}</td>
                    <td className="p-4 text-muted-foreground">{o.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 9. PRICING */}
      <section className="py-16 px-6 lg:px-12 bg-muted" data-testid={`industry-pricing-${industry}`}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="label-eyebrow text-muted-foreground">/ Pricing</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-3">{cfg.pricing_anchor}</h2>
          <p className="text-muted-foreground mt-4">14-day free trial. No card required. Cancel any time.</p>
          <div className="flex justify-center gap-3 mt-8">
            <Link to={`/pricing?industry=${industry}`}><Button variant="outline" className="btn-sharp h-12 border-ink uppercase tracking-widest" data-testid={`industry-pricing-link-${industry}`}>See plans</Button></Link>
            <Link to="/register"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority uppercase tracking-widest">Start Free Trial <ArrowRight className="ml-2" /></Button></Link>
          </div>
        </div>
      </section>

      {/* 10. RESOURCES PREVIEW */}
      {resources && (
        <section className="py-16 px-6 lg:px-12" data-testid={`industry-resources-preview-${industry}`}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2"><BookOpen weight="bold" className="text-warning" size={22} /><h2 className="font-display text-4xl font-black tracking-tighter">Resources.</h2></div>
            <p className="text-muted-foreground mt-3">Free articles, templates, calculators — built for {cfg.label.toLowerCase()}.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {resources.articles.slice(0, 3).map((a) => (
                <Link key={a.slug} to={`/resources/${industry}/${a.slug}`} className="block border border-border bg-background p-5 hover:border-ink">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{a.read_minutes} min read</div>
                  <h3 className="font-display text-lg font-black tracking-tight mt-2">{a.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{a.excerpt}</p>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link to={`/resources/${industry}`}><Button variant="outline" className="btn-sharp border-ink uppercase tracking-widest">All {cfg.label} resources <ArrowRight className="ml-2" size={14} /></Button></Link>
            </div>
          </div>
        </section>
      )}

      {/* 11. TESTIMONIALS — dark theme with industry-accent quote mark for contrast */}
      <section className="py-20 px-6 lg:px-12 bg-ink text-white relative overflow-hidden" data-testid={`industry-testimonials-${industry}`}>
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="max-w-6xl mx-auto relative">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
            <div>
              <div className="label-eyebrow" style={{ color: cfg.accent }}>/ What operators say</div>
              <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mt-3">Real words from real {cfg.label.toLowerCase()} operators.</h2>
            </div>
            <p className="text-sm text-white/60 max-w-md">Quotes from active SafeBase customers. Names changed where privacy was requested.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <figure key={i} className="relative bg-white text-ink p-8 flex flex-col" style={{ borderTop: `6px solid ${cfg.accent}` }}>
                <Quotes size={36} weight="fill" className="absolute -top-1 left-6" style={{ color: cfg.accent }} />
                <blockquote className="font-display text-lg leading-snug font-bold mt-5 text-ink">{t.quote}</blockquote>
                <figcaption className="mt-6 pt-4 border-t border-ink/10">
                  <div className="font-display font-black text-sm text-ink">{t.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest mt-1" style={{ color: cfg.accent === "#FFCC00" ? "#1a1a1a" : cfg.accent }}>Verified SafeBase customer</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 11b. PRODUCT TOUR — real captured screenshots, configured for this industry */}
      <ProductTour industry={industry} />

      {/* 12. FINAL CTA */}
      <section className="bg-ink text-white py-16 px-6" data-testid={`industry-final-cta-${industry}`} style={{ borderTop: `6px solid ${cfg.accent}` }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">{cfg.final_cta}</h2>
          <p className="text-white/70 mt-4">14-day free trial. We configure your industry. You walk in audit-ready.</p>
          <div className="flex justify-center gap-3 mt-8">
            <Link to="/register"><Button className="btn-sharp h-12 bg-warning text-ink hover:bg-warning/90 uppercase tracking-widest">Start Free Trial <ArrowRight className="ml-2" /></Button></Link>
            <Link to="/contact?type=demo"><Button variant="outline" className="btn-sharp h-12 border-white/40 text-white hover:bg-white hover:text-ink uppercase tracking-widest">Book a Demo</Button></Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
