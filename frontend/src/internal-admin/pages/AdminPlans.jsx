import { useEffect, useState } from "react";
import axios from "axios";

/**
 * Internal-admin "View Plans" — read-only mirror of the public Pricing
 * page, pulled live from /api/pricing/catalogue (the single source of
 * truth). Super-admins use this to see exactly what customers see across
 * every industry without leaving the admin app.
 */
export default function AdminPlans() {
  const [cat, setCat] = useState(null);
  const [industry, setIndustry] = useState("trades");
  const [cycle, setCycle] = useState("monthly");

  useEffect(() => {
    const base = process.env.REACT_APP_BACKEND_URL;
    axios.get(`${base}/api/pricing/catalogue`).then((r) => setCat(r.data || null));
  }, []);

  if (!cat) return <div className="p-8 text-slate-400">Loading catalogue…</div>;
  const plans = cat.plans || {};
  const cfg = plans[industry];
  if (!cfg) return <div className="p-8 text-slate-400">No plan for {industry}.</div>;

  const tiers = [0, 1, 2, 3];
  const fmt = (n) => `A$${Number(n).toLocaleString("en-AU")}`;

  return (
    <div className="space-y-6 p-6" data-testid="admin-plans-page">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-red-500">/ Billing · View Plans (read-only)</div>
          <h1 className="font-display text-3xl font-black text-white mt-1">Customer-facing plans</h1>
          <p className="text-slate-400 text-sm mt-2">Mirrors what customers see at <code className="bg-slate-800 px-1.5 py-0.5 text-xs">/pricing</code>. Live from <code className="bg-slate-800 px-1.5 py-0.5 text-xs">GET /api/pricing/catalogue</code> · v{cat.version}.</p>
        </div>
        <div className="flex gap-2">
          {(cat.industries || []).map((slug) => (
            <button
              key={slug}
              onClick={() => setIndustry(slug)}
              className={`px-3 py-2 text-xs font-bold tracking-widest uppercase border ${industry === slug ? "border-white bg-white text-slate-900" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}
              data-testid={`admin-plan-industry-${slug}`}
            >
              {plans[slug]?.label || slug}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setCycle("monthly")} className={`px-4 py-2 text-xs font-bold tracking-widest uppercase border ${cycle === "monthly" ? "border-white bg-white text-slate-900" : "border-slate-700 text-slate-300"}`}>Monthly</button>
        <button onClick={() => setCycle("annual")} className={`px-4 py-2 text-xs font-bold tracking-widest uppercase border ${cycle === "annual" ? "border-white bg-white text-slate-900" : "border-slate-700 text-slate-300"}`}>Annual</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {tiers.map((i) => {
          const price = cycle === "monthly" ? cfg.monthly[i] : cfg.annual[i];
          const equiv = cfg.annual_equivalent_monthly?.[i];
          const saving = cfg.annual_saving?.[i];
          return (
            <div key={i} className={`bg-slate-900 border-2 p-5 flex flex-col ${i === 2 ? "border-yellow-400" : "border-slate-700"}`} data-testid={`admin-plan-card-${i}`}>
              {i === 2 && <div className="text-[10px] font-mono uppercase tracking-widest bg-yellow-400 text-slate-900 px-2 py-0.5 inline-block self-start mb-2">Most popular</div>}
              <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Tier {i + 1}</div>
              <div className="font-display text-xl font-black text-white mt-1">{cfg.plan_names[i]}</div>
              <div className="text-xs text-slate-400 mt-1">{cfg.user_limits[i]}</div>
              <div className="font-display text-3xl font-black text-white mt-4">{fmt(price)}<span className="text-base text-slate-400">/{cycle === "monthly" ? "mo" : "yr"} + GST</span></div>
              {cycle === "annual" && equiv && <div className="text-xs text-slate-400 mt-1">Equivalent to A${equiv}/mo</div>}
              {cycle === "annual" && saving && <div className="inline-block mt-2 text-[10px] font-bold bg-emerald-700 text-white px-2 py-0.5">Save A${Number(saving).toLocaleString("en-AU")} / yr</div>}
              <ul className="mt-4 space-y-1 text-xs text-slate-300">
                {(cfg.features?.[String(i + 1)] || []).map((f, idx) => (<li key={idx}>· {f}</li>))}
              </ul>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 break-all">
                <div>monthly slug: {cfg.slugs_monthly?.[i]}</div>
                <div>annual slug: {cfg.slugs_annual?.[i]}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 p-5 space-y-2">
        <div className="text-xs font-mono uppercase tracking-widest text-slate-500">ROI · {cfg.label}</div>
        <div className="text-lg font-bold text-white">{cfg.roi_headline}</div>
        <p className="text-sm text-slate-300 leading-relaxed">{cfg.roi_body}</p>
        {cfg.value_callout && <div className="mt-2 bg-slate-800 p-3 text-xs text-slate-200 border-l-2" style={{ borderColor: cfg.accent }}>{cfg.value_callout}</div>}
      </div>

      <div className="bg-slate-900 border border-slate-800 p-5">
        <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Risk anchor</div>
        <div className="text-sm text-slate-200">{cat.risk_anchors?.[industry]}</div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-5">
        <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">Add-ons (monthly · ex-GST)</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(cat.addons || {}).map(([k, v]) => (
            <div key={k} className="bg-slate-800 px-3 py-1.5 text-xs text-slate-200 border border-slate-700">{k} · A${v}/mo</div>
          ))}
        </div>
      </div>
    </div>
  );
}
