/**
 * Simple list pages: Trials, Demos, Users, Audit log.
 * Each is intentionally lean — full power lives in the Account Detail view.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import adminApi from "../lib/adminApi";

function PageHeader({ eyebrow, title, sub }) {
  return (
    <div className="mb-6">
      <div className="label-eyebrow text-red-500">/ {eyebrow}</div>
      <h1 className="font-display text-3xl font-black tracking-tighter mt-1">{title}</h1>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function Tbl({ children, testid }) {
  return (
    <div className="bg-white border border-slate-200 overflow-x-auto" data-testid={testid}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Th({ children }) { return <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-slate-500">{children}</th>; }
function Td({ children, className = "" }) { return <td className={`px-4 py-3 ${className}`}>{children}</td>; }

function fmtDate(s) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-AU"); } catch { return s; }
}

// ──────────────────────── Trials ────────────────────────
export function AdminTrials() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    adminApi.get("/internal-admin/trials").then(r => setRows(r.data.rows || [])).finally(() => setLoading(false));
  }, []);
  return (
    <div data-testid="admin-trials-page">
      <PageHeader eyebrow="Customers" title="Trial accounts" sub={`${rows.length} active trials · sorted by days remaining`} />
      <Tbl testid="admin-trials-table">
        <thead className="bg-slate-50 border-b border-slate-200"><tr><Th>Business</Th><Th>Industry</Th><Th>Trial start</Th><Th>Trial end</Th><Th>Days left</Th><Th></Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No active trials.</td></tr>}
          {rows.map(r => (
            <tr key={r.account_id} className="hover:bg-slate-50" data-testid={`admin-trial-row-${r.account_id}`}>
              <Td><div className="font-bold">{r.business_name}</div><div className="text-[11px] text-slate-500">{r.owner_email}</div></Td>
              <Td>{r.industry}</Td>
              <Td className="text-xs text-slate-500">{fmtDate(r.trial_started_at)}</Td>
              <Td className="text-xs text-slate-500">{fmtDate(r.trial_ends_at)}</Td>
              <Td><span className={`font-mono ${r.days_remaining != null && r.days_remaining < 3 ? "text-red-600 font-bold" : ""}`}>{r.days_remaining ?? "—"}</span></Td>
              <Td><Link to={`/internal-admin/accounts/${r.account_id}`} className="text-xs text-red-600 font-mono uppercase tracking-widest" data-testid={`admin-trial-open-${r.account_id}`}>Open</Link></Td>
            </tr>
          ))}
        </tbody>
      </Tbl>
    </div>
  );
}

// ──────────────────────── Demos ────────────────────────
const DEMO_STATUSES = ["New", "Contacted", "Booked", "Completed", "No-Show", "Converted"];
export function AdminDemos() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const refresh = () => { setLoading(true); adminApi.get("/internal-admin/demos").then(r => setRows(r.data.rows || [])).finally(() => setLoading(false)); };
  useEffect(() => { refresh(); }, []);
  const setStatus = async (request_id, status) => {
    await adminApi.patch(`/internal-admin/demos/${request_id}`, { status });
    refresh();
  };
  return (
    <div data-testid="admin-demos-page">
      <PageHeader eyebrow="Customers" title="Demo requests" sub={`${rows.length} total`} />
      <Tbl testid="admin-demos-table">
        <thead className="bg-slate-50 border-b border-slate-200"><tr><Th>Name</Th><Th>Business</Th><Th>Email</Th><Th>Industry</Th><Th>Submitted</Th><Th>Status</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No demo requests yet.</td></tr>}
          {rows.map(r => (
            <tr key={r.request_id} className="hover:bg-slate-50" data-testid={`admin-demo-row-${r.request_id}`}>
              <Td>{r.name}</Td>
              <Td>{r.business}</Td>
              <Td className="font-mono text-xs">{r.email}</Td>
              <Td>{r.industry}</Td>
              <Td className="text-xs text-slate-500">{fmtDate(r.created_at)}</Td>
              <Td>
                <select value={r.status || "New"} onChange={(e) => setStatus(r.request_id, e.target.value)} data-testid={`admin-demo-status-${r.request_id}`} className="border border-slate-300 px-2 py-1 text-xs bg-white">
                  {DEMO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Td>
            </tr>
          ))}
        </tbody>
      </Tbl>
    </div>
  );
}

// ──────────────────────── Users ────────────────────────
export function AdminUsers() {
  const [q, setQ] = useState("");
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const params = new URLSearchParams(); if (q) params.set("q", q);
    setLoading(true);
    adminApi.get(`/internal-admin/users?${params}&page_size=50`).then(r => setData(r.data)).finally(() => setLoading(false));
  }, [q]);
  return (
    <div data-testid="admin-users-page">
      <PageHeader eyebrow="Customers" title="All users" sub={`${data.total} users across all accounts`} />
      <div className="mb-4">
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, user ID" data-testid="admin-users-search" className="w-full max-w-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <Tbl testid="admin-users-table">
        <thead className="bg-slate-50 border-b border-slate-200"><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Industry</Th><Th>Company</Th><Th>Last login</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
          {!loading && data.rows.map(u => (
            <tr key={u.user_id} className="hover:bg-slate-50">
              <Td>{u.name}</Td>
              <Td className="font-mono text-xs">{u.email}</Td>
              <Td>{u.role}</Td>
              <Td>{u.industry || "—"}</Td>
              <Td>{u.company_name || "—"}</Td>
              <Td className="text-xs text-slate-500">{fmtDate(u.last_login_at)}</Td>
            </tr>
          ))}
        </tbody>
      </Tbl>
    </div>
  );
}

// ──────────────────────── Audit logs ────────────────────────
export function AdminAuditLogs() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(); if (action) params.set("action", action);
    setLoading(true);
    adminApi.get(`/internal-admin/audit-logs?${params}&page_size=100`).then(r => setRows(r.data.rows || [])).finally(() => setLoading(false));
  }, [action]);
  return (
    <div data-testid="admin-audit-page">
      <PageHeader eyebrow="System" title="Internal audit log" sub="Append-only · every admin action recorded" />
      <div className="mb-4 flex gap-3 items-center">
        <select value={action} onChange={(e) => setAction(e.target.value)} data-testid="admin-audit-filter-action" className="border border-slate-300 px-2 py-2 text-sm bg-white">
          <option value="">All actions</option>
          <option value="login">login</option>
          <option value="login_2fa">login_2fa</option>
          <option value="logout">logout</option>
          <option value="enroll_2fa_start">enroll_2fa_start</option>
          <option value="enroll_2fa_complete">enroll_2fa_complete</option>
          <option value="extend_trial">extend_trial</option>
          <option value="apply_credit">apply_credit</option>
          <option value="add_note">add_note</option>
          <option value="update_demo_status">update_demo_status</option>
        </select>
      </div>
      <Tbl testid="admin-audit-table">
        <thead className="bg-slate-50 border-b border-slate-200"><tr><Th>Time</Th><Th>Admin</Th><Th>Action</Th><Th>Target</Th><Th>IP</Th><Th>Details</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No audit events yet.</td></tr>}
          {rows.map(r => (
            <tr key={r.log_id} className="hover:bg-slate-50">
              <Td className="text-xs text-slate-500 font-mono whitespace-nowrap">{fmtDate(r.created_at)}</Td>
              <Td className="text-xs">{r.admin_email}</Td>
              <Td><span className="px-2 py-0.5 bg-slate-100 text-[10px] font-mono uppercase tracking-widest">{r.action}</span></Td>
              <Td className="text-xs">{r.target_type ? `${r.target_type}:${r.target_id || ""}` : "—"}</Td>
              <Td className="text-xs font-mono text-slate-500">{r.ip_address || "—"}</Td>
              <Td className="text-xs text-slate-500"><code>{JSON.stringify(r.details || {})}</code></Td>
            </tr>
          ))}
        </tbody>
      </Tbl>
    </div>
  );
}
