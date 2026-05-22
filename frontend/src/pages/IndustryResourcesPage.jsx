import { useParams, Link, Navigate } from "react-router-dom";
import MarketingLayout from "@/components/marketing/Layout";
import { Button } from "@/components/ui/button";
import { INDUSTRY_RESOURCES } from "@/data/resources.config";
import { ArrowRight, FileText, Calculator, BookOpen, ShieldCheck, Sparkle } from "@phosphor-icons/react";

export default function IndustryResourcesPage() {
  const { industry } = useParams();
  const data = INDUSTRY_RESOURCES[industry];
  if (!data) return <Navigate to="/resources" replace />;

  return (
    <MarketingLayout>
      <section className="bg-ink text-white py-20 px-6" data-testid={`industry-resources-hero-${industry}`}>
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-warning">/ Resources · {data.label}</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">
            {data.label} compliance.
          </h1>
          <p className="text-white/70 mt-6 max-w-2xl">Articles, templates, calculators, and regulator links — every resource you need to run a compliant {data.label.toLowerCase()} business in Australia.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 text-xs uppercase tracking-widest">
            <div><div className="text-3xl font-black text-warning">{data.articles.length}</div><div className="text-white/60 mt-1">articles</div></div>
            <div><div className="text-3xl font-black text-warning">{data.templates.length}</div><div className="text-white/60 mt-1">templates</div></div>
            <div><div className="text-3xl font-black text-warning">{data.regulators.length}</div><div className="text-white/60 mt-1">regulators</div></div>
            <div><div className="text-3xl font-black text-warning">{data.calculators.length}</div><div className="text-white/60 mt-1">calculators</div></div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 lg:px-12" data-testid={`articles-${industry}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-8 border-b border-border pb-4">
            <BookOpen weight="bold" className="text-warning" size={22} />
            <h2 className="font-display text-3xl font-black tracking-tight">Articles</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.articles.map((a) => (
              <Link key={a.slug} to={`/resources/${industry}/${a.slug}`} className="block border border-border bg-background p-5 hover:border-ink transition-colors" data-testid={`article-${a.slug}`}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{a.read_minutes} min read</div>
                <h3 className="font-display text-lg font-black tracking-tight mt-2">{a.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{a.excerpt}</p>
                <div className="text-xs font-bold text-ink mt-3 flex items-center gap-1">Read article <ArrowRight size={12} /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 lg:px-12 bg-muted" data-testid={`templates-${industry}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-8 border-b border-border pb-4">
            <FileText weight="bold" className="text-warning" size={22} />
            <h2 className="font-display text-3xl font-black tracking-tight">Free templates</h2>
            <span className="text-xs text-muted-foreground">— email-gated downloads</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.templates.map((t) => (
              <div key={t.slug} className="bg-background border border-border p-4 flex items-center justify-between" data-testid={`template-${t.slug}`}>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.format}</div>
                  <div className="text-sm font-bold mt-1">{t.title}</div>
                </div>
                <Link to={`/templates?slug=${t.slug}`}><Button variant="outline" className="btn-sharp h-9 border-ink text-xs uppercase tracking-widest">Download</Button></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 lg:px-12" data-testid={`calculators-${industry}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-8 border-b border-border pb-4">
            <Calculator weight="bold" className="text-warning" size={22} />
            <h2 className="font-display text-3xl font-black tracking-tight">Calculators & tools</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.calculators.map((c) => (
              <div key={c.slug} className="bg-background border border-border p-5" data-testid={`calculator-${c.slug}`}>
                <Sparkle weight="fill" className="text-warning" size={18} />
                <h3 className="font-display text-base font-black tracking-tight mt-3">{c.title}</h3>
                <Link to={`/tools/${c.slug}`}><Button variant="outline" className="btn-sharp h-9 border-ink text-xs uppercase tracking-widest mt-3">Open tool</Button></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 lg:px-12 bg-muted" data-testid={`regulators-${industry}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-8 border-b border-border pb-4">
            <ShieldCheck weight="bold" className="text-warning" size={22} />
            <h2 className="font-display text-3xl font-black tracking-tight">Regulators</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.regulators.map((r) => (
              <a key={r.name} href={r.url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-background border border-border p-4 hover:border-ink" data-testid={`regulator-${r.name.toLowerCase().replace(/\s/g, '-')}`}>
                <span className="text-sm font-bold">{r.name}</span>
                <ArrowRight size={14} className="text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="font-display text-3xl lg:text-4xl font-black tracking-tighter">Run your {data.label.toLowerCase()} business compliantly.</h3>
          <p className="text-white/70 mt-4">Stop juggling spreadsheets and compliance binders. SafeBase handles it for you.</p>
          <div className="flex justify-center gap-3 mt-8">
            <Link to="/register"><Button className="btn-sharp h-12 bg-warning text-ink hover:bg-warning/90 uppercase tracking-widest" data-testid={`cta-trial-${industry}`}>Start Free Trial <ArrowRight className="ml-2" /></Button></Link>
            <Link to={`/industries/${industry}`}><Button variant="outline" className="btn-sharp h-12 border-white/40 text-white hover:bg-white hover:text-ink uppercase tracking-widest">See industry overview</Button></Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
