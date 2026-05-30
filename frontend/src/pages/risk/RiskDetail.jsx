import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PencilSimple, Archive, ArrowRight, FileText, Sparkle, ShieldWarning, ClockCounterClockwise, Link as LinkIcon, ListChecks, DownloadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { riskLevel, HIERARCHY_MAP } from "./constants";
import { personLabel } from "@/components/PeoplePicker";

export default function RiskDetail() {
  const { risk_id } = useParams();
  const nav = useNavigate();
  const [risk, setRisk] = useState(null);
  const [linked, setLinked] = useState({ incidents: [], swms: [], inspections: [], toolbox: [] });
  const [reviews, setReviews] = useState([]);

  const load = async () => {
    try {
      const [r, l, revs] = await Promise.all([
        api.get(`/risks/${risk_id}`),
        api.get(`/risks/${risk_id}/linked`),
        api.get("/risk-reviews"),
      ]);
      setRisk(r.data); setLinked(l.data);
      setReviews((revs.data || []).filter((rv) => rv.risk_id === risk_id));
    } catch { toast.error("Failed to load risk"); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [risk_id]);

  const startReview = async () => {
    const r = await api.post("/risk-reviews", { risk_id });
    nav(`/dashboard/risk-register/reviews/${r.data.review_id}`);
  };
  const archive = async () => {
    if (!window.confirm("Archive this risk?")) return;
    await api.delete(`/risks/${risk_id}`);
    nav("/dashboard/risk-register");
  };

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const downloadAuditPack = async () => {
    setGeneratingPdf(true);
    try {
      const res = await api.get(`/risks/${risk_id}/audit-pack`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-pack-${risk_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Audit pack downloaded");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not generate audit pack");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!risk) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  const il = riskLevel(risk.inherent_score);
  const rl = riskLevel(risk.residual_score);

  const genSwmsHref = `/dashboard/documents?prefill_process=${encodeURIComponent(risk.process_name || "")}&prefill_activity=${encodeURIComponent(risk.activity_name || "")}&prefill_title=${encodeURIComponent(risk.title || "")}`;
  const toolboxHref = `/dashboard/toolbox-talks?prefill_topic=${encodeURIComponent(risk.title || "")}`;
  const inspectionHref = `/dashboard/inspections?prefill_activity=${encodeURIComponent(risk.activity_name || "")}`;
  const academyHref = `/dashboard/academy?search=${encodeURIComponent(risk.primary_hazard || "")}`;

  return (
    <div className="space-y-6" data-testid="risk-detail-page">
      {/* Header */}
      <div className="border-b-2 border-ink pb-4">
        <div className="label-eyebrow">
          <Link to="/dashboard/risk-register" className="underline">Risk Register</Link> · {risk.process_name || "—"} → {risk.activity_name || "—"}
        </div>
        <div className="flex items-end justify-between flex-wrap gap-3 mt-2">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold">{risk.risk_id}</span>
              <span className={`${rl.color} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{rl.label}</span>
              <span className="text-xs text-muted-foreground">{risk.status}</span>
            </div>
            <h1 className="font-display text-3xl font-black tracking-tighter mt-1">{risk.title}</h1>
            <div className="text-sm text-muted-foreground mt-1">Owner {personLabel(risk.risk_owner)} · Next review {risk.next_review_date ? new Date(risk.next_review_date).toLocaleDateString("en-AU") : "—"}</div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={downloadAuditPack}
              disabled={generatingPdf}
              variant="outline"
              className="btn-sharp border-ink h-11"
              data-testid="download-audit-pack-btn"
            >
              <DownloadSimple className="mr-2" weight="bold" />
              {generatingPdf ? "Generating…" : "Audit pack PDF"}
            </Button>
            <Link to={`/dashboard/risk-register/${risk_id}/edit`}><Button variant="outline" className="btn-sharp border-ink h-11" data-testid="edit-risk-btn"><PencilSimple className="mr-2" />Edit</Button></Link>
            <Button onClick={startReview} className="btn-sharp bg-ink text-white hover:bg-authority h-11" data-testid="initiate-review-btn">Initiate review <ArrowRight className="ml-2" /></Button>
            <Button variant="outline" className="btn-sharp border-ink h-11 text-destructive" onClick={archive}><Archive className="mr-2" />Archive</Button>
          </div>
        </div>
      </div>

      {/* Cross-module quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="xmodule-actions">
        <Link to={genSwmsHref} className="border border-border p-3 hover:border-ink text-sm">Generate SWMS from this risk →</Link>
        <Link to={toolboxHref} className="border border-border p-3 hover:border-ink text-sm">Schedule toolbox talk →</Link>
        <Link to={inspectionHref} className="border border-border p-3 hover:border-ink text-sm">Create inspection →</Link>
        <Link to={academyHref} className="border border-border p-3 hover:border-ink text-sm">Assign training →</Link>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted rounded-none border border-border p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="rounded-none" data-testid="tab-overview"><ShieldWarning className="mr-2" />Overview</TabsTrigger>
          <TabsTrigger value="controls" className="rounded-none" data-testid="tab-controls"><ListChecks className="mr-2" />Controls ({(risk.controls || []).length})</TabsTrigger>
          <TabsTrigger value="linked" className="rounded-none" data-testid="tab-linked"><LinkIcon className="mr-2" />Linked Records</TabsTrigger>
          <TabsTrigger value="history" className="rounded-none" data-testid="tab-history"><ClockCounterClockwise className="mr-2" />Review History</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-none" data-testid="tab-audit"><FileText className="mr-2" />Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-2 border-ink p-5 text-center">
              <div className="label-eyebrow">Inherent</div>
              <div className={`inline-block mt-2 ${il.color} px-3 py-1 text-[10px] font-bold tracking-widest`}>{il.label}</div>
              <div className="font-display text-5xl font-black mt-2">{risk.inherent_score || "—"}</div>
              <div className="text-xs text-muted-foreground">L{risk.inherent_likelihood || "—"} × C{risk.inherent_consequence || "—"}</div>
            </div>
            <div className="border-2 border-ink p-5 text-center">
              <div className="label-eyebrow">Residual</div>
              <div className={`inline-block mt-2 ${rl.color} px-3 py-1 text-[10px] font-bold tracking-widest`}>{rl.label}</div>
              <div className="font-display text-5xl font-black mt-2">{risk.residual_score || "—"}</div>
              <div className="text-xs text-muted-foreground">L{risk.residual_likelihood || "—"} × C{risk.residual_consequence || "—"}</div>
            </div>
            <div className="bg-muted border border-border p-5 space-y-1 text-sm">
              <div><strong>Hazard:</strong> {risk.primary_hazard || "—"}{risk.secondary_hazard ? ` + ${risk.secondary_hazard}` : ""}</div>
              <div><strong>Source:</strong> {risk.source || "—"}</div>
              <div><strong>Date identified:</strong> {risk.date_identified ? new Date(risk.date_identified).toLocaleDateString("en-AU") : "—"}</div>
              <div><strong>Review frequency:</strong> {risk.review_frequency || "—"}</div>
              <div><strong>Last reviewed:</strong> {risk.last_reviewed_at ? new Date(risk.last_reviewed_at).toLocaleDateString("en-AU") : "never"}</div>
            </div>
          </div>
          <div className="bg-background border border-border p-5">
            <div className="label-eyebrow mb-2">Hazard description</div>
            <p className="text-sm">{risk.hazard_description || "—"}</p>
          </div>
          <div className="bg-background border border-border p-5">
            <div className="label-eyebrow mb-2">Risk description</div>
            <p className="text-sm">{risk.description || "—"}</p>
          </div>
        </TabsContent>

        <TabsContent value="controls" className="space-y-2">
          {(risk.controls || []).length === 0 && <div className="border-2 border-dashed border-border p-8 text-center text-muted-foreground text-sm">No controls linked. <Link to={`/dashboard/risk-register/${risk_id}/edit`} className="underline">Edit risk →</Link></div>}
          {(risk.controls || []).map((c, i) => (
            <div key={i} className="border border-border p-4" data-testid={`ctrl-${i}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2"><span className={`${HIERARCHY_MAP[c.hierarchy_level]?.color || "bg-muted"} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{HIERARCHY_MAP[c.hierarchy_level]?.label || c.hierarchy_level}</span><span className="font-bold">{c.name}</span></div>
                <div className="flex gap-2 text-xs">
                  <span className="bg-muted px-2 py-0.5">{(c.status || "planned").toUpperCase()}</span>
                  <span className="bg-muted px-2 py-0.5">Eff: {(c.effectiveness || "medium").toUpperCase()}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="linked" className="space-y-4">
          <div className="bg-ink text-white p-4 text-sm" data-testid="linked-ai-summary">
            <div className="label-eyebrow text-warning flex items-center gap-2"><Sparkle weight="fill" /> / Evidence summary</div>
            <p className="mt-1">This risk has <strong>{linked.incidents.length}</strong> linked incident(s) and <strong>{linked.swms.length}</strong> SWMS. Recent activity suggests controls should be re-verified at the next review.</p>
          </div>
          <div className="bg-background border border-border p-4">
            <div className="label-eyebrow mb-2">Linked incidents ({linked.incidents.length})</div>
            {linked.incidents.length === 0 ? <div className="text-xs text-muted-foreground">None</div> : (
              <ul className="text-sm divide-y divide-border">{linked.incidents.map((i) => <li key={i.incident_id} className="py-1 flex justify-between"><span>{i.title}</span><span className="text-xs text-muted-foreground">{i.severity}</span></li>)}</ul>
            )}
          </div>
          <div className="bg-background border border-border p-4">
            <div className="label-eyebrow mb-2">Linked SWMS ({linked.swms.length})</div>
            {linked.swms.length === 0 ? <div className="text-xs text-muted-foreground">None</div> : (
              <ul className="text-sm divide-y divide-border">{linked.swms.map((s) => <li key={s.document_id} className="py-1">{s.title}</li>)}</ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {reviews.length === 0 && <div className="border-2 border-dashed border-border p-8 text-center text-muted-foreground text-sm">No reviews yet. <button onClick={startReview} className="underline">Initiate one →</button></div>}
          {reviews.map((r) => (
            <div key={r.review_id} className="border border-border p-4" data-testid={`rev-${r.review_id}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold">{r.review_id}</div>
                  <div className="font-bold">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{(r.reasons || []).join(" · ")}</div>
                </div>
                <Link to={`/dashboard/risk-register/reviews/${r.review_id}`} className="label-eyebrow underline">Open →</Link>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="audit">
          <div className="bg-background border border-border">
            <table className="w-full text-xs">
              <thead className="bg-ink text-warning"><tr><th className="text-left px-3 py-2 label-eyebrow">When</th><th className="text-left px-3 py-2 label-eyebrow">Who</th><th className="text-left px-3 py-2 label-eyebrow">Field</th><th className="text-left px-3 py-2 label-eyebrow">Change</th></tr></thead>
              <tbody>
                {(risk.audit_log || []).slice().reverse().map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(e.at).toLocaleString("en-AU")}</td>
                    <td className="px-3 py-2">{e.user_name || "—"}</td>
                    <td className="px-3 py-2 font-mono">{e.field}</td>
                    <td className="px-3 py-2 text-xs"><span className="text-muted-foreground">{e.old || "—"}</span> → <strong>{e.new || "—"}</strong></td>
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
