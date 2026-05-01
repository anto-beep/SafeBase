/**
 * ComplianceInboxWidget — compact dashboard card showing the top 3 most
 * urgent compliance items across any industry the account operates in.
 *
 * Fetches /api/compliance-inbox/summary. Renders a "Go to Inbox" CTA that
 * deep-links to /dashboard/compliance-inbox for the full list.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";

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

function fmtDue(iso, minsRemaining) {
  if (!iso) return null;
  if (minsRemaining == null) return new Date(iso).toLocaleDateString();
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

export default function ComplianceInboxWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data } = await api.get("/compliance-inbox/summary");
        if (alive) setData(data);
      } catch {
        if (alive) setData({ total: 0, critical: 0, high: 0, medium: 0, top_3: [] });
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (loading) {
    return (
      <div className="border-2 border-black/10 bg-white p-6" data-testid="compliance-inbox-widget-loading">
        <div className="text-xs uppercase text-black/40">Loading inbox…</div>
      </div>
    );
  }

  const { total = 0, critical = 0, high = 0, top_3 = [] } = data || {};
  const empty = total === 0;

  return (
    <div className="border-2 border-black/10 bg-white" data-testid="compliance-inbox-widget">
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black/10" style={{ background: critical > 0 ? "#C7405B" : "#111" }}>
        <div className="flex items-center gap-3 text-white">
          <span className="text-xs uppercase tracking-widest opacity-80">Compliance Inbox</span>
          {critical > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-white text-[#C7405B] font-bold" data-testid="inbox-critical-count">
              {critical} CRITICAL
            </span>
          )}
        </div>
        <Link to="/dashboard/compliance-inbox" className="text-xs uppercase tracking-widest text-white/80 hover:text-white" data-testid="inbox-view-all-link">
          View all ({total}) →
        </Link>
      </div>
      <div className="p-4 grid grid-cols-3 gap-3 border-b border-black/5">
        <div>
          <div className="text-xs uppercase text-black/50">Critical</div>
          <div className="font-display font-black text-2xl" style={{ color: "#C7405B" }} data-testid="inbox-stat-critical">{critical}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-black/50">High</div>
          <div className="font-display font-black text-2xl" style={{ color: "#E6A70A" }} data-testid="inbox-stat-high">{high}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-black/50">Total open</div>
          <div className="font-display font-black text-2xl" data-testid="inbox-stat-total">{total}</div>
        </div>
      </div>
      {empty ? (
        <div className="p-8 text-center text-sm text-black/40" data-testid="inbox-empty">
          All clear — no open regulator deadlines or compliance breaches right now.
        </div>
      ) : (
        <div>
          {top_3.map(item => {
            const sev = SEVERITY_COLOR[item.severity] || SEVERITY_COLOR.medium;
            const industryColor = INDUSTRY_ACCENT[item.industry] || "#333";
            return (
              <Link
                to={item.cta_path || "/dashboard/compliance-inbox"}
                key={item.item_id}
                className="flex items-center gap-3 px-4 py-3 border-t border-black/5 hover:bg-black/[0.02] transition-colors"
                style={{ borderLeft: `4px solid ${industryColor}` }}
                data-testid={`inbox-item-${item.item_id}`}
              >
                <span
                  className="text-[10px] px-2 py-1 font-bold uppercase tracking-widest"
                  style={{ background: sev.bg, color: sev.fg }}
                >
                  {item.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{item.title}</div>
                  <div className="text-xs text-black/50 truncate">
                    <span className="uppercase font-bold" style={{ color: industryColor }}>{item.industry}</span>
                    {item.subtitle ? ` · ${item.subtitle}` : ""}
                  </div>
                </div>
                {item.due_at && (
                  <div className="text-xs text-right text-black/60 whitespace-nowrap">
                    {fmtDue(item.due_at, item.minutes_remaining)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
