import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkle, FloppyDisk, Plus, Trash, CheckCircle, Warning, PaperPlaneTilt } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  REVIEW_REASONS, ACTION_TYPES, LIKELIHOOD_SCALE, CONSEQUENCE_SCALE, riskLevel,
} from "./constants";

const SECTIONS = [
  "1. Identification", "2. Evidence", "3. Control Effectiveness",
  "4. Re-evaluation", "5. New Actions", "6. Summary & Sign-off",
];

export default function ReviewForm() {
  const { review_id } = useParams();
  const [params] = useSearchParams();
  const newRiskId = params.get("risk_id");
  const nav = useNavigate();
  const editing = review_id && review_id !== "new";

  const [risks, setRisks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [risk, setRisk] = useState(null);
  const [form, setForm] = useState({
    review_id: "", risk_id: newRiskId || "", title: "", reasons: [], reason_detail: "",
    start_date: new Date().toISOString(), target_completion_date: "",
    assigned_to: "", review_team: [],
    evidence_attachments: [], control_reviews: [], observations: "",
    risk_nature_changed: "no", risk_change_description: "",
    work_changed: "none",
    updated_likelihood: null, updated_consequence: null,
    immediate_action: "",
    new_actions: [], conclusion: "", summary: "",
    status: "in_progress", submitted_at: null, approved_at: null, approved_by: null,
  });
  const [aiBusy, setAiBusy] = useState(false);
  const [aiEvidence, setAiEvidence] = useState(null);

  const load = async () => {
    const [rs, ws] = await Promise.all([api.get("/risks"), api.get("/workers")]);
    setRisks(rs.data); setWorkers(ws.data);
    if (editing) {
      const r = await api.get(`/risk-reviews/${review_id}`);
      setForm((f) => ({ ...f, ...r.data }));
      const rr = rs.data.find((x) => x.risk_id === r.data.risk_id);
      setRisk(rr || null);
      // seed control reviews if empty
      if (!r.data.control_reviews?.length && rr?.controls?.length) {
        setForm((f) => ({
          ...f,
          control_reviews: rr.controls.map((c) => ({
            name: c.name, hierarchy_level: c.hierarchy_level, description: c.description,
            still_in_place: "yes", effectiveness: "effective", evidence_text: "",
            recommended_change: "no_change", explain: "",
          })),
        }));
      }
    } else if (newRiskId) {
      const rr = rs.data.find((x) => x.risk_id === newRiskId);
      if (rr) {
        setRisk(rr);
        setForm((f) => ({
          ...f,
          risk_id: newRiskId, title: `Review of ${rr.title} — ${new Date().toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`,
          assigned_to: rr.risk_owner || "",
          updated_likelihood: rr.residual_likelihood,
          updated_consequence: rr.residual_consequence,
          control_reviews: (rr.controls || []).map((c) => ({
            name: c.name, hierarchy_level: c.hierarchy_level, description: c.description,
            still_in_place: "yes", effectiveness: "effective", evidence_text: "",
            recommended_change: "no_change", explain: "",
          })),
        }));
      }
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [review_id, newRiskId]);

  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pickRisk = async (rid) => {
    const r = risks.find((x) => x.risk_id === rid);
    if (!r) return;
    setRisk(r);
    patch("risk_id", rid);
    patch("title", `Review of ${r.title} — ${new Date().toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`);
    patch("assigned_to", r.risk_owner || "");
    patch("updated_likelihood", r.residual_likelihood);
    patch("updated_consequence", r.residual_consequence);
    patch("control_reviews", (r.controls || []).map((c) => ({
      name: c.name, hierarchy_level: c.hierarchy_level, description: c.description,
      still_in_place: "yes", effectiveness: "effective", evidence_text: "",
      recommended_change: "no_change", explain: "",
    })));
  };

  const toggleReason = (r) =>
    patch("reasons", form.reasons.includes(r) ? form.reasons.filter((x) => x !== r) : [...form.reasons, r]);

  const runEvidence = async () => {
    if (!form.risk_id) return toast.error("Select a risk first");
    setAiBusy(true);
    try {
      const r = await api.post("/risk-reviews/ai/evidence", { risk_id: form.risk_id });
      setAiEvidence(r.data);
    } catch { toast.error("AI failed"); }
    setAiBusy(false);
  };

  const runSummary = async () => {
    setAiBusy(true);
    try {
      const r = await api.post("/risk-reviews/ai/review-summary", form);
      patch("summary", r.data.summary || "");
      toast.success("Summary generated — edit as needed");
    } catch { toast.error("AI failed"); }
    setAiBusy(false);
  };

  const addAction = () => patch("new_actions", [...form.new_actions, { description: "", type: "Improve existing control", assigned_to: "", due_date: "", priority: "medium", status: "open" }]);
  const patchAction = (i, k, v) => { const next = [...form.new_actions]; next[i] = { ...next[i], [k]: v }; patch("new_actions", next); };
  const removeAction = (i) => patch("new_actions", form.new_actions.filter((_, ix) => ix !== i));

  const patchCr = (i, k, v) => { const next = [...form.control_reviews]; next[i] = { ...next[i], [k]: v }; patch("control_reviews", next); };

  const save = async () => {
    try {
      if (editing) {
        await api.patch(`/risk-reviews/${review_id}`, form);
        toast.success("Saved");
      } else {
        const r = await api.post("/risk-reviews", form);
        toast.success("Created");
        nav(`/dashboard/risk-register/reviews/${r.data.review_id}`);
      }
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const submit = async () => {
    if (!editing) { await save(); return; }
    await api.patch(`/risk-reviews/${review_id}`, form);
    await api.post(`/risk-reviews/${review_id}/submit`);
    toast.success("Submitted for approval");
    load();
  };

  const decide = async (decision) => {
    const comment = window.prompt(`Comment for ${decision}:`) || "";
    await api.post(`/risk-reviews/${review_id}/approve`, { decision, comment });
    toast.success(`Review ${decision}`);
    nav("/dashboard/risk-register");
  };

  const ul = form.updated_likelihood;
  const uc = form.updated_consequence;
  const updatedScore = ul && uc ? ul * uc : 0;
  const previousScore = risk?.residual_score || 0;
  const updatedLevel = riskLevel(updatedScore);
  const changed = previousScore && updatedScore ? updatedScore - previousScore : 0;
  const isFinal = form.status === "approved" || form.status === "rejected";
  const pending = form.status === "pending_approval";

  return (
    <div className="space-y-6" data-testid="review-form">
      <div className="flex items-end justify-between flex-wrap gap-3 border-b-2 border-ink pb-4">
        <div>
          <div className="label-eyebrow">/ Risk Review {form.review_id && `· ${form.review_id}`}</div>
          <h1 className="font-display text-3xl font-black tracking-tighter mt-1">{form.title || "New risk review"}</h1>
          <div className="text-xs text-muted-foreground mt-1">Status: <strong>{(form.status || "").replace("_", " ").toUpperCase()}</strong></div>
        </div>
        <div className="flex gap-2">
          {!isFinal && <Button variant="outline" className="btn-sharp border-ink h-11" onClick={save} data-testid="review-save-btn"><FloppyDisk className="mr-2" />Save</Button>}
          {!isFinal && !pending && <Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" onClick={submit} data-testid="review-submit-btn"><PaperPlaneTilt className="mr-2" weight="fill" />Submit for approval</Button>}
          {pending && (
            <>
              <Button className="btn-sharp bg-emerald-600 text-white h-11" onClick={() => decide("approve")} data-testid="review-approve-btn"><CheckCircle className="mr-2" weight="fill" />Approve</Button>
              <Button variant="outline" className="btn-sharp border-ink h-11" onClick={() => decide("request_changes")}>Request changes</Button>
              <Button variant="outline" className="btn-sharp border-destructive text-destructive h-11" onClick={() => decide("reject")}>Reject</Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto py-2">
        {SECTIONS.map((s, i) => <a key={i} href={`#rsec${i + 1}`} className="px-3 py-1 border border-border hover:border-ink text-[10px] font-bold tracking-widest uppercase">{s}</a>)}
      </div>

      {/* 1 */}
      <section id="rsec1" className="bg-background border border-border p-6 space-y-4">
        <h2 className="font-display text-2xl font-black">1. Review identification</h2>
        {!risk && (
          <div>
            <Label className="label-eyebrow">Select risk to review</Label>
            <Select value={form.risk_id || "__none__"} onValueChange={(v) => v !== "__none__" && pickRisk(v)}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="pick-risk"><SelectValue placeholder="Search by ID or title" /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">—</SelectItem>{risks.map((r) => <SelectItem key={r.risk_id} value={r.risk_id}>{r.risk_id} — {r.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        {risk && (
          <div className="bg-muted p-4 border border-border text-sm space-y-1">
            <div><strong>{risk.risk_id}</strong> · {risk.title}</div>
            <div>Residual: <strong>{riskLevel(risk.residual_score).label}</strong> ({risk.residual_score || "—"}) · Controls {(risk.controls || []).length} · Last reviewed {risk.last_reviewed_at ? new Date(risk.last_reviewed_at).toLocaleDateString("en-AU") : "never"}</div>
          </div>
        )}
        <div>
          <Label className="label-eyebrow">Reasons for review (select all that apply)</Label>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1 max-h-48 overflow-y-auto border border-border p-2">
            {REVIEW_REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.reasons.includes(r)} onChange={() => toggleReason(r)} />{r}
              </label>
            ))}
          </div>
        </div>
        <Textarea rows={2} value={form.reason_detail} onChange={(e) => patch("reason_detail", e.target.value)} placeholder="Additional context…" className="rounded-none border-ink" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="label-eyebrow">Target completion date</Label>
            <Input type="date" value={(form.target_completion_date || "").slice(0, 10)} onChange={(e) => patch("target_completion_date", e.target.value)} className="mt-2 h-11 rounded-none border-ink" />
          </div>
          <div>
            <Label className="label-eyebrow">Assigned to</Label>
            <Select value={form.assigned_to || "__none__"} onValueChange={(v) => patch("assigned_to", v === "__none__" ? "" : v)}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">—</SelectItem>{workers.map((w) => <SelectItem key={w.worker_id} value={w.name}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* 2 */}
      <section id="rsec2" className="bg-background border border-border p-6 space-y-3">
        <h2 className="font-display text-2xl font-black">2. Evidence gathering</h2>
        <p className="text-sm text-muted-foreground">Consider all linked SafeTradie records before you assess.</p>
        <Button onClick={runEvidence} disabled={aiBusy || !form.risk_id} variant="outline" className="btn-sharp border-ink" data-testid="ai-evidence-btn"><Sparkle className="mr-2" weight="fill" />{aiBusy ? "Thinking…" : "AI evidence summary"}</Button>
        {aiEvidence && (
          <div className="bg-ink text-white p-4 text-sm">
            <p>{aiEvidence.summary}</p>
            {aiEvidence.points?.length ? <ul className="mt-2 space-y-1 list-disc pl-5">{aiEvidence.points.map((p, i) => <li key={i}>{p}</li>)}</ul> : null}
          </div>
        )}
      </section>

      {/* 3 */}
      <section id="rsec3" className="bg-background border border-border p-6 space-y-3">
        <h2 className="font-display text-2xl font-black">3. Control effectiveness</h2>
        {form.control_reviews.length === 0 && <div className="text-sm text-muted-foreground">No controls on the risk yet.</div>}
        {form.control_reviews.map((c, i) => (
          <div key={i} className="border border-border p-4 space-y-2" data-testid={`cr-${i}`}>
            <div className="font-bold text-sm">{c.name}</div>
            <p className="text-xs text-muted-foreground">{c.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div>
                <Label className="label-eyebrow">Still in place?</Label>
                <Select value={c.still_in_place} onValueChange={(v) => patchCr(i, "still_in_place", v)}>
                  <SelectTrigger className="mt-1 h-9 rounded-none border-ink"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem><SelectItem value="partial">Partially</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="label-eyebrow">Effectiveness</Label>
                <Select value={c.effectiveness} onValueChange={(v) => patchCr(i, "effectiveness", v)}>
                  <SelectTrigger className="mt-1 h-9 rounded-none border-ink"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highly">Highly effective</SelectItem><SelectItem value="effective">Effective</SelectItem>
                    <SelectItem value="partial">Partially</SelectItem><SelectItem value="not">Not effective</SelectItem>
                    <SelectItem value="unknown">Unable to assess</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="label-eyebrow">Recommended change</Label>
                <Select value={c.recommended_change} onValueChange={(v) => patchCr(i, "recommended_change", v)}>
                  <SelectTrigger className="mt-1 h-9 rounded-none border-ink"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_change">No change</SelectItem>
                    <SelectItem value="improve">Improve implementation</SelectItem>
                    <SelectItem value="replace">Replace with better</SelectItem>
                    <SelectItem value="remove">Remove (not relevant)</SelectItem>
                    <SelectItem value="supplement">Add supplementary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea rows={2} value={c.evidence_text} onChange={(e) => patchCr(i, "evidence_text", e.target.value)} placeholder="Evidence of effectiveness" className="rounded-none border-ink" />
          </div>
        ))}
        <Textarea rows={3} value={form.observations} onChange={(e) => patch("observations", e.target.value)} placeholder="Observations about the overall control set…" className="rounded-none border-ink" />
      </section>

      {/* 4 */}
      <section id="rsec4" className="bg-background border border-border p-6 space-y-3">
        <h2 className="font-display text-2xl font-black">4. Risk re-evaluation</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="label-eyebrow">Nature of risk changed?</Label>
            <Select value={form.risk_nature_changed} onValueChange={(v) => patch("risk_nature_changed", v)}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="no">No — same</SelectItem><SelectItem value="yes">Yes — changed</SelectItem><SelectItem value="new_hazard">New hazard identified</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label-eyebrow">Work changed?</Label>
            <Select value={form.work_changed} onValueChange={(v) => patch("work_changed", v)}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">No change</SelectItem><SelectItem value="minor">Minor</SelectItem><SelectItem value="significant">Significant</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        {form.risk_nature_changed === "yes" && (
          <Textarea rows={2} value={form.risk_change_description} onChange={(e) => patch("risk_change_description", e.target.value)} placeholder="Describe what changed" className="rounded-none border-ink" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="label-eyebrow">Updated likelihood</Label>
            <div className="mt-2 space-y-1">{LIKELIHOOD_SCALE.map((s) => <label key={s.v} className={`flex items-center gap-2 border p-2 text-xs ${form.updated_likelihood === s.v ? "border-ink bg-muted" : "border-border"}`}><input type="radio" checked={form.updated_likelihood === s.v} onChange={() => patch("updated_likelihood", s.v)} />{s.v} {s.label}</label>)}</div>
          </div>
          <div>
            <Label className="label-eyebrow">Updated consequence</Label>
            <div className="mt-2 space-y-1">{CONSEQUENCE_SCALE.map((s) => <label key={s.v} className={`flex items-center gap-2 border p-2 text-xs ${form.updated_consequence === s.v ? "border-ink bg-muted" : "border-border"}`}><input type="radio" checked={form.updated_consequence === s.v} onChange={() => patch("updated_consequence", s.v)} />{s.v} {s.label}</label>)}</div>
          </div>
          <div>
            <div className="border-2 border-ink p-4 text-center">
              <div className="label-eyebrow">Updated residual</div>
              <div className={`inline-block mt-2 ${updatedLevel.color} px-3 py-1 text-[10px] font-bold tracking-widest`}>{updatedLevel.label}</div>
              <div className="font-display text-4xl font-black mt-2" data-testid="updated-score">{updatedScore || "—"}</div>
              <div className="text-xs text-muted-foreground">Previous {previousScore || "—"}</div>
            </div>
            {changed > 0 && (
              <div className="mt-2 bg-red-100 border-2 border-red-700 p-3 text-xs" data-testid="risk-increased-banner">
                <Warning weight="fill" className="inline mr-1 text-red-700" />Risk has INCREASED by {changed}. Immediate review of controls required.
                <Textarea rows={2} required value={form.immediate_action} onChange={(e) => patch("immediate_action", e.target.value)} placeholder="What immediate action will be taken?" className="mt-2 rounded-none border-ink" />
              </div>
            )}
            {changed < 0 && <div className="mt-2 bg-emerald-100 border-2 border-emerald-700 p-3 text-xs">Risk has DECREASED by {-changed}. Controls are proving effective.</div>}
            {changed === 0 && previousScore > 0 && <div className="mt-2 bg-sky-100 border border-sky-400 p-3 text-xs">Risk level unchanged. Confirm controls remain adequate.</div>}
          </div>
        </div>
      </section>

      {/* 5 */}
      <section id="rsec5" className="bg-background border border-border p-6 space-y-3">
        <h2 className="font-display text-2xl font-black">5. New actions from this review</h2>
        {form.new_actions.map((a, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-2 border border-border p-2 items-center" data-testid={`action-${i}`}>
            <Input placeholder="Action" value={a.description} onChange={(e) => patchAction(i, "description", e.target.value)} className="h-9 rounded-none border-ink md:col-span-2" />
            <Select value={a.type || "Other"} onValueChange={(v) => patchAction(i, "type", v)}>
              <SelectTrigger className="h-9 rounded-none border-ink"><SelectValue /></SelectTrigger>
              <SelectContent>{ACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={a.assigned_to || "__none__"} onValueChange={(v) => patchAction(i, "assigned_to", v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-9 rounded-none border-ink"><SelectValue placeholder="Assignee" /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">—</SelectItem>{workers.map((w) => <SelectItem key={w.worker_id} value={w.name}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={a.due_date || ""} onChange={(e) => patchAction(i, "due_date", e.target.value)} className="h-9 rounded-none border-ink" />
            <Button variant="ghost" size="sm" onClick={() => removeAction(i)} className="text-destructive"><Trash /></Button>
          </div>
        ))}
        <Button variant="outline" className="btn-sharp border-ink" onClick={addAction} data-testid="add-action-btn"><Plus className="mr-1" />Add action</Button>
      </section>

      {/* 6 */}
      <section id="rsec6" className="bg-background border-2 border-ink p-6 space-y-3">
        <h2 className="font-display text-2xl font-black">6. Summary & sign-off</h2>
        <Button onClick={runSummary} disabled={aiBusy} variant="outline" className="btn-sharp border-ink" data-testid="ai-summary-btn"><Sparkle className="mr-2" weight="fill" />Generate summary with AI</Button>
        <Textarea rows={5} value={form.summary} onChange={(e) => patch("summary", e.target.value)} placeholder="Summary of review findings, outcomes, and actions…" className="rounded-none border-ink" data-testid="review-summary" />
        <div>
          <Label className="label-eyebrow">Conclusion</Label>
          <Select value={form.conclusion || "__none__"} onValueChange={(v) => patch("conclusion", v === "__none__" ? "" : v)}>
            <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue placeholder="Select conclusion" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              <SelectItem value="adequate">Adequately controlled — no change</SelectItem>
              <SelectItem value="minor_improvements">Adequately controlled — minor improvements</SelectItem>
              <SelectItem value="moderate">Requires improved controls — moderate priority</SelectItem>
              <SelectItem value="immediate">Requires immediate action — high priority</SelectItem>
              <SelectItem value="reassess">Has changed significantly — full re-assessment needed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>
    </div>
  );
}
