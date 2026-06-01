/**
 * Analytics & Reporting Dashboard — Phase 1.
 *
 * Layout:
 *   ─ Page header + "Report Register →" deep link
 *   ─ Tabs: FYTD Dashboard / Overall Dashboard
 *   ─ Toolbar (sticky): period segmented control, custom range,
 *     comparison toggle, site filter, Export Full Report (stub)
 *   ─ KPI strip (6 cards) with sparklines + trend arrows + tone colour
 *
 * Phases 2+ will plug chart sections in below the strip.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChartLineUp, Download, ArrowUp, ArrowDown, ArrowRight, Buildings, MagicWand,
} from "@phosphor-icons/react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

const PERIOD_LABELS = {
  fytd: "FYTD",
  overall: "Overall",
  cal_ytd: "Calendar YTD",
  last_90d: "Last 90 days",
  custom: "Custom",
};

const TONE_BG = {
  good: "bg-emerald-600/10 border-emerald-600/40",
  warn: "bg-amber-500/10 border-amber-500/50",
  bad: "bg-red-600/10 border-red-600/50",
};
const TONE_TEXT = {
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-red-700",
};
const TONE_STROKE = {
  good: "#059669",
  warn: "#D97706",
  bad: "#B91C1C",
};

function SparkLine({ data, tone }) {
  if (!data || data.length === 0) {
    return <div className="h-10 flex items-center text-[10px] text-muted-foreground italic">no data yet</div>;
  }
  const points = data.map((v, i) => ({ i, v }));
  const stroke = TONE_STROKE[tone] || "#0F172A";
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendArrow({ trend, delta_pct }) {
  if (trend === "flat" || delta_pct === null || delta_pct === undefined) {
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground"><ArrowRight size={10} weight="bold" /> flat</span>;
  }
  const good = trend === "up_good" || trend === "down_good";
  const Icon = (trend === "up_good" || trend === "up_bad") ? ArrowUp : ArrowDown;
  const colour = good ? "text-emerald-700" : "text-red-700";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${colour}`}>
      <Icon size={10} weight="bold" />
      {Math.abs(delta_pct).toFixed(1)}%
    </span>
  );
}

function KpiCard({ card }) {
  return (
    <div className={`border-2 p-4 ${TONE_BG[card.tone] || "border-border bg-background"}`} data-testid={`kpi-card-${card.key}`}>
      <div className="label-eyebrow text-[10px]">{card.label}</div>
      <div className="flex items-baseline gap-2 mt-2">
        <div className={`font-display text-4xl font-black tracking-tight ${TONE_TEXT[card.tone] || "text-ink"}`}>
          {card.value}<span className="text-base font-bold text-muted-foreground">{card.unit}</span>
        </div>
      </div>
      <div className="mt-1"><TrendArrow trend={card.trend} delta_pct={card.delta_pct} /></div>
      <div className="mt-2"><SparkLine data={card.sparkline} tone={card.tone} /></div>
    </div>
  );
}

function PeriodToolbar({ period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo, compareTo, setCompareTo, siteId, setSiteId, sites, onExport, exporting }) {
  return (
    <div className="bg-background border border-border p-3 flex flex-wrap items-end gap-3" data-testid="reports-toolbar">
      <div>
        <div className="label-eyebrow text-[10px] mb-1">Period</div>
        <div className="inline-flex">
          {Object.entries(PERIOD_LABELS).map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setPeriod(k)}
              className={`px-3 h-9 text-[11px] font-bold tracking-widest uppercase border ${period === k ? "bg-ink text-white border-ink" : "bg-background text-ink border-border hover:border-ink"} ${k !== "fytd" ? "border-l-0" : ""}`}
              data-testid={`period-${k}`}
            >{lbl}</button>
          ))}
        </div>
      </div>

      {period === "custom" && (
        <div className="flex items-end gap-2">
          <div>
            <div className="label-eyebrow text-[10px] mb-1">From</div>
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 rounded-none border-ink" data-testid="period-custom-from" />
          </div>
          <div>
            <div className="label-eyebrow text-[10px] mb-1">To</div>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 rounded-none border-ink" data-testid="period-custom-to" />
          </div>
        </div>
      )}

      <div>
        <div className="label-eyebrow text-[10px] mb-1">Compare</div>
        <Select value={compareTo} onValueChange={setCompareTo}>
          <SelectTrigger className="h-9 rounded-none border-ink w-32" data-testid="compare-toggle"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Off</SelectItem>
            <SelectItem value="mom">MoM</SelectItem>
            <SelectItem value="qoq">QoQ</SelectItem>
            <SelectItem value="yoy">YoY</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="label-eyebrow text-[10px] mb-1 flex items-center gap-1"><Buildings size={12} /> Site</div>
        <Select value={siteId} onValueChange={setSiteId}>
          <SelectTrigger className="h-9 rounded-none border-ink min-w-[160px]" data-testid="site-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {sites.map((s) => <SelectItem key={s.site_id} value={s.site_id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="ml-auto">
        <Button onClick={onExport} disabled={exporting} variant="outline" className="btn-sharp border-ink h-9" data-testid="export-full-report-btn">
          <Download className="mr-2" weight="bold" size={14} />
          {exporting ? "Generating…" : "Export Full Report"}
        </Button>
      </div>
    </div>
  );
}

export default function Reports() {
  const [tab, setTab] = useState("fytd"); // fytd | overall
  const [period, setPeriod] = useState("fytd");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [compareTo, setCompareTo] = useState("off");
  const [siteId, setSiteId] = useState("all");
  const [sites, setSites] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const stripRef = useRef(null);

  // When tab changes, reset the period to its default
  const switchTab = (t) => {
    setTab(t);
    setPeriod(t === "overall" ? "overall" : "fytd");
  };

  // Load sites for the dropdown once
  useEffect(() => {
    api.get("/sites").then((r) => setSites(r.data || [])).catch(() => {});
  }, []);

  const loadKpi = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, compare_to: compareTo, site_id: siteId });
      if (period === "custom") {
        if (customFrom) params.set("from", customFrom);
        if (customTo) params.set("to", customTo);
      }
      const r = await api.get(`/analytics/kpi-strip?${params.toString()}`);
      setKpi(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not load KPIs");
    } finally {
      setLoading(false);
    }
  }, [period, compareTo, siteId, customFrom, customTo]);

  useEffect(() => { loadKpi(); }, [loadKpi]);

  const periodLabel = useMemo(() => {
    if (!kpi?.period) return "";
    const { from, to } = kpi.period;
    if (!from) return `All time → ${to}`;
    return `${from} → ${to}`;
  }, [kpi]);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Phase 1: client-side PDF using window.print of the KPI strip area.
      // Phase 5 will replace this with a server-side reportlab pipeline.
      window.print();
      toast.success("Use your browser's Save-as-PDF in the print dialog.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="reports-page">
      {/* Header */}
      <div className="border-b-2 border-ink pb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-eyebrow flex items-center gap-2"><ChartLineUp size={14} /><span>Analytics &amp; Reporting</span></div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-2">Reports.</h1>
          <p className="text-muted-foreground mt-2 text-sm">Operational analytics across incidents, credentials, training, risk, audits, documents and compliance. Industry-specific. Multi-site. Time-period aware.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/report-register"><Button variant="outline" className="btn-sharp border-ink h-10" data-testid="report-register-link"><MagicWand className="mr-2" weight="bold" size={14} /> Report Register</Button></Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { k: "fytd", label: "FYTD Dashboard" },
          { k: "overall", label: "Overall Dashboard" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => switchTab(t.k)}
            className={`px-4 h-10 text-xs uppercase tracking-widest font-bold border-b-2 -mb-px ${tab === t.k ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"}`}
            data-testid={`tab-${t.k}`}
          >{t.label}</button>
        ))}
      </div>

      {/* Toolbar */}
      <PeriodToolbar
        period={period} setPeriod={setPeriod}
        customFrom={customFrom} setCustomFrom={setCustomFrom}
        customTo={customTo} setCustomTo={setCustomTo}
        compareTo={compareTo} setCompareTo={setCompareTo}
        siteId={siteId} setSiteId={setSiteId} sites={sites}
        onExport={handleExport} exporting={exporting}
      />

      {/* Active period summary */}
      <div className="text-xs text-muted-foreground">
        <span className="font-mono">{PERIOD_LABELS[period]}</span>
        {" · "}{periodLabel}
        {compareTo !== "off" && kpi?.previous?.from && <span className="ml-2">vs <span className="font-mono">{kpi.previous.from} → {kpi.previous.to}</span></span>}
        {" · "}<span>Industry: <strong className="text-ink">{kpi?.industry || "—"}</strong></span>
        {" · "}<span>Site: <strong className="text-ink">{siteId === "all" ? "All Sites" : (sites.find((x) => x.site_id === siteId)?.name || siteId)}</strong></span>
      </div>

      {/* KPI Strip */}
      <div ref={stripRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3" data-testid="kpi-strip">
        {loading && !kpi && (
          [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="border-2 border-border p-4 animate-pulse"><div className="h-2 bg-muted w-20 mb-3" /><div className="h-8 bg-muted w-16 mb-2" /><div className="h-10 bg-muted w-full" /></div>)
        )}
        {kpi?.cards?.map((c) => <KpiCard key={c.key} card={c} />)}
      </div>

      {/* Phase 2+ charts will go here */}
      <div className="bg-muted/40 border-2 border-dashed border-border p-8 text-center" data-testid="phase2-placeholder">
        <ChartLineUp size={32} className="mx-auto text-muted-foreground" weight="bold" />
        <div className="font-bold mt-2">More charts coming</div>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl mx-auto">Phase 1 ships the toolbar, tabs, and KPI strip. Phase 2 adds the 12 universal incident charts (volume over time, by type, by severity, notifiable, by site, body-part, root cause, etc.) with comparison overlays.</p>
      </div>
    </div>
  );
}
