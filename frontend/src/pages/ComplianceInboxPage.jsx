/**
 * ComplianceInboxPage — full-width page of every open compliance item across
 * all industries this account operates in. Filter by severity and industry.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SEVERITY_COLOR = {
  critical: { bg: "#C7405B", fg: "white" },
  high: { bg: "#E6A70A", fg: "#1a1300" },
  medium: { bg: "#0F4C5C", fg: "white" },
  info: { bg: "#4CAF8F", fg: "white" },
};

const INDUSTRY_ACCENT = {
  trades: "#FFCC00",
  hospitality: "#7C1D3F",
  transport: "#0DC4B5",
  healthcare: "#2196A6",
  retail: "#E91E8C",
};

const KIND_LABEL = {
  sirs_notify: "SIRS",
  ndis_notify: "NDIS",
  ahpra_expiry: "AHPRA",
  nhvr_notify: "NHVR",
  fatigue_breach: "Fatigue",
  lone_worker_overdue: "Lone Worker",
  temp_breach: "Temperature",
  haccp_breach: "HACCP",
  fss_expiry: "FSS Cert",
  liquor_expiry: "Liquor Cert",
  incident_open_long: "Incident",
};

function fmtDue(iso, minsRemaining) {
  if (!iso) return "—";
  const abs = new Date(iso).toLocaleString();
  if (minsRemaining == null) return abs;
  if (minsRemaining < 0) {
    const m = Math.abs(minsRemaining);
    if (m < 60) return `${m}m overdue`;
    if (m < 1440) return `${Math.round(m / 60)}h overdue`;
    return `${Math.round(m / 1440)}d overdue`;
  }
  if (minsRemaining < 60) return `in ${minsRemaining}m`;
  if (minsRemaining < 1440) return `in ${Math.round(minsRemaining / 60)}h`;
  return `in ${Math.round(minsRemaining / 1440)}d`;
}

export default function ComplianceInboxPage() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("all");
  const [industry, setIndustry] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severity !== "all") params.append("severity", severity);
      if (industry !== "all") params.append("industry", industry);
      const { data } = await api.get(`/compliance-inbox?${params.toString()}`);
      setItems(data.items || []);
      setCounts(data.counts_by_severity || {});
      setLastUpdated(data.generated_at);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [severity, industry]);

  const industries = useMemo(() => {
    const s = new Set(items.map(i => i.industry).filter(Boolean));
    return ["all", ...Array.from(s)];
  }, [items]);

  return (
    <div className="p-6" data-testid="compliance-inbox-page">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-black/50">Cross-industry</div>
          <h1 className="font-display font-black text-4xl mt-1">Compliance Inbox</h1>
          <p className="text-sm text-black/60 mt-2">Every open regulator deadline and compliance breach across your industries, ranked by urgency. Updated every minute.</p>
        </div>
        <button onClick={load} className="text-xs uppercase tracking-widest bg-black text-white px-4 py-2 hover:bg-black/80" data-testid="inbox-refresh-btn">
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatTile label="Critical" value={counts.critical || 0} color="#C7405B" testid="inbox-critical-tile" />
        <StatTile label="High" value={counts.high || 0} color="#E6A70A" testid="inbox-high-tile" />
        <StatTile label="Medium" value={counts.medium || 0} color="#0F4C5C" testid="inbox-medium-tile" />
        <StatTile label="Info" value={counts.info || 0} color="#4CAF8F" testid="inbox-info-tile" />
      </div>

      <div className="flex gap-4 mb-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-black/50">Severity</span>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-[140px]" data-testid="inbox-filter-severity"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-black/50">Industry</span>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-[180px]" data-testid="inbox-filter-industry"><SelectValue /></SelectTrigger>
            <SelectContent>
              {industries.map(i => <SelectItem key={i} value={i}>{i === "all" ? "All industries" : i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {lastUpdated && (
          <div className="ml-auto text-xs text-black/40">Updated {new Date(lastUpdated).toLocaleTimeString()}</div>
        )}
      </div>

      <div className="border-2 border-black/10 bg-white" data-testid="inbox-items-list">
        {items.length === 0 && !loading && (
          <div className="p-12 text-center text-black/40" data-testid="inbox-empty-state">
            <div className="text-5xl mb-3">✓</div>
            <div className="text-lg font-bold">All clear.</div>
            <div className="text-sm mt-1">No open compliance items match this filter.</div>
          </div>
        )}
        {items.map(item => {
          const sev = SEVERITY_COLOR[item.severity] || SEVERITY_COLOR.medium;
          const industryColor = INDUSTRY_ACCENT[item.industry] || "#333";
          const label = KIND_LABEL[item.kind] || item.kind;
          return (
            <Link
              to={item.cta_path || "/dashboard"}
              key={item.item_id}
              className="flex items-start gap-4 px-4 py-4 border-b border-black/5 hover:bg-black/[0.02] transition-colors"
              style={{ borderLeft: `4px solid ${industryColor}` }}
              data-testid={`inbox-row-${item.item_id}`}
            >
              <span
                className="text-[10px] px-2 py-1 font-bold uppercase tracking-widest mt-0.5"
                style={{ background: sev.bg, color: sev.fg }}
              >
                {item.severity}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 font-bold uppercase" style={{ background: industryColor, color: "white" }}>
                    {item.industry}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 font-bold uppercase border border-black/20">
                    {label}
                  </span>
                  <span className="font-bold text-sm">{item.title}</span>
                </div>
                {item.subtitle && <div className="text-xs text-black/60 mt-1">{item.subtitle}</div>}
              </div>
              {item.due_at && (
                <div className="text-xs text-right text-black/70 whitespace-nowrap" data-testid={`inbox-due-${item.item_id}`}>
                  {fmtDue(item.due_at, item.minutes_remaining)}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({ label, value, color, testid }) {
  return (
    <div className="border-2 border-black/10 bg-white p-4" data-testid={testid}>
      <div className="text-xs uppercase tracking-wider text-black/50">{label}</div>
      <div className="font-display font-black text-4xl mt-1" style={{ color }}>{value}</div>
    </div>
  );
}
