import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash, PencilSimple, Archive, Sparkle, MagnifyingGlass } from "@phosphor-icons/react";
import { toast } from "sonner";
import { HIERARCHY_LEVELS, HIERARCHY_MAP, TRADE_TYPES } from "./constants";

// One page used by all 4 libraries — rendered via /dashboard/library/{kind}.
// kind is passed via the route. Heavy composition, kept in a single file so
// the 4 libraries stay consistent (filters, table, add/edit dialog).

const LABELS = {
  process:  { title: "Process Library",  plural: "processes",  add: "Add Process",  one: "Process" },
  activity: { title: "Activity Library", plural: "activities", add: "Add Activity", one: "Activity" },
  task:     { title: "Task Library",     plural: "tasks",      add: "Add Task",     one: "Task" },
  control:  { title: "Control Library",  plural: "controls",   add: "Add Control",  one: "Control" },
};

export default function LibraryPage({ kind }) {
  const meta = LABELS[kind];
  const [items, setItems] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [activities, setActivities] = useState([]);
  const [hrcw, setHrcw] = useState([]);
  const [q, setQ] = useState("");
  const [tradeFilter, setTradeFilter] = useState("__all__");
  const [statusFilter, setStatusFilter] = useState("active");
  const [hierFilter, setHierFilter] = useState("__all__");
  const [processFilter, setProcessFilter] = useState("__all__");
  const [activityFilter, setActivityFilter] = useState("__all__");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiHazard, setAiHazard] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const emptyForm = () => ({
    name: "", description: "", trade_types: [], status: "active",
    parent_process_id: "", parent_process_name: "",
    parent_activity_id: "", parent_activity_name: "",
    duration: "", hrcw_trigger: false, hrcw_categories: [],
    hierarchy_level: "administrative", effectiveness: "medium",
    applicable_activity_id: "",
  });
  const [form, setForm] = useState(emptyForm());

  const load = async () => {
    const rs = await Promise.all([
      api.get(`/library/${kind}`),
      kind === "activity" || kind === "task" ? api.get("/library/process") : Promise.resolve({ data: [] }),
      kind === "task" || kind === "control" ? api.get("/library/activity") : Promise.resolve({ data: [] }),
      kind === "task" ? api.get("/risks/meta/hrcw") : Promise.resolve({ data: { categories: [] } }),
    ]);
    setItems(rs[0].data);
    setProcesses(rs[1].data);
    setActivities(rs[2].data);
    setHrcw(rs[3].data.categories || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [kind]);

  const filtered = useMemo(() => {
    return items.filter((x) => {
      if (statusFilter !== "all" && x.status !== statusFilter) return false;
      if (tradeFilter !== "__all__" && !(x.trade_types || []).includes(tradeFilter)) return false;
      if (kind === "control" && hierFilter !== "__all__" && x.hierarchy_level !== hierFilter) return false;
      if ((kind === "activity" || kind === "task") && processFilter !== "__all__" && x.parent_process_id !== processFilter) return false;
      if (kind === "task" && activityFilter !== "__all__" && x.parent_activity_id !== activityFilter) return false;
      if (q && !(`${x.name} ${x.description || ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [items, q, tradeFilter, statusFilter, hierFilter, processFilter, activityFilter, kind]);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...emptyForm(), ...row });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (kind === "activity" && form.parent_process_id) {
        payload.parent_process_name = processes.find((p) => p.id === form.parent_process_id)?.name;
      }
      if (kind === "task" && form.parent_activity_id) {
        const act = activities.find((a) => a.id === form.parent_activity_id);
        payload.parent_activity_name = act?.name;
        payload.parent_process_id = act?.parent_process_id;
        payload.parent_process_name = act?.parent_process_name;
      }
      if (editing) {
        await api.patch(`/library/${kind}/${editing.id}`, payload);
        toast.success(`${meta.one} updated`);
      } else {
        await api.post(`/library/${kind}`, payload);
        toast.success(`${meta.one} added`);
      }
      setOpen(false); load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Save failed"); }
  };

  const archive = async (row) => {
    await api.patch(`/library/${kind}/${row.id}`, { status: row.status === "archived" ? "active" : "archived" });
    load();
  };
  const remove = async (row) => {
    if (!window.confirm("Delete permanently?")) return;
    await api.delete(`/library/${kind}/${row.id}`);
    load();
  };

  const toggleTrade = (t) => {
    setForm((f) => ({
      ...f,
      trade_types: f.trade_types.includes(t) ? f.trade_types.filter((x) => x !== t) : [...f.trade_types, t],
    }));
  };
  const toggleHrcw = (c) => {
    setForm((f) => ({
      ...f,
      hrcw_categories: f.hrcw_categories.includes(c) ? f.hrcw_categories.filter((x) => x !== c) : [...f.hrcw_categories, c],
    }));
  };

  const runAiSuggestControls = async () => {
    if (!aiHazard.trim()) return toast.error("Describe the hazard first");
    setAiBusy(true);
    try {
      const r = await api.post("/risks/ai/suggest-controls", { hazard_description: aiHazard });
      setAiSuggestions(r.data.controls || []);
      if (r.data.fallback) toast.info("AI unavailable — showing standard suggestions");
    } catch { toast.error("AI suggest failed"); }
    setAiBusy(false);
  };

  const acceptAiSuggestion = async (s) => {
    await api.post("/library/control", {
      name: s.name, description: s.description,
      hierarchy_level: s.hierarchy_level, effectiveness: s.effectiveness || "medium",
    });
    toast.success(`Added: ${s.name}`);
    load();
  };

  return (
    <div className="space-y-6" data-testid={`library-${kind}-page`}>
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ Library</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">{meta.title}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            {kind === "process" && "Broad work categories your business undertakes. Activities and tasks roll up here."}
            {kind === "activity" && "Specific work activities within a Process. Tasks and risks reference these."}
            {kind === "task" && "Granular steps within an Activity. Flag High Risk Construction Work triggers here."}
            {kind === "control" && "Reusable measures across the hierarchy of controls — elimination through PPE."}
          </p>
        </div>
        <div className="flex gap-2">
          {kind === "control" && (
            <Button onClick={() => setAiOpen(true)} variant="outline" className="btn-sharp border-ink h-12" data-testid="ai-suggest-controls-btn">
              <Sparkle className="mr-2" weight="fill" />AI Suggest Controls
            </Button>
          )}
          <Button onClick={openAdd} className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="add-item-btn">
            <Plus className="mr-2" weight="bold" />{meta.add}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <div className="relative">
            <MagnifyingGlass className="absolute top-3 left-3 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-10 h-11 rounded-none border-ink" data-testid="library-search" />
          </div>
        </div>
        <Select value={tradeFilter} onValueChange={setTradeFilter}>
          <SelectTrigger className="h-11 rounded-none border-ink"><SelectValue placeholder="Trade" /></SelectTrigger>
          <SelectContent><SelectItem value="__all__">All trades</SelectItem>{TRADE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        {kind === "control" && (
          <Select value={hierFilter} onValueChange={setHierFilter}>
            <SelectTrigger className="h-11 rounded-none border-ink"><SelectValue placeholder="Hierarchy" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All levels</SelectItem>
              {HIERARCHY_LEVELS.map((h) => <SelectItem key={h.key} value={h.key}>{h.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(kind === "activity" || kind === "task") && (
          <Select value={processFilter} onValueChange={setProcessFilter}>
            <SelectTrigger className="h-11 rounded-none border-ink"><SelectValue placeholder="Process" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All processes</SelectItem>
              {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {kind === "task" && (
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="h-11 rounded-none border-ink"><SelectValue placeholder="Activity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All activities</SelectItem>
              {activities.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink text-warning">
            <tr>
              <th className="text-left px-4 py-3 label-eyebrow">Name</th>
              {kind === "activity" && <th className="text-left px-4 py-3 label-eyebrow">Parent Process</th>}
              {kind === "task" && <><th className="text-left px-4 py-3 label-eyebrow">Activity</th><th className="text-left px-4 py-3 label-eyebrow">Process</th><th className="text-left px-4 py-3 label-eyebrow">HRCW</th></>}
              {kind === "control" && <><th className="text-left px-4 py-3 label-eyebrow">Level</th><th className="text-left px-4 py-3 label-eyebrow">Effectiveness</th></>}
              <th className="text-left px-4 py-3 label-eyebrow">Trades</th>
              <th className="text-left px-4 py-3 label-eyebrow">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-border" data-testid={`library-row-${row.id}`}>
                <td className="px-4 py-3 font-bold">{row.name}<div className="text-xs text-muted-foreground font-normal line-clamp-1">{row.description}</div></td>
                {kind === "activity" && <td className="px-4 py-3">{row.parent_process_name || "—"}</td>}
                {kind === "task" && <><td className="px-4 py-3">{row.parent_activity_name || "—"}</td><td className="px-4 py-3">{row.parent_process_name || "—"}</td><td className="px-4 py-3">{row.hrcw_trigger ? <span className="bg-red-700 text-white text-[10px] font-bold px-2 py-0.5 tracking-widest">HRCW</span> : "—"}</td></>}
                {kind === "control" && (
                  <>
                    <td className="px-4 py-3">
                      <span className={`${HIERARCHY_MAP[row.hierarchy_level]?.color || "bg-muted"} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>
                        {HIERARCHY_MAP[row.hierarchy_level]?.label || row.hierarchy_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 uppercase text-xs">{row.effectiveness || "—"}</td>
                  </>
                )}
                <td className="px-4 py-3 text-xs">{(row.trade_types || []).join(", ") || "—"}</td>
                <td className="px-4 py-3"><span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 ${row.status === "archived" ? "bg-muted" : "bg-emerald-600 text-white"}`}>{(row.status || "active").toUpperCase()}</span></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(row)} data-testid={`library-edit-${row.id}`}><PencilSimple /></Button>
                  <Button size="sm" variant="ghost" onClick={() => archive(row)} data-testid={`library-archive-${row.id}`}><Archive /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(row)} className="text-destructive"><Trash /></Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No {meta.plural} match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-none max-w-2xl border-ink max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? "Edit" : meta.add}</DialogTitle>
            <DialogDescription className="sr-only">Library entry form.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label className="label-eyebrow">Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" data-testid="lib-f-name" />
            </div>
            <div>
              <Label className="label-eyebrow">Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 rounded-none border-ink" />
            </div>

            {(kind === "activity" || kind === "task") && (
              <div>
                <Label className="label-eyebrow">Parent Process</Label>
                <Select value={form.parent_process_id || "__none__"} onValueChange={(v) => setForm({ ...form, parent_process_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue placeholder="Select process" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">None</SelectItem>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {kind === "task" && (
              <>
                <div>
                  <Label className="label-eyebrow">Parent Activity</Label>
                  <Select value={form.parent_activity_id || "__none__"} onValueChange={(v) => setForm({ ...form, parent_activity_id: v === "__none__" ? "" : v })}>
                    <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue placeholder="Select activity" /></SelectTrigger>
                    <SelectContent><SelectItem value="__none__">None</SelectItem>{activities.filter((a) => !form.parent_process_id || a.parent_process_id === form.parent_process_id).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="label-eyebrow">Typical duration</Label>
                  <Select value={form.duration || "__none__"} onValueChange={(v) => setForm({ ...form, duration: v === "__none__" ? "" : v })}>
                    <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="label-eyebrow">High Risk Construction Work trigger?</Label>
                  <div className="mt-2 flex gap-3">
                    <label className="flex items-center gap-2 text-sm"><input type="radio" checked={!form.hrcw_trigger} onChange={() => setForm({ ...form, hrcw_trigger: false, hrcw_categories: [] })} /> No</label>
                    <label className="flex items-center gap-2 text-sm"><input type="radio" checked={form.hrcw_trigger} onChange={() => setForm({ ...form, hrcw_trigger: true })} /> Yes</label>
                  </div>
                </div>
                {form.hrcw_trigger && (
                  <div>
                    <Label className="label-eyebrow">HRCW categories (select all that apply)</Label>
                    <div className="mt-2 border border-ink p-3 max-h-48 overflow-y-auto space-y-1">
                      {hrcw.map((c) => (
                        <label key={c} className="flex items-start gap-2 text-xs">
                          <input type="checkbox" checked={form.hrcw_categories.includes(c)} onChange={() => toggleHrcw(c)} />
                          <span>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {kind === "control" && (
              <>
                <div>
                  <Label className="label-eyebrow">Hierarchy level</Label>
                  <Select value={form.hierarchy_level} onValueChange={(v) => setForm({ ...form, hierarchy_level: v })}>
                    <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
                    <SelectContent>{HIERARCHY_LEVELS.map((h) => <SelectItem key={h.key} value={h.key}><strong>{h.label}</strong> — {h.desc}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="label-eyebrow">Typical effectiveness</Label>
                  <Select value={form.effectiveness} onValueChange={(v) => setForm({ ...form, effectiveness: v })}>
                    <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High — reliably prevents</SelectItem>
                      <SelectItem value="medium">Medium — reduces likelihood/consequence</SelectItem>
                      <SelectItem value="low">Low — minor reduction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label className="label-eyebrow">Trade types</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {TRADE_TYPES.map((t) => (
                  <button type="button" key={t}
                    onClick={() => toggleTrade(t)}
                    className={`px-3 py-1 text-xs font-bold tracking-widest border-2 ${form.trade_types.includes(t) ? "bg-ink text-warning border-ink" : "bg-background border-border hover:border-ink"}`}
                  >{t}</button>
                ))}
              </div>
            </div>

            <div>
              <Label className="label-eyebrow">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-2 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="btn-sharp border-ink" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="btn-sharp bg-ink text-white hover:bg-authority" data-testid="lib-submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Suggest Controls dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="rounded-none max-w-2xl border-ink max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2"><Sparkle weight="fill" className="text-warning" /> AI Suggest Controls</DialogTitle>
            <DialogDescription>Describe the hazard — Claude will propose controls spanning the hierarchy.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea rows={3} value={aiHazard} onChange={(e) => setAiHazard(e.target.value)}
              placeholder="e.g. Uninsulated conductors in switchboard during live testing; workers may contact live parts."
              className="rounded-none border-ink" data-testid="ai-hazard-input" />
            <Button onClick={runAiSuggestControls} disabled={aiBusy} className="btn-sharp bg-ink text-white hover:bg-authority h-11" data-testid="ai-run-btn">
              <Sparkle className="mr-2" weight="fill" />{aiBusy ? "Thinking…" : "Generate controls"}
            </Button>
            {aiSuggestions.length > 0 && (
              <div className="space-y-2 mt-3 border-t border-border pt-3">
                {aiSuggestions.map((s, i) => (
                  <div key={i} className="border border-border p-3 flex items-start justify-between gap-3" data-testid={`ai-sugg-${i}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`${HIERARCHY_MAP[s.hierarchy_level]?.color || "bg-muted"} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{HIERARCHY_MAP[s.hierarchy_level]?.label || s.hierarchy_level}</span>
                        <span className="font-bold text-sm">{s.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                    </div>
                    <Button size="sm" className="btn-sharp bg-ink text-white hover:bg-authority" onClick={() => acceptAiSuggestion(s)}>Add to library</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
