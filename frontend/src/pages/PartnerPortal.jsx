import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash, Briefcase, Users, CurrencyDollar } from "@phosphor-icons/react";
import { toast } from "sonner";

const STATUS_OPTS = ["active", "at_risk", "onboarding", "paused", "churned"];

function Stat({ label, value, icon: Icon, prefix = "" }) {
  return (
    <div className="border border-border bg-background p-5">
      <div className="flex items-center gap-2 label-eyebrow text-muted-foreground"><Icon size={16} weight="duotone" />{label}</div>
      <div className="font-display text-3xl font-black tracking-tighter mt-2">{prefix}{value}</div>
    </div>
  );
}

export default function PartnerPortal() {
  const [summary, setSummary] = useState({ total_clients: 0, active_clients: 0, monthly_recurring_revenue: 0, at_risk: 0 });
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ business_name: "", contact_name: "", contact_email: "", state: "NSW", trade: "", retainer_monthly: 0, status: "active", notes: "" });

  const load = async () => {
    const [s, c] = await Promise.all([api.get("/partner/summary"), api.get("/partner/clients")]);
    setSummary(s.data);
    setClients(c.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/partner/clients", form);
      toast.success("Client added");
      setForm({ business_name: "", contact_name: "", contact_email: "", state: "NSW", trade: "", retainer_monthly: 0, status: "active", notes: "" });
      setOpen(false);
      load();
    } catch (e2) { toast.error(e2?.response?.data?.detail || "Failed"); }
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/partner/clients/${id}`, { status });
    load();
  };

  const remove = async (id) => {
    await api.delete(`/partner/clients/${id}`);
    toast.success("Removed");
    load();
  };

  return (
    <div className="space-y-6" data-testid="partner-portal-page">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ Consultant workspace</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Your client book.</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">White-label WHS for every trade business you service. Live compliance snapshots, MRR visibility, at-risk early warnings — all in one portal.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="partner-add-client-btn"><Plus className="mr-2" weight="bold" />Add client</Button>
          </DialogTrigger>
          <DialogContent className="rounded-none max-w-lg border-ink max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl tracking-tight">New client</DialogTitle>
              <DialogDescription className="sr-only">Add a new client to your portfolio.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label className="label-eyebrow">Business name</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" required data-testid="partner-f-bizname" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="label-eyebrow">Contact</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
                <div><Label className="label-eyebrow">Email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="label-eyebrow">State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
                <div><Label className="label-eyebrow">Trade</Label><Input value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
                <div><Label className="label-eyebrow">Retainer A$</Label><Input type="number" value={form.retainer_monthly} onChange={(e) => setForm({ ...form, retainer_monthly: Number(e.target.value) })} className="mt-2 h-11 rounded-none border-ink" /></div>
              </div>
              <div><Label className="label-eyebrow">Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 rounded-none border-ink" /></div>
              <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" className="btn-sharp border-ink" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" className="btn-sharp bg-ink text-white" data-testid="partner-submit">Add</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total clients" value={summary.total_clients} icon={Briefcase} />
        <Stat label="Active" value={summary.active_clients} icon={Users} />
        <Stat label="MRR" value={summary.monthly_recurring_revenue.toLocaleString("en-AU")} icon={CurrencyDollar} prefix="A$" />
        <Stat label="At risk" value={summary.at_risk} icon={Briefcase} />
      </div>

      {clients.length === 0 ? (
        <div className="border-2 border-dashed border-border p-16 text-center">
          <Briefcase size={48} weight="duotone" className="mx-auto opacity-40" />
          <div className="font-display text-xl font-bold mt-4">No clients yet</div>
          <div className="text-sm text-muted-foreground mt-1">Add your first client to start tracking their WHS compliance alongside yours.</div>
        </div>
      ) : (
        <div className="bg-background border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink text-warning">
              <tr>
                <th className="text-left px-4 py-3 label-eyebrow">Business</th>
                <th className="text-left px-4 py-3 label-eyebrow">Trade / State</th>
                <th className="text-left px-4 py-3 label-eyebrow">Retainer</th>
                <th className="text-left px-4 py-3 label-eyebrow">Docs</th>
                <th className="text-left px-4 py-3 label-eyebrow">Incidents</th>
                <th className="text-left px-4 py-3 label-eyebrow">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.client_id} className="border-t border-border" data-testid={`partner-row-${c.client_id}`}>
                  <td className="px-4 py-3 font-bold">{c.business_name}<div className="text-xs text-muted-foreground font-normal">{c.contact_name}</div></td>
                  <td className="px-4 py-3">{c.trade} · {c.state}</td>
                  <td className="px-4 py-3">A${(c.retainer_monthly || 0).toLocaleString("en-AU")}</td>
                  <td className="px-4 py-3">{c.docs_count || 0}</td>
                  <td className="px-4 py-3">{c.incidents_open || 0}</td>
                  <td className="px-4 py-3">
                    <Select value={c.status} onValueChange={(v) => updateStatus(c.client_id, v)}>
                      <SelectTrigger className="h-8 w-32 rounded-none border-ink" data-testid={`partner-status-${c.client_id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => remove(c.client_id)} className="text-destructive" data-testid={`partner-del-${c.client_id}`}><Trash /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
