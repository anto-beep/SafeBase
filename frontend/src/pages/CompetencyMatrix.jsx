import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CheckCircle, Warning, X, DownloadSimple, MagnifyingGlass } from "@phosphor-icons/react";
import { toast } from "sonner";

const STATUS_CELL = {
  current: { bg: "bg-emerald-600 text-white", label: "✓", title: "Current" },
  expiring_soon: { bg: "bg-amber-500 text-ink", label: "!", title: "Expiring soon (≤30d)" },
  expired: { bg: "bg-red-700 text-white", label: "✗", title: "Expired" },
};

export default function CompetencyMatrix() {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [trade, setTrade] = useState("");
  const [role, setRole] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/workers/competencies/matrix");
      setMatrix(r.data);
    } catch { toast.error("Failed to load competency matrix"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const trades = useMemo(() => {
    if (!matrix) return [];
    return Array.from(new Set((matrix.workers || []).map((w) => w.trade).filter(Boolean)));
  }, [matrix]);

  const roles = useMemo(() => {
    if (!matrix) return [];
    return Array.from(new Set((matrix.workers || []).map((w) => w.role).filter(Boolean)));
  }, [matrix]);

  const filteredWorkers = useMemo(() => {
    if (!matrix) return [];
    const qq = q.toLowerCase();
    return (matrix.workers || []).filter((w) => {
      if (qq && !(w.name || "").toLowerCase().includes(qq)) return false;
      if (trade && w.trade !== trade) return false;
      if (role && w.role !== role) return false;
      return true;
    });
  }, [matrix, q, trade, role]);

  const exportCsv = () => {
    if (!matrix) return;
    const topics = matrix.topics.map((t) => t.topic);
    const header = ["Worker", "Role", "Trade", "Coverage %", ...topics];
    const lines = [header.join(",")];
    for (const w of filteredWorkers) {
      const cov = matrix.coverage[w.worker_id]?.pct ?? 0;
      const row = [escapeCsv(w.name), escapeCsv(w.role || ""), escapeCsv(w.trade || ""), cov];
      for (const t of topics) {
        const cell = matrix.cells[w.worker_id]?.[t];
        row.push(cell ? cell.status : "missing");
      }
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `competency-matrix-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const totalCurrent = filteredWorkers.reduce((sum, w) => sum + (matrix?.coverage[w.worker_id]?.current || 0), 0);
  const totalCells = filteredWorkers.length * (matrix?.topics.length || 0);
  const overallPct = totalCells > 0 ? Math.round((totalCurrent / totalCells) * 100) : 0;

  return (
    <div className="space-y-6" data-testid="competency-matrix-page">
      <div className="border-b-2 border-ink pb-4">
        <div className="label-eyebrow">/ Workers · Competency Matrix</div>
        <h1 className="font-display text-3xl md:text-4xl font-black tracking-tighter mt-1">
          Worker Competency Matrix
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Workers × toolbox talk topics. Each cell shows whether the worker has a current
          competency stamp. Stamps auto-populate when a Toolbox Talk is conducted with the
          worker marked as an attendee.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Workers" value={matrix?.workers?.length || 0} testid="cm-stat-workers" />
        <Stat label="Topics" value={matrix?.topics?.length || 0} testid="cm-stat-topics" />
        <Stat label="Overall coverage" value={`${overallPct}%`} accent={overallPct >= 80 ? "text-emerald-700" : overallPct >= 50 ? "text-amber-600" : "text-red-700"} testid="cm-stat-coverage" />
        <Stat label="Expiring ≤30d" value={countExpiring(matrix, filteredWorkers)} accent="text-amber-600" testid="cm-stat-expiring" />
      </div>

      <div className="bg-background border border-border p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search worker…"
            className="h-10 pl-10 rounded-none border-ink"
            data-testid="cm-search"
          />
        </div>
        <Select value={trade || "__all__"} onValueChange={(v) => setTrade(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-10 w-36 rounded-none border-ink" data-testid="cm-filter-trade"><SelectValue placeholder="All trades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All trades</SelectItem>
            {trades.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={role || "__all__"} onValueChange={(v) => setRole(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-10 w-36 rounded-none border-ink" data-testid="cm-filter-role"><SelectValue placeholder="All roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All roles</SelectItem>
            {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="btn-sharp border-ink h-10"
          onClick={exportCsv}
          disabled={!matrix || filteredWorkers.length === 0}
          data-testid="cm-export-csv"
        >
          <DownloadSimple className="mr-2" />Export CSV
        </Button>
      </div>

      <div className="bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink">
            <tr>
              <th className="sticky left-0 bg-ink text-warning text-left px-3 py-2 label-eyebrow z-10 min-w-[180px]">Worker</th>
              <th className="text-left px-3 py-2 label-eyebrow text-warning">Coverage</th>
              {(matrix?.topics || []).map((t) => (
                <th key={t.topic} className="text-center px-2 py-2 label-eyebrow text-warning min-w-[80px]">
                  <div className="whitespace-normal leading-tight">{t.topic}</div>
                  <div className="text-[9px] font-normal text-warning/60 mt-0.5">{t.hazard_category}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={(matrix?.topics?.length || 0) + 2} className="px-3 py-4 text-xs text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && filteredWorkers.length === 0 && (
              <tr><td colSpan={(matrix?.topics?.length || 0) + 2} className="px-3 py-10 text-center">
                <Users className="mx-auto mb-2 text-muted-foreground" size={28} />
                <div className="text-sm font-bold">No workers match</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Clear filters or add workers, then conduct a toolbox talk to populate stamps.
                </div>
              </td></tr>
            )}
            {filteredWorkers.map((w) => {
              const cov = matrix.coverage[w.worker_id] || { pct: 0, current: 0, total: 0 };
              const covColor = cov.pct >= 80 ? "text-emerald-700" : cov.pct >= 50 ? "text-amber-600" : "text-red-700";
              return (
                <tr key={w.worker_id} className="border-t border-border" data-testid={`cm-row-${w.worker_id}`}>
                  <td className="sticky left-0 bg-background px-3 py-2 border-r border-border">
                    <div className="font-bold">{w.name}</div>
                    <div className="text-xs text-muted-foreground">{w.role}{w.trade ? ` · ${w.trade}` : ""}</div>
                  </td>
                  <td className={`px-3 py-2 font-display font-black ${covColor}`}>{cov.pct}%</td>
                  {(matrix?.topics || []).map((t) => {
                    const cell = matrix.cells[w.worker_id]?.[t.topic];
                    return (
                      <td key={t.topic} className="px-2 py-2 text-center">
                        {cell ? (
                          <span
                            title={`${STATUS_CELL[cell.status]?.title || "Missing"} — expires ${cell.expires_at?.slice(0, 10)}`}
                            className={`inline-flex items-center justify-center w-8 h-8 font-bold ${STATUS_CELL[cell.status]?.bg || "bg-muted"}`}
                            data-testid={`cm-cell-${w.worker_id}-${t.topic.replace(/\W+/g, '_')}`}
                          >
                            {STATUS_CELL[cell.status]?.label || "?"}
                          </span>
                        ) : (
                          <span
                            title="Not briefed"
                            className="inline-flex items-center justify-center w-8 h-8 text-muted-foreground border border-border"
                            data-testid={`cm-cell-${w.worker_id}-${t.topic.replace(/\W+/g, '_')}`}
                          >
                            <X size={14} />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-muted border border-border p-4 text-xs text-muted-foreground flex flex-wrap gap-4">
        <Legend color="bg-emerald-600 text-white" label="Current" icon={<CheckCircle weight="fill" />} />
        <Legend color="bg-amber-500 text-ink" label="Expiring ≤30d" icon={<Warning weight="fill" />} />
        <Legend color="bg-red-700 text-white" label="Expired" icon={<X />} />
        <Legend color="border border-border" label="Not briefed" icon={<X className="text-muted-foreground" />} plain />
      </div>
    </div>
  );
}

function Stat({ label, value, accent = "", testid }) {
  return (
    <div className="bg-background border border-border p-4" data-testid={testid}>
      <div className="label-eyebrow">{label}</div>
      <div className={`font-display text-3xl font-black mt-1 ${accent}`}>{value}</div>
    </div>
  );
}

function Legend({ color, label, icon, plain }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center justify-center w-6 h-6 ${plain ? color : color}`}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function escapeCsv(s) {
  if (s == null) return "";
  const v = String(s);
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function countExpiring(matrix, workers) {
  if (!matrix) return 0;
  let c = 0;
  for (const w of workers) {
    const cells = matrix.cells[w.worker_id] || {};
    for (const cell of Object.values(cells)) {
      if (cell.status === "expiring_soon") c++;
    }
  }
  return c;
}
