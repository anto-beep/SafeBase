/**
 * Admin Subscriptions — Phase 2.
 * Lists every owner account with their subscription state, plan, billing
 * cycle, MRR, payment method, current period end, failed-payments-30d.
 * All data is *mocked Stripe* per Iter49 spec — flagged in the UI.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import adminApi from "../lib/adminApi";

function StatusPill({ status }) {
  const m = {
    active:   "bg-emerald-100 text-emerald-800",
    trial:    "bg-amber-100 text-amber-800",
    trialing: "bg-amber-100 text-amber-800",
    past_due: "bg-red-100 text-red-800",
    canceled: "bg-slate-200 text-slate-700",
    paused:   "bg-slate-200 text-slate-700",
  }[status] || "bg-slate-100 text-slate-700";
  return <span className={`px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase ${m}`}>{status || "—"}</span>;
}

function fmtAud(n) {
  if (n == null) return "—";
  return `A$${Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(s) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-AU"); } catch { return s; }
}

export default function AdminSubscriptions() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [cycle, setCycle] = useState("");
  const [industry, setIndustry] = useState("");

  const fetchRows = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (cycle) params.set("cycle", cycle);
    if (industry) params.set("industry", industry);
    adminApi.get(`/internal-admin/subscriptions?${params.toString()}`)
      .then((r) => { setRows(r.data.rows || []); setSummary(r.data.summary || null); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, []);

  const onSearch = (e) => { e.preventDefault(); fetchRows(); };

  const visiblePageMrr = useMemo(() => rows
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + (r.mrr_aud || 0), 0), [rows]);

  return (
    <div data-testid="admin-subscriptions-page">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="label-eyebrow text-red-500">/ Billing</div>
          <h1 className="font-display text-3xl font-black tracking-tighter mt-1">Subscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">Mocked Stripe billing across every owner account. Search and filter the active subscription base.</p>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest bg-amber-100 text-amber-800 px-2 py-1" data-testid="admin-subs-mocked-flag">
          MOCKED STRIPE DATA
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6" data-testid="admin-subs-summary">
        <Tile label="Active paid" value={summary?.active_paid ?? "—"} sub="this page" />
        <Tile label="Active trials" value={summary?.trial_total ?? "—"} sub="this page" />
        <Tile label="MRR (active, this page)" value={fmtAud(visiblePageMrr)} sub="sum of MRR for active subs" />
      </div>

      {/* Filter bar */}
      <form onSubmit={onSearch} className="bg-white border border-slate-200 p-3 flex flex-wrap gap-2 items-center mb-3" data-testid="admin-subs-filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search business or email…" className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-slate-300" data-testid="admin-subs-search" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm border border-slate-300 px-3 py-2" data-testid="admin-subs-status-filter">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="past_due">Past due</option>
          <option value="canceled">Canceled</option>
        </select>
        <select value={cycle} onChange={(e) => setCycle(e.target.value)} className="text-sm border border-slate-300 px-3 py-2" data-testid="admin-subs-cycle-filter">
          <option value="">All cycles</option>
          <option value="monthly">Monthly</option>
          <option value="annual">Annual</option>
        </select>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="text-sm border border-slate-300 px-3 py-2" data-testid="admin-subs-industry-filter">
          <option value="">All industries</option>
          <option value="trades">Trades</option>
          <option value="hospitality">Hospitality</option>
          <option value="transport">Transport</option>
          <option value="healthcare">Healthcare</option>
          <option value="retail">Retail</option>
        </select>
        <button type="submit" className="text-xs font-bold uppercase tracking-widest px-3 py-2 bg-slate-900 text-white" data-testid="admin-subs-apply">Apply</button>
      </form>

      {/* Table */}
      <div className="bg-white border border-slate-200 overflow-x-auto" data-testid="admin-subs-table">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <Th>Business</Th><Th>Industry</Th><Th>Plan</Th><Th>Cycle</Th>
              <Th>Status</Th><Th>MRR</Th><Th>Period end</Th><Th>Payment</Th><Th>Failed 30d</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">No subscriptions match your filters.</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={r.account_id} className="hover:bg-slate-50" data-testid={`admin-subs-row-${r.account_id}`}>
                <Td>
                  <Link to={`/internal-admin/accounts/${r.account_id}`} className="font-bold hover:underline">{r.business_name}</Link>
                  <div className="text-[11px] font-mono text-slate-500">{r.owner_email}</div>
                </Td>
                <Td><span className="text-xs uppercase tracking-widest">{r.industry}</span></Td>
                <Td>{r.plan}</Td>
                <Td className="text-xs uppercase">{r.cycle}</Td>
                <Td><StatusPill status={r.status} /></Td>
                <Td>{fmtAud(r.mrr_aud)}</Td>
                <Td>{fmtDate(r.current_period_end)}</Td>
                <Td className="font-mono text-xs">{r.payment_method}</Td>
                <Td className={r.failed_payments_30d > 0 ? "text-red-600 font-bold" : ""}>{r.failed_payments_30d || 0}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }) { return <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-slate-500">{children}</th>; }
function Td({ children, className = "" }) { return <td className={`px-4 py-3 ${className}`}>{children}</td>; }

function Tile({ label, value, sub }) {
  return (
    <div className="bg-white border border-slate-200 p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</div>
      <div className="font-display font-black text-2xl mt-1">{value}</div>
      {sub && <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
