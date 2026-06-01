/**
 * IncidentCharts — the 12 universal incident charts (C1.1–C1.12) for the
 * Analytics Dashboard. Each chart is account+site+period-scoped, calls
 * `/api/analytics/incidents?chart=...`, and bubbles bucket-clicks up to
 * Reports.jsx so it can open the drill-down drawer.
 *
 * All charts share:
 *   - `onDrill(chartKey, bucketValue, displayLabel)` callback
 *   - same `period / siteId / compareTo` params
 *   - empty-state handling
 */
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend,
  Treemap,
} from "recharts";

const SEV_COLOURS = {
  minor: "#10B981", moderate: "#F59E0B", significant: "#F97316",
  major: "#DC2626", critical: "#7F1D1D",
};
const PALETTE = ["#0F172A", "#334155", "#475569", "#64748B", "#94A3B8",
                  "#B91C1C", "#DC2626", "#F97316", "#F59E0B", "#10B981",
                  "#0EA5E9", "#7C3AED"];

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

function useChart(chart, params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const sp = new URLSearchParams({ chart, ...params });
    setLoading(true);
    api.get(`/analytics/incidents?${sp.toString()}`)
      .then((r) => setData(r.data))
      .catch(() => setData({ error: true }))
      .finally(() => setLoading(false));
  }, [chart, JSON.stringify(params)]); // eslint-disable-line
  return { data, loading };
}

const PARAM_KEYS = ["period", "compare_to", "site_id", "from", "to"];
function buildParams(period, compareTo, siteId, customFrom, customTo) {
  const out = { period, compare_to: compareTo, site_id: siteId || "all" };
  if (period === "custom") {
    if (customFrom) out.from = customFrom;
    if (customTo) out.to = customTo;
  }
  return out;
}

