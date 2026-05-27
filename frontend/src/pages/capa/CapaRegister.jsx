import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ListChecks, Plus, Check, Warning, Clock, Archive } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PeoplePicker, personLabel } from "@/components/PeoplePicker";

/**
 * CAPA Register — Corrective & Preventive Actions.
 *
 * Cross-cutting register that surfaces all remediation actions across the
 * platform (Risk reviews, Incidents, Inspections, audits). Auto-spawned
 * items appear here alongside manual ones. Closing an item is gated and
 * audit-logged on the backend.
 */
export default function CapaRegister() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ open: 0, in_progress: 0, closed: 0, overdue: 0, total: 0 });
  const [filter, setFilter] = useState({ status: "all", action_type: "all" });
  const [createOpen, setCreateOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(null); // capa item being closed
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const params = {};
      if (filter.status !== "all") params.status = filter.status;
      if (filter.action_type !== "all") params.action_type = filter.action_type;
      const [r, s] = await Promise.all([
        api.get("/capa", { params }),
        api.get("/capa/summary"),
      ]);
      setItems(Array.isArray(r.data) ? r.data : []);
      setSummary(s.data || {});
    } catch (e) {
      toast.error("Could not load CAPA register");
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter.status, filter.action_type]);

  const visible = useMemo(() => items, [items]);

  return (
    <div className="space-y-6" data-testid="capa-page">
      <div className="border-b border-border pb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="label-eyebrow flex items-center gap-2">
            <ListChecks size={14} className="text-warning" />
            <span>CAPA Register</span>
          </div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-2">
            Corrective &amp; preventive actions.
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Every accepted remediation, audit finding, and risk-review action lands here. Close them with evidence — the audit log captures who, when, and what.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="btn-sharp bg-ink text-white hover:opacity-90 uppercase tracking-widest"
          data-testid="capa-create-btn"
        >
          <Plus weight="bold" className="mr-2" /> New CAPA
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="capa-stats">
        <Stat label="Open" value={summary.open} icon={<Warning className="text-amber-600" weight="bold" />} />
        <Stat label="In progress" value={summary.in_progress} icon={<Clock className="text-blue-600" weight="bold" />} />
        <Stat label="Overdue" value={summary.overdue} icon={<Warning className="text-red-600" weight="bold" />} red={summary.overdue > 0} />
        <Stat label="Closed" value={summary.closed} icon={<Check className="text-emerald-600" weight="bold" />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end border-b border-border pb-3">
        <div>
          <Label className="label-eyebrow">Status</Label>
          <Select value={filter.status} onValueChange={(v) => setFilter((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="mt-1 h-9 rounded-none border-ink w-44" data-testid="capa-filter-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="label-eyebrow">Action type</Label>
          <Select value={filter.action_type} onValueChange={(v) => setFilter((f) => ({ ...f, action_type: v }))}>
            <SelectTrigger className="mt-1 h-9 rounded-none border-ink w-44" data-testid="capa-filter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="corrective">Corrective</SelectItem>
              <SelectItem value="preventive">Preventive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border bg-background overflow-x-auto" data-testid="capa-table">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr className="text-left text-[10px] uppercase tracking-widest">
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 w-28">Type</th>
              <th className="px-3 py-2 w-32">Linked to</th>
              <th className="px-3 py-2 w-40">Assignee</th>
              <th className="px-3 py-2 w-28">Due</th>
              <th className="px-3 py-2 w-24">Priority</th>
              <th className="px-3 py-2 w-28">Status</th>
              <th className="px-3 py-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground italic">No CAPA items match these filters.</td></tr>
            )}
            {visible.map((c) => {
              const overdue = c.due_date && c.status !== "closed" && c.status !== "archived" && new Date(c.due_date) < new Date();
              return (
                <tr key={c.capa_id} className="border-b border-border last:border-b-0 hover:bg-muted/50" data-testid={`capa-row-${c.capa_id}`}>
                  <td className="px-3 py-2">
                    <div className="font-bold">{c.description}</div>
                    {c.linked_entity_label && (
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{c.linked_entity_label}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 border ${c.action_type === "preventive" ? "border-blue-400 text-blue-700" : "border-amber-400 text-amber-700"}`}>
                      {c.action_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.linked_entity_type || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {personLabel(c.assigned_to)}
                  </td>
                  <td className={`px-3 py-2 text-xs ${overdue ? "text-red-600 font-bold" : ""}`}>
                    {c.due_date ? new Date(c.due_date).toLocaleDateString("en-AU") : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{c.priority || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 ${
                      c.status === "closed" ? "bg-emerald-100 text-emerald-800"
                      : c.status === "in_progress" ? "bg-blue-100 text-blue-800"
                      : c.status === "archived" ? "bg-muted text-muted-foreground"
                      : "bg-amber-100 text-amber-800"
                    }`}>{c.status}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {c.status !== "closed" && c.status !== "archived" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCloseOpen(c)}
                        className="btn-sharp border-ink h-7 text-[10px] uppercase tracking-widest"
                        data-testid={`capa-close-${c.capa_id}`}
                      >
                        Close
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CreateCapaModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); load(); }}
        busy={busy}
        setBusy={setBusy}
      />
      <CloseCapaModal
        item={closeOpen}
        onClose={() => setCloseOpen(null)}
        onClosed={() => { setCloseOpen(null); load(); }}
      />
    </div>
  );
}


function Stat({ label, value, icon, red }) {
  return (
    <div className={`border bg-background p-4 flex items-center gap-3 ${red ? "border-red-500" : "border-border"}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-3xl font-display font-black">{value}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}


function CreateCapaModal({ open, onClose, onCreated, busy, setBusy }) {
  const [form, setForm] = useState({
    description: "", action_type: "corrective", priority: "medium",
    assigned_to: null, due_date: "", linked_entity_type: "other",
    linked_entity_id: "", linked_entity_label: "",
  });

  useEffect(() => {
    if (open) setForm({
      description: "", action_type: "corrective", priority: "medium",
      assigned_to: null, due_date: "", linked_entity_type: "other",
      linked_entity_id: "", linked_entity_label: "",
    });
  }, [open]);

  const submit = async () => {
    if (!form.description.trim()) { toast.error("Description is required"); return; }
    setBusy(true);
    try {
      await api.post("/capa", form);
      toast.success("CAPA created");
      onCreated();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not create CAPA");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-ink max-w-xl" data-testid="capa-create-modal">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-black">New CAPA</DialogTitle>
          <DialogDescription>Create a corrective or preventive action.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="label-eyebrow">Description *</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 rounded-none border-ink"
              data-testid="capa-create-desc"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="label-eyebrow">Action type</Label>
              <Select value={form.action_type} onValueChange={(v) => setForm((f) => ({ ...f, action_type: v }))}>
                <SelectTrigger className="mt-1 h-10 rounded-none border-ink" data-testid="capa-create-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="preventive">Preventive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="label-eyebrow">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger className="mt-1 h-10 rounded-none border-ink"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="label-eyebrow">Assignee</Label>
              <div className="mt-1">
                <PeoplePicker
                  value={form.assigned_to}
                  onChange={(v) => setForm((f) => ({ ...f, assigned_to: v }))}
                  testId="capa-create-assignee"
                />
              </div>
            </div>
            <div>
              <Label className="label-eyebrow">Due date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="mt-1 h-10 rounded-none border-ink"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="label-eyebrow">Linked entity type</Label>
              <Select value={form.linked_entity_type} onValueChange={(v) => setForm((f) => ({ ...f, linked_entity_type: v }))}>
                <SelectTrigger className="mt-1 h-10 rounded-none border-ink"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="control">Control</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="review">Risk review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="label-eyebrow">Linked entity label</Label>
              <Input
                value={form.linked_entity_label}
                onChange={(e) => setForm((f) => ({ ...f, linked_entity_label: e.target.value }))}
                placeholder="e.g. 'Risk #12 — Working at heights'"
                className="mt-1 h-10 rounded-none border-ink"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="btn-sharp border-ink">Cancel</Button>
          <Button onClick={submit} disabled={busy} className="btn-sharp bg-ink text-white hover:opacity-90" data-testid="capa-create-submit">
            {busy ? "Creating…" : "Create CAPA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function CloseCapaModal({ item, onClose, onClosed }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (item) setNotes(""); }, [item]);

  const submit = async () => {
    if (!item) return;
    setBusy(true);
    try {
      await api.post(`/capa/${item.capa_id}/close`, { closure_notes: notes });
      toast.success("CAPA closed");
      onClosed();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not close CAPA");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-ink max-w-lg" data-testid="capa-close-modal">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black">Close CAPA</DialogTitle>
          <DialogDescription>{item?.description}</DialogDescription>
        </DialogHeader>
        <div>
          <Label className="label-eyebrow">Closure notes</Label>
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Evidence / how it was resolved"
            className="mt-1 rounded-none border-ink"
            data-testid="capa-close-notes"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="btn-sharp border-ink">Cancel</Button>
          <Button onClick={submit} disabled={busy} className="btn-sharp bg-emerald-600 text-white hover:opacity-90" data-testid="capa-close-submit">
            {busy ? "Closing…" : "Confirm close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
