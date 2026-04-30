import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash, Warning, Database, Bell, UsersThree, Buildings, CreditCard, PlugsConnected } from "@phosphor-icons/react";
import { toast } from "sonner";
import BillingPanel from "./BillingPanel";
import EnterpriseUpsellModal from "@/components/EnterpriseUpsellModal";
import useTier from "@/hooks/useTier";

const ROLES = [
  { v: "admin", l: "Owner / Admin", d: "Full access including billing" },
  { v: "safety_manager", l: "Safety Manager", d: "All safety modules, no billing" },
  { v: "supervisor", l: "Supervisor", d: "Assigned sites only" },
  { v: "worker", l: "Worker", d: "Mobile app only" },
];

export default function Settings() {
  const { user } = useAuth();
  const { isEnterprise } = useTier();
  const [biz, setBiz] = useState({});
  const [team, setTeam] = useState([]);
  const [prefs, setPrefs] = useState({ credential_expiry_days: [60, 30, 14, 7], credential_delivery: "both", incident_score_threshold: 70, weekly_summary: true, legislative_digest: "weekly" });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "worker", name: "" });
  const [apiUpsellOpen, setApiUpsellOpen] = useState(false);

  const load = async () => {
    const [b, t, p] = await Promise.all([
      api.get("/settings/business").catch(() => ({ data: {} })),
      api.get("/team").catch(() => ({ data: [] })),
      api.get("/settings/notifications").catch(() => ({ data: prefs })),
    ]);
    setBiz(b.data); setTeam(t.data); setPrefs(p.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const saveBiz = async () => {
    try { await api.put("/settings/business", biz); toast.success("Business profile saved"); }
    catch { toast.error("Save failed"); }
  };
  const savePrefs = async () => {
    try { await api.put("/settings/notifications", prefs); toast.success("Preferences saved"); }
    catch { toast.error("Save failed"); }
  };
  const doInvite = async () => {
    if (!inviteForm.email) return;
    try {
      await api.post("/team/invite", inviteForm);
      toast.success("Invite created");
      setInviteOpen(false);
      setInviteForm({ email: "", role: "worker", name: "" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };
  const removeMember = async (id) => { await api.delete(`/team/${id}`); load(); };
  const updateRole = async (id, role) => { await api.patch(`/team/${id}`, { role }); load(); };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ Settings</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Settings</h1>
        </div>
      </div>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="bg-muted rounded-none border border-border p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="business" className="rounded-none" data-testid="settings-tab-business"><Buildings className="mr-2" />Business</TabsTrigger>
          <TabsTrigger value="team" className="rounded-none" data-testid="settings-tab-team"><UsersThree className="mr-2" />Users & Roles</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none" data-testid="settings-tab-notifications"><Bell className="mr-2" />Notifications</TabsTrigger>
          <TabsTrigger value="billing" className="rounded-none" data-testid="settings-tab-billing"><CreditCard className="mr-2" />Billing</TabsTrigger>
          <TabsTrigger
            value="api"
            className="rounded-none"
            data-testid="settings-tab-api"
            onClick={() => { if (!isEnterprise) setApiUpsellOpen(true); }}
          ><PlugsConnected className="mr-2" />API</TabsTrigger>
          <TabsTrigger value="data" className="rounded-none" data-testid="settings-tab-data"><Database className="mr-2" />Data & Privacy</TabsTrigger>
          <TabsTrigger value="danger" className="rounded-none text-destructive" data-testid="settings-tab-danger"><Warning className="mr-2" />Danger</TabsTrigger>
        </TabsList>

        {/* BUSINESS */}
        <TabsContent value="business" className="space-y-4">
          <div className="bg-background border border-border p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label className="label-eyebrow">Company name</Label><Input data-testid="biz-name" value={biz.company_name || ""} onChange={(e) => setBiz({ ...biz, company_name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
            <div><Label className="label-eyebrow">ABN</Label><Input data-testid="biz-abn" value={biz.abn || ""} onChange={(e) => setBiz({ ...biz, abn: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
            <div><Label className="label-eyebrow">Trade type</Label><Input value={biz.trade_type || ""} onChange={(e) => setBiz({ ...biz, trade_type: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
            <div><Label className="label-eyebrow">Primary state</Label><Input value={biz.primary_state || ""} onChange={(e) => setBiz({ ...biz, primary_state: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
            <div><Label className="label-eyebrow">Primary contact name</Label><Input value={biz.primary_contact_name || ""} onChange={(e) => setBiz({ ...biz, primary_contact_name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
            <div><Label className="label-eyebrow">Primary contact phone</Label><Input value={biz.primary_contact_phone || ""} onChange={(e) => setBiz({ ...biz, primary_contact_phone: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
            <div className="md:col-span-2"><Label className="label-eyebrow">Business address</Label><Input value={biz.address || ""} onChange={(e) => setBiz({ ...biz, address: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
            <div><Label className="label-eyebrow">Emergency contact name</Label><Input value={biz.emergency_contact_name || ""} onChange={(e) => setBiz({ ...biz, emergency_contact_name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
            <div><Label className="label-eyebrow">Emergency contact phone</Label><Input value={biz.emergency_contact_phone || ""} onChange={(e) => setBiz({ ...biz, emergency_contact_phone: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
            <div className="md:col-span-2"><Label className="label-eyebrow">WHS representative</Label><Input value={biz.whs_rep_name || ""} onChange={(e) => setBiz({ ...biz, whs_rep_name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
          </div>
          <div className="flex justify-end"><Button onClick={saveBiz} className="btn-sharp bg-ink text-white hover:bg-authority h-11" data-testid="biz-save">Save changes</Button></div>
        </TabsContent>

        {/* TEAM */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-lg">{team.length + 1} user(s)</div>
              <div className="text-sm text-muted-foreground">Owner + team members</div>
            </div>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" data-testid="team-invite-btn"><Plus className="mr-2" />Invite user</Button>
              </DialogTrigger>
              <DialogContent className="rounded-none max-w-md border-ink">
                <DialogHeader><DialogTitle className="font-display text-2xl">Invite user</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="label-eyebrow">Email</Label><Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="mt-2 h-11 rounded-none border-ink" data-testid="team-invite-email" /></div>
                  <div><Label className="label-eyebrow">Role</Label>
                    <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                      <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="team-invite-role"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r.v} value={r.v}><div><div className="font-bold">{r.l}</div><div className="text-xs text-muted-foreground">{r.d}</div></div></SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={doInvite} className="w-full btn-sharp h-11 bg-ink text-white hover:bg-authority" data-testid="team-invite-submit">Send invite</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="bg-background border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink text-white">
                <tr>
                  {["Email", "Name", "Role", "Status", "Invited", ""].map((h) => <th key={h} className="text-left px-4 py-3 label-eyebrow text-warning">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border bg-warning/10">
                  <td className="px-4 py-3 font-bold">{user?.email}</td>
                  <td className="px-4 py-3">{user?.name}</td>
                  <td className="px-4 py-3"><span className="bg-ink text-warning px-2 py-0.5 text-xs font-bold">OWNER</span></td>
                  <td className="px-4 py-3">Active</td>
                  <td className="px-4 py-3">—</td>
                  <td></td>
                </tr>
                {team.map((m) => (
                  <tr key={m.invite_id} className="border-t border-border" data-testid={`team-row-${m.invite_id}`}>
                    <td className="px-4 py-3 font-bold">{m.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.name || "—"}</td>
                    <td className="px-4 py-3">
                      <Select value={m.role} onValueChange={(v) => updateRole(m.invite_id, v)}>
                        <SelectTrigger className="h-9 rounded-none border-ink w-40" data-testid={`team-role-${m.invite_id}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3"><span className="bg-warning text-ink px-2 py-0.5 text-xs font-bold">{m.status.toUpperCase()}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(m.invited_at).toLocaleDateString("en-AU")}</td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => removeMember(m.invite_id)} className="text-destructive" data-testid={`team-del-${m.invite_id}`}><Trash /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="bg-background border border-border p-6 space-y-6">
            <div>
              <div className="font-display font-bold text-lg mb-3">Credential expiry alerts</div>
              <div className="flex flex-wrap gap-2">
                {[60, 30, 14, 7].map((d) => {
                  const on = prefs.credential_expiry_days.includes(d);
                  return (
                    <button key={d} onClick={() => setPrefs({ ...prefs, credential_expiry_days: on ? prefs.credential_expiry_days.filter((x) => x !== d) : [...prefs.credential_expiry_days, d] })} className={`btn-sharp px-4 py-2 text-sm font-bold ${on ? "bg-ink text-white" : "bg-muted text-foreground border border-border"}`} data-testid={`notif-days-${d}`}>
                      {d} days before
                    </button>
                  );
                })}
              </div>
              <div className="mt-4">
                <Label className="label-eyebrow">Delivery</Label>
                <Select value={prefs.credential_delivery} onValueChange={(v) => setPrefs({ ...prefs, credential_delivery: v })}>
                  <SelectTrigger className="mt-2 h-11 rounded-none border-ink max-w-xs" data-testid="notif-delivery"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email only</SelectItem>
                    <SelectItem value="sms">SMS only</SelectItem>
                    <SelectItem value="both">Email + SMS</SelectItem>
                    <SelectItem value="inapp">In-app only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <div className="font-display font-bold text-lg mb-3">Compliance score</div>
              <div className="flex items-center gap-3">
                <Label className="label-eyebrow">Alert when score drops below</Label>
                <Input type="number" min={0} max={100} value={prefs.incident_score_threshold} onChange={(e) => setPrefs({ ...prefs, incident_score_threshold: parseInt(e.target.value || 0, 10) })} className="h-11 rounded-none border-ink w-24" data-testid="notif-threshold" />
              </div>
            </div>

            <div className="border-t border-border pt-6 flex items-center justify-between">
              <div>
                <div className="font-display font-bold">Weekly compliance summary</div>
                <div className="text-sm text-muted-foreground">Emailed every Monday morning.</div>
              </div>
              <Switch checked={prefs.weekly_summary} onCheckedChange={(v) => setPrefs({ ...prefs, weekly_summary: v })} data-testid="notif-weekly" />
            </div>

            <div className="border-t border-border pt-6">
              <div className="font-display font-bold text-lg mb-3">Legislative update digest</div>
              <Select value={prefs.legislative_digest} onValueChange={(v) => setPrefs({ ...prefs, legislative_digest: v })}>
                <SelectTrigger className="h-11 rounded-none border-ink max-w-xs" data-testid="notif-digest"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="weekly">Weekly digest</SelectItem>
                  <SelectItem value="monthly">Monthly digest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end"><Button onClick={savePrefs} className="btn-sharp bg-ink text-white hover:bg-authority h-11" data-testid="notif-save">Save preferences</Button></div>
        </TabsContent>

        {/* BILLING */}
        <TabsContent value="billing" className="space-y-4">
          <BillingPanel />
        </TabsContent>

        {/* API (Enterprise-only) */}
        <TabsContent value="api" className="space-y-4">
          <div className="bg-background border-2 border-ink p-6 space-y-4" data-testid="settings-api-panel">
            <div className="flex items-center gap-2 label-eyebrow text-authority">
              <PlugsConnected /> / API & Integrations
            </div>
            {isEnterprise ? (
              <>
                <div className="font-display font-bold text-xl">Your API keys</div>
                <p className="text-sm text-muted-foreground">Generate long-lived tokens below. Full REST docs at <a href="/integrations" className="underline">/integrations</a>.</p>
                <Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" data-testid="api-generate-key">Generate new key</Button>
              </>
            ) : (
              <>
                <div className="font-display font-bold text-xl">API access is an Enterprise feature</div>
                <p className="text-sm text-muted-foreground">Connect SafeTradie to your ERP, HRIS or BI stack with our full REST API, webhooks and priority integration support. Available on Enterprise — A$1,299/mo + GST.</p>
                <Button
                  className="btn-sharp bg-ink text-white hover:bg-authority h-11"
                  onClick={() => setApiUpsellOpen(true)}
                  data-testid="api-upsell-trigger"
                >
                  See Enterprise features
                </Button>
              </>
            )}
          </div>
        </TabsContent>

        {/* DATA */}
        <TabsContent value="data" className="space-y-4">
          <div className="bg-background border border-border p-6 space-y-4">
            <div>
              <div className="font-display font-bold text-lg">Data hosting</div>
              <div className="text-sm text-muted-foreground mt-1">Your data is stored in <strong>AWS Sydney (ap-southeast-2)</strong>. It never leaves Australia.</div>
            </div>
            <div className="border-t border-border pt-4">
              <div className="font-display font-bold text-lg">Export all data</div>
              <div className="text-sm text-muted-foreground mt-1 mb-3">Generates JSON + PDF zip. Emailed within 24 hours.</div>
              <Button variant="outline" className="btn-sharp border-ink h-11" data-testid="data-export">Request export</Button>
            </div>
          </div>
        </TabsContent>

        {/* DANGER */}
        <TabsContent value="danger" className="space-y-4">
          <div className="bg-background border-2 border-destructive p-6 space-y-4">
            <div>
              <div className="font-display font-bold text-lg text-destructive">Cancel subscription</div>
              <div className="text-sm text-muted-foreground mt-1 mb-3">Cancel any time. Your data is retained for 30 days after cancellation.</div>
              <Button variant="outline" className="btn-sharp border-destructive text-destructive h-11" data-testid="danger-cancel">Cancel subscription</Button>
            </div>
            <div className="border-t border-destructive/30 pt-4">
              <div className="font-display font-bold text-lg text-destructive">Delete account</div>
              <div className="text-sm text-muted-foreground mt-1 mb-3">Permanent. Cannot be undone. All records permanently destroyed.</div>
              <Button variant="outline" className="btn-sharp border-destructive text-destructive h-11" data-testid="danger-delete">Delete account</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <EnterpriseUpsellModal open={apiUpsellOpen} onOpenChange={setApiUpsellOpen} trigger="api" />
    </div>
  );
}
