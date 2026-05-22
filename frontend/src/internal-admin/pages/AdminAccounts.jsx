/**
 * Accounts list — searchable, filterable, paginated.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import adminApi from "../lib/adminApi";
import { MagnifyingGlass, ArrowRight } from "@phosphor-icons/react";

const INDUSTRIES = ["", "trades", "hospitality", "transport", "healthcare", "retail"];
const STATUSES = ["", "trial", "active", "cancelled", "suspended"];

const INDUSTRY_DOT = {
  trades: "#FFCC00",
  hospitality: "#7C1D3F",
  transport: "#0DC4B5",
  healthcare: "#2196A6",
  retail: "#A855F7",
};

export default function AdminAccounts() {
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (industry) params.set("industry", industry);
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    adminApi.get(`/internal-admin/accounts?${params}`).then((r) => {
      if (alive) setData(r.data);
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [q, industry, status, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data.total || 0) / pageSize)), [data.total]);

  return (
    <div data-testid="admin-accounts-page">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="label-eyebrow text-red-500">/ Customers</div>
          <h1 className="font-display text-3xl font-black tracking-tighter mt-1">All accounts</h1>
          <p className="text-sm text-slate-500 mt-1">{data.total} total · showing page {page} of {totalPages}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 mb-4 p-4 flex flex-wrap gap-3 items-center" data-testid="admin-accounts-filters">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] border border-slate-300 px-2">
          <MagnifyingGlass size={14} className="text-slate-400" />
          <input
            type="text" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }}
            placeholder="Search business, email, ABN, account ID"
            data-testid="admin-accounts-search"
            className="flex-1 py-2 outline-none text-sm"
          />
        </div>
        <select
          value={industry} onChange={(e) => { setPage(1); setIndustry(e.target.value); }}
          data-testid="admin-accounts-industry"
          className="border border-slate-300 px-2 py-2 text-sm bg-white"
        >
          {INDUSTRIES.map(i => <option key={i || "all"} value={i}>{i ? i.charAt(0).toUpperCase() + i.slice(1) : "All industries"}</option>)}
        </select>
        <select
          value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          data-testid="admin-accounts-status"
          className="border border-slate-300 px-2 py-2 text-sm bg-white"
        >
          {STATUSES.map(s => <option key={s || "all"} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All statuses"}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm" data-testid="admin-accounts-table">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-slate-500">
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">MRR (mock)</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500" data-testid="admin-accounts-loading">Loading…</td></tr>}
            {!loading && data.rows.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No accounts match.</td></tr>}
            {!loading && data.rows.map((r) => (
              <tr key={r.account_id} className="hover:bg-slate-50" data-testid={`admin-account-row-${r.account_id}`}>
                <td className="px-4 py-3">
                  <div className="font-bold">{r.business_name}</div>
                  <div className="text-[11px] text-slate-500">{r.owner_email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: INDUSTRY_DOT[r.industry] || "#94a3b8" }} />
                    {r.industry}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.plan} · {r.cycle}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest ${STATUS_TONE[r.status] || "bg-slate-100 text-slate-700"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">A${r.mrr_aud?.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{(r.created_at || "").slice(0, 10)}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/internal-admin/accounts/${r.account_id}`} data-testid={`admin-account-open-${r.account_id}`} className="text-xs font-mono uppercase tracking-widest text-red-600 hover:text-red-700 inline-flex items-center gap-1">
                    Open <ArrowRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 border border-slate-300 disabled:opacity-40" data-testid="admin-accounts-prev">Previous</button>
          <span className="font-mono text-slate-500">Page {page} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-slate-300 disabled:opacity-40" data-testid="admin-accounts-next">Next</button>
        </div>
      )}
    </div>
  );
}

const STATUS_TONE = {
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  suspended: "bg-slate-200 text-slate-700",
};
