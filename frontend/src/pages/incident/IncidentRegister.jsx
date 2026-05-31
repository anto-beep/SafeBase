import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Warning, MagnifyingGlass, Siren, Clock, FileText } from "@phosphor-icons/react";
import { STAGES, severityColor } from "./constants";

function Stat({ label, value, hint, color = "bg-background" }) {
  return (
    <div className={`${color} border border-border p-4`}>
      <div className="label-eyebrow text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-black mt-1">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function StageBar({ current, stages_done = [] }) {
  return (
    <div className="flex gap-0.5" title={`Stage: ${current}`} data-testid={`stagebar-${current}`}>
      {STAGES.map((s) => {
        const isDone = stages_done.includes(s.key) && s.key !== current;
        const isCurrent = current === s.key;
        return (
          <span
            key={s.key}
            className={`w-3 h-3 rounded-full border ${isCurrent ? "bg-ink border-ink" : isDone ? "bg-emerald-600 border-emerald-600" : "bg-background border-border"}`}
          />
        );
      })}
    </div>
  );
}

function DaysOpen({ doc }) {
  if (doc.stage === "closed") return <span className="text-xs text-muted-foreground">{doc.lifecycle?.total_days || 0}d (closed)</span>;
  const d = doc.lifecycle?.total_days ?? 0;
  const overdue = doc.lifecycle?.overdue;
  const color = overdue ? "text-red-700 font-bold" : d > 20 ? "text-orange-600" : "text-emerald-700";
  return <span className={`text-xs ${color}`} data-testid={`days-open-${doc.incident_id}`}>{d}d{overdue ? " · overdue" : ""}</span>;
}

export default function IncidentRegister() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({});
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("__all__");
  const [notif, setNotif] = useState("__all__");
  const [sev, setSev] = useState("__all__");

  const load = async () => {
    const [r, s] = await Promise.all([
      api.get("/incident-workflow"),
      api.get("/incident-workflow/stats"),
    ]);
    setRows(r.data); setStats(s.data);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (stage !== "__all__" && r.stage !== stage) return false;
    if (notif === "only" && !r.notifiable) return false;
    if (notif === "no" && r.notifiable) return false;
    if (sev !== "__all__" && String(r.severity) !== sev) return false;
    if (q && !(`${r.title} ${r.reference} ${(r.submission?.description || "")}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [rows, q, stage, notif, sev]);

  return (
    <div className="space-y-6" data-testid="incident-register">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b-2 border-ink pb-6">
        <div>
          <div className="label-eyebrow">/ Safety</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Incidents</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">Five-stage workflow: Lodgement → Triage → Investigation → Actions → Closed. AI-assisted notifiability detection, root cause analysis, and lessons learned.</p>
        </div>
        <Link to="/dashboard/incidents/new">
          <Button className="btn-sharp bg-red-700 text-white hover:bg-red-800 h-12" data-testid="report-incident-btn">
            <Siren className="mr-2" weight="fill" />Report an incident
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3" data-testid="incident-stats">
        <Stat label="Total YTD" value={stats.total_ytd ?? 0} />
        <Stat label="Notifiable" value={stats.notifiable ?? 0} color={stats.notifiable ? "bg-red-50" : "bg-background"} />
        <Stat label="Lost Time" value={stats.lost_time ?? 0} />
        <Stat label="Medical Treatment" value={stats.medical_treatment ?? 0} />
        <Stat label="Near Miss" value={stats.near_miss ?? 0} />
        <Stat label="First Aid" value={stats.first_aid ?? 0} />
        <Stat label="Avg close days" value={stats.avg_close_days ?? 0} />
        <Stat label="Open > 30d" value={stats.open_over_30 ?? 0} color={stats.open_over_30 ? "bg-orange-50" : "bg-background"} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <MagnifyingGlass className="absolute top-3 left-3 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-10 h-11 w-64 rounded-none border-ink" data-testid="incident-search" />
        </div>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="h-11 w-44 rounded-none border-ink"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All stages</SelectItem>
            {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={notif} onValueChange={setNotif}>
          <SelectTrigger className="h-11 w-40 rounded-none border-ink"><SelectValue placeholder="Notifiable" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="only">Notifiable only</SelectItem>
            <SelectItem value="no">Not notifiable</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sev} onValueChange={setSev}>
          <SelectTrigger className="h-11 w-36 rounded-none border-ink"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            {[1, 2, 3, 4, 5, 6].map((n) => <SelectItem key={n} value={String(n)}>Severity {n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink text-warning">
            <tr>
              <th className="text-left px-3 py-3 label-eyebrow">Ref</th>
              <th className="text-left px-3 py-3 label-eyebrow">Date</th>
              <th className="text-left px-3 py-3 label-eyebrow">Title</th>
              <th className="text-left px-3 py-3 label-eyebrow">Severity</th>
              <th className="text-left px-3 py-3 label-eyebrow">Site</th>
              <th className="text-left px-3 py-3 label-eyebrow">Notifiable</th>
              <th className="text-left px-3 py-3 label-eyebrow">Stage</th>
              <th className="text-left px-3 py-3 label-eyebrow">Days open</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.incident_id} className={`border-t border-border ${r.urgent ? "bg-red-50" : ""}`} data-testid={`incident-row-${r.reference}`}>
                <td className="px-3 py-3 font-mono text-xs font-bold">
                  <Link to={`/dashboard/incidents/${r.incident_id}`} className="hover:underline" data-testid={`incident-link-ref-${r.reference}`}>{r.reference}</Link>
                </td>
                <td className="px-3 py-3 text-xs">{new Date(r.created_at).toLocaleDateString("en-AU")}</td>
                <td className="px-3 py-3 max-w-xs">
                  <Link to={`/dashboard/incidents/${r.incident_id}`} className="font-bold line-clamp-2 hover:underline" data-testid={`incident-link-title-${r.reference}`}>{r.title}</Link>
                </td>
                <td className="px-3 py-3"><span className={`${severityColor(r.severity)} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{r.severity ? `SEV ${r.severity}` : "—"}</span></td>
                <td className="px-3 py-3 text-xs">{r.site || "—"}</td>
                <td className="px-3 py-3">{r.notifiable ? <span className="bg-red-700 text-white px-2 py-0.5 text-[10px] font-bold tracking-widest"><Warning weight="fill" className="inline mr-1" />YES</span> : <span className="text-xs text-muted-foreground">no</span>}</td>
                <td className="px-3 py-3"><StageBar current={r.stage} stages_done={r.stages_done || []} /><div className="text-[10px] mt-0.5 uppercase tracking-widest">{r.stage}</div></td>
                <td className="px-3 py-3"><DaysOpen doc={r} /></td>
                <td className="px-3 py-3 text-right"><Link to={`/dashboard/incidents/${r.incident_id}`} className="label-eyebrow underline">Open →</Link></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="px-3 py-12 text-center text-muted-foreground">No incidents match. <Link to="/dashboard/incidents/new" className="underline">Report one →</Link></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
