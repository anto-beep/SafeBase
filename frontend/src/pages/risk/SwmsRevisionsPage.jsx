import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, FilePlus, CheckCircle, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";

const STATUS_COLOURS = {
  open: "bg-amber-500 text-ink",
  in_progress: "bg-sky-600 text-white",
  completed: "bg-emerald-600 text-white",
  cancelled: "bg-muted text-ink",
};

const PRIORITY_COLOURS = {
  high: "bg-red-700 text-white",
  medium: "bg-amber-500 text-ink",
  low: "bg-muted text-ink",
};

export default function SwmsRevisionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/swms-revisions");
      setRows(r.data || []);
    } catch { toast.error("Failed to load revisions"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const patch = async (id, status) => {
    try {
      await api.patch(`/swms-revisions/${id}`, { status });
      toast.success(status === "completed" ? "Marked complete" : "Updated");
      load();
    } catch { toast.error("Update failed"); }
  };

  const open = rows.filter((r) => r.status !== "completed" && r.status !== "cancelled").length;
  const high = rows.filter((r) => r.priority === "high" && r.status !== "completed").length;
  const done = rows.filter((r) => r.status === "completed").length;

  return (
    <div className="space-y-6" data-testid="swms-revisions-page">
      <div className="border-b-2 border-ink pb-4">
        <div className="label-eyebrow">/ Safety · SWMS Revision Tasks</div>
        <h1 className="font-display text-3xl md:text-4xl font-black tracking-tighter mt-1">
          SWMS Revisions
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Revision tasks raised automatically when a Risk Review flagged failing controls. Close
          the learning loop: update the SWMS, then mark the task complete so the risk register
          stays aligned with what's actually happening on site.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={rows.length} testid="stat-total" />
        <StatCard label="Open" value={open} testid="stat-open" />
        <StatCard label="High priority" value={high} accent="text-red-700" testid="stat-high" />
        <StatCard label="Completed" value={done} accent="text-emerald-700" testid="stat-done" />
      </div>

      <div className="bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink text-warning">
            <tr>
              <th className="text-left px-3 py-2 label-eyebrow">Title</th>
              <th className="text-left px-3 py-2 label-eyebrow">Priority</th>
              <th className="text-left px-3 py-2 label-eyebrow">Linked risk</th>
              <th className="text-left px-3 py-2 label-eyebrow">Due</th>
              <th className="text-left px-3 py-2 label-eyebrow">Status</th>
              <th className="text-left px-3 py-2 label-eyebrow">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-3 py-4 text-xs text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center">
                <FilePlus className="mx-auto mb-2 text-muted-foreground" size={28} />
                <div className="text-sm font-bold">No SWMS revisions yet</div>
                <div className="text-xs text-muted-foreground mt-1">
                  They appear here after a Risk Review flags failing controls and a Safety Manager
                  accepts the AI-drafted remediation.
                </div>
              </td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.swms_revision_id} className="border-t border-border" data-testid={`swr-${r.swms_revision_id}`}>
                <td className="px-3 py-2 max-w-md">
                  <div className="font-bold">{r.title}</div>
                  {r.summary && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.summary}</div>}
                  {r.changes?.length > 0 && (
                    <details className="mt-1">
                      <summary className="text-[10px] cursor-pointer font-bold tracking-widest">
                        {r.changes.length} CHANGES
                      </summary>
                      <ul className="list-disc pl-4 mt-1 text-xs space-y-0.5">
                        {r.changes.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </details>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`${PRIORITY_COLOURS[r.priority] || "bg-muted"} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>
                    {(r.priority || "medium").toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.linked_risk_id ? (
                    <Link to={`/dashboard/risk-register/${r.linked_risk_id}`} className="underline">
                      {r.linked_risk_id}
                    </Link>
                  ) : "—"}
                  {r.linked_risk_title && <div className="text-muted-foreground">{r.linked_risk_title}</div>}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.due_date ? new Date(r.due_date).toLocaleDateString("en-AU") : "—"}
                </td>
                <td className="px-3 py-2">
                  <Select value={r.status} onValueChange={(v) => patch(r.swms_revision_id, v)}>
                    <SelectTrigger className={`h-8 w-36 rounded-none border-ink text-[10px] font-bold tracking-widest ${STATUS_COLOURS[r.status] || ""}`} data-testid={`swr-status-${r.swms_revision_id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  {r.status !== "completed" ? (
                    <Button
                      size="sm"
                      className="btn-sharp bg-emerald-600 text-white hover:bg-emerald-700 h-8"
                      onClick={() => patch(r.swms_revision_id, "completed")}
                      data-testid={`swr-complete-${r.swms_revision_id}`}
                    >
                      <CheckCircle className="mr-1" weight="fill" />Done
                    </Button>
                  ) : (
                    <span className="text-xs text-emerald-700 font-bold">
                      {r.completed_at ? new Date(r.completed_at).toLocaleDateString("en-AU") : "Done"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-muted border border-border p-4 text-xs text-muted-foreground flex items-start gap-2">
        <Warning weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          SWMS revisions are raised from Risk Reviews whose control-review rows flagged
          effectiveness as <strong>not</strong> or <strong>partial</strong>. Once complete,
          the next Risk Review's evidence summary will reflect the updated controls.
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = "", testid }) {
  return (
    <div className="bg-background border border-border p-4" data-testid={testid}>
      <div className="label-eyebrow">{label}</div>
      <div className={`font-display text-3xl font-black mt-1 ${accent}`}>{value}</div>
    </div>
  );
}
