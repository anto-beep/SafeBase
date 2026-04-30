import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

/**
 * SafetyModulePage — generic list + create/delete page for a safety module.
 * Props:
 *  - module: backend module slug
 *  - title, eyebrow, lead — header text
 *  - icon — Phosphor icon component
 *  - fields — [{ key, label, type: 'text'|'textarea'|'date'|'select'|'number', options?, required?, span? }]
 *  - columns — [{ key, label, render?: (item) => ReactNode, className? }]
 *  - computeDefaults — (form) => updates, called when user opens dialog (optional)
 *  - emptyMessage — string
 */
export default function SafetyModulePage({
  module, title, eyebrow, lead, icon: Icon,
  fields, columns, emptyMessage, dataTestid,
}) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});

  const load = () => api.get(`/safety/${module}`).then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [module]);

  const openDialog = () => {
    const defaults = {};
    fields.forEach((f) => { defaults[f.key] = f.default ?? ""; });
    setForm(defaults);
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      // coerce numbers
      fields.forEach((f) => {
        if (f.type === "number" && payload[f.key] !== "" && payload[f.key] != null) {
          payload[f.key] = Number(payload[f.key]);
        }
      });
      await api.post(`/safety/${module}`, payload);
      toast.success(`${title} added`);
      setOpen(false);
      load();
    } catch (e2) { toast.error(e2?.response?.data?.detail || "Failed"); }
  };

  const remove = async (id) => {
    await api.delete(`/safety/${module}/${id}`);
    toast.success("Removed");
    load();
  };

  return (
    <div className="space-y-6" data-testid={dataTestid || `${module}-page`}>
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ {eyebrow}</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">{title}</h1>
          {lead && <p className="text-muted-foreground mt-2 max-w-xl">{lead}</p>}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openDialog} className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid={`${module}-add-btn`}>
              <Plus className="mr-2" weight="bold" />Add {title.split(" ")[0]}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-none max-w-2xl border-ink max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display text-2xl tracking-tight">Add {title.toLowerCase()}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.key} className={f.span === 2 ? "md:col-span-2" : ""}>
                  <Label className="label-eyebrow">{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea data-testid={`${module}-f-${f.key}`} rows={3} value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="mt-2 rounded-none border-ink" required={f.required} />
                  ) : f.type === "select" ? (
                    <Select value={form[f.key] || ""} onValueChange={(v) => setForm({ ...form, [f.key]: v })}>
                      <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid={`${module}-f-${f.key}`}><SelectValue placeholder={f.placeholder} /></SelectTrigger>
                      <SelectContent>{f.options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input data-testid={`${module}-f-${f.key}`} type={f.type || "text"} value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="mt-2 h-11 rounded-none border-ink" required={f.required} placeholder={f.placeholder} min={f.min} max={f.max} />
                  )}
                </div>
              ))}
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" className="btn-sharp border-ink" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="btn-sharp bg-ink text-white hover:bg-authority" data-testid={`${module}-submit-btn`}>Add</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="border-2 border-dashed border-border p-16 text-center">
          {Icon && <Icon size={48} weight="duotone" className="mx-auto opacity-40" />}
          <div className="font-display text-xl font-bold mt-4">No entries yet</div>
          <div className="text-sm text-muted-foreground mt-1">{emptyMessage}</div>
        </div>
      ) : (
        <div className="bg-background border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink text-white">
              <tr>
                {columns.map((c) => <th key={c.key} className={`text-left px-4 py-3 label-eyebrow text-warning ${c.className || ""}`}>{c.label}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.item_id} className="border-t border-border" data-testid={`${module}-row-${it.item_id}`}>
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.className || ""}`}>
                      {c.render ? c.render(it) : (it[c.key] ?? "—")}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => remove(it.item_id)} className="text-destructive" data-testid={`${module}-del-${it.item_id}`}><Trash /></Button>
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
