import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkle, Plus, Trash, FloppyDisk, ArrowRight, Warning, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  HIERARCHY_LEVELS, HIERARCHY_MAP, HAZARD_CATEGORIES,
  LIKELIHOOD_SCALE, CONSEQUENCE_SCALE, SOURCE_OPTIONS, riskLevel, MatrixCellClass,
} from "./constants";

const SECTIONS = [
  { id: "sec1", label: "1. Process & Activity" },
  { id: "sec2", label: "2. Hazard" },
  { id: "sec3", label: "3. Risk Details" },
  { id: "sec4", label: "4. Inherent Risk" },
  { id: "sec5", label: "5. Controls" },
  { id: "sec6", label: "6. Residual Risk" },
  { id: "sec7", label: "7. Review Schedule" },
  { id: "sec8", label: "8. Summary & Sign-off" },
];

function ScaleRadio({ scale, value, onChange, name }) {
  return (
    <div className="space-y-2">
      {scale.map((s) => (
        <label key={s.v} className={`flex items-start gap-3 border-2 p-3 cursor-pointer ${value === s.v ? "border-ink bg-muted" : "border-border hover:border-ink/60"}`}>
          <input type="radio" name={name} checked={value === s.v} onChange={() => onChange(s.v)} className="mt-1" data-testid={`${name}-${s.v}`} />
          <div>
            <div className="font-bold text-sm">{s.v} — {s.label}</div>
            <div className="text-xs text-muted-foreground">{s.help}</div>
          </div>
        </label>
      ))}
    </div>
  );
}

function Matrix({ l, c }) {
  const cells = [];
  for (let row = 5; row >= 1; row--) for (let col = 1; col <= 5; col++) cells.push([row, col]);
  return (
    <div className="grid grid-cols-6 gap-1 text-[10px]" data-testid="risk-matrix">
      <div />
      {[1, 2, 3, 4, 5].map((col) => <div key={col} className="text-center font-bold">C{col}</div>)}
      {cells.map(([row, col], i) => {
        const show = i % 6 === 0;
        const rowLabel = show ? <div className="self-center font-bold pr-1">L{6 - Math.floor(i / 6) - 1 + 1 - 0 /* noop */}</div> : null;
        const score = row * col;
        const active = row === l && col === c;
        return [
          (col === 1) && <div key={`lbl-${row}`} className="text-right font-bold">L{row}</div>,
          <div key={`${row}-${col}`} className={`${MatrixCellClass(score)} h-8 text-center leading-8 font-bold ${active ? "ring-4 ring-ink" : ""}`}>{score}</div>,
        ];
      })}
    </div>
  );
}

