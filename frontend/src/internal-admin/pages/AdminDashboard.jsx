/**
 * Admin Dashboard — KPI cards + activity feed + alerts.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import adminApi from "../lib/adminApi";
import { TrendUp, TrendDown, Users, Buildings, CurrencyDollar, Briefcase, Pulse, Lifebuoy } from "@phosphor-icons/react";

function KPI({ label, value, unit, trend, icon: Icon, testid }) {
  const TrendIcon = trend > 0 ? TrendUp : trend < 0 ? TrendDown : null;
  return (
    <div className="bg-white border border-slate-200 p-5" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</div>
        {Icon && <Icon size={16} weight="duotone" className="text-slate-400" />}
      </div>
      <div className="mt-2 font-display text-3xl font-black tracking-tighter leading-none">
        {unit === "$" && "A$"}{typeof value === "number" ? value.toLocaleString() : value}{unit === "%" && "%"}
      </div>
      {TrendIcon && (
        <div className={`mt-1 inline-flex items-center gap-1 text-xs ${trend > 0 ? "text-emerald-600" : "text-red-600"}`}>
          <TrendIcon size={12} weight="bold" /> {Math.abs(trend)}% vs prev 30d
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [kpi, setKpi] = useState(null);
  const [feed, setFeed] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [k, f, a] = await Promise.all([
          adminApi.get("/internal-admin/dashboard/kpi"),
          adminApi.get("/internal-admin/dashboard/activity-feed?limit=20"),
          adminApi.get("/internal-admin/dashboard/alerts"),
        ]);
        if (!alive) return;
        setKpi(k.data);
        setFeed(f.data.events || []);
        setAlerts(a.data);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="text-sm text-slate-500" data-testid="admin-dashboard-loading">Loading dashboard…</div>;

  return (
    <div data-testid="admin-dashboard">
      <div className="mb-6">
        <div className="label-eyebrow text-red-500">/ Operations</div>
        <h1 className="font-display text-3xl font-black tracking-tighter mt-1">SafeBase platform health</h1>
        <p className="text-sm text-slate-500 mt-1">Live snapshot of accounts, revenue, trials, and alerts. <span className="text-amber-600 font-mono text-xs">MRR figures are MOCKED until Stripe is wired.</span></p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KPI label="Active accounts" value={kpi?.total_active_accounts ?? 0} trend={kpi?.total_active_accounts_trend_pct} icon={Buildings} testid="kpi-accounts" />
        <KPI label="Total users" value={kpi?.total_users ?? 0} icon={Users} testid="kpi-users" />
        <KPI label="MRR (mocked)" value={kpi?.mrr_aud ?? 0} unit="$" icon={CurrencyDollar} testid="kpi-mrr" />
        <KPI label="Active trials" value={kpi?.active_trials ?? 0} icon={Briefcase} testid="kpi-trials" />
        <KPI label="Trial → paid" value={kpi?.trial_to_paid_pct ?? 0} unit="%" icon={Lifebuoy} testid="kpi-conversion" />
        <KPI label="System health" value={(kpi?.system_uptime_pct ?? 100)} unit="%" icon={Pulse} testid="kpi-health" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <section className="lg:col-span-2 bg-white border border-slate-200" data-testid="admin-activity-feed">
          <header className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display font-black text-sm tracking-tight">Activity feed</h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Last 20</span>
          </header>
          <ul className="divide-y divide-slate-100">
            {feed.length === 0 && <li className="px-5 py-4 text-sm text-slate-500">No recent activity</li>}
            {feed.map((e, i) => (
              <li key={i} className="px-5 py-3 text-sm flex items-center gap-3" data-testid={`admin-feed-event-${i}`}>
                <span className={`text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 ${EVENT_BADGE[e.type] || "bg-slate-100 text-slate-700"}`}>
                  {e.type}
                </span>
                <span className="flex-1 truncate">{e.label}</span>
                <span className="text-[10px] font-mono text-slate-400">{(e.ts || "").slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white border border-slate-200" data-testid="admin-alerts-panel">
          <header className="px-5 py-3 border-b border-slate-200">
            <h2 className="font-display font-black text-sm tracking-tight">Alerts</h2>
          </header>
          <div className="p-5 space-y-3 text-sm">
            <AlertRow value={alerts?.trials_expiring_48h ?? 0} label="Trials expiring in 48h" to="/internal-admin/trials" />
            <AlertRow value={alerts?.inactive_accounts_30d ?? 0} label="Inactive accounts (30d+)" to="/internal-admin/accounts" />
            <AlertRow value={alerts?.low_compliance_score_count ?? 0} label="Compliance score < 50" />
            <AlertRow value={alerts?.failed_payments_7d ?? 0} label="Failed payments (7d)" tone="mocked" />
          </div>
        </section>
      </div>
    </div>
  );
}

const EVENT_BADGE = {
  signup: "bg-emerald-100 text-emerald-700",
  demo_request: "bg-amber-100 text-amber-700",
  password_reset: "bg-slate-200 text-slate-700",
};

function AlertRow({ value, label, to, tone }) {
  const Wrapper = to ? Link : "div";
  return (
    <Wrapper {...(to ? { to } : {})} className={`flex items-center justify-between border border-slate-200 px-3 py-2 ${to ? "hover:bg-slate-50" : ""}`}>
      <span className="text-sm">{label}</span>
      <span className={`font-mono font-bold ${value > 0 ? "text-red-600" : "text-slate-400"}`}>{value}{tone === "mocked" && <span className="ml-1 text-[9px] text-amber-600">MOCKED</span>}</span>
    </Wrapper>
  );
}
