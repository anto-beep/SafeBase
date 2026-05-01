import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Palette, UploadSimple, Globe, EnvelopeSimple, ChatsCircle, Eye, Monitor, DeviceMobile,
  CheckCircle, Warning, FloppyDisk, Sparkle, HardHat, Bell
} from "@phosphor-icons/react";
import { toast } from "sonner";

const MAX_LOGO_KB = 500; // 500KB ceiling for base64-in-Mongo sanity

function fileToDataUrl(file, maxKB = MAX_LOGO_KB) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("no file"));
    if (file.size > maxKB * 1024) return reject(new Error(`File too large (> ${maxKB}KB)`));
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

function UploadTile({ label, hint, value, onChange, testid }) {
  return (
    <div className="border border-border p-4 bg-background">
      <Label className="label-eyebrow">{label}</Label>
      <div className="mt-2 flex items-center gap-4">
        <div className="w-28 h-16 border border-dashed border-border bg-muted flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt={label} className="max-w-full max-h-full object-contain" data-testid={`${testid}-preview`} />
          ) : (
            <span className="text-[10px] text-muted-foreground">No file</span>
          )}
        </div>
        <div className="flex-1">
          <label className="btn-sharp inline-flex items-center gap-2 border-2 border-ink px-3 py-2 cursor-pointer hover:bg-ink hover:text-white transition-colors text-sm">
            <UploadSimple weight="bold" />
            <span>Upload</span>
            <input
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/x-icon"
              className="hidden"
              data-testid={testid}
              onChange={async (e) => {
                try {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await fileToDataUrl(file);
                  onChange(url);
                } catch (err) {
                  toast.error(err.message || "Upload failed");
                }
              }}
            />
          </label>
          {value && (
            <button
              className="ml-2 text-xs underline text-muted-foreground"
              onClick={() => onChange(null)}
              data-testid={`${testid}-clear`}
            >Remove</button>
          )}
          <p className="text-xs text-muted-foreground mt-2">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function ColourField({ label, hint, value, onChange, testid }) {
  return (
    <div>
      <Label className="label-eyebrow">{label}</Label>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-16 border-2 border-ink cursor-pointer rounded-none"
          data-testid={`${testid}-picker`}
        />
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-none border-ink font-mono uppercase"
          data-testid={`${testid}-hex`}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}

function DashboardPreview({ branding, view }) {
  // Lightweight live preview — keeps styling independent from the real app shell
  // so designers can see exactly how clients will experience the rebrand.
  const name = branding.partner_name || "Your Brand";
  const logo = branding.logo_light || branding.logo_primary || branding.logo_dark;
  const primary = branding.primary_colour || "#0A0A0A";
  const secondary = branding.secondary_colour || "#FFCC00";

  if (view === "email") {
    return (
      <div className="border-2 border-border bg-white text-[#0A0A0A] p-6" data-testid="preview-email">
        <div className="flex items-center gap-2 pb-4 border-b border-border">
          {logo ? <img src={logo} alt={name} className="h-8" /> : <div className="font-display font-black text-lg" style={{ color: primary }}>{name}</div>}
        </div>
        <div className="py-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: primary }}>Licence expiry alert</div>
          <h3 className="font-bold text-lg mt-1">A worker credential expires in 14 days</h3>
          <p className="text-sm text-muted-foreground mt-2">Hi John — this is a courtesy alert from {name}. Tap below to review and renew.</p>
          <a className="inline-block mt-4 px-4 py-2 text-white text-sm font-bold" style={{ background: primary }}>Review credential →</a>
        </div>
        <div className="border-t border-border pt-4 text-xs text-muted-foreground whitespace-pre-line">
          {branding.email_signature || `${name} · Managed on SafeBase`}
        </div>
      </div>
    );
  }

  const width = view === "mobile" ? "max-w-[360px]" : "w-full";
  return (
    <div className={`${width} mx-auto border-2 border-border bg-background overflow-hidden`} data-testid={`preview-${view}`}>
      {/* Preview header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: primary, color: "#fff" }}>
        <div className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt={name} className="h-6" />
          ) : (
            <>
              <div className="w-6 h-6 flex items-center justify-center" style={{ background: secondary }}>
                <HardHat size={14} weight="fill" style={{ color: primary }} />
              </div>
              <span className="font-display font-black text-sm tracking-tight">{name.toUpperCase()}</span>
            </>
          )}
        </div>
        <Bell size={16} />
      </div>
      {/* Preview body */}
      <div className="p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">/ Dashboard</div>
        <h4 className="font-display font-black text-xl" style={{ color: primary }}>G'day, Alex.</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-border p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Compliance</div>
            <div className="font-display font-black text-2xl">82</div>
          </div>
          <div className="border border-border p-3" style={{ background: secondary }}>
            <div className="text-[10px] uppercase tracking-widest">Active SWMS</div>
            <div className="font-display font-black text-2xl">14</div>
          </div>
        </div>
        <button
          className="w-full text-sm font-bold py-2 text-white"
          style={{ background: primary }}
        >Generate SWMS</button>
        <a className="text-xs underline" style={{ color: secondary === "#FFCC00" ? primary : secondary }}>View all reports →</a>
      </div>
      {branding.show_powered_by && (
        <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground text-center">
          Powered by SafeBase
        </div>
      )}
    </div>
  );
}

export default function PartnerBranding() {
  const [b, setB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dnsBusy, setDnsBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [previewView, setPreviewView] = useState("desktop");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/partner/branding");
      setB(r.data);
    } catch { toast.error("Failed to load branding"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const patch = (k, v) => setB((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put("/partner/branding", b);
      setB(r.data);
      toast.success("Branding saved — changes take effect immediately for all clients.");
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
    setSaving(false);
  };

  const verifyDns = async () => {
    if (!b?.subdomain) return toast.error("Enter a subdomain first");
    setDnsBusy(true);
    try {
      const r = await api.post("/partner/branding/verify-dns", { subdomain: b.subdomain });
      patch("custom_domain_status", r.data.status);
      toast.success(r.data.message);
    } catch (e) { toast.error(e?.response?.data?.detail || "DNS verify failed"); }
    setDnsBusy(false);
  };

  const testEmail = async () => {
    setEmailBusy(true);
    try {
      const r = await api.post("/partner/branding/test-email");
      toast.success(`Test email queued to ${r.data.to}`);
    } catch { toast.error("Test email failed"); }
    setEmailBusy(false);
  };

  const level2 = useMemo(() => (b?.partnership_level || 1) >= 2, [b]);

  if (loading || !b) return <div className="py-12 text-center text-muted-foreground">Loading branding…</div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" data-testid="partner-branding-page">
      {/* LEFT — form */}
      <div className="xl:col-span-2 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
          <div>
            <div className="label-eyebrow">/ Partner Portal · Branding</div>
            <h1 className="font-display text-4xl font-black tracking-tighter mt-1">White-label configuration</h1>
            <p className="text-muted-foreground mt-2 max-w-xl">Configure how your clients experience the platform under your consultancy's brand. Changes take effect immediately for every business in your network.</p>
          </div>
          <Button
            onClick={save}
            disabled={saving}
            className="btn-sharp h-12 bg-ink text-white hover:bg-authority"
            data-testid="branding-save-btn"
          ><FloppyDisk className="mr-2" weight="fill" />{saving ? "Saving…" : "Save changes"}</Button>
        </div>

        <Tabs defaultValue="identity" className="space-y-4">
          <TabsList className="bg-muted rounded-none border border-border p-1 h-auto flex flex-wrap gap-1">
            <TabsTrigger value="identity" className="rounded-none" data-testid="tab-identity"><Sparkle className="mr-2" />Identity</TabsTrigger>
            <TabsTrigger value="colours" className="rounded-none" data-testid="tab-colours"><Palette className="mr-2" />Colours</TabsTrigger>
            <TabsTrigger value="domain" className="rounded-none" data-testid="tab-domain"><Globe className="mr-2" />Custom Domain</TabsTrigger>
            <TabsTrigger value="messages" className="rounded-none" data-testid="tab-messages"><ChatsCircle className="mr-2" />Messages</TabsTrigger>
            <TabsTrigger value="email" className="rounded-none" data-testid="tab-email"><EnvelopeSimple className="mr-2" />Email</TabsTrigger>
          </TabsList>

          {/* 1 — IDENTITY */}
          <TabsContent value="identity" className="space-y-4">
            <div className="bg-background border border-border p-6 space-y-4">
              <div>
                <Label className="label-eyebrow">Partner business name</Label>
                <Input
                  value={b.partner_name || ""}
                  onChange={(e) => patch("partner_name", e.target.value)}
                  placeholder="e.g. Apex WHS Consulting"
                  className="mt-2 h-11 rounded-none border-ink"
                  data-testid="field-partner-name"
                />
                <p className="text-xs text-muted-foreground mt-1">Displayed to your clients instead of "SafeBase".</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UploadTile
                  label="Primary logo"
                  hint="PNG or SVG · min 200px wide · transparent background preferred. Shown in the app header for every client of your partnership."
                  value={b.logo_primary}
                  onChange={(v) => patch("logo_primary", v)}
                  testid="upload-logo-primary"
                />
                <UploadTile
                  label="Favicon"
                  hint="PNG, ICO or SVG · 32×32 or 64×64 px. Shown in the browser tab."
                  value={b.favicon}
                  onChange={(v) => patch("favicon", v)}
                  testid="upload-favicon"
                />
                <UploadTile
                  label="Dark-version logo (for light backgrounds)"
                  hint="Use darker colours that read on white — for light-theme dashboards and printouts."
                  value={b.logo_dark}
                  onChange={(v) => patch("logo_dark", v)}
                  testid="upload-logo-dark"
                />
                <UploadTile
                  label="Light-version logo (for dark backgrounds)"
                  hint="Use lighter colours for navigation bars, dark hero sections, etc."
                  value={b.logo_light}
                  onChange={(v) => patch("logo_light", v)}
                  testid="upload-logo-light"
                />
              </div>
            </div>
          </TabsContent>

          {/* 2 — COLOURS */}
          <TabsContent value="colours" className="space-y-4">
            <div className="bg-background border border-border p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <ColourField
                label="Primary brand colour"
                hint="Buttons · active nav items · headings."
                value={b.primary_colour}
                onChange={(v) => patch("primary_colour", v)}
                testid="field-primary-colour"
              />
              <ColourField
                label="Secondary brand colour"
                hint="Accents · links · badges."
                value={b.secondary_colour}
                onChange={(v) => patch("secondary_colour", v)}
                testid="field-secondary-colour"
              />
              <div className="md:col-span-2 border-t border-border pt-4 text-xs text-muted-foreground">
                <strong>Tip:</strong> Use a dark primary (e.g. #1B3A5C) with a bright secondary (e.g. #FFCC00) for maximum legibility. The live preview on the right updates instantly.
              </div>
            </div>
          </TabsContent>

          {/* 3 — CUSTOM DOMAIN */}
          <TabsContent value="domain" className="space-y-4">
            <div className="bg-background border border-border p-6 space-y-4">
              {!level2 && (
                <div className="border-2 border-warning bg-warning/20 p-4 flex items-start gap-3" data-testid="level2-gate">
                  <Warning className="text-ink shrink-0 mt-0.5" weight="fill" />
                  <div>
                    <div className="font-bold">Custom domain requires Level 2 partnership</div>
                    <div className="text-sm">Upgrade your partnership tier to host the client dashboard on your own domain. <a href="/partners" className="underline">Learn more →</a></div>
                  </div>
                </div>
              )}
              <div>
                <Label className="label-eyebrow">Subdomain</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={b.subdomain || ""}
                    onChange={(e) => patch("subdomain", e.target.value.replace(/[^a-z0-9-]/gi, "").toLowerCase())}
                    placeholder="clients"
                    className="h-11 rounded-none border-ink w-40"
                    disabled={!level2}
                    data-testid="field-subdomain"
                  />
                  <span className="text-sm text-muted-foreground">.yourconsultingbusiness.com.au</span>
                </div>
              </div>
              <div className="bg-muted border border-border p-4 text-xs font-mono">
                Add a CNAME record in your DNS settings pointing this subdomain to:<br />
                <strong className="text-sm">partners.safebase.com.au</strong><br />
                SSL certificate will be provisioned automatically within 24 hours of DNS resolving.
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 text-xs font-bold tracking-widest ${
                    b.custom_domain_status === "active" ? "bg-emerald-600 text-white" :
                    b.custom_domain_status === "pending" ? "bg-warning text-ink" :
                    "bg-muted text-muted-foreground"
                  }`}
                  data-testid="domain-status-badge"
                >
                  {(b.custom_domain_status || "not_configured").replace("_", " ").toUpperCase()}
                </span>
                <Button
                  onClick={verifyDns}
                  disabled={!level2 || dnsBusy || !b.subdomain}
                  className="btn-sharp bg-ink text-white hover:bg-authority h-10"
                  data-testid="verify-dns-btn"
                >{dnsBusy ? "Verifying…" : "Verify DNS"}</Button>
              </div>
            </div>
          </TabsContent>

          {/* 4 — CLIENT MESSAGES */}
          <TabsContent value="messages" className="space-y-4">
            <div className="bg-background border border-border p-6 space-y-4">
              <div>
                <Label className="label-eyebrow">Welcome message (shown to clients on first login)</Label>
                <Textarea
                  rows={3}
                  maxLength={200}
                  value={b.welcome_message || ""}
                  onChange={(e) => patch("welcome_message", e.target.value.slice(0, 200))}
                  placeholder={`Welcome to your WHS compliance platform, managed by ${b.partner_name || "[Partner Name]"}.`}
                  className="mt-2 rounded-none border-ink"
                  data-testid="field-welcome-message"
                />
                <div className="text-xs text-muted-foreground mt-1">{(b.welcome_message || "").length} / 200 characters</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-4">
                <div>
                  <Label className="label-eyebrow">Support contact name</Label>
                  <Input
                    value={b.support_contact_name || ""}
                    onChange={(e) => patch("support_contact_name", e.target.value)}
                    className="mt-2 h-11 rounded-none border-ink"
                    data-testid="field-support-name"
                  />
                </div>
                <div>
                  <Label className="label-eyebrow">Support email</Label>
                  <Input
                    type="email"
                    value={b.support_contact_email || ""}
                    onChange={(e) => patch("support_contact_email", e.target.value)}
                    className="mt-2 h-11 rounded-none border-ink"
                    data-testid="field-support-email"
                  />
                </div>
                <div>
                  <Label className="label-eyebrow">Support phone</Label>
                  <Input
                    value={b.support_contact_phone || ""}
                    onChange={(e) => patch("support_contact_phone", e.target.value)}
                    className="mt-2 h-11 rounded-none border-ink"
                    data-testid="field-support-phone"
                  />
                </div>
                <p className="md:col-span-3 text-xs text-muted-foreground">Clients see these details instead of SafeBase support.</p>
              </div>
              <div className="border-t border-border pt-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold">"Powered by SafeBase" footer</div>
                  <div className="text-xs text-muted-foreground">Hiding this is available on Level 2+ partnerships.</div>
                </div>
                <Switch
                  checked={!!b.show_powered_by}
                  disabled={!level2}
                  onCheckedChange={(v) => patch("show_powered_by", v)}
                  data-testid="toggle-powered-by"
                />
              </div>
            </div>
          </TabsContent>

          {/* 5 — EMAIL */}
          <TabsContent value="email" className="space-y-4">
            <div className="bg-background border border-border p-6 space-y-4">
              <UploadTile
                label="Email header logo (optional — uses primary logo if blank)"
                hint="A tighter crop of your logo optimised for email inboxes (max 600px wide)."
                value={b.email_header_logo}
                onChange={(v) => patch("email_header_logo", v)}
                testid="upload-email-header"
              />
              <div>
                <Label className="label-eyebrow">Email signature</Label>
                <Textarea
                  rows={3}
                  value={b.email_signature || ""}
                  onChange={(e) => patch("email_signature", e.target.value)}
                  placeholder={`${b.partner_name || "[Partner Name]"} | ${b.support_contact_phone || "[Phone]"} | [Website]\nManaged on SafeBase`}
                  className="mt-2 rounded-none border-ink"
                  data-testid="field-email-signature"
                />
                <p className="text-xs text-muted-foreground mt-1">Shown at the bottom of every system email sent to your clients.</p>
              </div>
              <div className="border-t border-border pt-4">
                <Button
                  onClick={testEmail}
                  disabled={emailBusy}
                  className="btn-sharp bg-ink text-white hover:bg-authority h-11"
                  data-testid="send-test-email-btn"
                ><EnvelopeSimple className="mr-2" weight="fill" />{emailBusy ? "Sending…" : "Send test email"}</Button>
                <p className="text-xs text-muted-foreground mt-2">Sends a sample licence-expiry alert email to your registered address — showing exactly what your clients will receive.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            onClick={save}
            disabled={saving}
            className="btn-sharp h-12 bg-ink text-white hover:bg-authority"
            data-testid="branding-save-btn-bottom"
          ><FloppyDisk className="mr-2" weight="fill" />{saving ? "Saving…" : "Save changes"}</Button>
        </div>
        <p className="text-xs text-muted-foreground text-right">Changes take effect immediately for all clients in your partner network.</p>
      </div>

      {/* RIGHT — live preview panel */}
      <div className="xl:col-span-1">
        <div className="xl:sticky xl:top-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="label-eyebrow flex items-center gap-2"><Eye />/ Live preview</div>
            <div className="inline-flex border-2 border-ink bg-background" data-testid="preview-toggle">
              <button
                onClick={() => setPreviewView("desktop")}
                className={`px-3 py-1 text-xs flex items-center gap-1 ${previewView === "desktop" ? "bg-ink text-warning" : "hover:bg-muted"}`}
                data-testid="preview-desktop-btn"
              ><Monitor size={14} /> Desktop</button>
              <button
                onClick={() => setPreviewView("mobile")}
                className={`px-3 py-1 text-xs flex items-center gap-1 border-l-2 border-ink ${previewView === "mobile" ? "bg-ink text-warning" : "hover:bg-muted"}`}
                data-testid="preview-mobile-btn"
              ><DeviceMobile size={14} /> Mobile</button>
              <button
                onClick={() => setPreviewView("email")}
                className={`px-3 py-1 text-xs flex items-center gap-1 border-l-2 border-ink ${previewView === "email" ? "bg-ink text-warning" : "hover:bg-muted"}`}
                data-testid="preview-email-btn"
              ><EnvelopeSimple size={14} /> Email</button>
            </div>
          </div>
          <DashboardPreview branding={b} view={previewView} />
          {b.show_powered_by === false && level2 && (
            <div className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle weight="fill" /> "Powered by SafeBase" footer hidden (Level 2+).</div>
          )}
        </div>
      </div>
    </div>
  );
}
