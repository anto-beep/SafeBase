import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { IdentificationBadge, Plus, Trash, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";

const LIC_TYPES = [
  { v: "white_card", l: "White Card" },
  { v: "electrical_licence", l: "Electrical Licence" },
  { v: "plumbing_licence", l: "Plumbing Licence" },
  { v: "high_risk_work", l: "High-Risk Work Licence" },
  { v: "first_aid", l: "First Aid Certificate" },
  { v: "working_at_heights", l: "Working at Heights" },
  { v: "confined_space", l: "Confined Space Entry" },
  { v: "asbestos_removal", l: "Asbestos Removal" },
  { v: "other", l: "Other" },
];

const statusBadge = (s) => ({
  expired: "bg-red-600 text-white",
  expiring_soon: "bg-warning text-ink",
  active: "bg-emerald-600 text-white",
}[s] || "bg-muted");

export default function Licences() {
  const [items, setItems] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ worker_id: "", licence_type: "white_card", licence_number: "", issuing_authority: "", expiry_date: "" });

  const load = async () => {
    const [a, b] = await Promise.all([api.get("/licences"), api.get("/workers")]);
    setItems(a.data); setWorkers(b.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.worker_id) { toast.error("Pick a worker first"); return; }
    try {
      await api.post("/licences", form);
      toast.success("Licence added");
      setOpen(false);
      setForm({ worker_id: "", licence_type: "white_card", licence_number: "", issuing_authority: "", expiry_date: "" });
      load();
    } catch { toast.error("Failed"); }
  };

  const remove = async (id) => { await api.delete(`/licences/${id}`); load(); };
  const workerName = (id) => workers.find((w) => w.worker_id === id)?.name || "—";
  const sorted = [...items].sort((a, b) => (a.days_until_expiry ?? 1e9) - (b.days_until_expiry ?? 1e9));

  return (
    <div className="space-y-6" data-testid="licences-page">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ Licences & certifications</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Licence register</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">Every ticket tracked. Auto-alerts before expiry.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" disabled={workers.length === 0} data-testid="open-licence-dialog"><Plus className="mr-2" weight="bold" />Add licence</Button>
          </DialogTrigger>
          <DialogContent className="rounded-none max-w-md border-ink">
            <DialogHeader><DialogTitle className="font-display text-2xl">Add licence</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label className="label-eyebrow">Worker</Label>
                <Select value={form.worker_id} onValueChange={(v) => setForm({ ...form, worker_id: v })}>
                  <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="lic-worker"><SelectValue placeholder="Select worker" /></SelectTrigger>
                  <SelectContent>{workers.map((w) => <SelectItem key={w.worker_id} value={w.worker_id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="label-eyebrow">Licence type</Label>
                <Select value={form.licence_type} onValueChange={(v) => setForm({ ...form, licence_type: v })}>
                  <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="lic-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{LIC_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="label-eyebrow">Licence number</Label><Input data-testid="lic-num" required value={form.licence_number} onChange={(e) => setForm({ ...form, licence_number: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">Issuing authority</Label><Input data-testid="lic-auth" value={form.issuing_authority} onChange={(e) => setForm({ ...form, issuing_authority: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">Expiry date</Label><Input data-testid="lic-exp" type="date" required value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="btn-sharp border-ink" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="btn-sharp bg-ink text-white hover:bg-authority" data-testid="lic-submit">Add</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {workers.length === 0 && (
        <div className="bg-warning border border-ink p-4 flex items-center gap-3">
          <Warning weight="fill" /> <span className="text-sm font-bold">Add workers first before tracking their licences.</span>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="border-2 border-dashed border-border p-16 text-center">
          <IdentificationBadge size={48} weight="duotone" className="mx-auto opacity-40" />
          <div className="font-display text-xl font-bold mt-4">No licences tracked</div>
        </div>
      ) : (
        <div className="bg-background border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink text-white">
              <tr>
                {["Worker", "Licence", "Number", "Authority", "Expiry", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 label-eyebrow text-warning">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((l) => (
                <tr key={l.licence_id} className="border-t border-border" data-testid={`licence-${l.licence_id}`}>
                  <td className="px-4 py-3 font-bold">{workerName(l.worker_id)}</td>
                  <td className="px-4 py-3">{(LIC_TYPES.find((t) => t.v === l.licence_type) || { l: l.licence_type }).l}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.licence_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.issuing_authority || "—"}</td>
                  <td className="px-4 py-3">{l.expiry_date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 text-[10px] font-bold tracking-widest ${statusBadge(l.status)}`}>
                      {(l.status || "active").replace(/_/g, ' ').toUpperCase()}
                    </span>
                    {l.days_until_expiry != null && (
                      <div className="text-[11px] text-muted-foreground mt-1">{l.days_until_expiry < 0 ? `${-l.days_until_expiry} days overdue` : `${l.days_until_expiry} days left`}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => remove(l.licence_id)} className="text-destructive" data-testid={`licence-del-${l.licence_id}`}><Trash /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
