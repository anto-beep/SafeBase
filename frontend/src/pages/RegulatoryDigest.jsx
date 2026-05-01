/**
 * RegulatoryDigest — "What changed this month" feed per industry.
 * Pulls from public GET /api/regulatory-digest and renders cards with
 * severity, regulator, source link and deep-link to the industry page.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowRight, Warning, Info } from "@phosphor-icons/react";

const SEV = {
  high: { bg: "#C7405B", fg: "white", icon: Warning },
  medium: { bg: "#E6A70A", fg: "#1a1300", icon: Info },
};

const INDUSTRIES = [
  { slug: "all", label: "All industries" },
  { slug: "trades", label: "Trades and Construction" },
  { slug: "retail", label: "Retail" },
  { slug: "hospitality", label: "Hospitality" },
  { slug: "transport", label: "Transport and Logistics" },
  { slug: "healthcare", label: "Healthcare and Aged Care" },
];

export default function RegulatoryDigest() {
  const [industry, setIndustry] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API = process.env.REACT_APP_BACKEND_URL;
    setLoading(true);
    const qs = industry === "all" ? "" : `?industry=${industry}`;
    axios.get(`${API}/api/regulatory-digest${qs}`).then(({ data }) => {
      setItems(data.items || []);
    }).finally(() => setLoading(false));
  }, [industry]);

  return (
    <div className="bg-background">
      <MarketingNav />
      <section className="bg-ink text-white py-20 px-6" data-testid="digest-hero">
        <div className="max-w-5xl mx-auto">
          <div className="label-eyebrow text-warning">/ Regulatory Digest</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">What Changed This Month.</h1>
          <p className="text-white/70 mt-4 max-w-3xl">AHPRA notices, NHVR bulletins, ACQSC guidance, FSANZ amendments, SafeWork codes — curated and industry-tagged. If a change affects your operations, SafeBase account holders are alerted automatically via the Compliance Inbox.</p>
        </div>
      </section>
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs uppercase text-muted-foreground tracking-widest">Industry</span>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="w-[240px] rounded-none border-ink h-10" data-testid="digest-filter"><SelectValue /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i.slug} value={i.slug}>{i.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="ml-auto text-xs text-muted-foreground">Updated weekly</div>
          </div>
          {loading && <div className="text-center text-muted-foreground py-12" data-testid="digest-loading">Loading…</div>}
          {!loading && items.length === 0 && <div className="text-center text-muted-foreground py-12" data-testid="digest-empty">No items for this filter.</div>}
          <div className="space-y-4" data-testid="digest-list">
            {items.map(i => {
              const sev = SEV[i.severity] || SEV.medium;
              const Icon = sev.icon;
              return (
                <div key={`${i.posted}-${i.title}`} className="border-2 border-ink bg-background p-6" data-testid={`digest-item-${i.industry}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] px-2 py-1 font-bold uppercase tracking-widest flex items-center gap-1" style={{ background: sev.bg, color: sev.fg }}><Icon size={12} weight="fill" /> {i.severity}</span>
                    <span className="text-[10px] px-2 py-0.5 font-bold uppercase border border-black/20">{i.industry}</span>
                    <span className="text-[10px] px-2 py-0.5 font-mono bg-ink text-warning">{i.regulator}</span>
                    <span className="ml-auto text-xs text-muted-foreground font-mono">{new Date(i.posted).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-display font-black text-xl mt-3">{i.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{i.body}</p>
                  <div className="mt-4 flex gap-3 flex-wrap">
                    {i.source_url && <a href={i.source_url} target="_blank" rel="noreferrer" className="text-xs underline" data-testid="digest-source-link">View regulator source →</a>}
                    <Link to={`/industries/${i.industry}`} className="text-xs underline text-muted-foreground hover:text-ink">See how SafeBase covers {i.industry}</Link>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="max-w-3xl mx-auto text-center mt-16 border-2 border-warning bg-warning/20 p-8">
            <h2 className="font-display text-3xl font-black tracking-tighter">Get these alerts where they matter.</h2>
            <p className="text-sm mt-3 text-ink/80">SafeBase account holders see regulatory changes that affect them in the Compliance Inbox — automatically tagged to their industry, with suggested actions.</p>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <Link to="/plan-rightsizer"><Button className="btn-sharp bg-ink text-white hover:bg-authority" data-testid="digest-rightsizer-cta">Find your right-size plan <ArrowRight className="ml-1" /></Button></Link>
              <Link to="/register"><Button variant="outline" className="btn-sharp border-ink" data-testid="digest-trial-cta">Start 14-day free trial</Button></Link>
            </div>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
