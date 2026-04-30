import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChartLineUp, FileText, Printer, Download } from "@phosphor-icons/react";
import { toast } from "sonner";

const ICONS = {
  compliance_score: ChartLineUp,
  incidents_trend: ChartLineUp,
  licence_expiry: FileText,
  training_matrix: FileText,
  swms_register: FileText,
  toolbox_talks_log: FileText,
  risk_register_export: FileText,
  inspections_summary: FileText,
  plant_register: FileText,
  worker_roster: FileText,
};

function PillarBadge({ status, children }) {
  const cls = { good: "bg-emerald-600 text-white", warn: "bg-warning text-ink", bad: "bg-red-700 text-white" }[status] || "bg-muted";
  return <span className={`${cls} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{children}</span>;
}

function ReportBody({ type, data }) {
  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  if (type === "compliance_score") {
    return (
      <div className="space-y-4">
        <div className="border-2 border-ink p-6 text-center">
          <div className="label-eyebrow text-muted-foreground">Compliance score</div>
          <div className="font-display text-6xl font-black tracking-tighter mt-1" data-testid="report-score-value">{data.score}</div>
          <div className="text-xs text-muted-foreground mt-1">out of 100</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {data.pillars.map((p) => (
            <div key={p.key} className="border border-border p-3 flex items-center justify-between">
              <div>
                <div className="label-eyebrow text-muted-foreground">{p.label}</div>
                <div className="font-display text-2xl font-black">{p.value}</div>
              </div>
              <PillarBadge status={p.status}>{p.status.toUpperCase()}</PillarBadge>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "incidents_trend") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-border p-3"><div className="label-eyebrow">Total</div><div className="font-display text-3xl font-black">{data.total}</div></div>
          <div className="border border-border p-3"><div className="label-eyebrow">Types</div><div className="font-display text-3xl font-black">{Object.keys(data.by_type).length}</div></div>
          <div className="border border-border p-3"><div className="label-eyebrow">Months</div><div className="font-display text-3xl font-black">{Object.keys(data.by_month).length}</div></div>
        </div>
        <div>
          <div className="label-eyebrow mb-2">By severity</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.by_severity).map(([k, v]) => (
              <span key={k} className="border border-border px-3 py-1 text-xs"><strong>{k}</strong> · {v}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="label-eyebrow mb-2">By month</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.by_month).sort().map(([k, v]) => (
              <span key={k} className="border border-border px-3 py-1 text-xs"><strong>{k}</strong> · {v}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "licence_expiry") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-600 text-white p-3"><div className="label-eyebrow">Valid</div><div className="font-display text-3xl font-black">{data.counts.valid}</div></div>
          <div className="bg-warning text-ink p-3"><div className="label-eyebrow">Expiring ≤30d</div><div className="font-display text-3xl font-black">{data.counts.expiring}</div></div>
          <div className="bg-red-700 text-white p-3"><div className="label-eyebrow">Expired</div><div className="font-display text-3xl font-black">{data.counts.expired}</div></div>
        </div>
        {["expired", "expiring", "valid"].map((k) => (
          data[k].length > 0 && (
            <div key={k}>
              <div className="label-eyebrow mt-3">{k.toUpperCase()}</div>
              <ul className="text-sm divide-y divide-border border border-border">
                {data[k].slice(0, 20).map((lic, i) => (
                  <li key={i} className="px-3 py-2 flex justify-between">
                    <span>{lic.licence_type || "—"} · {lic.worker_name || lic.holder_name || "—"}</span>
                    <span className="text-muted-foreground">{lic.expiry_date || "—"} {lic.days_to_expiry != null && `(${lic.days_to_expiry}d)`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        ))}
      </div>
    );
  }

  if (type === "training_matrix") {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">{data.workers_count} workers · {data.licence_types.length} licence types tracked</div>
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-ink text-warning"><tr>
              <th className="text-left px-3 py-2 label-eyebrow">Worker</th>
              <th className="text-left px-3 py-2 label-eyebrow">Trade</th>
              <th className="text-left px-3 py-2 label-eyebrow">Held</th>
              <th className="text-left px-3 py-2 label-eyebrow">Gaps</th>
            </tr></thead>
            <tbody>
              {data.rows.map((w, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 font-bold">{w.name || "—"}</td>
                  <td className="px-3 py-2">{w.trade || "—"}</td>
                  <td className="px-3 py-2">{w.held.join(", ") || "—"}</td>
                  <td className="px-3 py-2 text-red-700">{w.gaps.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Default table renderer for list-type reports
  const rows = data.rows || [];
  if (rows.length === 0) return <div className="border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">No data yet for this report.</div>;
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter((k) => !["_id", "user_id", "module"].includes(k)).slice(0, 6);
  return (
    <div className="border border-border overflow-x-auto max-h-[50vh] overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="bg-ink text-warning sticky top-0"><tr>{keys.map((k) => <th key={k} className="text-left px-3 py-2 label-eyebrow">{k}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, 100).map((r, i) => (
            <tr key={i} className="border-t border-border">
              {keys.map((k) => <td key={k} className="px-3 py-2 max-w-xs truncate">{typeof r[k] === "object" ? JSON.stringify(r[k]) : String(r[k] ?? "—")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Reports() {
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/reports").then((r) => setCatalog(r.data)).catch(() => {});
  }, []);

  const run = async (type) => {
    setSelected(type);
    setReport(null);
    setLoading(true);
    try {
      const r = await api.get(`/reports/${type}`);
      setReport(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  const downloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="border-b border-border pb-6">
        <div className="label-eyebrow">/ Reporting</div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Reports.</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">Ten pre-built reports — computed live from your data. Click any to generate. Print-ready for WorkSafe and principal contractors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalog.map((r) => {
          const Icon = ICONS[r.type] || FileText;
          return (
            <button
              key={r.type}
              onClick={() => run(r.type)}
              data-testid={`report-${r.type}-btn`}
              className="text-left border border-border bg-background p-5 hover:border-ink hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-warning flex items-center justify-center group-hover:bg-ink group-hover:text-warning transition-colors">
                  <Icon size={20} weight="duotone" />
                </div>
                <span className="label-eyebrow text-muted-foreground group-hover:text-ink">Run →</span>
              </div>
              <div className="font-display text-lg font-black tracking-tight mt-4">{r.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{r.desc}</div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) { setSelected(null); setReport(null); } }}>
        <DialogContent className="rounded-none max-w-3xl border-ink max-h-[90vh] overflow-y-auto print:max-w-full print:border-0 print:shadow-none" data-testid="report-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-tight">
              {report?.meta?.title || "Report"}
            </DialogTitle>
            <DialogDescription>
              {report?.meta?.desc || "Generated report"}
              {report?.generated_at && <span className="block text-xs mt-1">Generated {new Date(report.generated_at).toLocaleString("en-AU")}</span>}
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Generating…</div>
          ) : (
            <ReportBody type={selected} data={report} />
          )}
          <div className="flex justify-end gap-2 pt-4 border-t border-border print:hidden">
            <Button variant="outline" className="btn-sharp border-ink" onClick={downloadJson} data-testid="report-download-btn"><Download className="mr-2" />JSON</Button>
            <Button className="btn-sharp bg-ink text-white hover:bg-authority" onClick={printReport} data-testid="report-print-btn"><Printer className="mr-2" />Print / Save PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
