import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/Layout";
import { INDUSTRY_TEMPLATES } from "@/content/industryTemplates";
import { downloadAsWord } from "@/lib/downloadAsWord";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, MagnifyingGlass, FileText, ArrowRight } from "@phosphor-icons/react";
import { toast } from "sonner";

const INDUSTRIES = [
  { slug: "trades",      label: "Trades & Construction",  accent: "#FFCC00" },
  { slug: "hospitality", label: "Hospitality",            accent: "#F59E0B" },
  { slug: "transport",   label: "Transport & Logistics",  accent: "#0DC4B5" },
  { slug: "healthcare",  label: "Healthcare & Aged Care", accent: "#2196A6" },
  { slug: "retail",      label: "Retail",                 accent: "#A855F7" },
];

export default function TemplatesLibrary() {
  const [industry, setIndustry] = useState("trades");
  const [cat, setCat] = useState("All");
  const [query, setQuery] = useState("");

  const templates = INDUSTRY_TEMPLATES[industry] || [];
  const cats = useMemo(() => ["All", ...new Set(templates.map((t) => t.cat))], [templates]);

  const filtered = templates.filter((t) => {
    if (cat !== "All" && t.cat !== cat) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [t.title, t.desc, t.cat].some((v) => (v || "").toLowerCase().includes(q));
  });

  // Reset category when switching industry — categories differ across industries.
  const switchIndustry = (slug) => {
    setIndustry(slug);
    setCat("All");
  };

  const download = (tpl) => {
    downloadAsWord(`${tpl.id}.doc`, tpl.title, tpl.body);
    toast.success(`Downloaded ${tpl.title}.doc`);
  };

  const currentIndustry = INDUSTRIES.find((i) => i.slug === industry) || INDUSTRIES[0];

  return (
    <MarketingLayout>
      <section className="bg-ink text-white py-20 px-6" data-testid="templates-hero">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-warning">/ Free templates</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">Free WHS &amp; compliance templates.<br />No signup. No email.</h1>
          <p className="text-white/70 max-w-2xl mt-4">
            Field-tested Australian templates for trades, hospitality, transport, healthcare and retail.
            Every template downloads as a Microsoft Word document — edit and use immediately.
          </p>
        </div>
      </section>

      {/* Industry tabs */}
      <section className="bg-ink/95 border-t border-white/10 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-2 py-4" data-testid="templates-industry-tabs">
          {INDUSTRIES.map((i) => {
            const active = industry === i.slug;
            return (
              <button
                key={i.slug}
                onClick={() => switchIndustry(i.slug)}
                data-testid={`templates-industry-${i.slug}`}
                className={`btn-sharp px-4 py-2 text-sm font-mono uppercase tracking-widest border-2 transition-colors ${
                  active
                    ? "text-ink border-transparent"
                    : "border-white/30 text-white hover:bg-white/10"
                }`}
                style={active ? { backgroundColor: i.accent } : undefined}
              >
                {i.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="py-8 px-6 bg-muted border-b border-border">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[220px] relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={`Search ${currentIndustry.label.toLowerCase()} templates…`} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 h-11 rounded-none border-ink" data-testid="template-search" />
          </div>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} data-testid={`template-cat-${c.toLowerCase().replace(/\s+/g, '-')}`}
                className={`px-3 py-2 label-eyebrow ${cat === c ? "bg-ink text-warning" : "bg-background text-ink border border-ink hover:bg-ink hover:text-warning"}`}>{c}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow mb-6" style={{ color: currentIndustry.accent }}>
            / {filtered.length} {currentIndustry.label.toLowerCase()} template{filtered.length === 1 ? "" : "s"}
          </div>
          {filtered.length === 0 ? (
            <div className="border-2 border-dashed border-border p-12 text-center" data-testid="templates-empty">
              <FileText size={32} className="mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No templates match your search. Try clearing filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t) => (
                <div key={t.id} className="border border-border bg-background p-5 flex flex-col" data-testid={`template-card-${t.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: currentIndustry.accent }}>
                      <FileText weight="duotone" size={20} className="text-ink" />
                    </div>
                    <span className="label-eyebrow text-muted-foreground">{t.size}</span>
                  </div>
                  <div className="font-display text-lg font-black tracking-tight mt-4">{t.title}</div>
                  <p className="text-sm text-muted-foreground mt-2 flex-1">{t.desc}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="label-eyebrow">{t.cat}</span>
                    <Button onClick={() => download(t)} size="sm" className="btn-sharp bg-ink text-white hover:bg-authority" data-testid={`template-download-${t.id}`}>
                      <Download className="mr-1" />Download .doc
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-6" style={{ backgroundColor: currentIndustry.accent }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="label-eyebrow text-ink">/ Or, skip the editing</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-2 text-ink">Let SafeBase generate it for your business.</h2>
          <p className="text-ink/80 mt-4">Tell SafeBase your industry + business + workers, and it produces every document on this page — pre-filled, signed, expiry-tracked. 14 days free.</p>
          <Link to={`/register?industry=${industry}`}><Button className="btn-sharp mt-6 bg-ink text-white hover:bg-authority" data-testid="templates-cta">Try it free <ArrowRight className="ml-1" /></Button></Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
