import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, ArrowRight, Sparkle, MagnifyingGlass, SquaresFour, FileText, Clock, Gauge, ShieldWarning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { riskLevel, MatrixCellClass } from "./constants";

function Stat({ label, value, hint, color = "bg-background" }) {
  return (
    <div className={`${color} border border-border p-5`}>
      <div className="label-eyebrow text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-black mt-2">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function HeatMap({ risks, view, onCellClick }) {
  // 5x5 — X axis Consequence (1..5), Y axis Likelihood (5..1 top-down).
  const cells = {};
  for (let l = 1; l <= 5; l++) for (let c = 1; c <= 5; c++) cells[`${l}-${c}`] = [];
  risks.forEach((r) => {
    const L = view === "inherent" ? r.inherent_likelihood : r.residual_likelihood;
    const C = view === "inherent" ? r.inherent_consequence : r.residual_consequence;
    if (L && C) cells[`${L}-${C}`].push(r);
  });
  const rows = [5, 4, 3, 2, 1];
  const cols = [1, 2, 3, 4, 5];
  return (
    <div className="bg-background border border-border p-4" data-testid={`heatmap-${view}`}>
      <div className="grid" style={{ gridTemplateColumns: "auto repeat(5, 1fr)" }}>
        <div />
        {cols.map((c) => <div key={c} className="label-eyebrow text-center py-1 text-[10px]">C{c}</div>)}
        {rows.map((l) => (
          <div key={l} className="contents">
            <div className="label-eyebrow self-center pr-2 text-[10px]">L{l}</div>
            {cols.map((c) => {
              const score = l * c;
              const list = cells[`${l}-${c}`];
              return (
                <button key={c}
                  onClick={() => list.length && onCellClick(list)}
                  className={`${MatrixCellClass(score)} border border-white/20 h-14 text-center font-display font-black text-lg hover:opacity-80`}
                  data-testid={`heat-cell-${l}-${c}`}
                  disabled={!list.length}
                >
                  {list.length || ""}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground flex gap-3 flex-wrap">
        <span>X = Consequence · Y = Likelihood · colour = score band</span>
      </div>
    </div>
  );
}

function RegisterTab() {
  const [risks, setRisks] = useState([]);
  const [summary, setSummary] = useState({ total: 0, by_level: { extreme: 0, high: 0, medium: 0, low: 0 }, reviews_overdue: 0, reviews_due_30: 0, open_actions: 0, avg_residual_score: 0 });
  const [intel, setIntel] = useState(null);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("__all__");
  const [status, setStatus] = useState("active");
  const [processFilter, setProcessFilter] = useState("__all__");
  const [showHeat, setShowHeat] = useState(false);
  const [heatView, setHeatView] = useState("residual");
  const [heatDrawer, setHeatDrawer] = useState(null);
  const [processes, setProcesses] = useState([]);

  const load = async () => {
    const [r, s, p, i] = await Promise.all([
      api.get("/risks"),
      api.get("/risks/summary"),
      api.get("/library/process"),
      api.get("/risks/ai/intelligence").catch(() => ({ data: null })),
    ]);
    setRisks(r.data); setSummary(s.data); setProcesses(p.data); setIntel(i.data);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return risks.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (level !== "__all__" && (r.residual_level || r.inherent_level) !== level) return false;
      if (processFilter !== "__all__" && r.process_id !== processFilter) return false;
      if (q && !(`${r.title} ${r.description || ""} ${r.hazard_description || ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [risks, q, level, status, processFilter]);

  const exportCsv = () => {
    const header = "risk_id,title,process,activity,inherent,residual,owner,next_review,status\n";
    const rows = filtered.map((r) => [
      r.risk_id, `"${(r.title || "").replace(/"/g, "''")}"`, r.process_name || "", r.activity_name || "",
      r.inherent_score || "", r.residual_score || "", r.risk_owner || "",
      r.next_review_date || "", r.status || "",
    ].join(",")).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "risk-register.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-testid="risk-stats-row">
        <Stat label="Total risks" value={summary.total} hint={`Ext ${summary.by_level.extreme} · High ${summary.by_level.high} · Med ${summary.by_level.medium} · Low ${summary.by_level.low}`} />
        <Stat label="Reviews requiring attention" value={summary.reviews_overdue + summary.reviews_due_30} hint={`${summary.reviews_overdue} overdue · ${summary.reviews_due_30} due in 30d`} color={summary.reviews_overdue ? "bg-red-50" : "bg-background"} />
        <Stat label="Open corrective actions" value={summary.open_actions} />
        <Stat label="Avg residual score" value={`${summary.avg_residual_score}/25`} />
      </div>

      {/* AI intelligence banner */}
      {intel && (intel.trending.length || intel.gap_activities.length || intel.not_effective.length || intel.overdue_with_activity.length) ? (
        <div className="bg-ink text-white p-5 border-2 border-ink" data-testid="ai-intel-banner">
          <div className="label-eyebrow text-warning flex items-center gap-2"><Sparkle weight="fill" /> / AI risk intelligence</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            {intel.trending.length > 0 && (
              <div>
                <div className="text-xs text-white/60">Trending risks (incidents up, last 90d)</div>
                <ul className="mt-2 space-y-1 text-sm">{intel.trending.slice(0, 3).map((t) => <li key={t.risk_id}>• {t.title} <span className="text-white/50">({t.incident_count_90d})</span></li>)}</ul>
              </div>
            )}
            {intel.not_effective.length > 0 && (
              <div>
                <div className="text-xs text-white/60">Controls flagged not effective</div>
                <ul className="mt-2 space-y-1 text-sm">{intel.not_effective.slice(0, 3).map((t) => <li key={t.control}>• {t.control} <span className="text-white/50">({t.risks_flagged})</span></li>)}</ul>
              </div>
            )}
            {intel.gap_activities.length > 0 && (
              <div>
                <div className="text-xs text-white/60">Activities with incidents but no risk</div>
                <ul className="mt-2 space-y-1 text-sm">{intel.gap_activities.slice(0, 3).map((t) => <li key={t.activity}>• {t.activity} <span className="text-white/50">({t.incident_count_90d})</span></li>)}</ul>
              </div>
            )}
            {intel.benchmarks && (
              <div>
                <div className="text-xs text-white/60">Peer benchmark (HIGH + EXTREME)</div>
                <div className="mt-2 font-display text-2xl font-black">{intel.benchmarks.your_high_or_extreme}<span className="text-sm text-white/60"> vs typical {intel.benchmarks.peer_typical}</span></div>
                <div className="text-xs mt-1 text-warning uppercase tracking-widest">{intel.benchmarks.signal}</div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Filters + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <MagnifyingGlass className="absolute top-3 left-3 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search risks…" className="pl-10 h-11 w-64 rounded-none border-ink" data-testid="risk-search" />
          </div>
          <Select value={processFilter} onValueChange={setProcessFilter}>
            <SelectTrigger className="h-11 w-52 rounded-none border-ink"><SelectValue placeholder="Process" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All processes</SelectItem>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="h-11 w-40 rounded-none border-ink"><SelectValue placeholder="Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All levels</SelectItem>
              <SelectItem value="extreme">Extreme</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-11 w-32 rounded-none border-ink"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="btn-sharp border-ink h-11" onClick={() => setShowHeat((v) => !v)} data-testid="heatmap-toggle">
            <SquaresFour className="mr-2" />{showHeat ? "Hide" : "Show"} Heat Map
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="btn-sharp border-ink h-11" onClick={exportCsv} data-testid="export-csv-btn"><FileText className="mr-2" />Export CSV</Button>
          <Link to="/dashboard/risk-register/new"><Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" data-testid="add-risk-btn"><Plus className="mr-2" weight="bold" />Add New Risk</Button></Link>
        </div>
      </div>

      {showHeat && (
        <div className="space-y-3">
          <div className="inline-flex border-2 border-ink bg-background">
            <button onClick={() => setHeatView("inherent")} className={`px-3 py-1 text-xs ${heatView === "inherent" ? "bg-ink text-warning" : ""}`} data-testid="heat-view-inherent">Inherent</button>
            <button onClick={() => setHeatView("residual")} className={`px-3 py-1 text-xs border-l-2 border-ink ${heatView === "residual" ? "bg-ink text-warning" : ""}`} data-testid="heat-view-residual">Residual</button>
          </div>
          <HeatMap risks={filtered} view={heatView} onCellClick={(list) => setHeatDrawer(list)} />
          {heatDrawer && (
            <div className="bg-muted border border-border p-4" data-testid="heat-drawer">
              <div className="flex items-center justify-between"><div className="label-eyebrow">Risks at this cell</div><button onClick={() => setHeatDrawer(null)} className="text-xs underline">Close</button></div>
              <ul className="mt-2 space-y-1">{heatDrawer.map((r) => <li key={r.risk_id} className="text-sm"><Link to={`/dashboard/risk-register/${r.risk_id}`} className="underline">{r.risk_id}</Link> — {r.title}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <div className="bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink text-warning">
            <tr>
              <th className="text-left px-4 py-3 label-eyebrow">ID</th>
              <th className="text-left px-4 py-3 label-eyebrow">Title</th>
              <th className="text-left px-4 py-3 label-eyebrow">Process / Activity</th>
              <th className="text-left px-4 py-3 label-eyebrow">Inherent</th>
              <th className="text-left px-4 py-3 label-eyebrow">Controls</th>
              <th className="text-left px-4 py-3 label-eyebrow">Residual</th>
              <th className="text-left px-4 py-3 label-eyebrow">Next Review</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const il = riskLevel(r.inherent_score);
              const rl = riskLevel(r.residual_score);
              return (
                <tr key={r.risk_id} className="border-t border-border" data-testid={`risk-row-${r.risk_id}`}>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{r.risk_id}</td>
                  <td className="px-4 py-3 max-w-xs"><div className="font-bold line-clamp-2">{r.title}</div></td>
                  <td className="px-4 py-3 text-xs">{r.process_name || "—"}<div className="text-muted-foreground">{r.activity_name || "—"}</div></td>
                  <td className="px-4 py-3"><span className={`${il.color} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{il.label}</span> <span className="text-xs text-muted-foreground">{r.inherent_score || ""}</span></td>
                  <td className="px-4 py-3 text-center">{(r.controls || []).length}</td>
                  <td className="px-4 py-3"><span className={`${rl.color} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{rl.label}</span> <span className="text-xs text-muted-foreground">{r.residual_score || ""}</span></td>
                  <td className="px-4 py-3 text-xs">{r.next_review_date ? new Date(r.next_review_date).toLocaleDateString("en-AU") : "—"}</td>
                  <td className="px-4 py-3 text-right"><Link to={`/dashboard/risk-register/${r.risk_id}`} className="label-eyebrow underline">View →</Link></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No risks match your filters. <Link to="/dashboard/risk-register/new" className="underline">Add your first risk →</Link></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ overdue: 0, due_this_month: 0, completed_ytd: 0, avg_days: 0 });
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const load = async () => {
    const [r, s, i] = await Promise.all([
      api.get("/risk-reviews"),
      api.get("/risk-reviews/summary"),
      api.get("/risks/ai/intelligence").catch(() => ({ data: null })),
    ]);
    setReviews(r.data); setSummary(s.data);
    // Derive AI review suggestions from the same intel payload
    if (i.data?.overdue_with_activity?.length) setAiSuggestions(i.data.overdue_with_activity);
  };
  useEffect(() => { load(); }, []);

  const initiate = async (risk_id) => {
    try {
      const r = await api.post("/risk-reviews", { risk_id, reasons: ["AI-suggested review"], reason_detail: "Risk is overdue with recent activity." });
      toast.success(`Review ${r.data.review_id} started`);
      window.location.href = `/dashboard/risk-register/reviews/${r.data.review_id}`;
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const filtered = useMemo(() => {
    return reviews.filter((r) => statusFilter === "__all__" || r.status === statusFilter);
  }, [reviews, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="Reviews overdue" value={summary.overdue} color={summary.overdue ? "bg-red-50" : "bg-background"} />
        <Stat label="Due this month" value={summary.due_this_month} color={summary.due_this_month ? "bg-yellow-50" : "bg-background"} />
        <Stat label="Completed YTD" value={summary.completed_ytd} />
        <Stat label="Avg days to complete" value={summary.avg_days} />
      </div>

      {aiSuggestions.length > 0 && (
        <div className="bg-ink text-white p-5" data-testid="ai-review-suggestions">
          <div className="label-eyebrow text-warning flex items-center gap-2"><Sparkle weight="fill" /> / AI suggested reviews</div>
          <p className="text-sm text-white/70 mt-1">Overdue risks with recent incident/inspection activity. One-click initiate below.</p>
          <ul className="mt-3 space-y-2">
            {aiSuggestions.map((s) => (
              <li key={s.risk_id} className="flex items-center justify-between border-b border-white/10 pb-2">
                <div><span className="font-bold">{s.title}</span> <span className="text-xs text-white/60">· overdue {s.days_overdue}d</span></div>
                <Button size="sm" className="btn-sharp bg-warning text-ink hover:bg-warning/90" onClick={() => initiate(s.risk_id)} data-testid={`ai-init-${s.risk_id}`}>Initiate review</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 w-48 rounded-none border-ink"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="pending_approval">Pending approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Link to="/dashboard/risk-register/reviews/new"><Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" data-testid="schedule-review-btn"><Plus className="mr-2" weight="bold" />Schedule review</Button></Link>
      </div>

      <div className="bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink text-warning"><tr>
            <th className="text-left px-4 py-3 label-eyebrow">Review</th>
            <th className="text-left px-4 py-3 label-eyebrow">Risk</th>
            <th className="text-left px-4 py-3 label-eyebrow">Reasons</th>
            <th className="text-left px-4 py-3 label-eyebrow">Status</th>
            <th className="text-left px-4 py-3 label-eyebrow">Due</th>
            <th></th>
          </tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.review_id} className="border-t border-border" data-testid={`review-row-${r.review_id}`}>
                <td className="px-4 py-3 font-mono text-xs font-bold">{r.review_id}</td>
                <td className="px-4 py-3">{r.risk_title}<div className="text-xs text-muted-foreground">{r.risk_id}</div></td>
                <td className="px-4 py-3 text-xs">{(r.reasons || []).slice(0, 2).join(" · ") || "—"}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 text-[10px] font-bold tracking-widest ${r.status === "approved" ? "bg-emerald-600 text-white" : r.status === "pending_approval" ? "bg-yellow-400 text-ink" : r.status === "rejected" ? "bg-red-700 text-white" : "bg-muted text-muted-foreground"}`}>{(r.status || "").replace("_", " ").toUpperCase()}</span></td>
                <td className="px-4 py-3 text-xs">{r.target_completion_date ? new Date(r.target_completion_date).toLocaleDateString("en-AU") : "—"}</td>
                <td className="px-4 py-3 text-right"><Link to={`/dashboard/risk-register/reviews/${r.review_id}`} className="label-eyebrow underline">Open →</Link></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No reviews yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RiskRegisterPage() {
  return (
    <div className="space-y-6" data-testid="risk-register-page">
      <div className="border-b border-border pb-6">
        <div className="label-eyebrow">/ Safety</div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Risk Register</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">Every identified risk across your business — linked to inspections, incidents, SWMS, and controls. With AI-assisted suggestions and scheduled reviews.</p>
      </div>
      <Tabs defaultValue="register" className="space-y-4">
        <TabsList className="bg-muted rounded-none border border-border p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="register" className="rounded-none" data-testid="tab-register"><ShieldWarning className="mr-2" />Risk Register</TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-none" data-testid="tab-reviews"><Clock className="mr-2" />Risk Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="register"><RegisterTab /></TabsContent>
        <TabsContent value="reviews"><ReviewsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
