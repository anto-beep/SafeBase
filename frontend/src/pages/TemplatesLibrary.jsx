import { useState } from "react";
import { Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/Layout";
import { TEMPLATES } from "@/content/marketingData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, MagnifyingGlass, FileText, ArrowRight } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function TemplatesLibrary() {
  const [cat, setCat] = useState("All");
  const [query, setQuery] = useState("");

  const cats = ["All", ...new Set(TEMPLATES.map((t) => t.cat))];

  const filtered = TEMPLATES.filter((t) => {
    if (cat !== "All" && t.cat !== cat) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [t.title, t.desc, t.cat].some((v) => (v || "").toLowerCase().includes(q));
  });

  const download = (tpl) => {
    const blob = new Blob([tpl.body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tpl.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${tpl.title}`);
  };

  return (
    <MarketingLayout>
      <section className="bg-ink text-white py-20 px-6" data-testid="templates-hero">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-warning">/ Free templates</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">Free WHS templates.<br />No signup. No email.</h1>
          <p className="text-white/70 max-w-2xl mt-4">{TEMPLATES.length} field-tested Australian WHS templates — SWMS, toolbox talks, risk registers, inductions. Download, edit, use. When you're ready for automation, try SafeTradie free for 14 days.</p>
        </div>
      </section>

      <section className="py-8 px-6 bg-muted border-b border-border">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[220px] relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search templates..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 h-11 rounded-none border-ink" data-testid="template-search" />
          </div>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} data-testid={`template-cat-${c.toLowerCase()}`}
                className={`px-3 py-2 label-eyebrow ${cat === c ? "bg-ink text-warning" : "bg-background text-ink border border-ink hover:bg-ink hover:text-warning"}`}>{c}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <div key={t.id} className="border border-border bg-background p-5 flex flex-col" data-testid={`template-card-${t.id}`}>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-warning flex items-center justify-center"><FileText weight="duotone" size={20} /></div>
                  <span className="label-eyebrow text-muted-foreground">{t.size}</span>
                </div>
                <div className="font-display text-lg font-black tracking-tight mt-4">{t.title}</div>
                <p className="text-sm text-muted-foreground mt-2 flex-1">{t.desc}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="label-eyebrow">{t.cat}</span>
                  <Button onClick={() => download(t)} size="sm" className="btn-sharp bg-ink text-white hover:bg-authority" data-testid={`template-download-${t.id}`}>
                    <Download className="mr-1" />Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-warning">
        <div className="max-w-3xl mx-auto text-center">
          <div className="label-eyebrow">/ Or, skip the editing</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-2 text-ink">Generate a SWMS in 30 seconds.</h2>
          <p className="text-ink/80 mt-4">Instead of editing a template, tell SafeTradie your trade + job and Claude 4.5 writes it for you. 14 days free.</p>
          <Link to="/register"><Button className="btn-sharp mt-6 bg-ink text-white hover:bg-authority">Try it free <ArrowRight className="ml-1" /></Button></Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
