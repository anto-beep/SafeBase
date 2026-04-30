import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash, CheckCircle, X, Sparkle, Lightning, ChartBar, Clock, Lightning as Bolt, TestTube } from "@phosphor-icons/react";
import { toast } from "sonner";

const SEVERITIES = ["minor", "moderate", "serious", "critical"];

// Map action → fields that need to be captured in the UI
function RecipeConfig({ recipe, config, setConfig }) {
  const action = recipe?.action;
  if (action === "slack" || action === "webhook_url") {
    return (
      <>
        <div>
          <Label className="label-eyebrow">{action === "slack" ? "Slack incoming webhook URL" : "Webhook URL"}</Label>
          <Input
            value={config.webhook_url || ""}
            onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
            className="mt-2 h-11 rounded-none border-ink font-mono text-sm"
            placeholder={action === "slack" ? "https://hooks.slack.com/services/..." : "https://hooks.zapier.com/..."}
            required
            data-testid="automation-cfg-url"
          />
        </div>
        {recipe?.config_schema?.severity_min && (
          <div>
            <Label className="label-eyebrow">Minimum severity to trigger</Label>
            <Select value={config.severity_min || "serious"} onValueChange={(v) => setConfig({ ...config, severity_min: v })}>
              <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="automation-cfg-severity"><SelectValue /></SelectTrigger>
              <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </>
    );
  }
  if (action === "resend_email") {
    return (
      <>
        <div>
          <Label className="label-eyebrow">Resend API key</Label>
          <Input type="password" value={config.api_key || ""} onChange={(e) => setConfig({ ...config, api_key: e.target.value })} className="mt-2 h-11 rounded-none border-ink font-mono text-sm" placeholder="re_..." required data-testid="automation-cfg-api-key" />
          <div className="text-xs text-muted-foreground mt-1">Get a free key from <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="underline">resend.com/api-keys</a>. Stored encrypted, never displayed.</div>
        </div>
        <div>
          <Label className="label-eyebrow">From email</Label>
          <Input type="email" value={config.from_email || ""} onChange={(e) => setConfig({ ...config, from_email: e.target.value })} className="mt-2 h-11 rounded-none border-ink" placeholder="safety@yourbusiness.com.au" required data-testid="automation-cfg-from" />
        </div>
        <div>
          <Label className="label-eyebrow">Subject</Label>
          <Input value={config.subject || recipe?.config_schema?.subject || ""} onChange={(e) => setConfig({ ...config, subject: e.target.value })} className="mt-2 h-11 rounded-none border-ink" data-testid="automation-cfg-subject" />
        </div>
      </>
    );
  }
  return null;
}

function CreateDialog({ recipe, onClose, onSaved }) {
  const [config, setConfig] = useState({ ...(recipe?.config_schema || {}) });
  const [label, setLabel] = useState(recipe?.title || "");
  const [saving, setSaving] = useState(false);

  // Remove schema-hint values (UI placeholders) before saving
  useEffect(() => {
    setConfig((c) => {
      const clean = { ...c };
      Object.keys(clean).forEach((k) => {
        if (typeof clean[k] === "string" && (clean[k].startsWith("https://") && clean[k].endsWith("..."))) delete clean[k];
        if (typeof clean[k] === "string" && clean[k].startsWith("re_") && clean[k].endsWith("...")) delete clean[k];
      });
      return clean;
    });
    // eslint-disable-next-line
  }, [recipe?.recipe_id]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/automations", {
        recipe_id: recipe.recipe_id,
        label,
        event: recipe.event,
        action: recipe.action,
        config,
      });
      toast.success("Automation enabled");
      onSaved();
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <DialogContent className="rounded-none max-w-lg border-ink max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{recipe?.icon}</span>
          <div>
            <DialogTitle className="font-display text-xl tracking-tight">{recipe?.title}</DialogTitle>
            <DialogDescription className="text-xs">{recipe?.desc}</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div>
          <Label className="label-eyebrow">Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-2 h-11 rounded-none border-ink" required data-testid="automation-cfg-label" />
        </div>
        <RecipeConfig recipe={recipe} config={config} setConfig={setConfig} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" className="btn-sharp border-ink" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving} className="btn-sharp bg-ink text-white" data-testid="automation-cfg-submit">{saving ? "Saving…" : "Enable"}</Button>
        </div>
      </form>
    </DialogContent>
  );
}

