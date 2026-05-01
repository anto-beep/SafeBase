import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CaretDown, Check, Plus } from "@phosphor-icons/react";

const INDUSTRY_META = {
  trades:      { label: "Trades & Construction", emoji: "🔨", accent: "bg-[#FFCC00]" },
  hospitality: { label: "Hospitality",            emoji: "🍽️", accent: "bg-[#0F4C5C]" },
  transport:   { label: "Transport & Logistics",  emoji: "🚛", accent: "bg-[#0DC4B5]" },
  healthcare:  { label: "Healthcare & Aged Care", emoji: "🏥", accent: "bg-[#2196A6]" },
  retail:      { label: "Retail",                 emoji: "🛍️", accent: "bg-[#A855F7]" },
};
const ALL_INDUSTRIES = ["trades", "hospitality", "transport", "healthcare", "retail"];

/**
 * Compact industry switcher — appears in the dashboard sidebar header for users
 * with `active_industries.length > 1`. Single-industry users see a static
 * read-only badge instead. Owners/managers can also "Add another industry"
 * which pushes onto the active list and immediately switches.
 *
 * Switching writes the new `industry` to the user record via PATCH and reloads
 * the page so all dashboards, score sub-bars, nav labels, AND feature flags
 * pick up the new context cleanly.
 */
export default function IndustrySwitcher() {
  const { user, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  if (!user) return null;
  const current = user.industry || "trades";
  const active = user.active_industries || [current];
  const meta = INDUSTRY_META[current] || INDUSTRY_META.trades;
  const isMulti = active.length > 1;
  const canManage = ["owner", "manager", "safety_lead"].includes(user.role_variant || "owner");

  const switchTo = async (industry) => {
    if (industry === current || busy) return;
    setBusy(true);
    try {
      const r = await api.patch("/auth/me/industry", { industry });
      setUser({
        ...user,
        industry: r.data.industry,
        active_industries: r.data.active_industries,
        primary_industry: r.data.primary_industry,
      });
      setOpen(false);
      // Reload so dashboards, scoring + feature flags re-fetch cleanly.
      window.location.assign("/dashboard");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Industry switch failed", err);
    } finally {
      setBusy(false);
    }
  };

  const addIndustry = async (industry) => {
    if (busy || active.includes(industry)) return;
    setBusy(true);
    try {
      const newActive = [...active, industry];
      await api.put("/auth/me/industries", {
        active_industries: newActive,
        primary_industry: user.primary_industry || current,
      });
      // Then switch to the newly-added industry to confirm context.
      await switchTo(industry);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Add industry failed", err);
      setBusy(false);
    }
  };

  const inactiveOptions = ALL_INDUSTRIES.filter((i) => !active.includes(i));

  return (
    <div className="relative px-3 py-3 border-b border-white/10" data-testid="industry-switcher">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!isMulti && !canManage}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-none ${
          isMulti || canManage ? "hover:bg-white/5 cursor-pointer" : "cursor-default"
        }`}
        data-testid="industry-switcher-button"
      >
        <span className={`w-2 h-2 rounded-full ${meta.accent}`} />
        <span className="text-white text-xs font-bold uppercase tracking-wide">{meta.emoji} {meta.label}</span>
        {(isMulti || canManage) && <CaretDown size={12} className="ml-auto text-white/50" />}
      </button>
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-ink border border-white/20 shadow-lg" data-testid="industry-switcher-dropdown">
          {active.map((slug) => {
            const m = INDUSTRY_META[slug] || {};
            const isCurrent = slug === current;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => switchTo(slug)}
                disabled={busy}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left ${
                  isCurrent ? "bg-warning text-ink font-bold" : "text-white/80 hover:bg-white/5"
                }`}
                data-testid={`industry-option-${slug}`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
                {isCurrent && <Check size={12} className="ml-auto" />}
              </button>
            );
          })}
          {canManage && inactiveOptions.length > 0 && (
            <>
              <div className="border-t border-white/10" />
              {!showAdd ? (
                <button
                  type="button"
                  onClick={() => setShowAdd(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:bg-white/5"
                  data-testid="add-industry-toggle"
                >
                  <Plus size={12} /> Add another industry
                </button>
              ) : (
                inactiveOptions.map((slug) => {
                  const m = INDUSTRY_META[slug] || {};
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => addIndustry(slug)}
                      disabled={busy}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-warning hover:bg-white/5"
                      data-testid={`add-industry-${slug}`}
                    >
                      <Plus size={11} /> Add {m.label}
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
