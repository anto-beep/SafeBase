import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { CheckCircle, ArrowRight, Star, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";
import { INDUSTRY_PRICING, INDUSTRY_LIST } from "@/data/pricing.config";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Pricing() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialIndustry = INDUSTRY_LIST.includes(searchParams.get("industry"))
    ? searchParams.get("industry") : "trades";
  const [industry, setIndustry] = useState(initialIndustry);
  const [cycle, setCycle] = useState("monthly"); // monthly is the default per Iter44 spec (save-badge still visible in both states)
  const [loading, setLoading] = useState(null);
  const [mySubs, setMySubs] = useState([]);
  const cfg = INDUSTRY_PRICING[industry];

  // Iter58 — load existing per-industry subscriptions so we can swap CTAs.
  // We re-fetch whenever `user` flips truthy/falsy and on industry change so
  // the trial-banner state is always in sync with the auth context.
  useEffect(() => {
    if (!user) { setMySubs([]); return; }
    api.get("/billing/my-subscriptions")
      .then(r => setMySubs(r.data.subscriptions || []))
      .catch(() => setMySubs([]));
  }, [user]);

  const subForCurrentIndustry = useMemo(
    () => mySubs.find(s => s.industry === industry),
    [mySubs, industry]
  );

  // URL deep-link support — clicking a tab updates the URL.
  useEffect(() => {
    if (industry !== "trades") {
      setSearchParams({ industry }, { replace: true });
    } else if (searchParams.get("industry")) {
      const sp = new URLSearchParams(searchParams);
      sp.delete("industry");
      setSearchParams(sp, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry]);

  const tiers = useMemo(() => cfg.plan_names.map((name, idx) => ({
    name,
    price: cfg.prices[cycle][idx],
    monthly_display: cfg.prices.monthly[idx],
    annual_display: cfg.prices.annual[idx],
    annual_equivalent_monthly: cfg.prices.annual_equivalent_monthly?.[idx],
    annual_saving: cfg.prices.annual_saving?.[idx],
    user_limit: cfg.user_limits?.[idx],
    slug: cfg.slugs[cycle][idx],
    features: cfg.features[idx + 1] || [],
    highlight: idx === 2,
    enterprise: idx === 3,
    badge: idx === 2 ? "MOST POPULAR" : idx === 3 ? "FOR LARGER OPERATIONS" : null,
  })), [cfg, cycle]);

  const startCheckout = async (tier, slug) => {
    if (!user) {
      window.location.href = `/register?industry=${industry}`;
      return;
    }
    setLoading(slug);
    try {
      // Iter58 — use v2 per-industry endpoint so the right industry sub row is created.
      const r = await api.post("/billing/checkout-industry", {
        industry,
        tier,
        cycle,
        origin_url: window.location.origin,
      });
      window.location.href = r.data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Checkout failed");
    } finally {
      setLoading(null);
    }
  };

  const startTrial = async () => {
    if (!user) {
      window.location.href = `/register?industry=${industry}`;
      return;
    }
    setLoading("trial");
    try {
      await api.post("/billing/start-trial", { industry });
      toast.success(`14-day ${cfg.label} trial started — opening dashboard…`);
      setTimeout(() => { window.location.href = "/dashboard"; }, 700);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start trial");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-background text-ink" data-testid="pricing-page">
      <MarketingNav />

      {/* INDUSTRY TABS */}
      <section className="border-b border-border" data-testid="pricing-industry-tabs">
        <div className="max-w-6xl mx-auto px-6 pt-10">
          <div className="label-eyebrow text-muted-foreground">/ Industry pricing</div>
          <div className="mt-3 flex flex-wrap gap-1 border-b-2 border-ink">
            {INDUSTRY_LIST.map((slug) => {
              const c = INDUSTRY_PRICING[slug];
              const active = industry === slug;
              return (
                <button
                  key={slug}
                  onClick={() => setIndustry(slug)}
                  data-testid={`pricing-tab-${slug}`}
                  className={`px-5 py-3 text-sm font-display font-black tracking-tight uppercase border-b-4 -mb-0.5 transition-all ${active ? "text-ink" : "text-muted-foreground hover:text-ink border-transparent"}`}
                  style={active ? { borderColor: c.accent } : {}}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="label-eyebrow" style={{ color: cfg.accent }}>/ {cfg.label} pricing · all prices + GST</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter mt-3" data-testid="pricing-headline">
              Pricing Built for Your Industry.
            </h1>
            <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
              Every industry has different compliance obligations. Our pricing reflects the depth of what each industry requires. 14-day free trial. No credit card required.
            </p>

            {/* Cycle toggle — monthly is default (Iter44). Active segment adopts the industry accent. */}
            <div className="inline-flex border-2 border-ink mt-8" data-testid="pricing-cycle-toggle" style={{ background: "var(--muted, #f5f5f5)" }}>
              <button
                onClick={() => setCycle("monthly")}
                className="px-6 py-3 font-display font-black tracking-tight transition-colors"
                style={cycle === "monthly" ? { background: cfg.accent, color: "#0A0A0A" } : {}}
                data-testid="pricing-cycle-monthly"
              >
                MONTHLY
              </button>
              <button
                onClick={() => setCycle("annual")}
                className="px-6 py-3 font-display font-black tracking-tight transition-colors"
                style={cycle === "annual" ? { background: cfg.accent, color: "#0A0A0A" } : {}}
                data-testid="pricing-cycle-annual"
              >
                ANNUAL <span className="text-xs opacity-80">(SAVE 2 MONTHS)</span>
              </button>
            </div>
          </div>

          {/* Iter58 — when logged in but NO sub for this industry, offer the free trial. */}
          {user && !subForCurrentIndustry && (
            <div
              className="mb-8 p-5 border-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between"
              style={{ borderColor: cfg.accent, background: `${cfg.accent}15` }}
              data-testid="pricing-trial-banner"
            >
              <div>
                <div className="text-xs font-mono uppercase tracking-widest" style={{ color: cfg.accent }}>/ 14-day free trial</div>
                <div className="font-display text-xl font-black tracking-tight mt-1">
                  Try {cfg.label} free for 14 days
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  One free trial per industry per email. After 14 days, choose any plan below.
                </p>
              </div>
              <Button
                onClick={startTrial}
                disabled={loading === "trial"}
                className="btn-sharp h-11 bg-ink text-white hover:bg-authority"
                data-testid="pricing-start-trial"
              >
                {loading === "trial" ? "Starting…" : "Start Free Trial"} <ArrowRight className="ml-2" />
              </Button>
            </div>
          )}

          {/* Iter58 — when an active sub exists for this industry, show a status banner. */}
          {user && subForCurrentIndustry && (
            <div
              className="mb-8 p-5 border-2 border-ink bg-ink text-white flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between"
              data-testid="pricing-status-banner"
            >
              <div>
                <div className="text-xs font-mono uppercase tracking-widest" style={{ color: cfg.accent }}>
                  / {subForCurrentIndustry.status === "trial" ? "trial · in progress" : "active subscription"}
                </div>
                <div className="font-display text-xl font-black tracking-tight mt-1">
                  {subForCurrentIndustry.status === "trial"
                    ? `${subForCurrentIndustry.trial_days_left ?? "—"} days left in your ${cfg.label} trial`
                    : `${subForCurrentIndustry.tier || "Active"} · ${subForCurrentIndustry.cycle || ""}`}
                </div>
              </div>
              <Link to="/dashboard/billing">
                <Button variant="outline" className="btn-sharp h-11 border-white text-white hover:bg-white hover:text-ink">
                  Manage subscription <ArrowRight className="ml-2" />
                </Button>
              </Link>
            </div>
          )}

          {/* TIER CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((t) => (
              <div
                key={t.name}
                data-testid={`pricing-tier-${t.name.replace(/\s+/g, "-").toLowerCase()}`}
                className={`bg-background border-2 p-6 flex flex-col ${t.highlight ? "border-ink ring-4" : "border-border"}`}
                style={t.highlight ? { boxShadow: `0 0 0 4px ${cfg.accent}` } : {}}
              >
                {t.badge && (
                  <span className="self-start text-[10px] font-bold tracking-widest px-2 py-1 mb-3" style={{ background: cfg.accent, color: "#0A0A0A" }}>
                    {t.badge}
                  </span>
                )}
                <div className="font-display font-black text-2xl tracking-tighter">{t.name}</div>
                {t.user_limit && <div className="text-xs font-mono text-muted-foreground mt-1">{t.user_limit}</div>}
                <div className="mt-3">
                  <span className="font-display font-black text-5xl tracking-tighter">A${t.price}</span>
                  <span className="text-sm text-muted-foreground"> /{cycle === "monthly" ? "mo" : "yr"} + GST</span>
                </div>
                {cycle === "annual" && t.annual_equivalent_monthly && (
                  <>
                    <div className="text-xs text-muted-foreground mt-1">A${t.monthly_display}/month + GST if billed monthly</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Equivalent to A${t.annual_equivalent_monthly}/month when billed annually</div>
                  </>
                )}
                {cycle === "monthly" && t.annual_display && (
                  <div className="text-xs text-muted-foreground mt-1">A${t.annual_display}/year + GST if billed annually</div>
                )}
                {t.annual_saving && (
                  <div
                    className="inline-block mt-2 text-[10px] font-bold px-2 py-1"
                    style={{ background: cfg.accent, color: "#0A0A0A" }}
                    data-testid={`pricing-save-badge-${t.name.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    Save A${t.annual_saving} + GST per year
                  </div>
                )}
                <ul className="mt-5 space-y-2 text-sm flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle weight="fill" size={16} className="shrink-0 mt-0.5" style={{ color: cfg.accent }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => {
                    const tier_only = t.slug.replace(/_(monthly|annual)$/, "");
                    startCheckout(tier_only, t.slug);
                  }}
                  disabled={loading === t.slug}
                  className="mt-6 btn-sharp h-12 bg-ink text-white hover:bg-authority"
                  data-testid={`pricing-cta-${t.name.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {loading === t.slug
                    ? "Redirecting…"
                    : !user
                      ? "Start Free Trial"
                      : subForCurrentIndustry?.status === "trial"
                        ? "Choose Plan"
                        : subForCurrentIndustry?.tier_slug === t.slug
                          ? "Current Plan"
                          : "Choose Plan"}
                  {(loading !== t.slug && !(subForCurrentIndustry?.status !== "trial" && subForCurrentIndustry?.tier_slug === t.slug)) && <ArrowRight className="ml-2" />}
                </Button>
              </div>
            ))}
          </div>

          {/* ROI BLOCK */}
          <div className="mt-16 bg-ink text-white p-8 lg:p-12 border-l-8" style={{ borderColor: cfg.accent }} data-testid="pricing-roi">
            <div className="label-eyebrow" style={{ color: cfg.accent }}>/ ROI · {cfg.label}</div>
            <h2 className="font-display text-3xl lg:text-5xl font-black tracking-tighter mt-3 max-w-3xl">
              {cfg.roi.headline}
            </h2>
            <p className="mt-4 text-white/70 text-lg max-w-3xl">{cfg.roi.body}</p>
          </div>

          {/* VALUE CALLOUT */}
          <div className="mt-8 bg-warning border-2 border-ink p-6" data-testid="pricing-value-callout">
            <div className="label-eyebrow">/ What's included</div>
            <p className="mt-2 text-base font-medium">{cfg.value_callout}</p>
          </div>

          {/* TRUST FOOTER */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-12">
            <div className="flex items-start gap-3"><ShieldCheck size={28} weight="duotone" className="shrink-0" /><div><div className="font-display font-bold">14-day free trial</div><div className="text-sm text-muted-foreground">Full access. No credit card required.</div></div></div>
            <div className="flex items-start gap-3"><CheckCircle size={28} weight="duotone" className="shrink-0" /><div><div className="font-display font-bold">Cancel anytime</div><div className="text-sm text-muted-foreground">Self-serve. No phone calls.</div></div></div>
          </div>

          <div className="mt-12 text-center">
            <Link to="/register" className="font-display font-black underline">Or start your trial directly →</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
