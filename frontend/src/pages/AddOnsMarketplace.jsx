import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plug, Check, Sparkle, ArrowRight } from "@phosphor-icons/react";

/**
 * In-app add-on marketplace (Settings → Add-ons).
 *
 * Lists only add-ons relevant to the user's active industry. Each card shows
 * label, blurb, price, included-in-plans hint, and Activate / Deactivate
 * toggle. Owner-only (POST returns 403 for non-owners).
 */
export default function AddOnsMarketplace() {
  const [available, setAvailable] = useState([]);
  const [active, setActive] = useState({});
  const [industry, setIndustry] = useState("trades");
  const [busy, setBusy] = useState(null);

  const refresh = async () => {
    try {
      const [av, ac] = await Promise.all([
        api.get("/addons/available"),
        api.get("/addons/active"),
      ]);
      setAvailable(av.data.addons || []);
      setIndustry(av.data.industry);
      const map = {};
      (ac.data.active || []).forEach((a) => { map[a.slug] = a; });
      setActive(map);
    } catch (e) { /* no-op */ }
  };
  useEffect(() => { refresh(); }, []);

  const toggle = async (slug, isActive) => {
    setBusy(slug);
    try {
      if (isActive) await api.post(`/addons/${slug}/deactivate`);
      else await api.post(`/addons/${slug}/activate`, {});
      await refresh();
    } catch (e) { /* no-op */ }
    finally { setBusy(null); }
  };

  const grouped = available.reduce((acc, a) => {
    const c = a.category || "other";
    (acc[c] = acc[c] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-8" data-testid="addons-marketplace">
      <div className="border-b border-border pb-4">
        <div className="label-eyebrow">Settings · Add-ons</div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-2">Extend SafeBase.</h1>
        <p className="text-muted-foreground mt-2">Add-ons relevant to your <span className="font-bold capitalize">{industry}</span> industry. Activate or deactivate any time — billing updates immediately.</p>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat} data-testid={`addons-cat-${cat}`}>
          <div className="label-eyebrow text-muted-foreground mb-3">{cat.replace(/_/g, " ")}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((a) => {
              const isActive = !!active[a.slug];
              const inc = (a.included_in_plans || []).length;
              return (
                <div key={a.slug} className={`border bg-background p-5 flex flex-col gap-3 ${isActive ? "border-emerald-600 ring-2 ring-emerald-100" : "border-border"}`} data-testid={`addon-${a.slug}`}>
                  <div className="flex items-start justify-between gap-2">
                    <Plug weight="bold" className="text-warning shrink-0" size={20} />
                    {isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-600 text-white px-2 py-0.5 flex items-center gap-1" data-testid={`addon-active-${a.slug}`}>
                        <Check size={10} weight="bold" /> Active
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-black tracking-tight">{a.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{a.blurb}</p>
                  </div>
                  {a.tiers && (
                    <div className="space-y-0.5 text-xs text-muted-foreground border-t border-border pt-2">
                      {a.tiers.map((t, i) => <div key={i}>{t.label} — A${t.price}/mo</div>)}
                    </div>
                  )}
                  {!a.tiers && a.monthly_price_aud > 0 && (
                    <div className="text-xs text-muted-foreground">A${a.monthly_price_aud}/month + GST</div>
                  )}
                  {a.one_time_aud && (
                    <div className="text-xs text-muted-foreground">A${a.one_time_aud} one-time + GST</div>
                  )}
                  {inc > 0 && (
                    <div className="text-[10px] text-emerald-700 flex items-center gap-1"><Sparkle size={10} weight="fill" /> Included in {inc} plan{inc > 1 ? "s" : ""}</div>
                  )}
                  {a.note && <div className="text-[10px] text-amber-700 italic">{a.note}</div>}
                  <Button
                    type="button"
                    onClick={() => toggle(a.slug, isActive)}
                    disabled={busy === a.slug}
                    className={`btn-sharp h-10 mt-auto uppercase tracking-widest text-xs ${
                      isActive ? "bg-muted text-ink hover:bg-muted/80" : "bg-ink text-white hover:bg-authority"
                    }`}
                    data-testid={`addon-toggle-${a.slug}`}
                  >
                    {busy === a.slug ? "…" : isActive ? "Deactivate" : <>Activate <ArrowRight size={12} className="ml-1" /></>}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
