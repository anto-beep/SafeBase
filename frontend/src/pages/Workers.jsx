import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import EnterpriseUpsellModal from "@/components/EnterpriseUpsellModal";
import useTier from "@/hooks/useTier";
import { useAuth } from "@/context/AuthContext";
import { ROLES_BY_INDUSTRY } from "@/data/roles.config";

// Growing Business plan caps at 20 users — 21st triggers Enterprise upsell.
const GROWING_USER_CAP = 20;

const CUSTOM_ROLE_VALUE = "__custom__";

export default function Workers() {
  const { user } = useAuth();
  const industry = (user?.industry || "trades").toLowerCase();
  const industryRoles = useMemo(() => ROLES_BY_INDUSTRY[industry] || ROLES_BY_INDUSTRY.trades, [industry]);

  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    role_value: industryRoles[0]?.value || "tradesperson",
    role: industryRoles[0]?.label || "Tradesperson",
    trade: "",
  });
  const [customRole, setCustomRole] = useState("");
  const { isEnterprise } = useTier();

  const handleAddClick = () => {
    if (!isEnterprise && items.length >= GROWING_USER_CAP) {
      setUpsellOpen(true);
      return;
    }
    setOpen(true);
  };

  const load = () => api.get("/workers").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const onRoleChange = (val) => {
    if (val === CUSTOM_ROLE_VALUE) {
      setForm((f) => ({ ...f, role_value: CUSTOM_ROLE_VALUE, role: "" }));
      return;
    }
    const r = industryRoles.find((x) => x.value === val);
    setForm((f) => ({ ...f, role_value: val, role: r?.label || val }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const finalRole = form.role_value === CUSTOM_ROLE_VALUE ? customRole.trim() : form.role;
    if (!finalRole) {
      toast.error("Please pick or type a role");
      return;
    }
    try {
      await api.post("/workers", {
        name: form.name, email: form.email, phone: form.phone,
        role: finalRole, trade: form.trade,
      });
      toast.success("Worker added");
      setOpen(false);
      setCustomRole("");
      setForm({
        name: "", email: "", phone: "",
        role_value: industryRoles[0]?.value || "tradesperson",
        role: industryRoles[0]?.label || "Tradesperson",
        trade: "",
      });
      load();
    } catch (err) { toast.error("Failed"); }
  };

  const remove = async (id) => { await api.delete(`/workers/${id}`); toast.success("Removed"); load(); };

  return (
    <div className="space-y-6" data-testid="workers-page">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ People</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Workers</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">Track every worker's role, trade and licences.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button
            onClick={handleAddClick}
            className="btn-sharp h-12 bg-ink text-white hover:opacity-90"
            data-testid="open-worker-dialog"
          >
            <Plus className="mr-2" weight="bold" />Add worker
          </Button>
          <DialogContent className="rounded-none max-w-md border-ink">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Add worker</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label className="label-eyebrow">Name</Label>
                <Input data-testid="wrk-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" />
              </div>
              <div>
                <Label className="label-eyebrow">Role</Label>
                <Select value={form.role_value} onValueChange={onRoleChange}>
                  <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="wrk-role-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {industryRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value} data-testid={`wrk-role-opt-${r.value}`}>
                        {r.label}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_ROLE_VALUE} data-testid="wrk-role-opt-custom">
                      Custom…
                    </SelectItem>
                  </SelectContent>
                </Select>
                {form.role_value === CUSTOM_ROLE_VALUE && (
                  <Input
                    placeholder="Type a custom role title"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="mt-2 h-11 rounded-none border-ink"
                    data-testid="wrk-role-custom-input"
                    required
                  />
                )}
              </div>
              <div>
                <Label className="label-eyebrow">Trade / specialty</Label>
                <Input data-testid="wrk-trade" value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} className="mt-2 h-11 rounded-none border-ink" />
              </div>
              <div>
                <Label className="label-eyebrow">Email</Label>
                <Input data-testid="wrk-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 h-11 rounded-none border-ink" />
              </div>
              <div>
                <Label className="label-eyebrow">Phone</Label>
                <Input data-testid="wrk-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-2 h-11 rounded-none border-ink" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="btn-sharp border-ink" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="btn-sharp bg-ink text-white hover:opacity-90" data-testid="wrk-submit">Add</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? (
        <div className="border-2 border-dashed border-border p-16 text-center">
          <Users size={48} weight="duotone" className="mx-auto opacity-40" />
          <div className="font-display text-xl font-bold mt-4">No workers yet</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((w) => (
            <div key={w.worker_id} className="bg-background border border-border p-5" data-testid={`worker-${w.worker_id}`}>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-ink text-warning flex items-center justify-center font-display font-black text-lg">{w.name?.[0]?.toUpperCase()}</div>
                <Button variant="ghost" size="sm" onClick={() => remove(w.worker_id)} className="text-destructive" data-testid={`worker-del-${w.worker_id}`}><Trash /></Button>
              </div>
              <div className="font-display font-bold text-lg mt-3">{w.name}</div>
              <div className="label-eyebrow mt-1">{w.role}{w.trade && ` · ${w.trade}`}</div>
              <div className="text-sm text-muted-foreground mt-2">{w.email}</div>
              {w.phone && <div className="text-sm text-muted-foreground">{w.phone}</div>}
            </div>
          ))}
        </div>
      )}
      <EnterpriseUpsellModal open={upsellOpen} onOpenChange={setUpsellOpen} trigger="users" />
    </div>
  );
}
