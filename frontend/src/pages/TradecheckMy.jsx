import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";

const TRADES = ["plumbing", "electrical", "carpentry", "concreting", "roofing", "painting", "hvac", "tiling", "landscaping"];
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];

export default function TradecheckMy() {
  const [listing, setListing] = useState({});
  const [saving, setSaving] = useState(false);
  const [credSpec, setCredSpec] = useState({ industry: "trades", credentials: [] });
  const [validation, setValidation] = useState(null);

  useEffect(() => {
    api.get("/tradecheck/my").then((r) => setListing(r.data || {})).catch(() => {});
    api.get("/tradecheck/required-credentials").then((r) => setCredSpec(r.data)).catch(() => {});
  }, []);

  const toggleCred = (code) => {
    const held = new Set(listing.licences || []);
    if (held.has(code)) held.delete(code); else held.add(code);
    setListing({ ...listing, licences: Array.from(held) });
    // re-run validation against the saved spec
    api.post("/tradecheck/validate-listing", { credentials: Array.from(held) })
      .then((r) => setValidation(r.data))
      .catch(() => setValidation(null));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.post("/tradecheck/listings", listing);
      setListing(r.data);
      toast.success("Listing saved");
    } catch (e2) { toast.error(e2?.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const verify = async () => {
    if (!listing.listing_id) return;
    await api.post(`/tradecheck/verify/${listing.listing_id}`);
    const r = await api.get("/tradecheck/my");
    setListing(r.data || {});
    toast.success("Verified — listing is now live on the marketplace");
  };

  return (
    <div className="space-y-6" data-testid="tradecheck-my-page">
      <div className="border-b border-border pb-6">
        <div className="label-eyebrow">/ TradeCheck</div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-1">My marketplace listing.</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">Showcase your compliance to principal contractors and homeowners. Verified businesses get premium placement on <a href="/tradecheck" className="underline">tradecheck</a>.</p>
      </div>

      {listing.status === "verified" && (
        <div className="bg-emerald-600 text-white p-4 flex items-center gap-3 border border-emerald-700">
          <ShieldCheck weight="fill" size={24} />
          <div>
            <div className="font-bold">Verified & live</div>
            <div className="text-xs">Your listing appears in the TradeCheck marketplace.</div>
          </div>
        </div>
      )}

      <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background border border-border p-6">
        <div><Label className="label-eyebrow">Business name</Label><Input value={listing.business_name || ""} onChange={(e) => setListing({ ...listing, business_name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" required data-testid="tc-f-bizname" /></div>
        <div><Label className="label-eyebrow">ABN</Label><Input value={listing.abn || ""} onChange={(e) => setListing({ ...listing, abn: e.target.value })} className="mt-2 h-11 rounded-none border-ink" data-testid="tc-f-abn" /></div>
        <div>
          <Label className="label-eyebrow">Trade</Label>
          <Select value={listing.trade || ""} onValueChange={(v) => setListing({ ...listing, trade: v })}>
            <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="tc-f-trade"><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>{TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="label-eyebrow">State</Label>
          <Select value={listing.state || ""} onValueChange={(v) => setListing({ ...listing, state: v })}>
            <SelectTrigger className="mt-2 h-11 rounded-none border-ink" data-testid="tc-f-state"><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="label-eyebrow">Years trading</Label><Input type="number" value={listing.years_trading || ""} onChange={(e) => setListing({ ...listing, years_trading: Number(e.target.value) })} className="mt-2 h-11 rounded-none border-ink" /></div>
        <div><Label className="label-eyebrow">Team size</Label><Input type="number" value={listing.team_size || ""} onChange={(e) => setListing({ ...listing, team_size: Number(e.target.value) })} className="mt-2 h-11 rounded-none border-ink" /></div>
        <div className="md:col-span-2"><Label className="label-eyebrow">Description</Label><Textarea rows={3} value={listing.description || ""} onChange={(e) => setListing({ ...listing, description: e.target.value })} className="mt-2 rounded-none border-ink" /></div>
        <div><Label className="label-eyebrow">Contact email</Label><Input type="email" value={listing.contact_email || ""} onChange={(e) => setListing({ ...listing, contact_email: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
        <div><Label className="label-eyebrow">Contact phone</Label><Input value={listing.contact_phone || ""} onChange={(e) => setListing({ ...listing, contact_phone: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>

        <div className="md:col-span-2 flex gap-2 justify-end pt-4 border-t border-border">
          <Button type="submit" disabled={saving} className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="tc-save-btn">{saving ? "Saving…" : "Save listing"}</Button>
          {listing.listing_id && listing.status !== "verified" && (
            <Button type="button" onClick={verify} className="btn-sharp h-12 bg-warning text-ink hover:bg-warning/90" data-testid="tc-verify-btn"><Sparkle className="mr-2" />Request verification</Button>
          )}
        </div>
      </form>

      {/* Industry-aware credential checklist (SafeCheck) — replaces the
          one-size-fits-all White Card / Trade Licence assumptions of the
          old TradeCheck. Hospitality operators see RSA + Food Safety
          Supervisor; healthcare sees AHPRA + NDIS screen + manual handling;
          transport sees HR licence + fatigue management; retail sees
          induction + lone-worker briefing. */}
      <div className="bg-background border border-border p-6" data-testid="safecheck-credentials-panel">
        <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="label-eyebrow">SafeCheck · {credSpec.industry} credentials</div>
            <h2 className="font-display text-2xl font-black tracking-tight mt-1">Credential checklist.</h2>
            <p className="text-sm text-muted-foreground mt-1">Tick every credential your business holds. Missing required items will block verification.</p>
          </div>
          {validation && (
            <div className={`px-4 py-2 text-xs font-bold ${validation.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`} data-testid="safecheck-coverage-badge">
              {validation.coverage_pct}% covered{validation.ok ? " · ready" : ` · ${validation.missing_required.length} missing`}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {credSpec.credentials.map((c) => {
            const held = (listing.licences || []).includes(c.code);
            return (
              <label key={c.code} className={`flex items-start gap-3 p-3 border cursor-pointer ${held ? "bg-emerald-50 border-emerald-600" : "border-border hover:bg-muted"}`} data-testid={`safecheck-cred-${c.code}`}>
                <input type="checkbox" checked={held} onChange={() => toggleCred(c.code)} className="mt-1" data-testid={`safecheck-cred-cb-${c.code}`} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-ink">{c.label}</div>
                  <div className="text-[10px] uppercase tracking-wide font-bold mt-1">
                    {c.required ? <span className="text-red-600">Required</span> : <span className="text-muted-foreground">Recommended</span>}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
