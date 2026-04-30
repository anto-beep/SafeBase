import { useState } from "react";
import { Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/Layout";
import { INTEGRATIONS } from "@/content/marketingData";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plug } from "@phosphor-icons/react";

export default function Integrations() {
  const cats = ["All", ...new Set(INTEGRATIONS.map((i) => i.cat))];
  const [cat, setCat] = useState("All");

  const filtered = cat === "All" ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.cat === cat);

  const badgeCls = (s) => ({
    Available: "bg-emerald-600 text-white",
    Beta: "bg-warning text-ink",
    Planned: "bg-muted text-muted-foreground",
  }[s] || "bg-muted");

  return (
    <MarketingLayout>
      <section className="bg-ink text-white py-20 px-6" data-testid="integrations-hero">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-warning">/ Integrations</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">Plays well with<br />the tools you already use.</h1>
          <p className="text-white/70 max-w-2xl mt-4">SafeTradie connects to accounting, job management, rostering, comms, and 800+ more apps via Zapier.</p>
        </div>
      </section>

      <section className="py-8 px-6 bg-muted border-b border-border">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} data-testid={`integration-cat-${c.toLowerCase()}`}
              className={`px-3 py-2 label-eyebrow ${cat === c ? "bg-ink text-warning" : "bg-background text-ink border border-ink hover:bg-ink hover:text-warning"}`}>{c}</button>
          ))}
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => (
            <div key={i.id} className="border border-border bg-background p-5" data-testid={`integration-card-${i.id}`}>
              <div className="flex items-start justify-between">
                <div className="text-4xl">{i.logo}</div>
                <span className={`${badgeCls(i.status)} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{i.status.toUpperCase()}</span>
              </div>
              <div className="font-display text-xl font-black tracking-tight mt-4">{i.name}</div>
              <div className="label-eyebrow text-muted-foreground mt-1">{i.cat}</div>
              <p className="text-sm text-muted-foreground mt-3">{i.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 bg-ink text-white">
        <div className="max-w-3xl mx-auto text-center">
          <Plug size={36} weight="duotone" className="mx-auto text-warning" />
          <div className="label-eyebrow text-warning mt-3">/ Don't see what you use?</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-2">Build it with our API.</h2>
          <p className="text-white/70 mt-4">Public REST API with webhooks + Zapier triggers. Any tool that speaks HTTP works with SafeTradie.</p>
          <Link to="/register"><Button className="btn-sharp mt-6 bg-warning text-ink hover:bg-warning/90">Get API access <ArrowRight className="ml-1" /></Button></Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
