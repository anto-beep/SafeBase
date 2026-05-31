import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sparkle, CheckCircle, Warning, FileText, Phone, ArrowRight, Link as LinkIcon,
  ChatsCircle, Plus, Trash, ShieldWarning, X, ArrowCounterClockwise,
} from "@phosphor-icons/react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import LifecycleTracker from "./LifecycleTracker";
import { PeoplePicker } from "@/components/PeoplePicker";
import {
  SEVERITIES, severityColor, INCIDENT_TYPES,
  SERIOUS_INJURY_ITEMS, DANGEROUS_OCCURRENCE_ITEMS,
  CONTRIBUTING_FACTORS, SHORT_TERM_ACTION_TYPES, LONG_TERM_ACTION_TYPES,
  CLOSE_CHECKLIST,
} from "./constants";

function ReopenStageBtn({ incident_id, stage, onReopened }) {
  const [busy, setBusy] = useState(false);
  const reopen = async () => {
    const reason = window.prompt(`Reopen the ${stage} stage for editing?\n\nReason (will be logged):`);
    if (!reason || !reason.trim()) return;
    setBusy(true);
    try {
      const r = await api.post(`/incident-workflow/${incident_id}/stages/${stage}/reopen`, { reason: reason.trim() });
      toast.success(`${stage[0].toUpperCase()}${stage.slice(1)} reopened`);
      onReopened && onReopened(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not reopen stage");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={reopen}
      disabled={busy}
      className="btn-sharp border-ink h-8 text-[10px] tracking-widest"
      data-testid={`reopen-stage-${stage}-btn`}
    >
      <ArrowCounterClockwise className="mr-1" weight="bold" size={12} />
      {busy ? "Reopening…" : "Reopen for editing"}
    </Button>
  );
}

function StageBadge({ stage }) {
  const colors = {
    reported: "bg-sky-600 text-white", triage: "bg-amber-600 text-white",
    investigation: "bg-indigo-600 text-white", actions: "bg-orange-600 text-white",
    closed: "bg-emerald-600 text-white",
  };
  return <span className={`${colors[stage] || "bg-muted"} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{(stage || "").toUpperCase()}</span>;
}

// ---- TRIAGE FORM ----
function TriageForm({ doc, onSaved, regulators }) {
  const { user } = useAuth();
  const existing = doc.triage || {};
  const [f, setF] = useState({
    manager_description: existing.manager_description || "",
    immediate_actions: existing.immediate_actions || "",
    scene_preserved: existing.scene_preserved || "",
    scene_explain: existing.scene_explain || "",
    resulted_in_death: !!existing.resulted_in_death,
    serious_injury_items: existing.serious_injury_items || [],
    dangerous_occurrence_items: existing.dangerous_occurrence_items || [],
    regulator_notified: existing.regulator_notified || "",
    notify_datetime: existing.notify_datetime || "",
    regulator_officer: existing.regulator_officer || "",
    regulator_ref: existing.regulator_ref || "",
    notifiable_category: existing.notifiable_category || "",
    incident_type: doc.incident_type || "",
    severity: doc.severity || "",
    workers_comp: existing.workers_comp || "",
    insurer_notified: existing.insurer_notified || "",
    treatment_outcome: existing.treatment_outcome || "",
    days_lost: existing.days_lost || "",
    signed_off_by: existing.signed_off_by || "",
    draft: false,
  });
  const state = (doc.state || doc.submission?.state || "NSW").toUpperCase();
  const reg = regulators[state];
  const notifiable = f.resulted_in_death || f.serious_injury_items.length > 0 || f.dangerous_occurrence_items.length > 0;

  const toggle = (k, val) => setF((p) => ({ ...p, [k]: p[k].includes(val) ? p[k].filter((x) => x !== val) : [...p[k], val] }));

  const save = async (draft) => {
    try {
      const r = await api.patch(`/incident-workflow/${doc.incident_id}/triage`, { ...f, draft });
      toast.success(draft ? "Draft saved" : "Triage complete — investigation started");
      onSaved(r.data);
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  return (
    <div className="space-y-5" data-testid="triage-form">
      <section className="bg-background border border-border p-5 space-y-3">
        <h3 className="font-display text-xl font-black">Management account</h3>
        <Textarea rows={4} value={f.manager_description} onChange={(e) => setF({ ...f, manager_description: e.target.value })} placeholder="Official account of what happened…" className="rounded-none border-ink" />
        <Textarea rows={3} value={f.immediate_actions} onChange={(e) => setF({ ...f, immediate_actions: e.target.value })} placeholder="Immediate actions taken by the organisation…" className="rounded-none border-ink" />
        <div>
          <Label className="label-eyebrow">Scene preserved?</Label>
          <Select value={f.scene_preserved || "__none__"} onValueChange={(v) => setF({ ...f, scene_preserved: v === "__none__" ? "" : v })}>
            <SelectTrigger className="mt-1 h-11 rounded-none border-ink"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              <SelectItem value="yes">Yes — undisturbed</SelectItem>
              <SelectItem value="partial">Yes — partially</SelectItem>
              <SelectItem value="no">No — work resumed</SelectItem>
              <SelectItem value="na">Not applicable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {f.scene_preserved === "no" && <Textarea rows={2} value={f.scene_explain} onChange={(e) => setF({ ...f, scene_explain: e.target.value })} placeholder="Why was the scene not preserved?" className="rounded-none border-ink" />}
      </section>

      <section className={`border-2 p-5 space-y-3 ${notifiable ? "border-red-700 bg-red-50" : "border-border bg-background"}`} data-testid="notifiability-decision">
        <h3 className="font-display text-xl font-black">Notifiability decision</h3>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.resulted_in_death} onChange={(e) => setF({ ...f, resulted_in_death: e.target.checked })} data-testid="chk-death" />Did this incident result in the <strong>death</strong> of a person?</label>
        <div>
          <div className="label-eyebrow mt-2">Serious injury / illness (select all that apply)</div>
          <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-1">
            {SERIOUS_INJURY_ITEMS.map((it) => (
              <label key={it} className="flex items-start gap-2 text-xs"><input type="checkbox" checked={f.serious_injury_items.includes(it)} onChange={() => toggle("serious_injury_items", it)} />{it}</label>
            ))}
          </div>
        </div>
        <div>
          <div className="label-eyebrow mt-2">Dangerous occurrence (select all that apply)</div>
          <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-1">
            {DANGEROUS_OCCURRENCE_ITEMS.map((it) => (
              <label key={it} className="flex items-start gap-2 text-xs"><input type="checkbox" checked={f.dangerous_occurrence_items.includes(it)} onChange={() => toggle("dangerous_occurrence_items", it)} />{it}</label>
            ))}
          </div>
        </div>

        {notifiable ? (
          <div className="bg-red-700 text-white p-4 space-y-3" data-testid="notifiable-banner">
            <div className="font-display text-lg font-black">THIS IS A NOTIFIABLE INCIDENT</div>
            <p className="text-sm">You must notify the WHS regulator immediately by phone.</p>
            {reg && (
              <a href={`tel:${reg.phone}`} className="inline-flex items-center gap-2 bg-warning text-ink px-4 py-2 font-bold tracking-widest" data-testid="call-regulator-btn">
                <Phone weight="fill" /> CALL NOW · {reg.name} — {reg.phone}
              </a>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <Label className="label-eyebrow text-white">Regulator notified?</Label>
                <Select value={f.regulator_notified || "__none__"} onValueChange={(v) => setF({ ...f, regulator_notified: v === "__none__" ? "" : v })}>
                  <SelectTrigger className="mt-1 h-10 rounded-none bg-white text-ink"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    <SelectItem value="yes">Yes — I have called</SelectItem>
                    <SelectItem value="pending">No — will call now</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input type="datetime-local" value={f.notify_datetime || ""} onChange={(e) => setF({ ...f, notify_datetime: e.target.value })} className="h-10 rounded-none mt-5 md:mt-5 bg-white text-ink" placeholder="Date/time" />
              <Input value={f.regulator_officer} onChange={(e) => setF({ ...f, regulator_officer: e.target.value })} placeholder="Officer name (optional)" className="h-10 rounded-none bg-white text-ink" />
              <Input value={f.regulator_ref} onChange={(e) => setF({ ...f, regulator_ref: e.target.value })} placeholder="Reference number (optional)" className="h-10 rounded-none bg-white text-ink" />
            </div>
          </div>
        ) : (
          <div className="bg-emerald-100 border border-emerald-600 text-emerald-900 p-3 text-sm">Not notifiable under the WHS Act based on your responses. Reassess if circumstances change.</div>
        )}

        <div>
          <Label className="label-eyebrow">Classification</Label>
          <Select value={f.notifiable_category || "__none__"} onValueChange={(v) => setF({ ...f, notifiable_category: v === "__none__" ? "" : v })}>
            <SelectTrigger className="mt-1 h-11 rounded-none border-ink" data-testid="f-notif-cat"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              <SelectItem value="not_notifiable">Not notifiable</SelectItem>
              <SelectItem value="death_worker">Death of a worker</SelectItem>
              <SelectItem value="death_non_worker">Death of a non-worker</SelectItem>
              <SelectItem value="serious_injury">Serious injury or illness</SelectItem>
              <SelectItem value="dangerous_incident">Dangerous incident</SelectItem>
              <SelectItem value="under_assessment">Under assessment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="bg-background border border-border p-5 space-y-3">
        <h3 className="font-display text-xl font-black">Incident type & severity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="label-eyebrow">Incident type</Label>
            <Select value={f.incident_type || "__none__"} onValueChange={(v) => setF({ ...f, incident_type: v === "__none__" ? "" : v })}>
              <SelectTrigger className="mt-1 h-11 rounded-none border-ink" data-testid="f-type"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">—</SelectItem>{INCIDENT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label-eyebrow">Severity</Label>
            <Select value={String(f.severity || "")} onValueChange={(v) => setF({ ...f, severity: v ? parseInt(v, 10) : "" })}>
              <SelectTrigger className="mt-1 h-11 rounded-none border-ink" data-testid="f-sev"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s.v} value={String(s.v)}>{s.v} — {s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label-eyebrow">Workers compensation</Label>
            <Select value={f.workers_comp || "__none__"} onValueChange={(v) => setF({ ...f, workers_comp: v === "__none__" ? "" : v })}>
              <SelectTrigger className="mt-1 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                <SelectItem value="yes">Yes — claim</SelectItem>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="assess">Under assessment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label-eyebrow">Treatment outcome</Label>
            <Input value={f.treatment_outcome} onChange={(e) => setF({ ...f, treatment_outcome: e.target.value })} placeholder="e.g. Returned to full duties" className="mt-1 h-11 rounded-none border-ink" />
          </div>
          <div>
            <Label className="label-eyebrow">Days lost</Label>
            <Input type="number" value={f.days_lost} onChange={(e) => setF({ ...f, days_lost: e.target.value })} className="mt-1 h-11 rounded-none border-ink" />
          </div>
        </div>
      </section>

      <section className="bg-background border-2 border-ink p-5 space-y-3">
        <h3 className="font-display text-xl font-black">Triage sign-off</h3>
        <div className="bg-muted p-3 text-sm space-y-1">
          <div><strong>Conducted by:</strong> {user?.name}</div>
          <div><strong>Date / time:</strong> {new Date().toLocaleString("en-AU")}</div>
        </div>
        <Input value={f.signed_off_by} onChange={(e) => setF({ ...f, signed_off_by: e.target.value })} placeholder="Type your full name to sign" className="h-11 rounded-none border-ink" data-testid="f-triage-sign" />
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="btn-sharp border-ink h-11" onClick={() => save(true)} data-testid="triage-save-draft">Save as draft</Button>
          <Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" onClick={() => save(false)} disabled={!f.signed_off_by} data-testid="triage-complete-btn">
            Complete triage <ArrowRight className="ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}

// ---- INVESTIGATION FORM ----
function InvestigationForm({ doc, onSaved }) {
  const existing = doc.investigation || {};
  const [f, setF] = useState({
    sequence: existing.sequence || "",
    immediate_cause: existing.immediate_cause || "",
    environment: existing.environment || "",
    equipment: existing.equipment || [],
    swms_status: existing.swms_status || "",
    training_status: existing.training_status || "",
    factors: existing.factors || {}, // {"Fatigue": "yes", ...}
    factor_details: existing.factor_details || {},
    summary: existing.summary || "",
    root_cause: existing.root_cause || "",
    ai_root_cause: existing.ai_root_cause || null,
  });
  const [busy, setBusy] = useState(false);

  const runAi = async () => {
    setBusy(true);
    try {
      const r = await api.post("/incident-workflow/ai/root-cause", { factors: f.factors });
      setF({ ...f, ai_root_cause: r.data });
      if (!f.root_cause) setF((p) => ({ ...p, root_cause: r.data.primary || "" }));
      toast.success("AI root cause suggested");
    } catch { toast.error("AI failed"); }
    setBusy(false);
  };

  const save = async (complete) => {
    try {
      const r = await api.patch(`/incident-workflow/${doc.incident_id}/investigation`, { ...f, completed: complete, draft: !complete });
      toast.success(complete ? "Investigation complete" : "Saved");
      onSaved(r.data);
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  return (
    <div className="space-y-5" data-testid="investigation-form">
      <section className="bg-background border border-border p-5 space-y-3">
        <h3 className="font-display text-xl font-black">Detailed account</h3>
        <Textarea rows={4} value={f.sequence} onChange={(e) => setF({ ...f, sequence: e.target.value })} placeholder="Full sequence of events…" className="rounded-none border-ink" />
        <Textarea rows={3} value={f.immediate_cause} onChange={(e) => setF({ ...f, immediate_cause: e.target.value })} placeholder="Immediate cause…" className="rounded-none border-ink" />
        <Textarea rows={3} value={f.environment} onChange={(e) => setF({ ...f, environment: e.target.value })} placeholder="Environment and conditions…" className="rounded-none border-ink" />
      </section>

      <section className="bg-background border border-border p-5 space-y-3">
        <h3 className="font-display text-xl font-black">Contributing factors</h3>
        {CONTRIBUTING_FACTORS.map((cat) => (
          <details key={cat.cat} className="border border-border">
            <summary className="px-4 py-2 cursor-pointer label-eyebrow">{cat.cat} factors</summary>
            <div className="p-4 space-y-2">
              {cat.items.map((it) => (
                <div key={it} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center" data-testid={`factor-${it.replace(/\W+/g, '-')}`}>
                  <label className="flex items-center gap-2 text-sm">
                    <Select value={f.factors[it] || "__none__"} onValueChange={(v) => setF({ ...f, factors: { ...f.factors, [it]: v === "__none__" ? "" : v } })}>
                      <SelectTrigger className="h-8 w-28 rounded-none border-ink"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>{it}</span>
                  </label>
                  {f.factors[it] === "yes" && (
                    <Input value={f.factor_details[it] || ""} onChange={(e) => setF({ ...f, factor_details: { ...f.factor_details, [it]: e.target.value } })} placeholder="Detail (optional)" className="h-8 rounded-none border-ink" />
                  )}
                </div>
              ))}
            </div>
          </details>
        ))}
      </section>

      <section className="bg-background border-2 border-ink p-5 space-y-3">
        <h3 className="font-display text-xl font-black">Root cause</h3>
        <Button variant="outline" className="btn-sharp border-ink" onClick={runAi} disabled={busy} data-testid="ai-root-cause-btn"><Sparkle className="mr-2" weight="fill" />{busy ? "Thinking…" : "AI suggest root cause"}</Button>
        {f.ai_root_cause && (
          <div className="bg-ink text-white p-3 text-sm" data-testid="ai-root-cause-panel">
            <div className="label-eyebrow text-warning mb-1">AI suggestion</div>
            <div><strong>Primary:</strong> {f.ai_root_cause.primary}</div>
            {f.ai_root_cause.systemic && <div className="mt-1"><strong>Systemic:</strong> {f.ai_root_cause.systemic}</div>}
            {f.ai_root_cause.pattern && <div className="mt-1 text-xs text-white/60">Pattern: {f.ai_root_cause.pattern}</div>}
          </div>
        )}
        <Textarea rows={3} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="In your own words, summarise the key contributing factors…" className="rounded-none border-ink" />
        <Textarea rows={3} value={f.root_cause} onChange={(e) => setF({ ...f, root_cause: e.target.value })} placeholder="State the underlying root cause…" className="rounded-none border-ink" data-testid="f-root-cause" />
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="btn-sharp border-ink h-11" onClick={() => save(false)}>Save draft</Button>
          <Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" onClick={() => save(true)} disabled={!f.root_cause} data-testid="investigation-complete-btn">Complete → Actions <ArrowRight className="ml-2" /></Button>
        </div>
      </section>
    </div>
  );
}

// ---- ACTIONS FORM ----
function ActionsForm({ doc, onSaved }) {
  const [f, setF] = useState(doc.actions || { short_term: [], long_term: [], risk_register: null, internal_comments: "", worker_communication: "", worker_consulted: "", consultation_notes: "" });
  const [workers, setWorkers] = useState([]);
  const [risks, setRisks] = useState([]);
  useEffect(() => {
    api.get("/workers").then((r) => setWorkers(r.data));
    api.get("/risks").then((r) => setRisks(r.data)).catch(() => {});
  }, []);

  const addRow = (bucket) => setF({ ...f, [bucket]: [...(f[bucket] || []), { description: "", type: "Other", assigned_to: "", due_date: "", priority: "medium", status: "open", create_as_ca: false }] });
  const patchRow = (bucket, i, k, v) => { const n = [...f[bucket]]; n[i] = { ...n[i], [k]: v }; setF({ ...f, [bucket]: n }); };
  const removeRow = (bucket, i) => setF({ ...f, [bucket]: f[bucket].filter((_, ix) => ix !== i) });

  const save = async (complete) => {
    try {
      const r = await api.patch(`/incident-workflow/${doc.incident_id}/actions`, { ...f, completed: complete, draft: !complete });
      toast.success(complete ? "Actions saved — ready to close" : "Saved");
      onSaved(r.data);
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const Bucket = ({ bucket, title, types }) => (
    <section className="bg-background border border-border p-5 space-y-3">
      <h3 className="font-display text-xl font-black">{title}</h3>
      {(f[bucket] || []).map((a, i) => (
        <div key={i} className="border border-border p-3 space-y-2" data-testid={`${bucket}-${i}`}>
          <Input value={a.description} onChange={(e) => patchRow(bucket, i, "description", e.target.value)} placeholder="Action description" className="h-10 rounded-none border-ink" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-start">
            <Select value={a.type} onValueChange={(v) => patchRow(bucket, i, "type", v)}>
              <SelectTrigger className="h-9 rounded-none border-ink"><SelectValue /></SelectTrigger>
              <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <div className="md:col-span-1">
              <PeoplePicker
                value={a.assigned_to}
                onChange={(v) => patchRow(bucket, i, "assigned_to", v)}
                placeholder="Assignee"
                testId={`incident-${bucket}-picker-${i}`}
              />
            </div>
            <Input type="date" value={a.due_date || ""} onChange={(e) => patchRow(bucket, i, "due_date", e.target.value)} className="h-9 rounded-none border-ink" />
            <Select value={a.priority} onValueChange={(v) => patchRow(bucket, i, "priority", v)}>
              <SelectTrigger className="h-9 rounded-none border-ink"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => removeRow(bucket, i)} className="text-destructive"><Trash /></Button>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!a.create_as_ca} onChange={(e) => patchRow(bucket, i, "create_as_ca", e.target.checked)} />
            Create as formal corrective action linked to this incident
          </label>
        </div>
      ))}
      <Button variant="outline" className="btn-sharp border-ink" onClick={() => addRow(bucket)} data-testid={`add-${bucket}-btn`}><Plus className="mr-1" />Add {title.toLowerCase()}</Button>
    </section>
  );

  return (
    <div className="space-y-5" data-testid="actions-form">
      <Bucket bucket="short_term" title="Short-term actions" types={SHORT_TERM_ACTION_TYPES} />
      <Bucket bucket="long_term" title="Long-term actions" types={LONG_TERM_ACTION_TYPES} />

      <section className="bg-background border border-border p-5 space-y-3">
        <h3 className="font-display text-xl font-black">Risk register link</h3>
        <Select value={f.risk_register || "__none__"} onValueChange={(v) => setF({ ...f, risk_register: v === "__none__" ? "" : v })}>
          <SelectTrigger className="h-11 rounded-none border-ink" data-testid="f-rr-link"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            <SelectItem value="create_new">Yes — create a new risk from this incident</SelectItem>
            <SelectItem value="no">No — not needed</SelectItem>
            {risks.map((r) => <SelectItem key={r.risk_id} value={r.risk_id}>Link to {r.risk_id} — {r.title}</SelectItem>)}
          </SelectContent>
        </Select>
        {f.risk_register === "create_new" && (
          <Link to={`/dashboard/risk-register/new?from_incident=${doc.incident_id}`} className="underline text-sm">Open Risk Register with AI-prefilled fields →</Link>
        )}
      </section>

      <section className="bg-background border border-border p-5 space-y-3">
        <h3 className="font-display text-xl font-black">Comments</h3>
        <Textarea rows={3} value={f.internal_comments} onChange={(e) => setF({ ...f, internal_comments: e.target.value })} placeholder="Internal comments (Safety Managers & Admins only)" className="rounded-none border-ink" />
        <Textarea rows={3} value={f.worker_communication} onChange={(e) => setF({ ...f, worker_communication: e.target.value })} placeholder="Message to be sent to the affected worker" className="rounded-none border-ink" />
        <div>
          <Label className="label-eyebrow">Affected worker consulted during investigation?</Label>
          <Select value={f.worker_consulted || "__none__"} onValueChange={(v) => setF({ ...f, worker_consulted: v === "__none__" ? "" : v })}>
            <SelectTrigger className="mt-1 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input value={f.consultation_notes || ""} onChange={(e) => setF({ ...f, consultation_notes: e.target.value })} placeholder="How were they consulted / why not?" className="h-11 rounded-none border-ink" />
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="outline" className="btn-sharp border-ink h-11" onClick={() => save(false)}>Save draft</Button>
        <Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" onClick={() => save(true)} data-testid="actions-complete-btn">Save & proceed to close-out <ArrowRight className="ml-2" /></Button>
      </div>
    </div>
  );
}

// ---- CLOSE-OUT FORM ----
function CloseOutForm({ doc, onSaved }) {
  const existing = doc.close_out || {};
  const [checklist, setChecklist] = useState(existing.checklist || {});
  const [lessons, setLessons] = useState(existing.lessons_learned || "");
  const [signed, setSigned] = useState(existing.signed_off_by || "");
  const [secondary, setSecondary] = useState(existing.secondary_sign_off || "");
  const [busy, setBusy] = useState(false);

  const flatAll = Object.entries(CLOSE_CHECKLIST).flatMap(([cat, items]) => items.map((it) => `${cat}:${it}`));
  const incomplete = flatAll.filter((k) => !checklist[k]);

  const runAi = async () => {
    setBusy(true);
    try {
      const r = await api.post("/incident-workflow/ai/lessons-learned", {
        root_cause: doc.investigation?.root_cause,
        category: doc.incident_type,
        severity: doc.severity,
      });
      setLessons(r.data.lessons_learned || "");
      toast.success("AI lessons suggested");
    } catch { toast.error("AI failed"); }
    setBusy(false);
  };

  const submit = async () => {
    try {
      const r = await api.patch(`/incident-workflow/${doc.incident_id}/close-out`, {
        checklist, lessons_learned: lessons, signed_off_by: signed, secondary_sign_off: secondary,
        incomplete_items: incomplete,
      });
      toast.success("Incident closed");
      onSaved(r.data);
    } catch (e) { toast.error(e?.response?.data?.detail || "Close failed"); }
  };

  return (
    <div className="space-y-5" data-testid="closeout-form">
      {Object.entries(CLOSE_CHECKLIST).map(([cat, items]) => (
        <section key={cat} className="bg-background border border-border p-5 space-y-2">
          <h3 className="font-display text-xl font-black capitalize">{cat}</h3>
          {items.map((it) => {
            const key = `${cat}:${it}`;
            return (
              <label key={key} className="flex items-start gap-2 text-sm border-b border-border/50 py-1" data-testid={`chk-${cat}-${items.indexOf(it)}`}>
                <input type="checkbox" checked={!!checklist[key]} onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })} />
                {it}
              </label>
            );
          })}
        </section>
      ))}

      {incomplete.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-400 p-3 text-sm" data-testid="incomplete-warning">
          <Warning weight="fill" className="inline mr-1" />
          {incomplete.length} checklist item(s) are incomplete. You can still close this incident but the incomplete items will be flagged.
        </div>
      )}

      <section className="bg-background border-2 border-ink p-5 space-y-3">
        <h3 className="font-display text-xl font-black">Lessons learned (required)</h3>
        <Button variant="outline" className="btn-sharp border-ink" onClick={runAi} disabled={busy} data-testid="ai-lessons-btn"><Sparkle className="mr-2" weight="fill" />{busy ? "Thinking…" : "AI suggest lessons"}</Button>
        <Textarea rows={4} value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder="What has been learned? How do we prevent a similar incident?" className="rounded-none border-ink" data-testid="f-lessons" />
        <Input value={signed} onChange={(e) => setSigned(e.target.value)} placeholder="Type your full name to sign" className="h-11 rounded-none border-ink" data-testid="f-close-sign" />
        {doc.severity && doc.severity >= 4 && (
          <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} placeholder="Secondary sign-off (recommended for Severity 4+)" className="h-11 rounded-none border-ink" />
        )}
        <Button className="btn-sharp bg-red-700 text-white hover:bg-red-800 h-12" onClick={submit} disabled={!lessons || !signed} data-testid="close-incident-btn">
          <CheckCircle className="mr-2" weight="fill" />Close incident
        </Button>
      </section>
    </div>
  );
}

// ---- AUTO-DERIVED RISK PROMPT (shown after an incident is closed) ----
function AutoRiskPrompt({ doc, onLinked }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);
  const [dismissedKey] = useState(`risk_prompt_dismissed_${doc.incident_id}`);
  const [dismissed, setDismissed] = useState(
    typeof window !== "undefined" && localStorage.getItem(`risk_prompt_dismissed_${doc.incident_id}`) === "1"
  );

  if (doc.linked_risk_id) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-600 p-4 flex items-center justify-between gap-3" data-testid="risk-linked-card">
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle weight="fill" className="text-emerald-700 shrink-0" size={24} />
          <div>
            <div className="font-display font-black text-emerald-900">Risk Register entry linked</div>
            <div className="text-xs text-emerald-800">This incident is linked to <strong>{doc.linked_risk_id}</strong>.</div>
          </div>
        </div>
        <Link to={`/dashboard/risk-register/${doc.linked_risk_id}`} className="shrink-0">
          <Button variant="outline" className="btn-sharp border-emerald-700 text-emerald-900 h-10" data-testid="open-linked-risk-btn">
            Open risk <ArrowRight className="ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  if (dismissed) return null;

  const generate = async () => {
    setLoading(true);
    try {
      const r = await api.post(`/incident-workflow/${doc.incident_id}/ai/suggest-risk-draft`);
      setDraft({
        title: r.data.title || `Risk derived from ${doc.reference}`,
        primary_hazard: r.data.primary_hazard || "Other",
        hazard_description: r.data.hazard_description || "",
        description: r.data.description || "",
        inherent_likelihood: Number(r.data.inherent_likelihood) || 3,
        inherent_consequence: Number(r.data.inherent_consequence) || 3,
        residual_likelihood: Number(r.data.residual_likelihood) || 2,
        residual_consequence: Number(r.data.residual_consequence) || 2,
        review_frequency: r.data.review_frequency || "quarterly",
        suggested_controls: Array.isArray(r.data.suggested_controls) ? r.data.suggested_controls : [],
        fallback: !!r.data.fallback,
      });
      setOpen(true);
    } catch {
      toast.error("AI draft failed — please try again");
    }
    setLoading(false);
  };

  const dismiss = () => {
    try { localStorage.setItem(dismissedKey, "1"); } catch {}
    setDismissed(true);
    toast.info("Prompt dismissed for this incident");
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload = {
        title: draft.title,
        primary_hazard: draft.primary_hazard,
        hazard_description: draft.hazard_description,
        description: draft.description,
        inherent_likelihood: Number(draft.inherent_likelihood),
        inherent_consequence: Number(draft.inherent_consequence),
        residual_likelihood: Number(draft.residual_likelihood),
        residual_consequence: Number(draft.residual_consequence),
        review_frequency: draft.review_frequency,
        controls: (draft.suggested_controls || []).map((c) => ({
          name: c.name || "Control",
          hierarchy_level: c.hierarchy_level || "administrative",
          description: c.description || "",
          effectiveness: c.effectiveness || "medium",
          status: "in_place",
        })),
      };
      const r = await api.post(`/incident-workflow/${doc.incident_id}/accept-risk-draft`, payload);
      toast.success(`Risk register entry ${r.data.risk_id} created`);
      setOpen(false);
      onLinked?.(r.data.risk_id);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to create risk");
    }
    setSaving(false);
  };

  const patch = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const patchControl = (i, k, v) => setDraft((d) => {
    const n = [...(d.suggested_controls || [])];
    n[i] = { ...n[i], [k]: v };
    return { ...d, suggested_controls: n };
  });
  const removeControl = (i) => setDraft((d) => ({ ...d, suggested_controls: d.suggested_controls.filter((_, ix) => ix !== i) }));

  const il = (Number(draft?.inherent_likelihood) || 0) * (Number(draft?.inherent_consequence) || 0);
  const rl = (Number(draft?.residual_likelihood) || 0) * (Number(draft?.residual_consequence) || 0);
  const scoreColor = (s) => (s <= 5 ? "bg-emerald-600" : s <= 11 ? "bg-amber-500" : s <= 19 ? "bg-orange-600" : "bg-red-700");

  return (
    <>
      <div className="bg-ink text-white border-2 border-ink p-5 space-y-3 relative" data-testid="auto-risk-prompt">
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-2 right-2 text-white/60 hover:text-white"
          aria-label="Dismiss"
          data-testid="risk-prompt-dismiss-x"
        ><X size={18} /></button>
        <div className="flex items-start gap-3">
          <ShieldWarning weight="fill" className="text-warning shrink-0 mt-1" size={28} />
          <div className="flex-1">
            <div className="label-eyebrow text-warning">CONTINUOUS IMPROVEMENT</div>
            <h3 className="font-display text-xl md:text-2xl font-black mt-1">
              Create a Risk Register entry from this incident?
            </h3>
            <p className="text-sm text-white/80 mt-1">
              Turn the investigation's root cause and contributing factors into a tracked
              Risk Register item so controls and reviews persist beyond this incident.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            className="btn-sharp bg-warning text-ink hover:bg-yellow-400 h-11"
            onClick={generate}
            disabled={loading}
            data-testid="generate-risk-draft-btn"
          >
            <Sparkle weight="fill" className="mr-2" />
            {loading ? "Drafting with AI…" : "Generate AI draft"}
          </Button>
          <Button
            variant="outline"
            className="btn-sharp border-white/40 text-white bg-transparent hover:bg-white/10 h-11"
            onClick={dismiss}
            data-testid="risk-prompt-skip-btn"
          >
            Not needed
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-none border-ink" data-testid="risk-draft-modal">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-black tracking-tighter">
              Review AI-drafted Risk Register entry
            </DialogTitle>
            <DialogDescription>
              Derived from incident <strong>{doc.reference}</strong>. Adjust any field before saving.
              {draft?.fallback && (
                <span className="block mt-1 text-amber-600 font-bold">
                  AI unavailable — showing safe defaults. Review carefully.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div>
                <Label className="label-eyebrow">Risk title</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => patch("title", e.target.value)}
                  className="mt-1 h-11 rounded-none border-ink"
                  data-testid="draft-title"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="label-eyebrow">Primary hazard</Label>
                  <Select value={draft.primary_hazard} onValueChange={(v) => patch("primary_hazard", v)}>
                    <SelectTrigger className="mt-1 h-11 rounded-none border-ink" data-testid="draft-hazard">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Electrical", "Mechanical", "Chemical / Hazardous Substance",
                        "Physical / Ergonomic", "Biological", "Psychosocial",
                        "Environmental", "Fire / Explosion", "Height / Fall",
                        "Confined Space", "Vehicle / Traffic", "Noise", "Radiation",
                        "Temperature Extremes", "Other",
                      ].map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="label-eyebrow">Review frequency</Label>
                  <Select value={draft.review_frequency} onValueChange={(v) => patch("review_frequency", v)}>
                    <SelectTrigger className="mt-1 h-11 rounded-none border-ink" data-testid="draft-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="6-monthly">6-monthly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="label-eyebrow">Hazard description</Label>
                <Textarea
                  rows={2}
                  value={draft.hazard_description}
                  onChange={(e) => patch("hazard_description", e.target.value)}
                  className="mt-1 rounded-none border-ink"
                  data-testid="draft-hazard-desc"
                />
              </div>

              <div>
                <Label className="label-eyebrow">Risk description (root cause framed as a risk)</Label>
                <Textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => patch("description", e.target.value)}
                  className="mt-1 rounded-none border-ink"
                  data-testid="draft-description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted border border-border p-3 space-y-2">
                  <div className="label-eyebrow flex items-center justify-between">
                    <span>Inherent (before controls)</span>
                    <span className={`${scoreColor(il)} text-white px-2 py-0.5 text-[10px] font-bold tracking-widest`} data-testid="draft-inherent-score">
                      {il}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Likelihood (1-5)</Label>
                      <Input
                        type="number" min="1" max="5"
                        value={draft.inherent_likelihood}
                        onChange={(e) => patch("inherent_likelihood", e.target.value)}
                        className="mt-1 h-9 rounded-none border-ink"
                        data-testid="draft-inh-l"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Consequence (1-5)</Label>
                      <Input
                        type="number" min="1" max="5"
                        value={draft.inherent_consequence}
                        onChange={(e) => patch("inherent_consequence", e.target.value)}
                        className="mt-1 h-9 rounded-none border-ink"
                        data-testid="draft-inh-c"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-muted border border-border p-3 space-y-2">
                  <div className="label-eyebrow flex items-center justify-between">
                    <span>Residual (after controls)</span>
                    <span className={`${scoreColor(rl)} text-white px-2 py-0.5 text-[10px] font-bold tracking-widest`} data-testid="draft-residual-score">
                      {rl}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Likelihood (1-5)</Label>
                      <Input
                        type="number" min="1" max="5"
                        value={draft.residual_likelihood}
                        onChange={(e) => patch("residual_likelihood", e.target.value)}
                        className="mt-1 h-9 rounded-none border-ink"
                        data-testid="draft-res-l"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Consequence (1-5)</Label>
                      <Input
                        type="number" min="1" max="5"
                        value={draft.residual_consequence}
                        onChange={(e) => patch("residual_consequence", e.target.value)}
                        className="mt-1 h-9 rounded-none border-ink"
                        data-testid="draft-res-c"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="label-eyebrow mb-2">Suggested controls ({(draft.suggested_controls || []).length})</div>
                <div className="space-y-2" data-testid="draft-controls">
                  {(draft.suggested_controls || []).map((c, i) => (
                    <div key={i} className="border border-border p-3 space-y-2" data-testid={`draft-control-${i}`}>
                      <div className="flex gap-2">
                        <Input
                          value={c.name || ""}
                          onChange={(e) => patchControl(i, "name", e.target.value)}
                          placeholder="Control name"
                          className="h-9 rounded-none border-ink flex-1"
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeControl(i)} className="text-destructive">
                          <Trash />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Select value={c.hierarchy_level || "administrative"} onValueChange={(v) => patchControl(i, "hierarchy_level", v)}>
                          <SelectTrigger className="h-9 rounded-none border-ink"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="elimination">1 — Elimination</SelectItem>
                            <SelectItem value="substitution">2 — Substitution</SelectItem>
                            <SelectItem value="isolation">3 — Isolation</SelectItem>
                            <SelectItem value="engineering">4 — Engineering</SelectItem>
                            <SelectItem value="administrative">5 — Administrative</SelectItem>
                            <SelectItem value="ppe">6 — PPE</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={c.effectiveness || "medium"} onValueChange={(v) => patchControl(i, "effectiveness", v)}>
                          <SelectTrigger className="h-9 rounded-none border-ink"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">Effectiveness: High</SelectItem>
                            <SelectItem value="medium">Effectiveness: Medium</SelectItem>
                            <SelectItem value="low">Effectiveness: Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea
                        rows={2}
                        value={c.description || ""}
                        onChange={(e) => patchControl(i, "description", e.target.value)}
                        placeholder="Control description"
                        className="rounded-none border-ink"
                      />
                    </div>
                  ))}
                  {(draft.suggested_controls || []).length === 0 && (
                    <div className="text-xs text-muted-foreground">No controls suggested — add some after saving.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="btn-sharp border-ink h-11"
              onClick={() => setOpen(false)}
              disabled={saving}
              data-testid="draft-cancel-btn"
            >Cancel</Button>
            <Button
              className="btn-sharp bg-ink text-white hover:bg-authority h-11"
              onClick={save}
              disabled={saving || !draft?.title}
              data-testid="draft-save-btn"
            >
              {saving ? "Creating…" : "Create Risk Register entry"} <ArrowRight className="ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function IncidentDetail() {
  const { incident_id } = useParams();
  const [doc, setDoc] = useState(null);
  const [regulators, setRegulators] = useState({});
  const [aiSummary, setAiSummary] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const nav = useNavigate();

  const load = async () => {
    try {
      const [d, reg, n] = await Promise.all([
        api.get(`/incident-workflow/${incident_id}`),
        api.get("/incident-workflow/meta/regulators"),
        api.get("/notifications").catch(() => ({ data: [] })),
      ]);
      setDoc(d.data); setRegulators(reg.data);
      setNotifs((n.data || []).filter((x) => x.incident_id === incident_id));
    } catch { toast.error("Failed to load incident"); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [incident_id]);

  const runSummary = async () => {
    try {
      const r = await api.post("/incident-workflow/ai/summary", { incident_id });
      setAiSummary(r.data.summary);
    } catch { toast.error("AI summary failed"); }
  };

  const reopen = async () => {
    const reason = window.prompt("Reason for reopening?");
    if (!reason) return;
    await api.post(`/incident-workflow/${incident_id}/reopen`, { reason });
    toast.success("Reopened");
    load();
  };

  if (!doc) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const locked = doc.stage === "closed";

  return (
    <div className="space-y-5" data-testid="incident-detail">
      {/* Header */}
      <div className="border-b-2 border-ink pb-4">
        <div className="label-eyebrow"><Link to="/dashboard/incidents" className="underline">Incidents</Link> · {doc.site || "—"}</div>
        <div className="flex items-end justify-between flex-wrap gap-3 mt-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold">{doc.reference}</span>
              <StageBadge stage={doc.stage} />
              {doc.severity ? <span className={`${severityColor(doc.severity)} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>SEV {doc.severity}</span> : null}
              {doc.notifiable && <span className="bg-red-700 text-white px-2 py-0.5 text-[10px] font-bold tracking-widest"><Warning weight="fill" className="inline mr-1" />NOTIFIABLE</span>}
              {doc.urgent && <span className="bg-yellow-400 text-ink px-2 py-0.5 text-[10px] font-bold tracking-widest">URGENT</span>}
            </div>
            <h1 className="font-display text-3xl font-black tracking-tighter mt-1">{doc.title}</h1>
            <div className="text-xs text-muted-foreground mt-1">Reported {new Date(doc.created_at).toLocaleString("en-AU")} · by {doc.created_by_name || "—"}</div>
          </div>
          {locked && (
            <Button variant="outline" className="btn-sharp border-ink" onClick={reopen} data-testid="reopen-btn"><ArrowRight className="mr-2" />Reopen (Admin)</Button>
          )}
        </div>
      </div>

      <LifecycleTracker lifecycle={doc.lifecycle} />

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="bg-muted rounded-none border border-border p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="summary" className="rounded-none" data-testid="tab-summary"><FileText className="mr-2" />Summary</TabsTrigger>
          <TabsTrigger value="submission" className="rounded-none" data-testid="tab-submission">Submission</TabsTrigger>
          <TabsTrigger value="triage" className="rounded-none" data-testid="tab-triage">Triage{doc.stage === "triage" && <span className="ml-1 bg-warning text-ink text-[10px] px-1">●</span>}</TabsTrigger>
          <TabsTrigger value="investigation" className="rounded-none" data-testid="tab-investigation">Investigation{doc.stage === "investigation" && <span className="ml-1 bg-warning text-ink text-[10px] px-1">●</span>}</TabsTrigger>
          <TabsTrigger value="actions" className="rounded-none" data-testid="tab-actions">Actions{doc.stage === "actions" && <span className="ml-1 bg-warning text-ink text-[10px] px-1">●</span>}</TabsTrigger>
          <TabsTrigger value="closeout" className="rounded-none" data-testid="tab-closeout">Close-out</TabsTrigger>
          <TabsTrigger value="linked" className="rounded-none" data-testid="tab-linked"><LinkIcon className="mr-2" />Linked</TabsTrigger>
          <TabsTrigger value="comms" className="rounded-none" data-testid="tab-comms"><ChatsCircle className="mr-2" />Communications</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-none" data-testid="tab-audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-3">
          {doc.stage === "closed" && (
            <AutoRiskPrompt doc={doc} onLinked={(risk_id) => setDoc({ ...doc, linked_risk_id: risk_id })} />
          )}
          <div className="flex items-end justify-between flex-wrap gap-2">
            <Button variant="outline" className="btn-sharp border-ink" onClick={runSummary} data-testid="ai-summary-btn"><Sparkle className="mr-2" weight="fill" />AI summary</Button>
            <Button variant="outline" className="btn-sharp border-ink" onClick={() => window.print()} data-testid="generate-report-btn"><FileText className="mr-2" />Generate report (PDF)</Button>
          </div>
          {aiSummary && <div className="bg-ink text-white p-4 text-sm" data-testid="ai-summary-panel">{aiSummary}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-background border border-border p-4 text-sm space-y-1">
              <div><strong>Who:</strong> {doc.submission?.involved_type} · {(doc.submission?.involved_people || []).map((p) => p.name).join(", ") || "—"}</div>
              <div><strong>What:</strong> {doc.title}</div>
              <div><strong>Where:</strong> {doc.submission?.site || "—"} ({doc.state})</div>
              <div><strong>When:</strong> {doc.submission?.date} {doc.submission?.time}</div>
              <div><strong>Status:</strong> {doc.stage}</div>
              <div><strong>Severity:</strong> {doc.severity ? `${doc.severity} — ${SEVERITIES.find((s) => s.v === doc.severity)?.label}` : "TBD"}</div>
            </div>
            <div className="bg-muted border border-border p-4 text-sm">
              <div className="label-eyebrow mb-1">Incident narrative</div>
              <p>{doc.submission?.description || "—"}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="submission" className="bg-background border border-border p-5 text-sm space-y-2">
          {Object.entries(doc.submission || {}).map(([k, v]) => (
            <div key={k} className="grid grid-cols-4 gap-2 border-b border-border py-1">
              <div className="label-eyebrow text-[10px] col-span-1">{k}</div>
              <div className="col-span-3 break-words">{typeof v === "object" ? JSON.stringify(v) : String(v || "—")}</div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="triage">
          {doc.stage === "reported" && <TriageForm doc={doc} regulators={regulators} onSaved={setDoc} />}
          {doc.stage !== "reported" && (
            <div className="bg-background border border-border p-5 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="label-eyebrow">Triage (completed)</div>
                <ReopenStageBtn incident_id={doc.incident_id} stage="triage" onReopened={setDoc} />
              </div>
              <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-3">{JSON.stringify(doc.triage, null, 2)}</pre>
            </div>
          )}
        </TabsContent>

        <TabsContent value="investigation">
          {doc.stage === "investigation" && <InvestigationForm doc={doc} onSaved={setDoc} />}
          {doc.stage === "reported" || doc.stage === "triage" ? <div className="p-5 text-sm text-muted-foreground">Complete triage first.</div> : null}
          {["actions", "closed"].includes(doc.stage) && (
            <div className="bg-background border border-border p-5 text-sm">
              <div className="flex items-center justify-between">
                <div className="label-eyebrow">Investigation (completed)</div>
                <ReopenStageBtn incident_id={doc.incident_id} stage="investigation" onReopened={setDoc} />
              </div>
              <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-3 mt-2">{JSON.stringify(doc.investigation, null, 2)}</pre>
            </div>
          )}
        </TabsContent>

        <TabsContent value="actions">
          {doc.stage === "actions" && <ActionsForm doc={doc} onSaved={setDoc} />}
          {["reported", "triage", "investigation"].includes(doc.stage) && <div className="p-5 text-sm text-muted-foreground">Complete investigation first.</div>}
          {doc.stage === "closed" && (
            <div className="bg-background border border-border p-5 text-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="label-eyebrow">Actions (completed)</div>
                <ReopenStageBtn incident_id={doc.incident_id} stage="actions" onReopened={setDoc} />
              </div>
              <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-3">{JSON.stringify(doc.actions, null, 2)}</pre>
            </div>
          )}
        </TabsContent>

        <TabsContent value="closeout">
          {doc.stage === "actions" && <CloseOutForm doc={doc} onSaved={setDoc} />}
          {["reported", "triage", "investigation"].includes(doc.stage) && <div className="p-5 text-sm text-muted-foreground">Complete actions first.</div>}
          {doc.stage === "closed" && (
            <div className="space-y-4">
              <AutoRiskPrompt doc={doc} onLinked={(risk_id) => setDoc({ ...doc, linked_risk_id: risk_id })} />
              <div className="bg-background border-2 border-emerald-600 p-5 text-sm space-y-2" data-testid="closed-panel">
                <div className="label-eyebrow text-emerald-700">CLOSED</div>
                <div><strong>Signed off by:</strong> {doc.close_out?.signed_off_by} · {doc.close_out?.signed_at ? new Date(doc.close_out.signed_at).toLocaleString("en-AU") : ""}</div>
                <div><strong>Lessons learned:</strong> {doc.close_out?.lessons_learned}</div>
                {doc.close_out?.incomplete_items?.length > 0 && (
                  <div className="text-xs text-muted-foreground">Flagged incomplete: {doc.close_out.incomplete_items.length} item(s)</div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="linked" className="space-y-3">
          <div className="bg-background border border-border p-4 text-sm">
            <div className="label-eyebrow mb-1">Risk Register</div>
            {doc.linked_risk_id ? <Link to={`/dashboard/risk-register/${doc.linked_risk_id}`} className="underline">Open {doc.linked_risk_id} →</Link> : <span className="text-muted-foreground">Not linked</span>}
          </div>
        </TabsContent>

        <TabsContent value="comms">
          <div className="bg-background border border-border p-4 space-y-2">
            <div className="label-eyebrow mb-2">Notifications</div>
            {notifs.length === 0 && <div className="text-xs text-muted-foreground">No notifications logged.</div>}
            {notifs.map((n, i) => (
              <div key={i} className="border-b border-border pb-2 text-sm">
                <div className="flex items-center justify-between">
                  <strong>{n.title}</strong>
                  <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("en-AU")}</span>
                </div>
                <div className="text-xs">{n.body}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <div className="bg-background border border-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-ink text-warning"><tr><th className="text-left px-3 py-2 label-eyebrow">When</th><th className="text-left px-3 py-2 label-eyebrow">Who</th><th className="text-left px-3 py-2 label-eyebrow">Field</th><th className="text-left px-3 py-2 label-eyebrow">Change</th></tr></thead>
              <tbody>
                {(doc.audit_log || []).slice().reverse().map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(e.at).toLocaleString("en-AU")}</td>
                    <td className="px-3 py-2">{e.user_name || "—"}</td>
                    <td className="px-3 py-2 font-mono">{e.field}</td>
                    <td className="px-3 py-2"><span className="text-muted-foreground">{e.old || "—"}</span> → <strong>{e.new || "—"}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
