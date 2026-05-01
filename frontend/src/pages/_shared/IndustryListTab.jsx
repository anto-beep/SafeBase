/**
 * Shared helpers for industry-specific module pages.
 * IndustryListTab renders a list + inline create form side-by-side.
 */
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function StatChip({ label, value, color = "#0F4C5C", testid }) {
  return (
    <div className="border-2 border-black/10 p-4 bg-white" data-testid={testid}>
      <div className="text-xs uppercase tracking-wider text-black/60">{label}</div>
      <div className="font-display font-black text-3xl mt-1" style={{ color }}>{value}</div>
    </div>
  );
}

export function IndustryListTab({
  title, endpoint, columns, formFields, testPrefix,
  accent = "#0F4C5C", headerBg = "#F1ECE0",
  submitLabel = "Save", onRowAction,
  transformSubmit,
  extraFooter,
}) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const { data } = await api.get(endpoint);
      setRows(data.rows || []);
    } catch (err) {
      // silent
    }
  };
  useEffect(() => { refresh(); }, [endpoint]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = transformSubmit ? transformSubmit(form) : form;
      await api.post(endpoint, payload);
      toast.success(`${title.replace(/s$/, "")} saved`);
      setForm({});
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || err.response?.data?.detail || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 border-2 border-black/10 bg-white" data-testid={`${testPrefix}-list`}>
        <div className="px-4 py-3 border-b-2 border-black/10 font-display font-black uppercase text-sm" style={{ background: headerBg }}>
          {title} ({rows.length})
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-black/60 sticky top-0 bg-white">
              <tr>{columns.map(c => <th key={c.key} className="p-3">{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id || Object.values(r)[0] || i} className="border-t border-black/5 hover:bg-black/[0.02]">
                  {columns.map(c => <td key={c.key} className="p-3">{c.render ? c.render(r, refresh) : String(r[c.key] ?? "—")}</td>)}
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={columns.length} className="p-6 text-center text-black/40">No records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <form onSubmit={submit} className="border-2 p-5 bg-white self-start space-y-3" style={{ borderColor: accent }} data-testid={`${testPrefix}-form`}>
        <h3 className="font-display font-black uppercase text-sm" style={{ color: accent }}>Add {title.replace(/s$/, "")}</h3>
        {formFields.map(f => (
          <div key={f.key}>
            <Label className="text-xs uppercase tracking-wider">{f.label}{f.required && " *"}</Label>
            {f.type === "select" ? (
              <Select value={form[f.key] || ""} onValueChange={v => setForm({ ...form, [f.key]: v })}>
                <SelectTrigger data-testid={`${testPrefix}-${f.key}`}><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{f.options.map(o => <SelectItem key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</SelectItem>)}</SelectContent>
              </Select>
            ) : f.type === "date" ? (
              <Input type="date" value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} data-testid={`${testPrefix}-${f.key}`} />
            ) : f.type === "datetime" ? (
              <Input type="datetime-local" value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} data-testid={`${testPrefix}-${f.key}`} />
            ) : f.type === "number" ? (
              <Input type="number" step={f.step || "any"} value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.required} data-testid={`${testPrefix}-${f.key}`} />
            ) : f.type === "textarea" ? (
              <Textarea value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} rows={3} required={f.required} data-testid={`${testPrefix}-${f.key}`} />
            ) : (
              <Input value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.required} data-testid={`${testPrefix}-${f.key}`} />
            )}
          </div>
        ))}
        <Button type="submit" className="w-full text-white" style={{ background: accent }} disabled={loading} data-testid={`${testPrefix}-submit`}>
          {loading ? "Saving…" : submitLabel}
        </Button>
        {extraFooter}
      </form>
    </div>
  );
}

export function pill(txt, color) {
  return <Badge style={{ background: color, color: "white" }}>{txt}</Badge>;
}
