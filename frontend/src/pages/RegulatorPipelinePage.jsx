import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Owner-only regulator pipeline manager.
 *   - Triage widget: paste incident description → see which pipelines fire
 *   - Draft a case → land in the pending list with countdown
 *   - Mark submitted with a reference number
 */
export default function RegulatorPipelinePage() {
  const [cases, setCases] = useState([]);
  const [triage, setTriage] = useState(null);
  const [industry, setIndustry] = useState("healthcare");
  const [incidentType, setIncidentType] = useState("");
  const [description, setDescription] = useState("");

  const token = useMemo(() => localStorage.getItem("safetradie_token") || localStorage.getItem("safebase_token"), []);
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/api/regulator-pipeline/pending`, { headers });
      setCases(data.cases || []);
    } catch (e) { setCases([]); }
  };
  useEffect(() => { load(); }, []);

  const runTriage = async () => {
    if (!description && !incidentType) return;
    try {
      const { data } = await axios.post(`${API}/api/regulator-pipeline/triage`, { industry, incident_type: incidentType, description }, { headers });
      setTriage(data);
    } catch (e) { setTriage({ error: e?.response?.data?.detail || "Triage failed" }); }
  };

  const draft = async () => {
    try {
      await axios.post(`${API}/api/regulator-pipeline/draft`, { industry, incident_type: incidentType, description }, { headers });
      setTriage(null); setIncidentType(""); setDescription("");
      await load();
    } catch (e) { alert(e?.response?.data?.detail || "Draft failed"); }
  };

  const markSubmitted = async (id, pipeline) => {
    const ref = prompt(`Reference number from ${pipeline}?`) || "";
    try {
      await axios.post(`${API}/api/regulator-pipeline/mark-submitted/${id}`, { pipeline, reference_number: ref }, { headers });
      await load();
    } catch (e) { alert("Update failed"); }
  };

  return (
    <div className="space-y-6" data-testid="regulator-page">
      <div>
        <div className="label-eyebrow">REGULATOR PIPELINE AUTOMATION</div>
        <h1 className="font-display font-black tracking-tighter text-3xl mt-1">Triage every incident. Never miss a deadline.</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">SafeBase evaluates each incident against SIRS (Aged Care), NDIS Reportable Incidents, and NHVR Notifiable Occurrence matrices — and gives you a 24-hour clock you cannot miss.</p>
      </div>

      {/* Triage */}
      <Card className="p-6" data-testid="regulator-triage-card">
        <div className="font-semibold">Triage an incident</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger data-testid="regulator-industry"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="healthcare">Healthcare / Aged Care</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
              <SelectItem value="hospitality">Hospitality</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="trades">Trades</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Incident type (e.g. unexpected death)" value={incidentType} onChange={e => setIncidentType(e.target.value)} data-testid="regulator-incident-type" />
          <Button onClick={runTriage} data-testid="regulator-triage-btn">Run triage</Button>
        </div>
        <Textarea placeholder="Short description of what happened, when, who was involved, where" className="mt-3" rows={3} value={description} onChange={e => setDescription(e.target.value)} data-testid="regulator-description" />

        {triage && triage.matches && (
          <div className="mt-4 space-y-2" data-testid="regulator-triage-result">
            {!triage.matches.length && <div className="text-sm text-muted-foreground">No regulator pipeline triggered — log as internal incident only.</div>}
            {triage.matches.map((m, i) => (
              <div key={i} className="border-2 border-ink p-3 rounded bg-warning/10" data-testid={`regulator-match-${m.pipeline}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold">{m.pipeline}</span> · {m.regulator}
                    <Badge className="ml-2" variant="destructive">{m.priority}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Deadline in {m.deadline_hours}h</span>
                </div>
                <div className="text-xs mt-1">Statutory basis: {m.statutory_basis}</div>
                <div className="text-xs text-muted-foreground mt-1">Triggered by: {(m.triggered_by || []).join(", ")}</div>
              </div>
            ))}
            {triage.matches.length > 0 && (
              <Button onClick={draft} className="mt-2" data-testid="regulator-draft-btn">Create case and start clock</Button>
            )}
          </div>
        )}
      </Card>

      {/* Pending cases */}
      <Card className="p-6" data-testid="regulator-pending-card">
        <div className="font-semibold mb-3">Pending notifications ({cases.length})</div>
        {!cases.length && <div className="text-sm text-muted-foreground">No open cases.</div>}
        <ul className="space-y-3">
          {cases.map((c) => {
            const pipelines = (c.matches || []).map(m => m.pipeline).join(" · ");
            return (
              <li key={c.id} className="border p-3 rounded" data-testid={`regulator-pending-${c.id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{c.incident_type || "Incident"} · {pipelines}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>
                  </div>
                  <Badge variant={c.overdue ? "destructive" : "outline"}>
                    {c.overdue ? "OVERDUE" : `${c.hours_remaining}h`}
                  </Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  {(c.matches || []).map((m, i) => (
                    <Button key={i} size="sm" variant="outline" onClick={() => markSubmitted(c.id, m.pipeline)} data-testid={`regulator-mark-submitted-${m.pipeline}`}>
                      Mark {m.pipeline} submitted
                    </Button>
                  ))}
                  {(c.matches || []).length > 0 && (
                    <a href={c.matches[0].channel} target="_blank" rel="noreferrer" className="ml-auto text-xs underline self-center">Go to {c.matches[0].pipeline} portal →</a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