function ControlsPyramid({ controls }) {
  const counts = HIERARCHY_LEVELS.map((h) => ({
    ...h, count: controls.filter((c) => c.hierarchy_level === h.key).length,
  }));
  let commentary = "Strong control profile.";
  const upper = counts.slice(0, 2).reduce((s, x) => s + x.count, 0); // elim + subst
  const ppe = counts.find((c) => c.key === "ppe")?.count || 0;
  const total = controls.length;
  if (total === 0) commentary = "No controls added yet — start by adding elimination or substitution controls.";
  else if (upper === 0) commentary = "Consider whether elimination or substitution controls are feasible.";
  else if (total > 0 && ppe / total > 0.6) commentary = "PPE-heavy — look for engineering or administrative controls.";
  return (
    <div className="bg-muted border border-border p-4" data-testid="controls-pyramid">
      <div className="label-eyebrow mb-3">Controls hierarchy</div>
      <div className="space-y-1">
        {counts.map((h) => (
          <div key={h.key} className="flex items-center gap-2">
            <span className={`${h.color} px-2 py-0.5 text-[10px] font-bold tracking-widest w-28 text-center`}>{h.label}</span>
            <div className="flex-1 bg-background border border-border h-5 relative">
              <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${Math.min(100, h.count * 20)}%` }} />
            </div>
            <span className="font-display font-black w-6 text-right">{h.count}</span>
          </div>
        ))}
      </div>
      <div className="text-xs mt-3 border-t border-border pt-2">{commentary}</div>
    </div>
  );
}

export default function RiskForm() {
  const { risk_id } = useParams();
  const nav = useNavigate();
  const editing = !!risk_id;

  const [processes, setProcesses] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [controlsLib, setControlsLib] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [swmsDocs, setSwmsDocs] = useState([]);

  const [form, setForm] = useState({
    title: "", status: "active",
    process_id: "", process_name: "",
    activity_id: "", activity_name: "",
    task_ids: [], task_names: [],
    primary_hazard: "", secondary_hazard: "",
    hazard_description: "", at_risk: [],
    description: "", risk_owner: "", sites: [],
    date_identified: new Date().toISOString().slice(0, 10),
    source: "", linked_incident_ids: [], linked_swms_ids: [],
    inherent_likelihood: null, inherent_consequence: null,
    controls: [],
    residual_likelihood: null, residual_consequence: null,
    residual_acceptable: "yes", residual_conditions: "",
    additional_actions: [],
    review_frequency: "quarterly", notify_days_before: 14, notify_safety_manager: true,
    triggers: { on_new_incident: true, on_failed_inspection: true, on_swms_update: true, on_near_miss: true },
    acknowledged_by: "",
  });
  const [aiBusy, setAiBusy] = useState(false);
  const [aiRisks, setAiRisks] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/library/process"), api.get("/library/activity"), api.get("/library/task"),
      api.get("/workers"), api.get("/library/control"),
      api.get("/incidents"), api.get("/documents"),
    ]).then(([p, a, t, w, c, i, d]) => {
      setProcesses(p.data); setActivities(a.data); setTasks(t.data);
      setWorkers(w.data); setControlsLib(c.data);
      setIncidents(i.data); setSwmsDocs(d.data);
    });
    if (editing) {
      api.get(`/risks/${risk_id}`).then((r) => setForm((f) => ({ ...f, ...r.data })));
    }
    // eslint-disable-next-line
  }, [risk_id]);

  const filteredActivities = useMemo(() => activities.filter((a) => !form.process_id || a.parent_process_id === form.process_id), [activities, form.process_id]);
  const filteredTasks = useMemo(() => tasks.filter((t) => !form.activity_id || t.parent_activity_id === form.activity_id), [tasks, form.activity_id]);

  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setProcess = (id) => {
    const p = processes.find((x) => x.id === id);
    patch("process_id", id); patch("process_name", p?.name || "");
    patch("activity_id", ""); patch("activity_name", "");
    patch("task_ids", []); patch("task_names", []);
  };
  const setActivity = (id) => {
    const a = activities.find((x) => x.id === id);
    patch("activity_id", id); patch("activity_name", a?.name || "");
    patch("task_ids", []); patch("task_names", []);
  };
  const toggleTask = (id) => {
    const already = form.task_ids.includes(id);
    const next = already ? form.task_ids.filter((x) => x !== id) : [...form.task_ids, id];
    const names = next.map((tid) => tasks.find((t) => t.id === tid)?.name).filter(Boolean);
    patch("task_ids", next); patch("task_names", names);
  };

  const runAiRisks = async () => {
    if (!form.process_name || !form.activity_name) return toast.error("Select a process and activity first");
    setAiBusy(true);
    try {
      const r = await api.post("/risks/ai/suggest", {
        process_name: form.process_name, activity_name: form.activity_name,
      });
      setAiRisks(r.data.risks || []);
      if (r.data.fallback) toast.info("AI unavailable — showing standard suggestions");
    } catch { toast.error("AI suggest failed"); }
    setAiBusy(false);
  };
  const applyAiRisk = (s) => {
    patch("title", s.title);
    patch("primary_hazard", s.hazard_category);
    patch("hazard_description", s.description);
    patch("inherent_likelihood", s.likelihood);
    patch("inherent_consequence", s.consequence);
    toast.success("Risk fields populated from AI");
    document.getElementById("sec2")?.scrollIntoView({ behavior: "smooth" });
  };

  const addControl = () => setForm((f) => ({
    ...f,
    controls: [...f.controls, {
      name: "", description: "", hierarchy_level: "administrative",
      status: "planned", responsible: "", implementation_date: "",
      effectiveness: "medium", evidence: "",
    }],
  }));
  const patchControl = (i, k, v) => setForm((f) => {
    const next = [...f.controls]; next[i] = { ...next[i], [k]: v }; return { ...f, controls: next };
  });
  const removeControl = (i) => setForm((f) => ({ ...f, controls: f.controls.filter((_, ix) => ix !== i) }));
  const addFromLibrary = (lib) => setForm((f) => ({
    ...f,
    controls: [...f.controls, {
      library_id: lib.id, name: lib.name, description: lib.description,
      hierarchy_level: lib.hierarchy_level, status: "planned",
      responsible: "", implementation_date: "",
      effectiveness: lib.effectiveness, evidence: "",
    }],
  }));

  const runAiControls = async () => {
    if (!form.hazard_description) return toast.error("Describe the hazard first (Section 2)");
    setAiBusy(true);
    try {
      const r = await api.post("/risks/ai/suggest-controls", {
        hazard_description: form.hazard_description,
        activity_name: form.activity_name,
      });
      (r.data.controls || []).forEach((s) => {
        setForm((f) => ({
          ...f,
          controls: [...f.controls, {
            name: s.name, description: s.description,
            hierarchy_level: s.hierarchy_level, status: "planned",
            responsible: "", implementation_date: "",
            effectiveness: s.effectiveness || "medium", evidence: "",
          }],
        }));
      });
      toast.success(`Added ${(r.data.controls || []).length} AI-suggested controls`);
    } catch { toast.error("AI suggest failed"); }
    setAiBusy(false);
  };

  const addAction = () => setForm((f) => ({
    ...f,
    additional_actions: [...f.additional_actions, { description: "", assigned_to: "", due_date: "", priority: "medium", status: "open" }],
  }));
  const patchAction = (i, k, v) => setForm((f) => {
    const next = [...f.additional_actions]; next[i] = { ...next[i], [k]: v }; return { ...f, additional_actions: next };
  });
  const removeAction = (i) => setForm((f) => ({ ...f, additional_actions: f.additional_actions.filter((_, ix) => ix !== i) }));

  const save = async (status = "active") => {
    setSaving(true);
    try {
      const payload = { ...form, status };
      if (editing) await api.patch(`/risks/${risk_id}`, payload);
      else await api.post("/risks", payload);
      toast.success("Risk saved");
      nav("/dashboard/risk-register");
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
    setSaving(false);
  };

  const il = form.inherent_likelihood && form.inherent_consequence ? form.inherent_likelihood * form.inherent_consequence : 0;
  const rl = form.residual_likelihood && form.residual_consequence ? form.residual_likelihood * form.residual_consequence : 0;
  const inherent = riskLevel(il);
  const residual = riskLevel(rl);
  const reduction = il && rl ? il - rl : 0;
  const reductionPct = il ? Math.round((reduction / il) * 100) : 0;

  const residualWarning = rl >= 12 ? "high_or_extreme" : (il && rl && rl > il) ? "increased" : "ok";
  const upper = form.controls.filter((c) => ["elimination", "substitution"].includes(c.hierarchy_level)).length;

  return (
    <div className="space-y-6" data-testid="risk-form">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6 sticky top-0 bg-background z-10">
        <div>
          <div className="label-eyebrow">/ Risk Register</div>
          <h1 className="font-display text-3xl font-black tracking-tighter mt-1">{editing ? `Edit ${risk_id}` : "Add a new risk"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="btn-sharp border-ink h-11" onClick={() => save("draft")} disabled={saving} data-testid="save-draft-btn">Save as draft</Button>
          <Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" onClick={() => save("active")} disabled={saving} data-testid="save-publish-btn"><FloppyDisk className="mr-2" weight="fill" />Save & Publish</Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1 overflow-x-auto py-2 sticky top-[88px] bg-background z-10 border-b border-border" data-testid="risk-form-progress">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="px-3 py-1 border border-border hover:border-ink text-[10px] font-bold tracking-widest uppercase">{s.label}</a>
        ))}
      </div>

      {/* Section 1 */}
      <section id="sec1" className="bg-background border border-border p-6 space-y-4">
        <h2 className="font-display text-2xl font-black">1. What work is this risk associated with?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="label-eyebrow">Process</Label>
            <Select value={form.process_id || "__none__"} onValueChange={(v) => setProcess(v === "__none__" ? "" : v)}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="f-process"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">—</SelectItem>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label-eyebrow">Activity</Label>
            <Select value={form.activity_id || "__none__"} onValueChange={(v) => setActivity(v === "__none__" ? "" : v)} disabled={!form.process_id}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="f-activity"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">—</SelectItem>{filteredActivities.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
            <Link to="/dashboard/library/activities" className="text-xs underline">Can't find it? Add to library +</Link>
          </div>
          <div>
            <Label className="label-eyebrow">Tasks (multi-select)</Label>
            <div className="mt-2 border border-ink p-2 max-h-40 overflow-y-auto">
              {filteredTasks.length === 0 && <div className="text-xs text-muted-foreground p-2">No tasks for this activity yet. <Link to="/dashboard/library/tasks" className="underline">Add one →</Link></div>}
              {filteredTasks.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm py-0.5">
                  <input type="checkbox" checked={form.task_ids.includes(t.id)} onChange={() => toggleTask(t.id)} />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <Button onClick={runAiRisks} disabled={aiBusy || !form.activity_id} variant="outline" className="btn-sharp border-ink" data-testid="ai-suggest-risks">
          <Sparkle className="mr-2" weight="fill" />{aiBusy ? "Thinking…" : "AI suggest risks for this activity"}
        </Button>
        {aiRisks.length > 0 && (
          <div className="space-y-2">
            {aiRisks.map((s, i) => (
              <div key={i} className="border border-border p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-sm">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.hazard_category} · L{s.likelihood} C{s.consequence}</div>
                </div>
                <Button size="sm" className="btn-sharp bg-ink text-white" onClick={() => applyAiRisk(s)} data-testid={`apply-ai-risk-${i}`}>Use this →</Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2 */}
      <section id="sec2" className="bg-background border border-border p-6 space-y-4">
        <h2 className="font-display text-2xl font-black">2. What is the hazard?</h2>
        <div>
          <Label className="label-eyebrow">Risk title (max 100 chars)</Label>
          <Input maxLength={100} value={form.title} onChange={(e) => patch("title", e.target.value)} className="mt-2 h-11 rounded-none border-ink" placeholder="e.g. Electrocution from contact with live conductors during cable termination" data-testid="f-title" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="label-eyebrow">Primary hazard</Label>
            <Select value={form.primary_hazard || "__none__"} onValueChange={(v) => patch("primary_hazard", v === "__none__" ? "" : v)}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="f-hazard"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">—</SelectItem>{HAZARD_CATEGORIES.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label-eyebrow">Secondary hazard (optional)</Label>
            <Select value={form.secondary_hazard || "__none__"} onValueChange={(v) => patch("secondary_hazard", v === "__none__" ? "" : v)}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">—</SelectItem>{HAZARD_CATEGORIES.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="label-eyebrow">Hazard description</Label>
          <Textarea rows={4} value={form.hazard_description} onChange={(e) => patch("hazard_description", e.target.value)} className="mt-2 rounded-none border-ink" placeholder="Describe the source of potential harm…" />
        </div>
      </section>

      {/* Section 3 */}
      <section id="sec3" className="bg-background border border-border p-6 space-y-4">
        <h2 className="font-display text-2xl font-black">3. Tell us more about this risk</h2>
        <div>
          <Label className="label-eyebrow">Risk description (detailed)</Label>
          <Textarea rows={4} value={form.description} onChange={(e) => patch("description", e.target.value)} className="mt-2 rounded-none border-ink" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="label-eyebrow">Risk owner</Label>
            <Select value={form.risk_owner || "__none__"} onValueChange={(v) => patch("risk_owner", v === "__none__" ? "" : v)}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="f-owner"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">—</SelectItem>{workers.map((w) => <SelectItem key={w.worker_id} value={w.name}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label-eyebrow">Date identified</Label>
            <Input type="date" value={form.date_identified} onChange={(e) => patch("date_identified", e.target.value)} className="mt-2 h-11 rounded-none border-ink" />
          </div>
          <div>
            <Label className="label-eyebrow">Source</Label>
            <Select value={form.source || "__none__"} onValueChange={(v) => patch("source", v === "__none__" ? "" : v)}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">—</SelectItem>{SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="label-eyebrow">Linked incidents</Label>
            <div className="mt-2 border border-ink p-2 max-h-32 overflow-y-auto">
              {incidents.length === 0 && <div className="text-xs text-muted-foreground p-1">No incidents yet</div>}
              {incidents.map((i) => (
                <label key={i.incident_id} className="flex items-center gap-2 text-xs py-0.5">
                  <input type="checkbox" checked={form.linked_incident_ids.includes(i.incident_id)} onChange={() => patch("linked_incident_ids", form.linked_incident_ids.includes(i.incident_id) ? form.linked_incident_ids.filter((x) => x !== i.incident_id) : [...form.linked_incident_ids, i.incident_id])} />
                  <span>{i.title} <span className="text-muted-foreground">({i.severity})</span></span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="label-eyebrow">Linked SWMS</Label>
            <div className="mt-2 border border-ink p-2 max-h-32 overflow-y-auto">
              {swmsDocs.length === 0 && <div className="text-xs text-muted-foreground p-1">No SWMS yet</div>}
              {swmsDocs.map((d) => (
                <label key={d.document_id} className="flex items-center gap-2 text-xs py-0.5">
                  <input type="checkbox" checked={form.linked_swms_ids.includes(d.document_id)} onChange={() => patch("linked_swms_ids", form.linked_swms_ids.includes(d.document_id) ? form.linked_swms_ids.filter((x) => x !== d.document_id) : [...form.linked_swms_ids, d.document_id])} />
                  <span>{d.title}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 */}
      <section id="sec4" className="bg-background border border-border p-6 space-y-4">
        <h2 className="font-display text-2xl font-black">4. Inherent risk — without controls</h2>
        <p className="text-sm text-muted-foreground">Be honest — this represents the worst-case scenario with zero controls in place.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label className="label-eyebrow">Likelihood</Label>
            <div className="mt-2"><ScaleRadio name="inherent_l" scale={LIKELIHOOD_SCALE} value={form.inherent_likelihood} onChange={(v) => patch("inherent_likelihood", v)} /></div>
          </div>
          <div>
            <Label className="label-eyebrow">Consequence</Label>
            <div className="mt-2"><ScaleRadio name="inherent_c" scale={CONSEQUENCE_SCALE} value={form.inherent_consequence} onChange={(v) => patch("inherent_consequence", v)} /></div>
          </div>
          <div>
            <Label className="label-eyebrow">Inherent level</Label>
            <div className="mt-2 p-4 border-2 border-ink text-center">
              <div className={`inline-block ${inherent.color} px-3 py-1 text-xs font-bold tracking-widest`}>{inherent.label}</div>
              <div className="font-display text-5xl font-black mt-2" data-testid="inherent-score">{il || "—"}</div>
              <div className="text-xs text-muted-foreground">/ 25</div>
            </div>
            <div className="mt-3"><Matrix l={form.inherent_likelihood} c={form.inherent_consequence} /></div>
          </div>
        </div>
      </section>

      {/* Section 5 */}
      <section id="sec5" className="bg-background border border-border p-6 space-y-4">
        <h2 className="font-display text-2xl font-black">5. Controls in place or planned</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {form.controls.map((c, i) => (
              <div key={i} className="border border-border p-4 space-y-2" data-testid={`control-row-${i}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1"><Input value={c.name} onChange={(e) => patchControl(i, "name", e.target.value)} placeholder="Control name" className="h-9 rounded-none border-ink" /></div>
                  <Button variant="ghost" size="sm" onClick={() => removeControl(i)} className="text-destructive"><Trash /></Button>
                </div>
                <Textarea rows={2} value={c.description} onChange={(e) => patchControl(i, "description", e.target.value)} placeholder="Description" className="rounded-none border-ink" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <Select value={c.hierarchy_level} onValueChange={(v) => patchControl(i, "hierarchy_level", v)}>
                    <SelectTrigger className="h-9 rounded-none border-ink"><SelectValue /></SelectTrigger>
                    <SelectContent>{HIERARCHY_LEVELS.map((h) => <SelectItem key={h.key} value={h.key}>{h.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={c.status || "planned"} onValueChange={(v) => patchControl(i, "status", v)}>
                    <SelectTrigger className="h-9 rounded-none border-ink"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="implemented">Implemented</SelectItem>
                      <SelectItem value="partial">Partially</SelectItem>
                      <SelectItem value="not_effective">Not effective</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={c.effectiveness || "medium"} onValueChange={(v) => patchControl(i, "effectiveness", v)}>
                    <SelectTrigger className="h-9 rounded-none border-ink"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                  </Select>
                  <Input type="date" value={c.implementation_date || ""} onChange={(e) => patchControl(i, "implementation_date", e.target.value)} className="h-9 rounded-none border-ink" />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="btn-sharp border-ink" onClick={addControl} data-testid="add-control-btn"><Plus className="mr-1" />Add control</Button>
              <Button onClick={runAiControls} disabled={aiBusy} className="btn-sharp bg-ink text-white hover:bg-authority" data-testid="ai-suggest-controls-risk-btn"><Sparkle className="mr-2" weight="fill" />{aiBusy ? "Thinking…" : "AI suggest controls"}</Button>
            </div>
            <details className="border border-border">
              <summary className="px-4 py-2 cursor-pointer text-sm">Add from Control Library ({controlsLib.length} available)</summary>
              <div className="max-h-56 overflow-y-auto divide-y divide-border">
                {controlsLib.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-2">
                    <div className="text-sm">
                      <span className={`${HIERARCHY_MAP[c.hierarchy_level]?.color || "bg-muted"} px-2 py-0.5 text-[10px] font-bold tracking-widest mr-2`}>{HIERARCHY_MAP[c.hierarchy_level]?.label}</span>
                      {c.name}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => addFromLibrary(c)}><Plus /></Button>
                  </div>
                ))}
              </div>
            </details>
          </div>
          <div><ControlsPyramid controls={form.controls} /></div>
        </div>
      </section>

      {/* Section 6 */}
      <section id="sec6" className="bg-background border border-border p-6 space-y-4">
        <h2 className="font-display text-2xl font-black">6. Residual risk — with controls applied</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label className="label-eyebrow">Residual likelihood</Label>
            <div className="mt-2"><ScaleRadio name="residual_l" scale={LIKELIHOOD_SCALE} value={form.residual_likelihood} onChange={(v) => patch("residual_likelihood", v)} /></div>
          </div>
          <div>
            <Label className="label-eyebrow">Residual consequence</Label>
            <div className="mt-2"><ScaleRadio name="residual_c" scale={CONSEQUENCE_SCALE} value={form.residual_consequence} onChange={(v) => patch("residual_consequence", v)} /></div>
          </div>
          <div>
            <div className="p-4 border-2 border-ink text-center">
              <div className={`inline-block ${residual.color} px-3 py-1 text-xs font-bold tracking-widest`}>{residual.label}</div>
              <div className="font-display text-5xl font-black mt-2" data-testid="residual-score">{rl || "—"}</div>
              <div className="text-xs text-muted-foreground">/ 25</div>
            </div>
            {il && rl ? (
              <div className="mt-3 border border-border p-3 text-sm bg-muted" data-testid="reduction-summary">
                Inherent <strong>{il}</strong> → Residual <strong>{rl}</strong>
                <div className={reduction >= 0 ? "text-emerald-700" : "text-red-700"}>
                  {reduction >= 0 ? `Reduced by ${reduction} (${reductionPct}%)` : `INCREASED by ${-reduction}`}
                </div>
              </div>
            ) : null}
            {residualWarning === "high_or_extreme" && (
              <div className="mt-2 bg-red-100 border-2 border-red-700 p-3 text-xs"><Warning weight="fill" className="inline mr-1 text-red-700" />Warning: residual remains HIGH/EXTREME. Additional controls strongly recommended.</div>
            )}
            {residualWarning === "ok" && upper === 0 && form.controls.length > 0 && (
              <div className="mt-2 bg-yellow-50 border border-yellow-400 p-3 text-xs">No elimination or substitution controls — consider whether higher-level options are feasible.</div>
            )}
            {il && rl && rl < il && upper > 0 && (
              <div className="mt-2 bg-emerald-50 border border-emerald-400 p-3 text-xs"><CheckCircle weight="fill" className="inline mr-1 text-emerald-700" />Excellent risk reduction. Ensure controls are consistently implemented.</div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="label-eyebrow">Is the residual risk acceptable?</Label>
            <Select value={form.residual_acceptable} onValueChange={(v) => patch("residual_acceptable", v)}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes — acceptable to proceed</SelectItem>
                <SelectItem value="no">No — additional actions required</SelectItem>
                <SelectItem value="conditional">Conditional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(form.residual_acceptable === "no" || form.residual_acceptable === "conditional") && (
            <div className="md:col-span-2">
              <Label className="label-eyebrow">Conditions / additional actions required</Label>
              <Textarea rows={2} value={form.residual_conditions} onChange={(e) => patch("residual_conditions", e.target.value)} className="mt-2 rounded-none border-ink" />
            </div>
          )}
        </div>
        {(form.residual_acceptable === "no" || form.residual_acceptable === "conditional") && (
          <div className="space-y-2">
            <Label className="label-eyebrow">Additional actions</Label>
            {form.additional_actions.map((a, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center border border-border p-2">
                <Input placeholder="Action" value={a.description} onChange={(e) => patchAction(i, "description", e.target.value)} className="h-9 rounded-none border-ink md:col-span-2" />
                <Select value={a.assigned_to || "__none__"} onValueChange={(v) => patchAction(i, "assigned_to", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-none border-ink"><SelectValue placeholder="Assignee" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">—</SelectItem>{workers.map((w) => <SelectItem key={w.worker_id} value={w.name}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="date" value={a.due_date || ""} onChange={(e) => patchAction(i, "due_date", e.target.value)} className="h-9 rounded-none border-ink" />
                <Select value={a.priority || "medium"} onValueChange={(v) => patchAction(i, "priority", v)}>
                  <SelectTrigger className="h-9 rounded-none border-ink"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => removeAction(i)} className="text-destructive"><Trash /></Button>
              </div>
            ))}
            <Button variant="outline" className="btn-sharp border-ink" onClick={addAction}><Plus className="mr-1" />Add action</Button>
          </div>
        )}
      </section>

      {/* Section 7 */}
      <section id="sec7" className="bg-background border border-border p-6 space-y-4">
        <h2 className="font-display text-2xl font-black">7. Review schedule</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="label-eyebrow">Review frequency</Label>
            <Select value={form.review_frequency} onValueChange={(v) => patch("review_frequency", v)}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="6-monthly">6-monthly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label-eyebrow">Notify owner X days before</Label>
            <Select value={String(form.notify_days_before)} onValueChange={(v) => patch("notify_days_before", parseInt(v, 10))}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
              <SelectContent>{[7, 14, 30, 60].map((d) => <SelectItem key={d} value={String(d)}>{d} days</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-7">
            <Switch checked={!!form.notify_safety_manager} onCheckedChange={(v) => patch("notify_safety_manager", v)} />
            <span className="text-sm">Also notify Safety Manager</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            ["on_new_incident", "Trigger review when a new incident is linked to this risk"],
            ["on_failed_inspection", "Trigger review when a linked inspection fails"],
            ["on_swms_update", "Trigger review when a linked SWMS is updated"],
            ["on_near_miss", "Trigger review when this risk's activity has had a near-miss"],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 border border-border p-3">
              <Switch checked={!!form.triggers?.[k]} onCheckedChange={(v) => patch("triggers", { ...form.triggers, [k]: v })} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Section 8 */}
      <section id="sec8" className="bg-background border-2 border-ink p-6 space-y-4">
        <h2 className="font-display text-2xl font-black">8. Summary & sign-off</h2>
        <div className="bg-muted p-4 text-sm space-y-1">
          <div><strong>Title:</strong> {form.title || <em className="text-muted-foreground">—</em>}</div>
          <div><strong>Process / Activity:</strong> {form.process_name || "—"} → {form.activity_name || "—"}</div>
          <div><strong>Primary hazard:</strong> {form.primary_hazard || "—"}</div>
          <div><strong>Inherent:</strong> {inherent.label} ({il || "—"}) · <strong>Residual:</strong> {residual.label} ({rl || "—"})</div>
          <div><strong>Controls:</strong> {form.controls.length}</div>
          <div><strong>Owner:</strong> {form.risk_owner || "—"}</div>
        </div>
        <div>
          <Label className="label-eyebrow">Risk owner acknowledgement</Label>
          <Input value={form.acknowledged_by} onChange={(e) => patch("acknowledged_by", e.target.value)} placeholder="Type owner name to acknowledge" className="mt-2 h-11 rounded-none border-ink" data-testid="f-ack" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="btn-sharp border-ink h-11" onClick={() => save("draft")} disabled={saving}>Save as draft</Button>
          <Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" onClick={() => save("active")} disabled={saving}><FloppyDisk className="mr-2" weight="fill" />Save & Publish <ArrowRight className="ml-2" /></Button>
        </div>
      </section>
    </div>
  );
}
