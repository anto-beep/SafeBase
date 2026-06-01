/**
 * Phase 3 universal chart components (C2 Credentials, C3 Training, C4 Risk,
 * C5 Documents, C6 Audits, C7 Compliance Score). All charts share the same
 * `period / siteId / compareTo / customFrom / customTo` props and render
 * using Recharts. Empty states handled consistently with "No data for this
 * period."
 */
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

// ---------- helpers ----------
function buildParams(period, compareTo, siteId, customFrom, customTo, extra = {}) {
  const out = { period, compare_to: compareTo, site_id: siteId || "all", ...extra };
  if (period === "custom") {
    if (customFrom) out.from = customFrom;
    if (customTo) out.to = customTo;
  }
  return out;
}
function useEndpoint(url, params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams(params).toString();
    api.get(`${url}?${sp}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [url, JSON.stringify(params)]); // eslint-disable-line
  return { data, loading };
}

function ChartFrame({ title, subtitle, children, testid, empty }) {
  return (
    <div className="bg-background border border-border p-4" data-testid={testid}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="label-eyebrow text-[10px]">{title}</div>
          {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {empty ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground italic">No data for this period.</div>
      ) : children}
    </div>
  );
}

const STATUS_COL = { current: "#10B981", expiring_30: "#F59E0B", expiring_90: "#EAB308", expired: "#DC2626" };
const RAG = (pct) => pct == null ? "#E5E7EB" : pct >= 95 ? "#10B981" : pct >= 85 ? "#F59E0B" : "#DC2626";
const RATING_COL = { Low: "#10B981", Medium: "#F59E0B", High: "#F97316", Extreme: "#7F1D1D" };

// ============================================================
// C2 — CREDENTIALS
// ============================================================
export function CredentialStatusOverview(p) {
  const { data, loading } = useEndpoint("/analytics/credentials", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "status_overview" }));
  const rows = data?.data || [];
  const total = rows.reduce((a, b) => a + (b.count || 0), 0);
  return (
    <ChartFrame title="C2.1 · Credential status overview" subtitle={`${total} total credentials`} testid="chart-cred-status" empty={!loading && total === 0}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={rows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} tick={{ fill: "#6B7280" }} allowDecimals={false} />
          <YAxis dataKey="status" type="category" fontSize={10} width={130} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count">{rows.map((r, i) => <Cell key={i} fill={STATUS_COL[r.key]} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function CredentialsByType(p) {
  const { data, loading } = useEndpoint("/analytics/credentials", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "by_type" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C2.2 · Credentials by type (current vs expired)" testid="chart-cred-by-type" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 28)}>
        <BarChart data={rows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} allowDecimals={false} />
          <YAxis dataKey="type" type="category" fontSize={10} width={140} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="current" stackId="s" fill="#10B981" />
          <Bar dataKey="expired" stackId="s" fill="#DC2626" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function CredentialExpiryForecast(p) {
  const { data, loading } = useEndpoint("/analytics/credentials", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "expiry_forecast" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C2.3 · Credential expiry forecast (next 6 months)" testid="chart-cred-forecast" empty={!loading && rows.every((r) => !r.expiring)}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" fontSize={10} tick={{ fill: "#6B7280" }} />
          <YAxis fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="expiring" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function CredentialBySiteHeatmap(p) {
  const { data, loading } = useEndpoint("/analytics/credentials", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "by_site_heatmap" }));
  const rows = data?.rows || [];
  const types = data?.types || [];
  return (
    <ChartFrame title="C2.4 · Credential currency by site (heatmap)" subtitle="Cell = % current. Green >95, amber 85–95, red <85." testid="chart-cred-heatmap" empty={!loading && rows.length === 0}>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr><th className="px-2 py-1 text-left text-muted-foreground">Site</th>{types.map((t) => <th key={t} className="px-1 py-1 text-left text-muted-foreground" style={{ minWidth: 70 }}>{t}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border"><td className="px-2 py-1 font-bold">{r.site}</td>{r.cells.map((c, j) => (
                <td key={j} className="px-1 py-1 text-center text-white font-bold" style={{ backgroundColor: RAG(c.pct) }} title={`${c.current}/${c.total} current`}>{c.pct == null ? "—" : `${c.pct}%`}</td>
              ))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartFrame>
  );
}

// ============================================================
// C3 — TRAINING
// ============================================================
export function ModuleCompletionRate(p) {
  const { data, loading } = useEndpoint("/analytics/training", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "module_completion" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C3.1 · Module completion rate" testid="chart-training-completion" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 24)}>
        <BarChart data={rows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} domain={[0, 100]} unit="%" />
          <YAxis dataKey="module" type="category" fontSize={9} width={180} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => `${v}%`} />
          <Bar dataKey="pct">{rows.map((r, i) => <Cell key={i} fill={r.pct >= 80 ? "#10B981" : r.pct >= 50 ? "#F59E0B" : "#DC2626"} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function TrainingOverTime(p) {
  const { data, loading } = useEndpoint("/analytics/training", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "completion_over_time" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C3.2 · Training completion over time (cumulative)" testid="chart-training-over-time" empty={!loading && rows.every((r) => !r.cumulative)}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="bucket" fontSize={10} tick={{ fill: "#6B7280" }} />
          <YAxis fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="cumulative" stroke="#0EA5E9" fill="#0EA5E940" strokeWidth={2} name="Cumulative" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function OverdueMandatoryTraining(p) {
  const { data, loading } = useEndpoint("/analytics/training", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "overdue_mandatory" }));
  const rows = data?.rows || [];
  return (
    <ChartFrame title="C3.3 · Overdue mandatory training" subtitle={`${data?.count ?? 0} workers overdue`} testid="chart-training-overdue" empty={!loading && rows.length === 0}>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="px-2 py-1 text-left">Worker</th><th className="px-2 py-1 text-left">Module</th><th className="px-2 py-1 text-right">Days</th></tr></thead>
          <tbody>{rows.map((r, i) => (<tr key={i} className="border-t border-border"><td className="px-2 py-1">{r.worker}</td><td className="px-2 py-1">{r.module}</td><td className="px-2 py-1 text-right font-bold text-red-700">{r.days_overdue}</td></tr>))}</tbody>
        </table>
      </div>
    </ChartFrame>
  );
}
export function QuizPassRates(p) {
  const { data, loading } = useEndpoint("/analytics/training", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "quiz_pass_rates" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C3.4 · Quiz pass rates by module" subtitle="Bar = pass %; tooltip shows avg attempts" testid="chart-training-quiz" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 24)}>
        <BarChart data={rows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} domain={[0, 100]} unit="%" />
          <YAxis dataKey="module" type="category" fontSize={9} width={180} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v, _, item) => [`${v}% · avg ${item.payload.avg_attempts} attempts`]} />
          <Bar dataKey="pct" fill="#7C3AED" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function TrainingHoursPerWorker(p) {
  const { data, loading } = useEndpoint("/analytics/training", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "hours_per_worker" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C3.5 · Training hours per worker (top 15)" testid="chart-training-hours" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 24)}>
        <BarChart data={rows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} />
          <YAxis dataKey="worker" type="category" fontSize={9} width={140} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="hours" fill="#0EA5E9" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ============================================================
// C4 — RISK REGISTER
// ============================================================
export function RiskMatrixHeatmap(p) {
  const [view, setView] = useState("residual");
  const { data, loading } = useEndpoint("/analytics/risks", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "matrix_heatmap", view }));
  const grid = data?.grid || [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
  const cellColour = (l, c) => {
    const score = l * c;
    if (score >= 15) return "#7F1D1D";
    if (score >= 8) return "#F97316";
    if (score >= 4) return "#F59E0B";
    return "#10B981";
  };
  const totalRisks = grid.flat().reduce((a, b) => a + b, 0);
  return (
    <ChartFrame title="C4.1 · Risk matrix (5×5 heatmap)" subtitle={`${totalRisks} risks · ${view === "residual" ? "Residual" : "Inherent"} view`} testid="chart-risk-matrix" empty={!loading && totalRisks === 0}>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setView("inherent")} className={`px-2 py-1 text-[10px] font-bold tracking-widest border ${view === "inherent" ? "bg-ink text-white" : "border-border"}`}>Inherent</button>
        <button onClick={() => setView("residual")} className={`px-2 py-1 text-[10px] font-bold tracking-widest border ${view === "residual" ? "bg-ink text-white" : "border-border"}`}>Residual</button>
      </div>
      <div className="inline-block">
        <div className="flex">
          <div className="w-12" />
          <div className="grid grid-cols-5 gap-0.5">{[1, 2, 3, 4, 5].map((c) => <div key={c} className="w-12 text-center text-[10px] font-bold text-muted-foreground">C{c}</div>)}</div>
        </div>
        {grid.map((row, i) => {
          const lik = 5 - i;
          return (
            <div key={i} className="flex items-center">
              <div className="w-12 text-right text-[10px] font-bold text-muted-foreground pr-1">L{lik}</div>
              <div className="grid grid-cols-5 gap-0.5">
                {row.map((count, j) => {
                  const c = j + 1;
                  return (
                    <div key={j} className="w-12 h-12 flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: count > 0 ? cellColour(lik, c) : "#F3F4F6", color: count > 0 ? "white" : "#9CA3AF" }} title={`L${lik} × C${c} = ${lik * c}`}>{count}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ChartFrame>
  );
}
export function RisksByRating(p) {
  const { data, loading } = useEndpoint("/analytics/risks", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "by_rating" }));
  const segments = data?.segments || [];
  const total = data?.total || 0;
  return (
    <ChartFrame title="C4.2 · Risks by rating" subtitle={`${total} risks`} testid="chart-risk-by-rating" empty={!loading && total === 0}>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="55%" height={200}>
          <PieChart>
            <Pie data={segments} dataKey="count" nameKey="label" innerRadius={50} outerRadius={80}>
              {segments.map((s, i) => <Cell key={i} fill={RATING_COL[s.label] || "#94A3B8"} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1 text-xs">
          {segments.map((s) => (
            <div key={s.label} className="flex justify-between"><span className="inline-flex items-center gap-2"><span className="inline-block w-3 h-3" style={{ backgroundColor: RATING_COL[s.label] || "#94A3B8" }} />{s.label}</span><strong>{s.count}</strong></div>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}
export function RisksByProcess(p) {
  const { data, loading } = useEndpoint("/analytics/risks", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "by_process" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C4.3 · Risks by process" testid="chart-risk-by-process" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 24)}>
        <BarChart data={rows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} allowDecimals={false} />
          <YAxis dataKey="process" type="category" fontSize={9} width={160} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" fill="#0F172A" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function OverdueRiskReviews(p) {
  const { data, loading } = useEndpoint("/analytics/risks", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "overdue_reviews" }));
  const rows = data?.rows || [];
  return (
    <ChartFrame title="C4.4 · Overdue risk reviews" subtitle={`${data?.count ?? 0} overdue`} testid="chart-risk-overdue" empty={!loading && rows.length === 0}>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="px-2 py-1 text-left">Risk</th><th className="px-2 py-1 text-left">Title</th><th className="px-2 py-1 text-right">Days</th></tr></thead>
          <tbody>{rows.map((r, i) => (<tr key={i} className="border-t border-border"><td className="px-2 py-1 font-mono">{r.risk_id}</td><td className="px-2 py-1">{r.title}</td><td className="px-2 py-1 text-right font-bold text-red-700">{r.days_overdue}</td></tr>))}</tbody>
        </table>
      </div>
    </ChartFrame>
  );
}
export function ControlsEffectiveness(p) {
  const { data, loading } = useEndpoint("/analytics/risks", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "controls_effectiveness" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C4.5 · Controls effectiveness" subtitle="Inherent vs residual score for high/extreme risks" testid="chart-risk-controls-effectiveness" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 28)}>
        <BarChart data={rows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} allowDecimals={false} />
          <YAxis dataKey="title" type="category" fontSize={9} width={170} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="inherent" fill="#DC2626" name="Inherent" />
          <Bar dataKey="residual" fill="#10B981" name="Residual" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ============================================================
// C5 — DOCUMENTS
// ============================================================
export function DocumentsOverTime(p) {
  const { data, loading } = useEndpoint("/analytics/documents", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "generated_over_time" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C5.1 · Documents generated over time" testid="chart-docs-over-time" empty={!loading && rows.every((r) => !r.count)}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="bucket" fontSize={10} tick={{ fill: "#6B7280" }} />
          <YAxis fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="count" stroke="#0F172A" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function DocumentsByStatus(p) {
  const { data, loading } = useEndpoint("/analytics/documents", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "by_status" }));
  const segs = data?.segments || [];
  const COL = { Draft: "#94A3B8", Final: "#10B981", Archived: "#6B7280" };
  return (
    <ChartFrame title="C5.2 · Documents by status" subtitle={`${data?.total ?? 0} total`} testid="chart-docs-status" empty={!loading && (data?.total ?? 0) === 0}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={segs} dataKey="count" nameKey="label" innerRadius={50} outerRadius={80}>
            {segs.map((s, i) => <Cell key={i} fill={COL[s.label] || "#94A3B8"} />)}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function MostGeneratedDocTypes(p) {
  const { data, loading } = useEndpoint("/analytics/documents", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "top_types" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C5.3 · Most generated document types (top 10)" testid="chart-docs-types" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 28)}>
        <BarChart data={rows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} allowDecimals={false} />
          <YAxis dataKey="type" type="category" fontSize={10} width={120} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" fill="#0F172A" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function DocsDueForReview(p) {
  const { data, loading } = useEndpoint("/analytics/documents", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "due_for_review" }));
  const rows = data?.rows || [];
  return (
    <ChartFrame title="C5.4 · Documents due for review" subtitle={`${data?.count ?? 0} not reviewed in 12+ months`} testid="chart-docs-due-review" empty={!loading && rows.length === 0}>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="px-2 py-1 text-left">Document</th><th className="px-2 py-1 text-left">Last reviewed</th><th className="px-2 py-1 text-right">Days</th></tr></thead>
          <tbody>{rows.map((r, i) => (<tr key={i} className="border-t border-border"><td className="px-2 py-1">{r.title}</td><td className="px-2 py-1 text-muted-foreground">{r.last_reviewed}</td><td className="px-2 py-1 text-right font-bold text-red-700">{r.days}</td></tr>))}</tbody>
        </table>
      </div>
    </ChartFrame>
  );
}

// ============================================================
// C6 — AUDITS
// ============================================================
export function AuditCompletionGauge(p) {
  const { data, loading } = useEndpoint("/analytics/audits", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "completion_rate" }));
  const pct = data?.pct ?? 0;
  return (
    <ChartFrame title="C6.1 · Audit completion rate" subtitle={`${data?.completed ?? 0} of ${data?.scheduled ?? 0} scheduled`} testid="chart-audit-gauge" empty={!loading && (data?.scheduled ?? 0) === 0}>
      <div className="flex items-center justify-center h-32">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 36 36" className="-rotate-90 w-full h-full">
            <circle cx="18" cy="18" r="16" fill="none" stroke="#E5E7EB" strokeWidth="3" />
            <circle cx="18" cy="18" r="16" fill="none" stroke={pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#DC2626"} strokeWidth="3" strokeDasharray={`${pct} 100`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-3xl font-black">{pct}%</div>
          </div>
        </div>
      </div>
    </ChartFrame>
  );
}
export function AuditScoresOverTime(p) {
  const { data, loading } = useEndpoint("/analytics/audits", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "scores_over_time" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C6.2 · Audit scores over time" testid="chart-audit-scores" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="date" fontSize={10} tick={{ fill: "#6B7280" }} />
          <YAxis fontSize={10} domain={[0, 100]} unit="%" />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="score" stroke="#0F172A" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function OpenAuditFindings(p) {
  const { data, loading } = useEndpoint("/analytics/audits", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "open_findings" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C6.3 · Open audit findings (by category, stacked by severity)" testid="chart-audit-findings" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 28)}>
        <BarChart data={rows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} allowDecimals={false} />
          <YAxis dataKey="category" type="category" fontSize={10} width={140} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="minor" stackId="s" fill="#10B981" />
          <Bar dataKey="moderate" stackId="s" fill="#F59E0B" />
          <Bar dataKey="major" stackId="s" fill="#DC2626" />
          <Bar dataKey="critical" stackId="s" fill="#7F1D1D" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ============================================================
// C7 — COMPLIANCE SCORE
// ============================================================
export function ComplianceScoreTrend(p) {
  const { data, loading } = useEndpoint("/analytics/compliance-score", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "trend" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C7.1 · Compliance score trend" subtitle={`Current: ${data?.current ?? 0}/100`} testid="chart-comp-trend" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={rows}>
          <defs>
            <linearGradient id="green-zone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B98140" />
              <stop offset="10%" stopColor="#10B98140" />
              <stop offset="11%" stopColor="#F59E0B40" />
              <stop offset="30%" stopColor="#F59E0B40" />
              <stop offset="31%" stopColor="#DC262640" />
              <stop offset="100%" stopColor="#DC262640" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="bucket" fontSize={10} tick={{ fill: "#6B7280" }} />
          <YAxis fontSize={10} domain={[0, 100]} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="score" stroke="#0F172A" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function ComplianceBreakdownRadar(p) {
  const { data, loading } = useEndpoint("/analytics/compliance-score", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "breakdown" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C7.2 · Compliance score breakdown" subtitle="Strong vs weak axes" testid="chart-comp-radar" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={rows}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis dataKey="axis" fontSize={10} tick={{ fill: "#6B7280" }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
          <Radar dataKey="score" stroke="#0F172A" fill="#0F172A" fillOpacity={0.4} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function ComplianceBySite(p) {
  const { data, loading } = useEndpoint("/analytics/compliance-score", buildParams(p.period, p.compareTo, p.siteId, p.customFrom, p.customTo, { chart: "by_site" }));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C7.3 · Compliance score by site" testid="chart-comp-by-site" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 32)}>
        <BarChart data={rows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} domain={[0, 100]} />
          <YAxis dataKey="site" type="category" fontSize={10} width={140} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="score">{rows.map((r, i) => <Cell key={i} fill={r.score >= 90 ? "#10B981" : r.score >= 70 ? "#F59E0B" : "#DC2626"} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