// ───── C1.1 — Total Incidents Over Time ─────
export function VolumeOverTime({ period, compareTo, siteId, customFrom, customTo, onDrill }) {
  const params = buildParams(period, compareTo, siteId, customFrom, customTo);
  const { data, loading } = useChart("volume_over_time", params);
  const series = data?.current?.series || [];
  const previous = data?.previous?.series || [];
  const merged = series.map((s, i) => ({ ...s, prev_incidents: previous[i]?.incidents }));
  const empty = !loading && merged.every((s) => (s.incidents + s.near_miss) === 0);
  return (
    <ChartFrame title="C1.1 · Total incidents over time" subtitle={data?.current?.granularity === "month" ? "by month" : "by ISO week"} testid="chart-volume-over-time" empty={empty}>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={merged} onClick={(e) => e?.activeLabel && onDrill?.("volume_over_time", e.activeLabel, e.activeLabel)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="bucket" fontSize={10} tick={{ fill: "#6B7280" }} />
          <YAxis fontSize={10} tick={{ fill: "#6B7280" }} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="incidents" stroke="#DC2626" fill="#DC262640" strokeWidth={2} name="Incidents" />
          <Area type="monotone" dataKey="near_miss" stroke="#F59E0B" fill="#F59E0B40" strokeWidth={2} name="Near misses" />
          {compareTo !== "off" && previous.length > 0 && <Line type="monotone" dataKey="prev_incidents" stroke="#94A3B8" strokeDasharray="4 4" name={`Prev (${compareTo})`} />}
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ───── C1.2 — Incidents by Type ─────
export function IncidentsByType({ period, compareTo, siteId, customFrom, customTo, onDrill }) {
  const { data, loading } = useChart("by_type", buildParams(period, compareTo, siteId, customFrom, customTo));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C1.2 · Incidents by type" testid="chart-by-type" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 28)}>
        <BarChart data={rows} layout="vertical" onClick={(e) => e?.activeLabel && onDrill?.("by_type", e.activeLabel, e.activeLabel)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} tick={{ fill: "#6B7280" }} allowDecimals={false} />
          <YAxis dataKey="type" type="category" fontSize={10} tick={{ fill: "#6B7280" }} width={110} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" fill="#0F172A" cursor="pointer" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ───── C1.3 — Incidents by Severity (stacked) ─────
export function IncidentsBySeverity({ period, compareTo, siteId, customFrom, customTo, onDrill }) {
  const { data, loading } = useChart("by_severity", buildParams(period, compareTo, siteId, customFrom, customTo));
  const series = data?.series || [];
  const sevs = data?.severities || ["minor", "moderate", "significant", "major", "critical"];
  const empty = !loading && series.every((s) => sevs.every((k) => (s[k] || 0) === 0));
  return (
    <ChartFrame title="C1.3 · Incidents by severity (stacked, by month)" testid="chart-by-severity" empty={empty}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={series} onClick={(e) => e?.activeLabel && onDrill?.("by_severity", e.activeLabel, `${e.activeLabel} · all severities`)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="bucket" fontSize={10} tick={{ fill: "#6B7280" }} />
          <YAxis fontSize={10} tick={{ fill: "#6B7280" }} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {sevs.map((s) => (
            <Bar key={s} dataKey={s} stackId="sev" fill={SEV_COLOURS[s]} name={s} cursor="pointer" />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ───── C1.4 — Notifiable Incidents ─────
export function NotifiableIncidents({ period, compareTo, siteId, customFrom, customTo, onDrill }) {
  const { data, loading } = useChart("notifiable", buildParams(period, compareTo, siteId, customFrom, customTo));
  const rows = data?.by_regulator || [];
  return (
    <ChartFrame title="C1.4 · Notifiable incidents" subtitle={`${data?.total ?? 0} total in period`} testid="chart-notifiable" empty={!loading && (data?.total ?? 0) === 0}>
      <div className="flex items-center gap-6">
        <button
          onClick={() => onDrill?.("notifiable", "all", "All notifiable incidents")}
          className="font-display text-5xl font-black text-red-700 hover:underline"
          data-testid="notifiable-total"
        >{data?.total ?? 0}</button>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={rows} layout="vertical" onClick={(e) => e?.activeLabel && onDrill?.("notifiable", e.activeLabel, `Notifiable · ${e.activeLabel}`)}>
              <XAxis type="number" fontSize={9} allowDecimals={false} hide />
              <YAxis dataKey="regulator" type="category" fontSize={10} width={90} tick={{ fill: "#6B7280" }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" fill="#B91C1C" cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartFrame>
  );
}

// ───── C1.5 — Time Between Stages (SLA red/green) ─────
export function TimeBetweenStages({ period, compareTo, siteId, customFrom, customTo, onDrill }) {
  const { data, loading } = useChart("time_between_stages", buildParams(period, compareTo, siteId, customFrom, customTo));
  const rows = data?.data || [];
  const empty = !loading && rows.every((r) => r.count === 0);
  return (
    <ChartFrame title="C1.5 · Avg time between stages vs SLA" subtitle="Red bars exceed the configured SLA" testid="chart-time-between-stages" empty={empty}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 40)}>
        <BarChart data={rows} layout="vertical" onClick={(e) => e?.activePayload?.[0]?.payload?.stage_key && onDrill?.("time_between_stages", e.activePayload[0].payload.stage_key, e.activePayload[0].payload.stage)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} tick={{ fill: "#6B7280" }} label={{ value: "hours (avg)", fontSize: 10, fill: "#6B7280", dy: 12 }} />
          <YAxis dataKey="stage" type="category" fontSize={10} width={150} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="avg_hours" cursor="pointer">
            {rows.map((r, i) => <Cell key={i} fill={r.breached ? "#DC2626" : "#10B981"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ───── C1.6 — Incidents by Site ─────
export function IncidentsBySite({ period, compareTo, siteId, customFrom, customTo, onDrill }) {
  const { data, loading } = useChart("by_site", buildParams(period, compareTo, siteId, customFrom, customTo));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C1.6 · Incidents by site" subtitle="Stacked by severity" testid="chart-by-site" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 36)}>
        <BarChart data={rows} layout="vertical" onClick={(e) => e?.activeLabel && onDrill?.("by_site", e.activeLabel, `Site · ${e.activeLabel}`)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} tick={{ fill: "#6B7280" }} allowDecimals={false} />
          <YAxis dataKey="site" type="category" fontSize={10} width={130} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {["minor", "moderate", "significant", "major", "critical"].map((s) => (
            <Bar key={s} dataKey={s} stackId="sev" fill={SEV_COLOURS[s]} name={s} cursor="pointer" />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ───── C1.7 — Bullying, Harassment & Discrimination ─────
export function BHDDonut({ period, compareTo, siteId, customFrom, customTo, onDrill }) {
  const { data, loading } = useChart("bhd_donut", buildParams(period, compareTo, siteId, customFrom, customTo));
  const segments = data?.segments || [];
  return (
    <ChartFrame title="C1.7 · Bullying, harassment & discrimination" subtitle={`${data?.total ?? 0} total in period`} testid="chart-bhd" empty={!loading && (data?.total ?? 0) === 0}>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie
              data={segments}
              dataKey="count"
              nameKey="label"
              innerRadius={50}
              outerRadius={80}
              onClick={(e) => e?.label && onDrill?.("bhd_donut", e.label, e.label)}
            >
              {segments.map((_, i) => <Cell key={i} fill={["#7F1D1D", "#B91C1C", "#DC2626", "#F97316", "#F59E0B"][i % 5]} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1 text-xs">
          {segments.map((s, i) => (
            <button
              key={s.label}
              onClick={() => onDrill?.("bhd_donut", s.label, s.label)}
              className="flex items-center justify-between w-full hover:bg-muted px-2 py-1"
            >
              <span className="inline-flex items-center gap-2"><span className="inline-block w-3 h-3" style={{ backgroundColor: ["#7F1D1D", "#B91C1C", "#DC2626", "#F97316", "#F59E0B"][i % 5] }} />{s.label}</span>
              <strong>{s.count}</strong>
            </button>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

// ───── C1.8 — Mechanism of Injury ─────
export function MechanismOfInjury({ period, compareTo, siteId, customFrom, customTo, onDrill }) {
  const { data, loading } = useChart("mechanism", buildParams(period, compareTo, siteId, customFrom, customTo));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C1.8 · Mechanism of injury (TOOCS-aligned)" testid="chart-mechanism" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 28)}>
        <BarChart data={rows} layout="vertical" onClick={(e) => e?.activeLabel && onDrill?.("mechanism", e.activeLabel, e.activeLabel)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} tick={{ fill: "#6B7280" }} allowDecimals={false} />
          <YAxis dataKey="category" type="category" fontSize={10} width={160} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" fill="#7C3AED" cursor="pointer" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ───── C1.9 — Body Part Affected ─────
export function BodyPartAffected({ period, compareTo, siteId, customFrom, customTo, onDrill }) {
  const { data, loading } = useChart("body_part", buildParams(period, compareTo, siteId, customFrom, customTo));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C1.9 · Body part affected" testid="chart-body-part" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 28)}>
        <BarChart data={rows} layout="vertical" onClick={(e) => e?.activeLabel && onDrill?.("body_part", e.activeLabel, e.activeLabel)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} tick={{ fill: "#6B7280" }} allowDecimals={false} />
          <YAxis dataKey="part" type="category" fontSize={10} width={130} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" fill="#0EA5E9" cursor="pointer" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ───── C1.10 — Primary vs Secondary Impact ─────
export function PrimaryVsSecondary({ period, compareTo, siteId, customFrom, customTo }) {
  const { data, loading } = useChart("primary_secondary", buildParams(period, compareTo, siteId, customFrom, customTo));
  const rows = data?.series || [];
  const opts = data?.secondary_options || ["Lost Time", "Medical Treatment", "First Aid Only", "No Treatment"];
  return (
    <ChartFrame title="C1.10 · Primary vs secondary impact" subtitle="By incident category" testid="chart-primary-secondary" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 32)}>
        <BarChart data={rows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} tick={{ fill: "#6B7280" }} allowDecimals={false} />
          <YAxis dataKey="category" type="category" fontSize={10} width={140} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {opts.map((o, i) => (
            <Bar key={o} dataKey={o} fill={PALETTE[(i + 6) % PALETTE.length]} name={o} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ───── C1.11 — Corrective Actions / CAPA Status ─────
export function CapaStatus({ period, compareTo, siteId, customFrom, customTo }) {
  const { data, loading } = useChart("capa_status", buildParams(period, compareTo, siteId, customFrom, customTo));
  const rows = data?.data || [];
  const total = rows.reduce((a, b) => a + (b.count || 0), 0);
  const COL = { Open: "#94A3B8", "In Progress": "#0EA5E9", Overdue: "#DC2626", Completed: "#10B981" };
  return (
    <ChartFrame title="C1.11 · CAPA status" subtitle={`${total} total actions`} testid="chart-capa-status" empty={!loading && total === 0}>
      <div className="flex flex-col gap-3">
        <div className="flex h-8 w-full">
          {rows.map((r) => (
            r.count > 0 && <div key={r.status} className="h-full text-[10px] font-bold text-white flex items-center justify-center" style={{ width: `${r.pct}%`, backgroundColor: COL[r.status] }} title={`${r.status}: ${r.count} (${r.pct}%)`}>
              {r.pct >= 8 ? `${r.status} ${r.count}` : null}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {rows.map((r) => (
            <div key={r.status} className="border border-border p-2">
              <div className="font-bold text-lg">{r.count}</div>
              <div className="text-muted-foreground">{r.status} · {r.pct}%</div>
            </div>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

// ───── C1.12 — Root Cause Analysis ─────
export function RootCauseAnalysis({ period, compareTo, siteId, customFrom, customTo, onDrill }) {
  const { data, loading } = useChart("root_cause", buildParams(period, compareTo, siteId, customFrom, customTo));
  const rows = data?.data || [];
  return (
    <ChartFrame title="C1.12 · Root cause" testid="chart-root-cause" empty={!loading && rows.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 30 + 50)}>
        <BarChart data={rows} layout="vertical" onClick={(e) => e?.activeLabel && onDrill?.("root_cause", e.activeLabel, e.activeLabel)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" fontSize={10} tick={{ fill: "#6B7280" }} allowDecimals={false} />
          <YAxis dataKey="category" type="category" fontSize={10} width={140} tick={{ fill: "#6B7280" }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" fill="#0F172A" cursor="pointer" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
