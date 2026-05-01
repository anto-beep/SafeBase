/**
 * HospitalityFoodSafety — main hospitality operations page.
 * Cream + deep teal + burgundy. Tabs for: Temperature, HACCP, Allergens,
 * Cleaning, FSS & Liquor, Suppliers, Inspection Pack.
 *
 * Mounted at /dashboard/food-safety for hospitality users only. Backend 403s
 * non-hospitality callers, but we also hide the nav entry in the sidebar.
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

const CREAM = "#F1ECE0";
const TEAL = "#0F4C5C";
const BURGUNDY = "#7C1D3F";

function StatChip({ label, value, color = TEAL }) {
  return (
    <div className="border-2 border-black/10 p-4 bg-white" data-testid={`hosp-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="text-xs uppercase tracking-wider text-black/60">{label}</div>
      <div className="font-display font-black text-3xl mt-1" style={{ color }}>{value}</div>
    </div>
  );
}

function TemperatureTab() {
  const [form, setForm] = useState({ equipment: "", equipment_type: "fridge", temp_c: "", corrective_action: "" });
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total_30d: 0, breaches_30d: 0, breach_rate_pct: 0 });

  const refresh = async () => {
    const { data } = await api.get("/hospitality/temperature-logs");
    setRows(data.rows || []);
    const s = await api.get("/hospitality/temperature-logs/stats");
    setStats(s.data);
  };
  useEffect(() => { refresh(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/hospitality/temperature-logs", { ...form, temp_c: parseFloat(form.temp_c) });
      toast.success("Temperature logged");
      setForm({ ...form, temp_c: "", corrective_action: "" });
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || "Failed to log");
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <StatChip label="Readings 30d" value={stats.total_30d} />
          <StatChip label="Breaches 30d" value={stats.breaches_30d} color={BURGUNDY} />
          <StatChip label="Breach rate" value={`${stats.breach_rate_pct}%`} color={stats.breach_rate_pct > 0 ? BURGUNDY : TEAL} />
        </div>
        <div className="border-2 border-black/10 bg-white" data-testid="hosp-temp-table">
          <div className="px-4 py-3 border-b-2 border-black/10 font-display font-black uppercase text-sm" style={{ background: CREAM }}>Recent readings (FSANZ Std 3.2.2)</div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-black/60">
                <tr><th className="p-3">Equipment</th><th className="p-3">Type</th><th className="p-3">Temp</th><th className="p-3">Status</th><th className="p-3">Time</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map(r => (
                  <tr key={r.log_id} className="border-t border-black/5">
                    <td className="p-3 font-semibold">{r.equipment}</td>
                    <td className="p-3 text-xs uppercase">{r.equipment_type}</td>
                    <td className="p-3 font-mono">{r.temp_c}°C</td>
                    <td className="p-3">{r.in_range ? <Badge style={{ background: TEAL, color: "white" }}>In range</Badge> : <Badge style={{ background: BURGUNDY, color: "white" }}>BREACH</Badge>}</td>
                    <td className="p-3 text-xs">{new Date(r.taken_at).toLocaleString()}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-black/40">No readings yet — log your first below.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <form onSubmit={submit} className="border-2 p-5 bg-white self-start" style={{ borderColor: TEAL }} data-testid="hosp-temp-form">
        <h3 className="font-display font-black uppercase text-sm mb-4" style={{ color: TEAL }}>Log a reading</h3>
        <Label>Equipment name</Label>
        <Input value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })} required data-testid="hosp-temp-equipment" />
        <Label className="mt-3 block">Type</Label>
        <Select value={form.equipment_type} onValueChange={v => setForm({ ...form, equipment_type: v })}>
          <SelectTrigger data-testid="hosp-temp-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fridge">Fridge (≤5°C)</SelectItem>
            <SelectItem value="coolroom">Coolroom (≤5°C)</SelectItem>
            <SelectItem value="freezer">Freezer (≤-15°C)</SelectItem>
            <SelectItem value="bain_marie">Bain-marie (≥60°C)</SelectItem>
            <SelectItem value="hot_holding">Hot holding (≥60°C)</SelectItem>
          </SelectContent>
        </Select>
        <Label className="mt-3 block">Temperature (°C)</Label>
        <Input type="number" step="0.1" value={form.temp_c} onChange={e => setForm({ ...form, temp_c: e.target.value })} required data-testid="hosp-temp-value" />
        <Label className="mt-3 block">Corrective action (if breach)</Label>
        <Textarea value={form.corrective_action} onChange={e => setForm({ ...form, corrective_action: e.target.value })} rows={2} />
        <Button type="submit" className="mt-4 w-full text-white" style={{ background: TEAL }} data-testid="hosp-temp-submit">Log reading</Button>
      </form>
    </div>
  );
}

function SimpleListTab({ title, endpoint, columns, formFields, testPrefix }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({});
  const refresh = async () => { const { data } = await api.get(endpoint); setRows(data.rows || []); };
  useEffect(() => { refresh(); }, [endpoint]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post(endpoint, form);
      toast.success(`${title.replace(/s$/, "")} added`);
      setForm({});
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || err.response?.data?.detail || "Failed");
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 border-2 border-black/10 bg-white" data-testid={`${testPrefix}-list`}>
        <div className="px-4 py-3 border-b-2 border-black/10 font-display font-black uppercase text-sm" style={{ background: CREAM }}>{title} ({rows.length})</div>
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-black/60">
              <tr>{columns.map(c => <th key={c.key} className="p-3">{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.log_id || r.supplier_id || r.item_id || r.task_id || r.cert_id || r.fss_id || r.ccp_id || r.pack_id || i} className="border-t border-black/5">
                  {columns.map(c => <td key={c.key} className="p-3">{c.render ? c.render(r) : String(r[c.key] ?? "")}</td>)}
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={columns.length} className="p-6 text-center text-black/40">No records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <form onSubmit={submit} className="border-2 p-5 bg-white self-start space-y-3" style={{ borderColor: TEAL }}>
        <h3 className="font-display font-black uppercase text-sm" style={{ color: TEAL }}>Add {title.replace(/s$/, "")}</h3>
        {formFields.map(f => (
          <div key={f.key}>
            <Label>{f.label}{f.required && " *"}</Label>
            {f.type === "select" ? (
              <Select value={form[f.key] || ""} onValueChange={v => setForm({ ...form, [f.key]: v })}>
                <SelectTrigger data-testid={`${testPrefix}-${f.key}`}><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{f.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            ) : f.type === "date" ? (
              <Input type="date" value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} data-testid={`${testPrefix}-${f.key}`} />
            ) : (
              <Input value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.required} data-testid={`${testPrefix}-${f.key}`} />
            )}
          </div>
        ))}
        <Button type="submit" className="w-full text-white" style={{ background: TEAL }} data-testid={`${testPrefix}-submit`}>Save</Button>
      </form>
    </div>
  );
}

function InspectionPackTab() {
  const [pack, setPack] = useState(null);
  const generate = async () => {
    try {
      const { data } = await api.post("/hospitality/inspection-pack", { covers_period_days: 30 });
      setPack(data);
      toast.success(`Inspection pack ${data.pack_id} generated`);
    } catch (err) { toast.error("Generation failed"); }
  };
  return (
    <div className="max-w-2xl mx-auto" data-testid="hosp-inspection-pack">
      <div className="border-2 border-black/10 bg-white p-8 text-center">
        <h3 className="font-display font-black text-2xl mb-2" style={{ color: BURGUNDY }}>Council Inspection Pack</h3>
        <p className="text-sm text-black/60 mb-6">One-click bundle of temperature logs, HACCP records, FSS certificates, allergen register, and supplier approvals for the last 30 days — ready for the inspector.</p>
        <Button onClick={generate} className="text-white px-8 py-6 text-base" style={{ background: BURGUNDY }} data-testid="hosp-inspection-generate">Generate Pack</Button>
        {pack && (
          <div className="mt-6 text-left border-t-2 pt-6 border-black/10">
            <div className="text-xs uppercase text-black/60">Pack ID</div>
            <div className="font-mono text-sm mb-4">{pack.pack_id}</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(pack.manifest).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-black/5 py-1">
                  <span className="capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HospitalityFoodSafety() {
  return (
    <div className="min-h-screen p-6" style={{ background: CREAM }} data-testid="hosp-food-safety-page">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-black/60">Hospitality · Operations</div>
        <h1 className="font-display font-black text-4xl mt-1" style={{ color: TEAL }}>Food Safety & Venue Compliance</h1>
        <p className="text-sm text-black/60 mt-2 max-w-2xl">Australian hospitality operators: capture temperature readings, HACCP CCPs, allergens, cleaning, and certifications in one place. Generate a council-ready inspection pack in one click.</p>
      </div>

      <Tabs defaultValue="temperature" className="w-full">
        <TabsList className="bg-white border-2 border-black/10 p-1 h-auto flex-wrap">
          <TabsTrigger value="temperature" data-testid="hosp-tab-temperature">Temperature</TabsTrigger>
          <TabsTrigger value="haccp" data-testid="hosp-tab-haccp">HACCP CCPs</TabsTrigger>
          <TabsTrigger value="allergens" data-testid="hosp-tab-allergens">Allergens</TabsTrigger>
          <TabsTrigger value="cleaning" data-testid="hosp-tab-cleaning">Cleaning</TabsTrigger>
          <TabsTrigger value="fss" data-testid="hosp-tab-fss">FSS & Liquor</TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="hosp-tab-suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="pack" data-testid="hosp-tab-pack">Inspection Pack</TabsTrigger>
        </TabsList>

        <TabsContent value="temperature" className="mt-6"><TemperatureTab /></TabsContent>
        <TabsContent value="haccp" className="mt-6">
          <SimpleListTab
            title="HACCP CCP Records"
            endpoint="/hospitality/haccp-ccp"
            testPrefix="hosp-haccp"
            columns={[
              { key: "ccp_step", label: "CCP Step" },
              { key: "hazard", label: "Hazard" },
              { key: "critical_limit", label: "Limit" },
              { key: "measured_value", label: "Measured" },
              { key: "within_limit", label: "Status", render: r => r.within_limit ? <Badge style={{ background: TEAL, color: "white" }}>OK</Badge> : <Badge style={{ background: BURGUNDY, color: "white" }}>BREACH</Badge> },
            ]}
            formFields={[
              { key: "ccp_step", label: "CCP step", required: true },
              { key: "hazard", label: "Hazard type", type: "select", options: ["biological", "chemical", "physical"] },
              { key: "critical_limit", label: "Critical limit" },
              { key: "measured_value", label: "Measured value", required: true },
              { key: "corrective_action", label: "Corrective action" },
            ]}
          />
        </TabsContent>
        <TabsContent value="allergens" className="mt-6">
          <SimpleListTab
            title="Menu Allergen Register"
            endpoint="/hospitality/allergens"
            testPrefix="hosp-allergen"
            columns={[
              { key: "menu_item", label: "Menu item" },
              { key: "contains", label: "Contains", render: r => (r.contains || []).join(", ") },
              { key: "may_contain", label: "May contain", render: r => (r.may_contain || []).join(", ") },
            ]}
            formFields={[
              { key: "menu_item", label: "Menu item", required: true },
              { key: "notes", label: "Notes" },
            ]}
          />
        </TabsContent>
        <TabsContent value="cleaning" className="mt-6">
          <SimpleListTab
            title="Cleaning Schedule"
            endpoint="/hospitality/cleaning-tasks"
            testPrefix="hosp-clean"
            columns={[
              { key: "area", label: "Area" },
              { key: "frequency", label: "Frequency" },
              { key: "chemical", label: "Chemical" },
              { key: "status", label: "Status" },
              { key: "last_completed_at", label: "Last done", render: r => r.last_completed_at ? new Date(r.last_completed_at).toLocaleDateString() : "—" },
            ]}
            formFields={[
              { key: "area", label: "Area", required: true },
              { key: "frequency", label: "Frequency", type: "select", options: ["daily", "weekly", "monthly"], required: true },
              { key: "method", label: "Method" },
              { key: "chemical", label: "Chemical" },
              { key: "responsible", label: "Responsible" },
            ]}
          />
        </TabsContent>
        <TabsContent value="fss" className="mt-6 space-y-8">
          <SimpleListTab
            title="Food Safety Supervisors"
            endpoint="/hospitality/fss-register"
            testPrefix="hosp-fss"
            columns={[
              { key: "worker_name", label: "Worker" },
              { key: "certificate_number", label: "Cert #" },
              { key: "issuing_rto", label: "RTO" },
              { key: "expires_at", label: "Expires", render: r => r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—" },
            ]}
            formFields={[
              { key: "worker_name", label: "Worker name", required: true },
              { key: "certificate_number", label: "Certificate #", required: true },
              { key: "issuing_rto", label: "Issuing RTO", required: true },
              { key: "issued_at", label: "Issued", type: "date" },
              { key: "expires_at", label: "Expires", type: "date" },
            ]}
          />
          <SimpleListTab
            title="RSA / Liquor Certificates"
            endpoint="/hospitality/liquor-certs"
            testPrefix="hosp-liquor"
            columns={[
              { key: "worker_name", label: "Worker" },
              { key: "certificate_type", label: "Type" },
              { key: "jurisdiction", label: "State" },
              { key: "expires_at", label: "Expires", render: r => r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—" },
            ]}
            formFields={[
              { key: "worker_name", label: "Worker name", required: true },
              { key: "certificate_type", label: "Type", type: "select", options: ["RSA", "RSG", "Approved Manager"], required: true },
              { key: "certificate_number", label: "Certificate #" },
              { key: "jurisdiction", label: "State", type: "select", options: ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] },
              { key: "expires_at", label: "Expires", type: "date" },
            ]}
          />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-6">
          <SimpleListTab
            title="Suppliers"
            endpoint="/hospitality/suppliers"
            testPrefix="hosp-supplier"
            columns={[
              { key: "name", label: "Supplier" },
              { key: "category", label: "Category" },
              { key: "abn", label: "ABN" },
              { key: "contact_phone", label: "Phone" },
            ]}
            formFields={[
              { key: "name", label: "Supplier name", required: true },
              { key: "category", label: "Category", type: "select", options: ["meat", "seafood", "dairy", "produce", "dry_goods", "beverage"] },
              { key: "abn", label: "ABN" },
              { key: "contact_email", label: "Email" },
              { key: "contact_phone", label: "Phone" },
            ]}
          />
        </TabsContent>
        <TabsContent value="pack" className="mt-6"><InspectionPackTab /></TabsContent>
      </Tabs>
    </div>
  );
}