export default function Automations() {
  const [recipes, setRecipes] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [active, setActive] = useState(null);
  const [testingAll, setTestingAll] = useState(false);

  const load = async () => {
    const [r, a, an] = await Promise.all([
      api.get("/automations/recipes"),
      api.get("/automations"),
      api.get("/automations/analytics/summary"),
    ]);
    setRecipes(r.data);
    setAutomations(a.data);
    setAnalytics(an.data);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id, enabled) => { await api.patch(`/automations/${id}`, { enabled }); load(); };
  const remove = async (id) => { await api.delete(`/automations/${id}`); toast.success("Removed"); load(); };
  const test = async (id) => {
    const r = await api.post(`/automations/${id}/test`);
    if (r.data.success) toast.success(`Test succeeded · ${r.data.detail || ""}`);
    else toast.error(`Test failed: ${r.data.error || r.data.detail}`);
    load();
  };
  const testAll = async () => {
    if (!automations.some((a) => a.enabled)) { toast.info("No enabled automations to test"); return; }
    setTestingAll(true);
    try {
      const r = await api.post("/automations/test-all");
      const d = r.data;
      if (d.failed === 0 && d.success > 0) toast.success(`✅ ${d.success}/${d.total} automations passed`);
      else if (d.success === 0) toast.error(`${d.failed}/${d.total} automations failed`);
      else toast.warning(`${d.success} passed · ${d.failed} failed`);
      load();
    } finally { setTestingAll(false); }
  };

  const maxDaily = analytics ? Math.max(1, ...analytics.daily.map((d) => d.success + d.fail)) : 1;

  return (
    <div className="space-y-8" data-testid="automations-page">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ Automations</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Native integrations.<br />Zero middleman.</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">One-click recipes that connect SafeTradie to Slack, email, Google Sheets (via Zapier) and more. No subscription to Zapier needed for the common cases.</p>
        </div>
        <Button onClick={testAll} disabled={testingAll} className="btn-sharp h-12 bg-warning text-ink hover:bg-warning/90" data-testid="automation-test-all-btn">
          <TestTube className="mr-2" weight="duotone" />{testingAll ? "Testing…" : "Test all enabled"}
        </Button>
      </div>

      {/* ANALYTICS */}
      {analytics && (
        <section data-testid="automations-analytics">
          <div className="flex items-center gap-2 label-eyebrow mb-3"><ChartBar />Analytics · last 30 days</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="border border-border bg-background p-4" data-testid="analytics-total">
              <div className="label-eyebrow text-muted-foreground">Total runs</div>
              <div className="font-display text-3xl font-black mt-1">{analytics.total_runs_30d}</div>
            </div>
            <div className="border border-border bg-background p-4" data-testid="analytics-rate">
              <div className="label-eyebrow text-muted-foreground">Success rate</div>
              <div className="font-display text-3xl font-black mt-1">
                {analytics.success_rate}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">{analytics.success_count} ok · {analytics.failure_count} failed</div>
            </div>
            <div className="border border-border bg-background p-4" data-testid="analytics-top">
              <div className="label-eyebrow text-muted-foreground flex items-center gap-1"><Bolt size={12} weight="fill" className="text-warning" />Most active rule</div>
              {analytics.top_rules?.[0] ? (
                <>
                  <div className="font-display text-lg font-black mt-1 truncate">{analytics.top_rules[0].label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{analytics.top_rules[0].run_count} runs · {analytics.top_rules[0].action}</div>
                </>
              ) : (<div className="text-sm text-muted-foreground mt-2">—</div>)}
            </div>
            <div className="border border-border bg-background p-4" data-testid="analytics-slowest">
              <div className="label-eyebrow text-muted-foreground flex items-center gap-1"><Clock size={12} />Slowest endpoint</div>
              {analytics.slowest ? (
                <>
                  <div className="font-display text-lg font-black mt-1 truncate">{analytics.slowest.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{analytics.slowest.avg_ms}ms avg · {analytics.slowest.runs} runs</div>
                </>
              ) : (<div className="text-sm text-muted-foreground mt-2">—</div>)}
            </div>
          </div>

          {/* 30-day chart */}
          <div className="border-2 border-ink bg-background p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="label-eyebrow">Daily run volume</div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-600" />Success</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-600" />Failed</span>
              </div>
            </div>
            <div className="flex items-end gap-0.5 h-40" data-testid="analytics-chart">
              {analytics.daily.map((d) => {
                const total = d.success + d.fail;
                const heightPct = total === 0 ? 2 : Math.max(4, (total / maxDaily) * 100);
                const successPct = total === 0 ? 0 : (d.success / total) * 100;
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col justify-end group relative cursor-pointer"
                    title={`${d.date}: ${d.success} ok · ${d.fail} failed`}
                  >
                    <div className="flex flex-col bg-muted" style={{ height: `${heightPct}%`, minHeight: "2px" }}>
                      <div className="bg-red-600" style={{ height: `${100 - successPct}%` }} />
                      <div className="bg-emerald-600 flex-1" style={{ minHeight: d.success > 0 ? "2px" : "0" }} />
                    </div>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-ink text-white text-xs px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                      {d.date} · {total}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{analytics.daily[0]?.date}</span>
              <span>{analytics.daily[analytics.daily.length - 1]?.date}</span>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="label-eyebrow mb-4">/ Recipe gallery</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((r) => (
            <Dialog key={r.recipe_id}>
              <DialogTrigger asChild>
                <button onClick={() => setActive(r)} data-testid={`automation-recipe-${r.recipe_id}`} className="text-left border border-border bg-background p-5 hover:border-ink hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{r.icon}</span>
                    <span className="label-eyebrow bg-ink text-warning px-2 py-0.5">{r.action.toUpperCase()}</span>
                  </div>
                  <div className="font-display text-lg font-black tracking-tight mt-4">{r.title}</div>
                  <div className="text-sm text-muted-foreground mt-2">{r.desc}</div>
                  <div className="mt-4 text-xs text-ink font-bold">Trigger: <code className="font-mono bg-muted px-1.5 py-0.5">{r.event}</code></div>
                </button>
              </DialogTrigger>
              {active?.recipe_id === r.recipe_id && (
                <CreateDialog recipe={active} onClose={() => setActive(null)} onSaved={() => { setActive(null); load(); }} />
              )}
            </Dialog>
          ))}
        </div>
      </section>

      <section>
        <div className="label-eyebrow mb-4">/ My automations ({automations.length})</div>
        {automations.length === 0 ? (
          <div className="border-2 border-dashed border-border p-12 text-center">
            <Lightning size={36} weight="duotone" className="mx-auto opacity-40" />
            <div className="font-display text-lg font-bold mt-3">Nothing running yet</div>
            <div className="text-sm text-muted-foreground mt-1">Pick a recipe above to enable your first automation.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {automations.map((a) => (
              <div key={a.automation_id} className="border border-border bg-background p-5" data-testid={`automation-card-${a.automation_id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display text-lg font-black tracking-tight truncate">{a.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="bg-muted px-1.5 py-0.5 font-mono">{a.event}</span> → <strong className="ml-1">{a.action}</strong>
                    </div>
                  </div>
                  <Switch checked={a.enabled} onCheckedChange={(v) => toggle(a.automation_id, v)} data-testid={`automation-toggle-${a.automation_id}`} />
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs">
                  <span className="text-muted-foreground">
                    {a.run_count} runs
                    {a.last_error && <span className="ml-2 text-red-600">· last error: {a.last_error.slice(0, 30)}…</span>}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="btn-sharp border-ink" onClick={() => test(a.automation_id)} data-testid={`automation-test-${a.automation_id}`}>
                      <Sparkle className="mr-1" />Test
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(a.automation_id)} data-testid={`automation-del-${a.automation_id}`}><Trash /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
