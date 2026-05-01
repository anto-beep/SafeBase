import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, MagnifyingGlass, ShieldCheck, Star } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TRADES = ["", "plumbing", "electrical", "carpentry", "concreting", "roofing", "painting", "hvac", "tiling", "landscaping"];
const STATES = ["", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];

export default function TradecheckMarketplace() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ trade: "", state: "" });
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.trade) params.trade = filters.trade;
      if (filters.state) params.state = filters.state;
      const r = await axios.get(`${API_URL}/api/tradecheck/listings`, { params });
      setListings(r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters]);

  const filtered = listings.filter((l) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [l.business_name, l.trade, l.state, l.description].some((v) => (v || "").toLowerCase().includes(q));
  });

  return (
    <>
      <MarketingNav />
      <section className="bg-ink text-white py-20 px-6" data-testid="tradecheck-hero">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-warning">/ TradeCheck Marketplace</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">Verified contractors. No chasing certificates.</h1>
          <p className="text-white/70 max-w-2xl mt-4">Every business here has had their ABN, licences, insurance and safety history independently verified by SafeBase. Hire with confidence.</p>
        </div>
      </section>

      <section className="py-10 px-6 bg-muted border-b border-border">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[240px]">
            <div className="label-eyebrow mb-2">Search</div>
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Business name, location, keyword..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 h-11 rounded-none border-ink" data-testid="tradecheck-search" />
            </div>
          </div>
          <div className="w-full md:w-40">
            <div className="label-eyebrow mb-2">Trade</div>
            <Select value={filters.trade} onValueChange={(v) => setFilters({ ...filters, trade: v === "any" ? "" : v })}>
              <SelectTrigger className="h-11 rounded-none border-ink" data-testid="tradecheck-filter-trade"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent><SelectItem value="any">Any trade</SelectItem>{TRADES.filter(Boolean).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-32">
            <div className="label-eyebrow mb-2">State</div>
            <Select value={filters.state} onValueChange={(v) => setFilters({ ...filters, state: v === "any" ? "" : v })}>
              <SelectTrigger className="h-11 rounded-none border-ink" data-testid="tradecheck-filter-state"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent><SelectItem value="any">Any state</SelectItem>{STATES.filter(Boolean).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="label-eyebrow">{loading ? "Loading…" : `${filtered.length} verified businesses`}</div>
            <Link to="/dashboard/tradecheck" className="label-eyebrow text-ink hover:underline">List my business →</Link>
          </div>

          {filtered.length === 0 ? (
            <div className="border-2 border-dashed border-border p-16 text-center">
              <ShieldCheck size={48} weight="duotone" className="mx-auto opacity-40" />
              <div className="font-display text-xl font-bold mt-4">No verified listings yet</div>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Be the first. SafeBase customers who complete verification get premium placement for free during our launch.</p>
              <Link to="/dashboard/tradecheck"><Button className="btn-sharp mt-6 bg-ink text-white" data-testid="tradecheck-cta-list">List my business</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((l) => (
                <div key={l.listing_id} className="border border-border bg-background p-5" data-testid={`tradecheck-card-${l.listing_id}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-display text-lg font-black tracking-tight">{l.business_name}</div>
                      <div className="text-xs text-muted-foreground">{l.trade} · {l.state}</div>
                    </div>
                    <span className="bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold tracking-widest flex items-center gap-1"><CheckCircle size={12} weight="fill" />VERIFIED</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{l.description || "—"}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <span>{l.years_trading}y trading</span><span>•</span>
                    <span>{l.team_size} team</span>
                    {l.rating > 0 && <><span>•</span><span className="flex items-center gap-1"><Star size={12} weight="fill" className="text-warning" />{l.rating}</span></>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <MarketingFooter />
    </>
  );
}
