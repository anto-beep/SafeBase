import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash, Clipboard, QrCode, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Tradeinduct() {
  const [programs, setPrograms] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", site: "", trade: "" });

  const load = () => api.get("/tradeinduct/programs").then((r) => setPrograms(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/tradeinduct/programs", form);
      toast.success("Induction program created");
      setForm({ title: "", site: "", trade: "" });
      setOpen(false);
      load();
    } catch (e2) { toast.error(e2?.response?.data?.detail || "Failed"); }
  };

  const remove = async (id) => {
    await api.delete(`/tradeinduct/programs/${id}`);
    toast.success("Removed");
    load();
  };

  const loadSubs = async (pid) => {
    const r = await api.get(`/tradeinduct/programs/${pid}/submissions`);
    setSubmissions((s) => ({ ...s, [pid]: r.data }));
  };

  const copyLink = (code) => {
    const url = `${window.location.origin}/induct/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Induction link copied");
  };

  return (
    <div className="space-y-6" data-testid="tradeinduct-page">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ TradeInduct</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Induction Portal.</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">Create a site induction once, share a code, and any worker or subbie can complete it in 5 minutes — with a signed certificate emailed instantly.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="induction-create-btn">
              <Plus className="mr-2" weight="bold" />New induction
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-none max-w-lg border-ink">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl tracking-tight">New induction program</DialogTitle>
              <DialogDescription className="sr-only">Create a reusable induction with an invite code.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div><Label className="label-eyebrow">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 h-11 rounded-none border-ink" required data-testid="induction-f-title" /></div>
              <div><Label className="label-eyebrow">Site</Label><Input value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">Trade</Label><Input value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" className="btn-sharp border-ink" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" className="btn-sharp bg-ink text-white" data-testid="induction-submit">Create</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {programs.length === 0 ? (
        <div className="border-2 border-dashed border-border p-16 text-center">
          <QrCode size={48} weight="duotone" className="mx-auto opacity-40" />
          <div className="font-display text-xl font-bold mt-4">No inductions yet</div>
          <div className="text-sm text-muted-foreground mt-1">Create your first site induction. Worker invites go live instantly.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {programs.map((p) => (
            <div key={p.program_id} className="border border-border bg-background p-5" data-testid={`induction-card-${p.program_id}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-black tracking-tight">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.site || "Any site"} · {p.trade || "all trades"}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(p.program_id)} className="text-destructive" data-testid={`induction-del-${p.program_id}`}><Trash /></Button>
              </div>
              <div className="mt-4 bg-ink text-warning p-4 flex items-center justify-between">
                <div>
                  <div className="label-eyebrow">Invite code</div>
                  <div className="font-display text-3xl font-black tracking-wider">{p.code}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyLink(p.code)} className="text-warning hover:bg-warning/10" data-testid={`induction-copy-${p.program_id}`}><Clipboard className="mr-1" />Copy link</Button>
              </div>
              <div className="mt-4">
                <button onClick={() => loadSubs(p.program_id)} className="label-eyebrow text-ink hover:underline" data-testid={`induction-view-subs-${p.program_id}`}>Show submissions</button>
                {submissions[p.program_id] && (
                  <div className="mt-3 space-y-1 text-sm max-h-40 overflow-y-auto">
                    {submissions[p.program_id].length === 0 ? (
                      <div className="text-xs text-muted-foreground">No submissions yet.</div>
                    ) : submissions[p.program_id].map((s) => (
                      <div key={s.submission_id} className="flex justify-between border-b border-border py-1">
                        <span className="font-bold">{s.worker_name || s.worker_email}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle weight="fill" className="text-emerald-600" size={14} />{new Date(s.submitted_at).toLocaleDateString("en-AU")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
