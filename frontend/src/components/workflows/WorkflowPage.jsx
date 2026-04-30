import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash, CheckCircle, Circle } from "@phosphor-icons/react";
import { toast } from "sonner";

/**
 * WorkflowPage — generic progress-tracking UI for any workflow type.
 * Props: wtype (slug), title, eyebrow, lead, icon, entityLabel (e.g. "Worker", "Incident")
 */
export default function WorkflowPage({ wtype, title, eyebrow, lead, icon: Icon, entityLabel = "Subject" }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", entity_name: "", notes: "" });
  const [expanded, setExpanded] = useState(null);

  const load = () => api.get(`/workflows/${wtype}`).then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [wtype]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/workflows/${wtype}`, form);
      toast.success("Workflow created");
      setForm({ title: "", entity_name: "", notes: "" });
      setOpen(false);
      load();
    } catch (e2) { toast.error(e2?.response?.data?.detail || "Failed"); }
  };

  const toggle = async (id, key, completed) => {
    try {
      await api.post(`/workflows/${wtype}/${id}/step`, { step_key: key, completed: !completed });
      load();
    } catch (e) { toast.error("Failed to update step"); }
  };

  const remove = async (id) => {
    await api.delete(`/workflows/${wtype}/${id}`);
    toast.success("Removed");
    load();
  };

  const statusCls = (s) => ({
    not_started: "bg-muted text-muted-foreground",
    in_progress: "bg-warning text-ink",
    complete: "bg-emerald-600 text-white",
  }[s] || "bg-muted");

  return (
    <div className="space-y-6" data-testid={`workflow-${wtype}-page`}>
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ {eyebrow}</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">{title}</h1>
          {lead && <p className="text-muted-foreground mt-2 max-w-xl">{lead}</p>}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid={`workflow-${wtype}-add-btn`}>
              <Plus className="mr-2" weight="bold" />Start {entityLabel.toLowerCase()}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-none max-w-lg border-ink">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl tracking-tight">New {title.toLowerCase()} instance</DialogTitle>
              <DialogDescription className="sr-only">Start a new workflow instance.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label className="label-eyebrow">Instance title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 h-11 rounded-none border-ink" required data-testid={`workflow-${wtype}-f-title`} />
              </div>
              <div>
                <Label className="label-eyebrow">{entityLabel} name / reference</Label>
                <Input value={form.entity_name} onChange={(e) => setForm({ ...form, entity_name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" data-testid={`workflow-${wtype}-f-entity`} />
              </div>
              <div>
                <Label className="label-eyebrow">Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 rounded-none border-ink" data-testid={`workflow-${wtype}-f-notes`} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="btn-sharp border-ink" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="btn-sharp bg-ink text-white hover:bg-authority" data-testid={`workflow-${wtype}-submit-btn`}>Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="border-2 border-dashed border-border p-16 text-center">
          {Icon && <Icon size={48} weight="duotone" className="mx-auto opacity-40" />}
          <div className="font-display text-xl font-bold mt-4">No workflows yet</div>
          <div className="text-sm text-muted-foreground mt-1">Start your first {title.toLowerCase()} instance to track progress.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((it) => (
            <div key={it.instance_id} className="border border-border bg-background p-5" data-testid={`workflow-card-${it.instance_id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display text-lg font-black tracking-tight truncate">{it.title}</div>
                  {it.entity_name && <div className="text-xs text-muted-foreground">{entityLabel}: {it.entity_name}</div>}
                </div>
                <span className={`${statusCls(it.status)} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>
                  {it.status.replace("_", " ").toUpperCase()}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="label-eyebrow">Progress</span>
                  <span className="font-bold">{it.progress_pct}% · {it.completed_steps}/{it.total_steps}</span>
                </div>
                <div className="w-full bg-muted h-2">
                  <div className="bg-ink h-2 transition-all" style={{ width: `${it.progress_pct}%` }} />
                </div>
              </div>

              <button
                onClick={() => setExpanded(expanded === it.instance_id ? null : it.instance_id)}
                className="mt-4 label-eyebrow text-ink hover:underline"
                data-testid={`workflow-expand-${it.instance_id}`}
              >
                {expanded === it.instance_id ? "Hide steps" : "Show steps"}
              </button>

              {expanded === it.instance_id && (
                <div className="mt-3 space-y-1">
                  {it.steps.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => toggle(it.instance_id, s.key, s.completed)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm ${s.completed ? "bg-emerald-50 text-ink" : "hover:bg-muted"}`}
                      data-testid={`workflow-step-${it.instance_id}-${s.key}`}
                    >
                      {s.completed ? <CheckCircle weight="fill" className="text-emerald-600" size={18} /> : <Circle size={18} />}
                      <span className={s.completed ? "line-through" : ""}>{s.label}</span>
                    </button>
                  ))}
                  <div className="flex justify-end pt-2 border-t border-border mt-2">
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(it.instance_id)} data-testid={`workflow-del-${it.instance_id}`}>
                      <Trash className="mr-1" />Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
