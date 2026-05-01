import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash, Lightning, CheckCircle, X, Clipboard } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Webhooks() {
  const [events, setEvents] = useState([]);
  const [subs, setSubs] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ target_url: "", label: "", events: [] });

  const loadAll = async () => {
    const [e, s, d] = await Promise.all([
      api.get("/webhooks/events"), api.get("/webhooks/subscriptions"), api.get("/webhooks/deliveries")
    ]);
    setEvents(e.data); setSubs(s.data); setDeliveries(d.data);
  };
  useEffect(() => { loadAll(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/webhooks/subscriptions", form);
      toast.success("Webhook subscription added");
      setForm({ target_url: "", label: "", events: [] });
      setOpen(false);
      loadAll();
    } catch (e2) { toast.error(e2?.response?.data?.detail || "Failed"); }
  };

  const toggle = async (sid, enabled) => {
    await api.patch(`/webhooks/subscriptions/${sid}`, { enabled });
    loadAll();
  };
  const remove = async (sid) => { await api.delete(`/webhooks/subscriptions/${sid}`); toast.success("Removed"); loadAll(); };
  const test = async (sid) => {
    const r = await api.post(`/webhooks/test/${sid}`);
    if (r.data.success) toast.success(`Test delivered — ${r.data.status_code}`);
    else toast.error(`Delivery failed: ${r.data.error || r.data.status_code}`);
    loadAll();
  };

  const toggleEvent = (ev) => {
    setForm((f) => ({ ...f, events: f.events.includes(ev) ? f.events.filter((x) => x !== ev) : [...f.events, ev] }));
  };

  return (
    <div className="space-y-6" data-testid="webhooks-page">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ Outbound webhooks</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Integrate anything.</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">Subscribe a URL to SafeBase events and we'll POST JSON when they fire — connect to Zapier, Make, n8n or your own API. {events.length} events available.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="wh-add-btn"><Plus className="mr-2" weight="bold" />New subscription</Button>
          </DialogTrigger>
          <DialogContent className="rounded-none max-w-2xl border-ink max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl tracking-tight">New webhook subscription</DialogTitle>
              <DialogDescription className="sr-only">POST JSON to any URL when events fire.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div><Label className="label-eyebrow">Target URL (https)</Label><Input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} className="mt-2 h-11 rounded-none border-ink" required placeholder="https://hooks.zapier.com/..." data-testid="wh-f-url" /></div>
              <div><Label className="label-eyebrow">Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="mt-2 h-11 rounded-none border-ink" placeholder="Zapier — incident pipeline" data-testid="wh-f-label" /></div>
              <div>
                <Label className="label-eyebrow">Events ({form.events.length || "all"})</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 border border-border p-3 max-h-60 overflow-y-auto">
                  {events.map((ev) => (
                    <label key={ev} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={form.events.includes(ev)} onCheckedChange={() => toggleEvent(ev)} data-testid={`wh-event-${ev}`} />
                      <code className="font-mono text-xs">{ev}</code>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Leave empty to receive all events.</div>
              </div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" className="btn-sharp border-ink" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" className="btn-sharp bg-ink text-white" data-testid="wh-submit">Create</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {subs.length === 0 ? (
        <div className="border-2 border-dashed border-border p-16 text-center">
          <Lightning size={48} weight="duotone" className="mx-auto opacity-40" />
          <div className="font-display text-xl font-bold mt-4">No subscriptions yet</div>
          <div className="text-sm text-muted-foreground mt-1">Add a Zapier catch-hook URL to start receiving SafeBase events.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {subs.map((s) => (
            <div key={s.subscription_id} className="border border-border bg-background p-5" data-testid={`wh-card-${s.subscription_id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display text-lg font-black tracking-tight truncate">{s.label || "Webhook"}</div>
                  <div className="text-xs text-muted-foreground truncate font-mono">{s.target_url}</div>
                </div>
                <Switch checked={s.enabled} onCheckedChange={(v) => toggle(s.subscription_id, v)} data-testid={`wh-toggle-${s.subscription_id}`} />
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {(s.events?.length ? s.events : ["ALL EVENTS"]).slice(0, 6).map((ev) => (
                  <span key={ev} className="bg-muted px-2 py-0.5 text-xs font-mono">{ev}</span>
                ))}
                {s.events?.length > 6 && <span className="text-xs text-muted-foreground">+{s.events.length - 6}</span>}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs">
                <span className="text-muted-foreground">
                  {s.delivery_count} delivered · {s.failure_count} failed
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(s.secret); toast.success("Secret copied"); }} data-testid={`wh-copy-secret-${s.subscription_id}`}><Clipboard /></Button>
                  <Button size="sm" variant="outline" className="btn-sharp border-ink" onClick={() => test(s.subscription_id)} data-testid={`wh-test-${s.subscription_id}`}>Test</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(s.subscription_id)} data-testid={`wh-del-${s.subscription_id}`}><Trash /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deliveries.length > 0 && (
        <div className="border border-border bg-background p-5">
          <div className="label-eyebrow mb-3">/ Recent deliveries (last 20)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border"><tr>
                <th className="text-left py-2 label-eyebrow text-muted-foreground">Status</th>
                <th className="text-left py-2 label-eyebrow text-muted-foreground">Event</th>
                <th className="text-left py-2 label-eyebrow text-muted-foreground">Target</th>
                <th className="text-left py-2 label-eyebrow text-muted-foreground">When</th>
              </tr></thead>
              <tbody>
                {deliveries.slice(0, 20).map((d) => (
                  <tr key={d.delivery_id} className="border-b border-border">
                    <td className="py-2">{d.success ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle weight="fill" size={14} />{d.status_code}</span> : <span className="flex items-center gap-1 text-red-600"><X size={14} />{d.status_code || "error"}</span>}</td>
                    <td className="py-2"><code className="font-mono text-xs">{d.event}</code></td>
                    <td className="py-2 truncate max-w-xs font-mono text-xs">{d.target_url}</td>
                    <td className="py-2 text-xs text-muted-foreground">{new Date(d.delivered_at).toLocaleString("en-AU")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
