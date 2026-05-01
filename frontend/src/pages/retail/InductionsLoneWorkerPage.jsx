/**
 * RetailInductionsLoneWorker — main retail operations page.
 * Purple + magenta + tint.
 * Tabs: Lone Worker (active+history), Quick Induct, Customer incidents.
 */
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { IndustryListTab, StatChip, pill } from "../_shared/IndustryListTab";

const PURPLE = "#5B2D8E";
const MAGENTA = "#E91E8C";
const TINT = "#F9F5FF";
const GREEN = "#4CAF8F";
const RED = "#C7405B";
const AMBER = "#E6A70A";

function LoneWorkerActivePanel({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/retail/lone-worker/active");
      setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); const t = setInterval(refresh, 30000); return () => clearInterval(t); }, [refreshKey]);

  const escalate = async (checkin_id) => {
    try {
      await api.post("/retail/lone-worker/escalate", { checkin_id, reason: "manual_escalation" });
      toast.success("Escalated — manager alerted");
      refresh();
    } catch (err) {
      toast.error("Escalation failed");
    }
  };

  return (
    <div className="mb-6">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatChip label="Active lone workers" value={rows.length} color={PURPLE} testid="retail-lw-active-count" />
        <StatChip label="Overdue" value={rows.filter(r => r._overdue).length} color={AMBER} testid="retail-lw-overdue" />
        <StatChip label="Escalated" value={rows.filter(r => r.escalated).length} color={RED} testid="retail-lw-escalated" />
      </div>
      <div className="border-2 border-black/10 bg-white" data-testid="retail-lw-active-panel">
        <div className="px-4 py-3 border-b-2 border-black/10 font-display font-black uppercase text-sm" style={{ background: TINT }}>
          Active check-ins (auto-refresh every 30s)
        </div>
        {loading && <div className="p-6 text-center text-black/40">Loading…</div>}
        {!loading && rows.length === 0 && <div className="p-6 text-center text-black/40">No active lone workers.</div>}
        {rows.map(r => (
          <div key={r.checkin_id} className="border-t border-black/5 p-4 flex items-center gap-4" data-testid={`retail-lw-row-${r.checkin_id}`}>
            <div className="w-3 h-3 rounded-full" style={{ background: r._should_escalate ? RED : (r._overdue ? AMBER : GREEN) }} />
            <div className="flex-1">
              <div className="font-bold">{r.worker_name}</div>
              <div className="text-xs text-black/60">{r.location} · next check-in {r.next_checkin_due ? new Date(r.next_checkin_due).toLocaleTimeString() : "—"}</div>
            </div>
            <div>
              {r._should_escalate && pill("ESCALATE NOW", RED)}
              {!r._should_escalate && r._overdue && pill(`Overdue ${r._overdue_min}m`, AMBER)}
              {!r._overdue && pill("OK", GREEN)}
            </div>
            {!r.escalated && (
              <Button size="sm" variant="outline" onClick={() => escalate(r.checkin_id)} data-testid={`retail-lw-escalate-${r.checkin_id}`}>Escalate</Button>
            )}
            {r.escalated && pill("ESCALATED", RED)}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickInductFlow() {
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({ casual_name: "", casual_id: "", store_location: "", answers: {} });
  const [last, setLast] = useState(null);

  useEffect(() => {
    api.get("/retail/quick-induct/meta").then(({ data }) => setQuestions(data.questions || [])).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/retail/quick-induct", form);
      setLast(data);
      if (data.passed) toast.success(`${data.casual_name} inducted — valid 90 days`);
      else toast.error(`Incomplete: ${data.missing_answers.join(", ")}`);
      setForm({ casual_name: "", casual_id: "", store_location: "", answers: {} });
    } catch (err) {
      toast.error("Failed");
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className="border-2 p-6 bg-white space-y-4" style={{ borderColor: MAGENTA }} data-testid="retail-qi-form">
        <h3 className="font-display font-black uppercase text-sm" style={{ color: MAGENTA }}>Quick Induct (3-min shift-blocker)</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs uppercase">Casual name *</Label><Input value={form.casual_name} onChange={e => setForm({ ...form, casual_name: e.target.value })} required data-testid="retail-qi-name" /></div>
          <div><Label className="text-xs uppercase">Casual ID</Label><Input value={form.casual_id} onChange={e => setForm({ ...form, casual_id: e.target.value })} data-testid="retail-qi-id" /></div>
        </div>
        <div><Label className="text-xs uppercase">Store</Label><Input value={form.store_location} onChange={e => setForm({ ...form, store_location: e.target.value })} data-testid="retail-qi-store" /></div>
        <div className="space-y-3 pt-2 border-t border-black/10">
          {questions.map(q => (
            <div key={q.key}>
              <Label className="text-sm">{q.q}</Label>
              <Textarea rows={2} value={form.answers[q.key] || ""} onChange={e => setForm({ ...form, answers: { ...form.answers, [q.key]: e.target.value } })} data-testid={`retail-qi-answer-${q.key}`} />
            </div>
          ))}
        </div>
        <Button type="submit" className="w-full text-white" style={{ background: MAGENTA }} data-testid="retail-qi-submit">Submit induction</Button>
      </form>
      <div className="border-2 border-black/10 bg-white p-6" data-testid="retail-qi-last">
        <h3 className="font-display font-black uppercase text-sm mb-4" style={{ color: PURPLE }}>Last induction</h3>
        {!last && <div className="text-sm text-black/40">Complete an induction — result shows here.</div>}
        {last && (
          <div className="space-y-3">
            <div className="text-lg font-bold">{last.casual_name}</div>
            <div>{last.passed ? pill("PASSED · valid 90d", GREEN) : pill("FAILED", RED)}</div>
            {!last.passed && <div className="text-xs text-red-700">Missing: {last.missing_answers.join(", ")}</div>}
            <div className="text-xs text-black/60 pt-2">Induct ID: <span className="font-mono">{last.induct_id}</span></div>
            {last.expires_at && <div className="text-xs text-black/60">Expires: {new Date(last.expires_at).toLocaleDateString()}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function LoneWorkerCheckinForm({ onDone }) {
  const [form, setForm] = useState({ worker_name: "", location: "", next_checkin_min: 60 });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/retail/lone-worker/checkin", { ...form, next_checkin_min: Number(form.next_checkin_min) });
      toast.success("Check-in recorded");
      setForm({ worker_name: "", location: "", next_checkin_min: 60 });
      onDone?.();
    } catch (err) {
      toast.error("Failed");
    }
  };
  return (
    <form onSubmit={submit} className="border-2 p-5 bg-white space-y-3" style={{ borderColor: PURPLE }} data-testid="retail-lw-checkin-form">
      <h3 className="font-display font-black uppercase text-sm" style={{ color: PURPLE }}>Log a lone-worker check-in</h3>
      <div><Label className="text-xs uppercase">Worker *</Label><Input value={form.worker_name} onChange={e => setForm({ ...form, worker_name: e.target.value })} required data-testid="retail-lw-worker" /></div>
      <div><Label className="text-xs uppercase">Location *</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required data-testid="retail-lw-location" /></div>
      <div><Label className="text-xs uppercase">Next check-in (minutes)</Label><Input type="number" value={form.next_checkin_min} onChange={e => setForm({ ...form, next_checkin_min: e.target.value })} data-testid="retail-lw-next" /></div>
      <Button type="submit" className="w-full text-white" style={{ background: PURPLE }} data-testid="retail-lw-submit">Start check-in window</Button>
    </form>
  );
}

export default function RetailInductionsLoneWorker() {
  const [key, setKey] = useState(0);
  return (
    <div className="min-h-screen p-6" style={{ background: TINT }} data-testid="retail-ops-page">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider" style={{ color: MAGENTA }}>Retail · Operations</div>
        <h1 className="font-display font-black text-4xl mt-1" style={{ color: PURPLE }}>Inductions, Lone Worker & Customer Safety</h1>
        <p className="text-sm text-black/60 mt-2 max-w-2xl">Casual Quick Induct (3-min shift-blocker), live lone-worker check-ins, and customer injury / aggression logs — built for high-turnover retail teams.</p>
      </div>

      <Tabs defaultValue="lone-worker" className="w-full">
        <TabsList className="bg-white border-2 border-black/10 p-1 h-auto flex-wrap">
          <TabsTrigger value="lone-worker" data-testid="retail-tab-lone-worker">Lone Worker</TabsTrigger>
          <TabsTrigger value="quick-induct" data-testid="retail-tab-quick-induct">Quick Induct</TabsTrigger>
          <TabsTrigger value="customer" data-testid="retail-tab-customer">Customer Incidents</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="lone-worker">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LoneWorkerActivePanel refreshKey={key} />
              </div>
              <div className="self-start">
                <LoneWorkerCheckinForm onDone={() => setKey(k => k + 1)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quick-induct">
            <QuickInductFlow />
          </TabsContent>

          <TabsContent value="customer">
            <IndustryListTab
              title="Customer Incidents"
              endpoint="/retail/customer-incidents"
              testPrefix="retail-cust"
              accent={MAGENTA}
              headerBg={TINT}
              columns={[
                { key: "incident_type", label: "Type" },
                { key: "severity", label: "Severity" },
                { key: "summary", label: "Summary" },
                { key: "location", label: "Location" },
                { key: "occurred_at", label: "When", render: r => new Date(r.occurred_at).toLocaleString() },
                { key: "status", label: "Status" },
              ]}
              transformSubmit={(f) => ({
                ...f,
                police_called: f.police_called === "yes",
                ambulance_called: f.ambulance_called === "yes",
              })}
              formFields={[
                { key: "incident_type", label: "Type", type: "select", options: ["injury", "aggression", "slip", "theft", "medical_event"], required: true },
                { key: "severity", label: "Severity", type: "select", options: ["minor", "moderate", "serious"] },
                { key: "summary", label: "Summary", type: "textarea", required: true },
                { key: "occurred_at", label: "Occurred at", type: "datetime", required: true },
                { key: "location", label: "Location" },
                { key: "customer_initials", label: "Customer initials" },
                { key: "staff_involved", label: "Staff involved" },
                { key: "police_called", label: "Police called?", type: "select", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }] },
                { key: "ambulance_called", label: "Ambulance?", type: "select", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }] },
                { key: "follow_up_action", label: "Follow-up", type: "textarea" },
              ]}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
