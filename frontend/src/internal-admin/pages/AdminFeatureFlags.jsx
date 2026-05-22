/**
 * Admin Feature Flags — Phase 2.
 * Lists registered platform flags with global on/off toggles. Each row shows
 * the override count (per-account overrides) and writes immediately on click,
 * with audit log capture handled server-side.
 *
 * RBAC: viewing requires any authed admin; toggling requires ops_lead+.
 */
import { useEffect, useState } from "react";
import adminApi from "../lib/adminApi";
import { useAdminAuth } from "../lib/AdminAuthContext";
import { toast } from "sonner";

function fmtDate(s) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("en-AU"); } catch { return s; }
}

const ROLE_RANK = {
  super_admin: 100, ops_lead: 80, support_agent: 60,
  billing_analyst: 50, content_manager: 40, viewer: 10,
};
const canEdit = (role) => (ROLE_RANK[role] || 0) >= 80;

export default function AdminFeatureFlags() {
  const { admin } = useAdminAuth();
  const editable = canEdit(admin?.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});

  const fetchRows = () => {
    setLoading(true);
    adminApi.get("/internal-admin/feature-flags")
      .then((r) => setRows(r.data.rows || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchRows(); }, []);

  const toggle = async (key, currentlyEnabled) => {
    if (!editable) {
      toast.error("Your role does not have permission to toggle flags.");
      return;
    }
    setBusy((s) => ({ ...s, [key]: true }));
    try {
      const r = await adminApi.patch(`/internal-admin/feature-flags/${encodeURIComponent(key)}`, { enabled: !currentlyEnabled });
      setRows((rows) => rows.map((row) => row.key === key
        ? { ...row, enabled: r.data.enabled, updated_at: new Date().toISOString() }
        : row));
      toast.success(`${key} ${r.data.enabled ? "enabled" : "disabled"} globally`);
    } catch {
      toast.error(`Failed to toggle ${key}`);
    } finally {
      setBusy((s) => ({ ...s, [key]: false }));
    }
  };

  return (
    <div data-testid="admin-flags-page">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="label-eyebrow text-red-500">/ Platform</div>
          <h1 className="font-display text-3xl font-black tracking-tighter mt-1">Feature flags</h1>
          <p className="text-sm text-slate-500 mt-1">Global on/off switches for platform capabilities. Per-account overrides take precedence over the global state.</p>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest bg-slate-900 text-white px-2 py-1" data-testid="admin-flags-role-pill">
          {editable ? "EDITOR" : "READ-ONLY"}
        </div>
      </div>

      <div className="bg-white border border-slate-200 overflow-x-auto" data-testid="admin-flags-table">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <Th>Flag</Th><Th>Description</Th><Th>Overrides</Th><Th>Updated</Th><Th>Global</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No flags registered.</td></tr>}
            {!loading && rows.map((f) => (
              <tr key={f.key} className="hover:bg-slate-50" data-testid={`admin-flag-row-${f.key}`}>
                <Td>
                  <div className="font-bold">{f.label}</div>
                  <div className="text-[11px] font-mono text-slate-500">{f.key}</div>
                </Td>
                <Td className="text-sm text-slate-600">{f.description}</Td>
                <Td className="text-sm">
                  {f.account_overrides > 0
                    ? <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-violet-100 text-violet-800">{f.account_overrides} override{f.account_overrides === 1 ? "" : "s"}</span>
                    : <span className="text-slate-400 text-xs">none</span>}
                </Td>
                <Td className="text-xs font-mono text-slate-500">{fmtDate(f.updated_at)}</Td>
                <Td>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={f.enabled}
                    disabled={!editable || busy[f.key]}
                    onClick={() => toggle(f.key, f.enabled)}
                    data-testid={`admin-flag-toggle-${f.key}`}
                    className={`relative w-12 h-6 transition-colors ${f.enabled ? "bg-emerald-500" : "bg-slate-300"} ${editable ? "hover:opacity-90" : "opacity-60 cursor-not-allowed"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white transition-transform ${f.enabled ? "translate-x-6" : ""}`} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!editable && (
        <p className="text-xs text-slate-500 mt-4" data-testid="admin-flags-readonly-note">
          Your role ({admin?.role?.replace(/_/g, " ")}) is read-only on feature flags. Ops Lead or Super Admin can toggle them.
        </p>
      )}
    </div>
  );
}

function Th({ children }) { return <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-slate-500">{children}</th>; }
function Td({ children, className = "" }) { return <td className={`px-4 py-3 ${className}`}>{children}</td>; }
