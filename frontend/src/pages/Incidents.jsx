import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Warning, Plus, Camera } from "@phosphor-icons/react";
import { toast } from "sonner";

const SEV = [
  { v: "near_miss", l: "Near miss" },
  { v: "minor", l: "Minor" },
  { v: "moderate", l: "Moderate" },
  { v: "serious", l: "Serious" },
  { v: "critical", l: "Critical" },
];
const TYPES = ["injury", "near_miss", "property_damage", "environmental"];

const sevColor = (s) => ({
  near_miss: "bg-muted text-foreground",
  minor: "bg-warning text-ink",
  moderate: "bg-orange-500 text-white",
  serious: "bg-red-600 text-white",
  critical: "bg-ink text-warning",
}[s] || "bg-muted");

export default function Incidents() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", severity: "near_miss", incident_type: "near_miss",
    location: "", site: "", occurred_at: new Date().toISOString().slice(0, 16), corrective_actions: "",
  });
  const [photos, setPhotos] = useState([]);

  const load = () => api.get("/incidents").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handlePhoto = (e) => {
    const files = Array.from(e.target.files || []);
    Promise.all(files.map((f) => new Promise((res) => {
      const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f);
    }))).then((urls) => setPhotos((p) => [...p, ...urls]));
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/incidents", { ...form, photos });
      toast.success("Incident logged");
      setOpen(false); setPhotos([]);
      setForm({ ...form, title: "", description: "", corrective_actions: "" });
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/incidents/${id}`, { status });
    load();
  };

  return (
    <div className="space-y-6" data-testid="incidents-page">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ Incidents & near-miss</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Incident register</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">Mobile-first capture from the job site. Auto-flag for regulatory notification.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="open-incident-dialog"><Plus className="mr-2" weight="bold" />Log incident</Button>
          </DialogTrigger>
          <DialogContent className="rounded-none max-w-2xl border-ink max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display text-2xl tracking-tight">Log incident</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label className="label-eyebrow">Title</Label>
                <Input data-testid="inc-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 h-11 rounded-none border-ink" placeholder="Short summary" /></div>
              <div><Label className="label-eyebrow">Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}><SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="inc-sev"><SelectValue /></SelectTrigger><SelectContent>{SEV.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label className="label-eyebrow">Type</Label>
                <Select value={form.incident_type} onValueChange={(v) => setForm({ ...form, incident_type: v })}><SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="inc-type"><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label className="label-eyebrow">Site</Label><Input data-testid="inc-site" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">Location</Label><Input data-testid="inc-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              <div className="md:col-span-2"><Label className="label-eyebrow">When occurred</Label><Input data-testid="inc-date" type="datetime-local" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              <div className="md:col-span-2"><Label className="label-eyebrow">Description</Label><Textarea data-testid="inc-desc" required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 rounded-none border-ink" /></div>
              <div className="md:col-span-2"><Label className="label-eyebrow">Corrective action</Label><Textarea data-testid="inc-action" rows={2} value={form.corrective_actions} onChange={(e) => setForm({ ...form, corrective_actions: e.target.value })} className="mt-2 rounded-none border-ink" /></div>
              <div className="md:col-span-2">
                <Label className="label-eyebrow">Photos</Label>
                <label className="mt-2 cursor-pointer flex items-center gap-2 border border-ink p-3 hover:bg-muted">
                  <Camera /> Add photos
                  <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhoto} className="hidden" data-testid="inc-photos" />
                </label>
                {photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {photos.map((p, i) => <img key={i} src={p} alt="" className="w-full h-20 object-cover border border-border" />)}
                  </div>
                )}
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" className="btn-sharp border-ink" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="btn-sharp bg-ink text-white hover:bg-authority" data-testid="inc-submit">Log incident</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="border-2 border-dashed border-border p-16 text-center">
          <Warning size={48} weight="duotone" className="mx-auto opacity-40" />
          <div className="font-display text-xl font-bold mt-4">No incidents logged</div>
          <div className="text-sm text-muted-foreground mt-1">A clean register is a healthy register.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.incident_id} className="bg-background border border-border p-5 grid grid-cols-1 md:grid-cols-12 gap-4" data-testid={`incident-${i.incident_id}`}>
              <div className="md:col-span-2">
                <span className={`inline-block px-2 py-1 text-[10px] font-bold tracking-widest ${sevColor(i.severity)}`}>{i.severity.replace(/_/g, ' ').toUpperCase()}</span>
                {i.notify_regulator && <div className="mt-2 text-[10px] font-bold text-red-600 tracking-widest">⚠ NOTIFY REGULATOR</div>}
              </div>
              <div className="md:col-span-7">
                <div className="font-display font-bold text-lg leading-tight">{i.title}</div>
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{i.description}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  {i.site && <span>{i.site} · </span>}
                  {i.location && <span>{i.location} · </span>}
                  {i.occurred_at && <span>{new Date(i.occurred_at).toLocaleString("en-AU")}</span>}
                </div>
                {i.photos?.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {i.photos.slice(0, 4).map((p, idx) => <img key={idx} src={p} alt="" className="w-12 h-12 object-cover border border-border" />)}
                  </div>
                )}
              </div>
              <div className="md:col-span-3 flex md:flex-col gap-2 md:justify-center md:items-end">
                <span className="px-2 py-1 text-[10px] font-bold tracking-widest bg-muted">{(i.status || 'open').toUpperCase()}</span>
                {i.status !== "closed" && (
                  <Button onClick={() => updateStatus(i.incident_id, "closed")} variant="outline" size="sm" className="btn-sharp border-ink" data-testid={`incident-close-${i.incident_id}`}>Close</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
