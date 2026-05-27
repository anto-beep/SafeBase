import { useEffect, useState } from "react";
import SafetyModulePage from "@/components/safety/SafetyModulePage";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ChatCircleText, CheckCircle, Users } from "@phosphor-icons/react";
import { toast } from "sonner";

const TOPICS = [
  "Working at Heights", "Electrical Safety", "Plumbing Safety", "Confined Spaces",
  "Manual Handling", "Hazardous Substances", "Emergency Procedures",
  "Mental Health & Wellbeing", "Psychosocial Safety", "Fatigue Management",
  "Heat & Cold Stress", "Traffic Management", "Fire Safety", "Noise & Hearing Protection",
].map((t) => ({ v: t, l: t }));

const STATUS = [
  { v: "scheduled", l: "Scheduled" },
  { v: "conducted", l: "Conducted" },
  { v: "archived", l: "Archived" },
];

// ---- Conduct Toolbox dialog: select attendees + stamp competencies ----
function ConductButton({ item, onDone }) {
  const [open, setOpen] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [signedOff, setSignedOff] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get("/workers").then((r) => setWorkers(r.data || []));
    setSelected(new Set());
    setNotes("");
    setSignedOff("");
  }, [open]);

  const toggle = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => prev.size === workers.length ? new Set() : new Set(workers.map((w) => w.worker_id)));
  };

  const submit = async () => {
    if (selected.size === 0) { toast.error("Select at least one attendee"); return; }
    if (!signedOff) { toast.error("Sign-off name required"); return; }
    setBusy(true);
    try {
      const attendees = workers
        .filter((w) => selected.has(w.worker_id))
        .map((w) => ({ worker_id: w.worker_id, name: w.name }));
      const r = await api.post(`/toolbox-talks/${item.item_id}/conduct`, {
        attendees, signed_off_by: signedOff, notes,
      });
      toast.success(`${r.data.stamped_count} worker(s) briefed — competency stamped for ${r.data.expires_at?.slice(0, 10)}`);
      setOpen(false);
      onDone?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to conduct toolbox");
    }
    setBusy(false);
  };

  if (item.status === "conducted") {
    return (
      <span className="text-[10px] font-bold tracking-widest text-emerald-700 inline-flex items-center gap-1 mr-2" data-testid={`conducted-${item.item_id}`}>
        <CheckCircle weight="fill" size={14} />
        {item.attendees_count || 0} STAMPED
      </span>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="btn-sharp border-ink h-8 mr-1"
        onClick={() => setOpen(true)}
        data-testid={`conduct-${item.item_id}`}
      >
        <Users className="mr-1" />Conduct
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-none max-w-2xl border-ink max-h-[90vh] overflow-y-auto" data-testid="conduct-modal">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-black tracking-tighter">
              Conduct toolbox talk
            </DialogTitle>
            <DialogDescription>
              Mark <strong>{item.topic}</strong> as conducted and stamp each attending worker's
              Competency Matrix. Each stamp is valid for 12 months.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="label-eyebrow">Attendees</Label>
                <button type="button" onClick={toggleAll} className="text-xs underline" data-testid="toggle-all-attendees">
                  {selected.size === workers.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="border border-ink max-h-64 overflow-y-auto" data-testid="attendees-list">
                {workers.length === 0 && <div className="p-4 text-xs text-muted-foreground">No workers found — add workers first.</div>}
                {workers.map((w) => (
                  <label key={w.worker_id} className="flex items-center gap-3 p-3 border-b border-border last:border-0 hover:bg-muted cursor-pointer text-sm" data-testid={`attendee-${w.worker_id}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(w.worker_id)}
                      onChange={() => toggle(w.worker_id)}
                    />
                    <div className="flex-1">
                      <div className="font-bold">{w.name}</div>
                      <div className="text-xs text-muted-foreground">{w.role}{w.trade ? ` · ${w.trade}` : ""}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="text-[10px] mt-1 label-eyebrow text-muted-foreground">
                {selected.size}/{workers.length} selected
              </div>
            </div>

            <div>
              <Label className="label-eyebrow">Notes covered (optional)</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Brief summary of what was covered and any worker feedback…"
                className="mt-1 rounded-none border-ink"
                data-testid="conduct-notes"
              />
            </div>

            <div>
              <Label className="label-eyebrow">Sign-off (Safety Manager / Supervisor)</Label>
              <Input
                value={signedOff}
                onChange={(e) => setSignedOff(e.target.value)}
                placeholder="Type your full name"
                className="mt-1 h-11 rounded-none border-ink"
                data-testid="conduct-signed-off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="btn-sharp border-ink" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button
              className="btn-sharp bg-ink text-white hover:bg-authority"
              onClick={submit}
              disabled={busy || selected.size === 0 || !signedOff}
              data-testid="conduct-submit"
            >
              {busy ? "Stamping…" : `Conduct & stamp ${selected.size} worker${selected.size === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ToolboxTalks() {
  return (
    <SafetyModulePage
      module="toolbox_talks"
      title="Toolbox Talks"
      eyebrow="Safety briefings"
      lead="Short pre-start safety briefings with workers. Conduct a talk to auto-stamp each attending worker's Competency Matrix."
      icon={ChatCircleText}
      emptyMessage="Schedule your first toolbox talk — 5-minute pre-start safety briefing."
      fields={[
        { key: "topic", label: "Topic", type: "select", options: TOPICS, required: true, span: 2 },
        { key: "site", label: "Site", type: "text", span: 2 },
        { key: "scheduled_at", label: "Date & time", type: "datetime-local", required: true },
        { key: "conducted_by", label: "Conducted by", type: "person" },
        { key: "status", label: "Status", type: "select", options: STATUS, default: "scheduled" },
        { key: "attendees_count", label: "Expected attendees", type: "number", min: 1 },
        { key: "notes", label: "Key points / notes", type: "textarea", span: 2 },
      ]}
      columns={[
        { key: "topic", label: "Topic", render: (i) => <span className="font-bold">{i.topic}</span> },
        { key: "site", label: "Site" },
        { key: "scheduled_at", label: "Scheduled", render: (i) => i.scheduled_at ? new Date(i.scheduled_at).toLocaleString("en-AU") : "—" },
        { key: "conducted_by", label: "Conducted by" },
        { key: "status", label: "Status", render: (i) => <span className={`${i.status === "conducted" ? "bg-emerald-600 text-white" : "bg-warning text-ink"} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{(i.status || "scheduled").toUpperCase()}</span> },
      ]}
      rowActions={(item, reload) => <ConductButton item={item} onDone={reload} />}
    />
  );
}
