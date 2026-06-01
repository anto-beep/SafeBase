/**
 * IncidentDrillDownDrawer — slide-over panel showing the underlying
 * incidents for whichever chart bucket was clicked. Used by every chart
 * in Reports.jsx Phase 2.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { X, ArrowRight, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function IncidentDrillDownDrawer({ open, onClose, chart, bucket, label, period, siteId, customFrom, customTo }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open || !chart) return;
    setLoading(true);
    const params = new URLSearchParams({ chart, bucket: bucket || "", period, site_id: siteId || "all" });
    if (period === "custom") {
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
    }
    api.get(`/analytics/incidents/list?${params.toString()}`)
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e?.response?.data?.detail || "Could not load drill-down"))
      .finally(() => setLoading(false));
  }, [open, chart, bucket, period, siteId, customFrom, customTo]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" data-testid="incident-drilldown-drawer">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-xl bg-background border-l-2 border-ink overflow-y-auto">
        <div className="sticky top-0 bg-ink text-white px-5 py-4 flex items-start justify-between">
          <div>
            <div className="label-eyebrow text-warning">Drill-down</div>
            <div className="font-display text-xl font-black mt-1">{label || bucket || chart}</div>
            <div className="text-xs text-white/60 mt-1">{loading ? "Loading…" : `${data?.count ?? 0} incident${(data?.count ?? 0) === 1 ? "" : "s"}`}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-white hover:text-warning"><X size={20} weight="bold" /></button>
        </div>
        <div className="p-5 space-y-2">
          {data?.incidents?.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">No incidents in this bucket for the current period.</div>
          )}
          {data?.incidents?.map((r) => (
            <Link
              key={r.incident_id}
              to={`/dashboard/incidents/${r.incident_id}`}
              onClick={onClose}
              className="block border border-border hover:border-ink p-3 group"
              data-testid={`drill-incident-${r.incident_id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-bold text-sm">{r.title || "Untitled incident"}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                    <span className="font-mono">{r.incident_id}</span>
                    {r.severity && <span className="bg-muted px-1.5 py-0.5">{r.severity}</span>}
                    {r.incident_type && <span className="bg-muted px-1.5 py-0.5">{(r.incident_type || "").replace("_", " ")}</span>}
                    {r.status && <span className="bg-muted px-1.5 py-0.5">{r.status}</span>}
                    {r.site && <span>· {r.site}</span>}
                    {r.notifiable && <span className="text-red-700 inline-flex items-center gap-1"><Warning size={12} /> Notifiable</span>}
                    {r.created_at && <span>· {r.created_at.slice(0, 10)}</span>}
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground group-hover:text-ink mt-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
