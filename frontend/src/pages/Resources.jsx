import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, BookOpen, FileText, Lightbulb, ShieldCheck, Books } from "@phosphor-icons/react";

const ARTICLES = [
  { tag: "GUIDE", title: "What WorkSafe actually wants in your SWMS", body: "A line-by-line breakdown of the 8 elements WHS Reg 299 requires, with examples from passed audits.", read: "8 min" },
  { tag: "EXPLAINER", title: "PCBU vs employer — why the language matters", body: "Why the WHS Act renamed the duty-holder, and how it changes liability for sole traders, partnerships and corporates.", read: "5 min" },
  { tag: "TEMPLATE", title: "Free toolbox talk: working at heights", body: "Print-ready 5-minute toolbox talk covering edge protection, harness inspection and rescue planning.", read: "Download" },
  { tag: "CASE STUDY", title: "How a 12-person roofing crew passed audit first time", body: "What they did differently — and which 3 SafeBase features they leaned on most.", read: "6 min" },
  { tag: "REGULATORY", title: "Psychosocial hazards: the new compliance frontier", body: "Code of Practice on psychosocial hazards is now in force across most states. Here's the practical implication for trade SMEs.", read: "9 min" },
  { tag: "GUIDE", title: "Notifiable incidents: the 24-hour clock", body: "What counts as notifiable, who you call, and what to write down before you do.", read: "7 min" },
];

const CATEGORIES = [
  { icon: BookOpen, t: "WHS Fundamentals", c: "12 articles" },
  { icon: FileText, t: "Document Templates", c: "24 templates" },
  { icon: Lightbulb, t: "Industry Insights", c: "18 articles" },
  { icon: ShieldCheck, t: "Audit & Compliance", c: "15 articles" },
];

export default function Resources() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <div className="label-eyebrow mb-3">/ Resources & Knowledge</div>
          <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter">WHS, decoded.</h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">Plain-English guides, free templates, regulatory updates and case studies — the WHS knowledge base for Australian trade SMEs.</p>
        </div>
      </section>

      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
          {CATEGORIES.map((c) => (
            <div key={c.t} className="bg-background p-6 hover:bg-warning transition-colors cursor-pointer">
              <c.icon size={32} weight="duotone" />
              <div className="font-display font-bold mt-3">{c.t}</div>
              <div className="label-eyebrow mt-1">{c.c}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Latest articles</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">From the field.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
            {ARTICLES.map((a, i) => (
              <article key={i} className="bg-background p-6 hover:bg-muted cursor-pointer transition-colors group" data-testid={`article-${i}`}>
                <span className="px-2 py-1 bg-ink text-warning text-[10px] font-bold tracking-widest">{a.tag}</span>
                <h3 className="font-display text-xl font-bold mt-4 leading-tight group-hover:underline">{a.title}</h3>
                <p className="text-sm text-muted-foreground mt-3">{a.body}</p>
                <div className="mt-6 flex items-center justify-between text-sm">
                  <span className="label-eyebrow">{a.read}</span>
                  <ArrowRight size={14} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink text-white border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <div className="label-eyebrow text-warning mb-3">/ Newsletter</div>
            <h2 className="font-display text-4xl font-black tracking-tighter">The Toolbox — monthly WHS digest.</h2>
            <p className="text-white/70 mt-3">Regulatory updates, free templates and one practical tip — straight to your inbox.</p>
          </div>
          <div className="lg:col-span-4">
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="your@email.com" className="flex-1 h-12 px-3 bg-transparent border-2 border-white/20 text-white placeholder:text-white/40" data-testid="newsletter-email" />
              <Button type="submit" className="btn-sharp h-12 bg-warning text-ink hover:bg-white" data-testid="newsletter-submit">Subscribe</Button>
            </form>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
