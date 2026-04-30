import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/Layout";
import { BLOG_POSTS, BLOG_CATEGORIES } from "@/content/blogPosts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MagnifyingGlass, ArrowRight, Clock } from "@phosphor-icons/react";

export default function Blog() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");

  const filtered = useMemo(() => BLOG_POSTS.filter((p) => {
    if (cat !== "All" && p.category !== cat) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [p.title, p.excerpt, p.author, p.category].some((v) => (v || "").toLowerCase().includes(q));
  }), [query, cat]);

  return (
    <MarketingLayout>
      <section className="bg-ink text-white py-20 px-6" data-testid="blog-hero">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-warning">/ Blog & insights</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">WHS, written for Aussie tradies.</h1>
          <p className="text-white/70 max-w-2xl mt-4">Plain-English deep-dives on SWMS, incidents, fines, licences, mental health, and culture. Written by consultants who've worked on sites you've been on.</p>
        </div>
      </section>

      <section className="py-8 px-6 bg-muted border-b border-border">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[220px] relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search articles..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 h-11 rounded-none border-ink" data-testid="blog-search" />
          </div>
          <div className="flex flex-wrap gap-2">
            {["All", ...BLOG_CATEGORIES].map((c) => (
              <button key={c} onClick={() => setCat(c)} data-testid={`blog-cat-${c.toLowerCase().replace(/\s+/g, '-')}`}
                className={`px-3 py-2 label-eyebrow ${cat === c ? "bg-ink text-warning" : "bg-background text-ink border border-ink hover:bg-ink hover:text-warning"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow mb-6">{filtered.length} article{filtered.length === 1 ? "" : "s"}</div>
          {filtered.length === 0 ? (
            <div className="border-2 border-dashed border-border p-16 text-center text-muted-foreground">No articles match your search.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <Link to={`/blog/${p.slug}`} key={p.slug} className="group border border-border bg-background p-5 hover:border-ink hover:shadow-lg transition-all" data-testid={`blog-card-${p.slug}`}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-warning text-ink px-2 py-0.5 font-bold tracking-widest">{p.category.toUpperCase()}</span>
                    <span className="text-muted-foreground flex items-center gap-1"><Clock size={12} />{p.read_mins} min</span>
                  </div>
                  <div className="font-display text-xl font-black tracking-tight mt-3 group-hover:text-ink">{p.title}</div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.excerpt}</p>
                  <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                    <span>{p.author}</span>
                    <span className="flex items-center gap-1 text-ink group-hover:translate-x-1 transition-transform">Read <ArrowRight size={12} /></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-6 bg-ink text-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="label-eyebrow text-warning">/ Free trial</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-2">Get the tools behind the advice.</h2>
          <p className="text-white/70 mt-4">SafeTradie ships AI SWMS, incident register, licence tracking and 20+ other modules covering everything these articles talk about.</p>
          <Link to="/register"><Button className="btn-sharp mt-6 bg-warning text-ink hover:bg-warning/90">Start 14-day free trial <ArrowRight className="ml-1" /></Button></Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
