/**
 * Account Detail — 6 tabs: Overview / Users / Billing / Compliance / Activity / Notes.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import adminApi from "../lib/adminApi";
import { ArrowLeft, Plus, Clock, Note, ShieldStar, Stack, IdentificationBadge, ChartLine } from "@phosphor-icons/react";

const TABS = [
  { id: "overview",   label: "Overview",  icon: IdentificationBadge },
  { id: "users",      label: "Users",     icon: Stack },
  { id: "billing",    label: "Billing",   icon: ShieldStar },
  { id: "compliance", label: "Compliance", icon: ChartLine },
  { id: "activity",   label: "Activity",  icon: Clock },
  { id: "notes",      label: "Internal notes", icon: Note },
];

export default function AdminAccountDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState("overview");
  const [account, setAccount] = useState(null);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [extending, setExtending] = useState(false);
  const [extendDays, setExtendDays] = useState(14);
  const [extendReason, setExtendReason] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteTags, setNoteTags] = useState("");

  const loadAll = async () => {
    try {
      const r = await adminApi.get(`/internal-admin/accounts/${id}`);
      setAccount(r.data);
      const [u, a, n] = await Promise.all([
        adminApi.get(`/internal-admin/accounts/${id}/users`),
        adminApi.get(`/internal-admin/accounts/${id}/activity-log`),
        adminApi.get(`/internal-admin/accounts/${id}/notes`),
      ]);
      setUsers(u.data.users || []);
      setActivity(a.data.events || []);
      setNotes(n.data.notes || []);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load account");
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [id]);

  const extendTrial = async () => {
    setExtending(true);
    try {
      await adminApi.post(`/internal-admin/accounts/${id}/extend-trial`, { days: parseInt(extendDays, 10) || 14, reason: extendReason });
      setExtendReason("");
      await loadAll();
    } finally { setExtending(false); }
  };

  const addNote = async () => {
    if (!noteBody.trim()) return;
    const tags = noteTags.split(",").map(t => t.trim()).filter(Boolean);
    await adminApi.post(`/internal-admin/accounts/${id}/add-note`, { body: noteBody, tags });
    setNoteBody(""); setNoteTags("");
    await loadAll();
  };

  if (error) return <div className="text-red-600 text-sm" data-testid="admin-detail-error">{error}</div>;
  if (!account) return <div className="text-sm text-slate-500" data-testid="admin-detail-loading">Loading…</div>;

  const o = account.overview;
  const b = account.billing;

  return (
    <div data-testid="admin-account-detail">
      <Link to="/internal-admin/accounts" data-testid="admin-detail-back" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft size={12} /> Back to accounts
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-200 pb-6 mb-6">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tighter">{o.business_name}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2 py-0.5 bg-slate-900 text-white font-mono uppercase tracking-widest">{o.industry}</span>
            <span className="px-2 py-0.5 bg-slate-100 font-mono uppercase tracking-widest">{b.tier_name} · {b.cycle}</span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-mono uppercase tracking-widest">{o.subscription_status}</span>
            <span className="font-mono text-slate-500">{id}</span>
          </div>
        </div>
      </div>

      <nav className="border-b border-slate-200 mb-6 flex flex-wrap gap-1" data-testid="admin-detail-tabs">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id} onClick={() => setTab(t.id)}
              data-testid={`admin-detail-tab-${t.id}`}
              className={`px-4 py-2 text-sm font-mono uppercase tracking-widest border-b-2 inline-flex items-center gap-2 ${active ? "border-red-500 text-red-600" : "border-transparent text-slate-500 hover:text-slate-900"}`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="admin-tab-overview">
          <section className="lg:col-span-2 bg-white border border-slate-200 p-5">
            <div className="label-eyebrow text-slate-500 mb-3">/ Account details</div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Item label="Owner name" value={o.owner_name} />
              <Item label="Owner email" value={o.owner_email} />
              <Item label="Phone" value={o.owner_phone || "—"} />
              <Item label="ABN" value={o.abn || "—"} />
              <Item label="State" value={o.state || "—"} />
              <Item label="Industry" value={o.industry} />
              <Item label="Trial started" value={fmtDate(o.trial_started_at)} />
              <Item label="Trial ends" value={fmtDate(o.trial_ends_at)} />
              <Item label="Created" value={fmtDate(o.created_at)} />
              <Item label="Last login" value={fmtDate(o.last_login_at)} />
            </dl>
          </section>

          <section className="bg-white border border-slate-200 p-5">
            <div className="label-eyebrow text-slate-500 mb-3">/ Quick actions</div>
            <div className="space-y-3" data-testid="admin-quick-actions">
              <div className="border border-slate-200 p-3">
                <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Extend trial</div>
                <div className="flex gap-2 items-center">
                  <input type="number" min={1} max={30} value={extendDays} onChange={(e) => setExtendDays(e.target.value)} data-testid="admin-extend-days" className="w-16 border border-slate-300 px-2 py-1.5 text-sm" />
                  <span className="text-xs text-slate-500">days</span>
                  <button onClick={extendTrial} disabled={extending} data-testid="admin-extend-submit" className="ml-auto px-3 py-1.5 bg-slate-900 text-white text-xs font-mono uppercase tracking-widest disabled:opacity-40">
                    {extending ? "…" : "Extend"}
                  </button>
                </div>
                <input type="text" value={extendReason} onChange={(e) => setExtendReason(e.target.value)} placeholder="Reason (optional)" data-testid="admin-extend-reason" className="mt-2 w-full border border-slate-300 px-2 py-1.5 text-xs" />
              </div>
              <div className="border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 font-mono uppercase tracking-widest">
                Credit / refund · plan change <span className="block normal-case mt-1 tracking-normal text-amber-900">Phase 2 — Stripe wire-up</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "users" && (
        <section className="bg-white border border-slate-200 overflow-x-auto" data-testid="admin-tab-users">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-[10px] font-mono uppercase tracking-widest text-slate-500">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Last login</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.user_id}>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(u.last_login_at)}</td>
                  <td className="px-4 py-3">{u.is_active ? "Active" : <span className="text-slate-400">Disabled</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "billing" && (
        <section className="bg-white border border-slate-200 p-5" data-testid="admin-tab-billing">
          <div className="flex items-center justify-between mb-4">
            <div className="label-eyebrow text-slate-500">/ Subscription</div>
            <span className="text-[10px] font-mono uppercase tracking-widest bg-amber-100 text-amber-800 px-2 py-0.5" data-testid="admin-billing-mocked">MOCKED — Stripe Phase 2</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Item label="Stripe customer ID" value={b.stripe_customer_id} />
            <Item label="Subscription ID" value={b.subscription_id} />
            <Item label="Plan" value={`${b.tier_name} · ${b.cycle}`} />
            <Item label="Status" value={b.status} />
            <Item label="Monthly" value={`A$${b.monthly_aud} + GST`} />
            <Item label="Annual" value={`A$${b.annual_aud} + GST`} />
            <Item label="MRR" value={`A$${b.mrr_aud}`} />
            <Item label="Current period end" value={fmtDate(b.current_period_end)} />
            <Item label="Payment method" value={b.payment_method} />
            <Item label="Failed payments (30d)" value={b.failed_payments_30d} />
          </dl>
        </section>
      )}

      {tab === "compliance" && (
        <section className="bg-white border border-slate-200 p-5 text-sm text-slate-500" data-testid="admin-tab-compliance">
          Compliance score breakdown · incidents · expiring credentials · open regulator cases — wired up in Phase 2.
        </section>
      )}

      {tab === "activity" && (
        <section className="bg-white border border-slate-200" data-testid="admin-tab-activity">
          <ul className="divide-y divide-slate-100">
            {activity.length === 0 && <li className="px-5 py-4 text-sm text-slate-500">No recent activity</li>}
            {activity.map((e, i) => (
              <li key={i} className="px-5 py-3 text-sm flex items-center gap-3">
                <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-slate-100">{e.type}</span>
                <span className="flex-1">{e.label}</span>
                <span className="text-[10px] font-mono text-slate-400">{fmtDate(e.ts)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "notes" && (
        <section className="bg-white border border-slate-200 p-5" data-testid="admin-tab-notes">
          <div className="label-eyebrow text-slate-500 mb-3">/ Internal notes</div>
          <div className="border border-slate-200 p-3 mb-4">
            <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Write a note (markdown supported)…" data-testid="admin-note-body" className="w-full border border-slate-200 px-2 py-2 text-sm min-h-[80px]" />
            <div className="flex gap-2 mt-2">
              <input type="text" value={noteTags} onChange={(e) => setNoteTags(e.target.value)} placeholder="tags (comma separated)" data-testid="admin-note-tags" className="flex-1 border border-slate-200 px-2 py-1.5 text-xs" />
              <button onClick={addNote} disabled={!noteBody.trim()} data-testid="admin-note-submit" className="px-3 py-1.5 bg-slate-900 text-white text-xs font-mono uppercase tracking-widest disabled:opacity-40 inline-flex items-center gap-1">
                <Plus size={12} /> Add
              </button>
            </div>
          </div>
          <ul className="space-y-3" data-testid="admin-notes-list">
            {notes.length === 0 && <li className="text-sm text-slate-500">No notes yet.</li>}
            {notes.map(n => (
              <li key={n.note_id} className="border border-slate-200 p-3">
                <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                <div className="mt-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  <span>{n.author_admin_email}</span>
                  <span>·</span>
                  <span>{fmtDate(n.created_at)}</span>
                  {(n.tags || []).map(t => <span key={t} className="px-1.5 py-0.5 bg-slate-100">#{t}</span>)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Item({ label, value }) {
  return (<><dt className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</dt><dd className="text-sm">{value ?? "—"}</dd></>);
}

function fmtDate(s) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return s; }
}
