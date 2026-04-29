import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkle, FileText, Trash, Eye, Plus } from "@phosphor-icons/react";
import { toast } from "sonner";

const DOC_TYPES = [
  { v: "SWMS", l: "Safe Work Method Statement (SWMS)" },
  { v: "risk_assessment", l: "Risk Assessment" },
  { v: "emergency_procedure", l: "Emergency Procedure" },
  { v: "induction_checklist", l: "Induction Checklist" },
  { v: "hazardous_substance_register", l: "Hazardous Substance Register" },
];

const TRADES = ["Plumbing", "Electrical", "Roofing", "Carpentry", "Concreting", "Painting", "Tiling", "HVAC", "Demolition", "Excavation", "Scaffolding", "Welding"];

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ document_type: "SWMS", trade: "Plumbing", job_description: "", site_location: "", hazards: "", extra_notes: "" });

  const load = () => api.get("/documents").then((r) => setDocs(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (!form.job_description.trim()) { toast.error("Describe the job"); return; }
    setLoading(true);
    try {
      const payload = { ...form, hazards: form.hazards.split(",").map((s) => s.trim()).filter(Boolean) };
      const r = await api.post("/documents/generate", payload);
      toast.success("Document generated");
      setOpen(false);
      setForm({ document_type: "SWMS", trade: "Plumbing", job_description: "", site_location: "", hazards: "", extra_notes: "" });
      await load();
      window.location.assign(`/dashboard/documents/${r.data.document_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/documents/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6" data-testid="documents-page">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ Documents</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Compliance documents</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">AI-generated SWMS, risk assessments and procedures aligned to Australian WHS standards.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="open-generate-dialog"><Sparkle className="mr-2" weight="fill" />Generate document</Button>
          </DialogTrigger>
          <DialogContent className="rounded-none max-w-2xl border-ink">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl tracking-tight">Generate compliance document</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <Label className="label-eyebrow">Document type</Label>
                <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                  <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="gen-doctype"><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="label-eyebrow">Trade</Label>
                <Select value={form.trade} onValueChange={(v) => setForm({ ...form, trade: v })}>
                  <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="gen-trade"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="label-eyebrow">Job description</Label>
                <Textarea data-testid="gen-job" value={form.job_description} onChange={(e) => setForm({ ...form, job_description: e.target.value })} className="mt-2 rounded-none border-ink" rows={3} placeholder="e.g. Install hot water system on a 2-storey residential roof in Sydney" />
              </div>
              <div className="md:col-span-2">
                <Label className="label-eyebrow">Site location</Label>
                <Input data-testid="gen-site" value={form.site_location} onChange={(e) => setForm({ ...form, site_location: e.target.value })} className="mt-2 h-11 rounded-none border-ink" placeholder="Suburb, state" />
              </div>
              <div className="md:col-span-2">
                <Label className="label-eyebrow">Known hazards (comma separated)</Label>
                <Input data-testid="gen-hazards" value={form.hazards} onChange={(e) => setForm({ ...form, hazards: e.target.value })} className="mt-2 h-11 rounded-none border-ink" placeholder="Working at heights, electrical, hot works" />
              </div>
              <div className="md:col-span-2">
                <Label className="label-eyebrow">Notes</Label>
                <Textarea data-testid="gen-notes" value={form.extra_notes} onChange={(e) => setForm({ ...form, extra_notes: e.target.value })} className="mt-2 rounded-none border-ink" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="btn-sharp border-ink" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={generate} disabled={loading} className="btn-sharp bg-ink text-white hover:bg-authority" data-testid="gen-submit-btn">
                {loading ? "Generating with Claude…" : (<><Sparkle className="mr-2" weight="fill" />Generate</>)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {docs.length === 0 ? (
        <div className="border-2 border-dashed border-border p-16 text-center">
          <FileText size={48} weight="duotone" className="mx-auto opacity-40" />
          <div className="font-display text-xl font-bold mt-4">No documents yet</div>
          <div className="text-sm text-muted-foreground mt-1">Generate your first SWMS in under a minute.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((d) => (
            <div key={d.document_id} className="bg-background border border-border p-5 hover:-translate-y-1 hover:shadow-lg transition-transform group" data-testid={`doc-card-${d.document_id}`}>
              <div className="flex items-start justify-between">
                <span className="px-2 py-1 bg-warning text-ink text-[10px] font-bold tracking-widest">{d.document_type.replace(/_/g, ' ').toUpperCase()}</span>
                <FileText size={24} weight="duotone" />
              </div>
              <div className="font-display font-bold text-lg mt-4 line-clamp-2 leading-tight">{d.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{new Date(d.created_at).toLocaleString("en-AU")}</div>
              <div className="flex gap-2 mt-4">
                <Link to={`/dashboard/documents/${d.document_id}`} className="flex-1"><Button variant="outline" className="btn-sharp w-full border-ink" data-testid={`doc-view-${d.document_id}`}><Eye className="mr-1" />View</Button></Link>
                <Button variant="outline" className="btn-sharp border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={() => remove(d.document_id)} data-testid={`doc-del-${d.document_id}`}><Trash /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
