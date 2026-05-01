/**
 * IndustryDashboardPreview — interactive industry switcher on the homepage.
 *
 * Renders a tabbed mini-mockup of each industry's dashboard so visitors can
 * see SafeBase configures itself differently per industry — before signing up.
 * Uses the same colour palette as each industry's actual dashboard.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  HardHat, ChefHat, Truck, HeartStraight, ShoppingBag,
  Sparkle, Thermometer, ShieldCheck, IdentificationBadge, Warning, ArrowRight,
} from "@phosphor-icons/react";

const INDUSTRIES = [
  {
    slug: "trades", label: "Trades", icon: HardHat, accent: "#FFCC00",
    bg: "bg-[#0A1F44]", text: "text-white",
    cta: "Generate SWMS", primaryWidget: "Active SWMS",
    score: 92, scoreLabel: "Safety Compliance Score",
    subs: [
      { label: "Documents", v: 92, c: "#FFCC00" }, { label: "Incidents", v: 88, c: "#FFCC00" },
      { label: "Training", v: 95, c: "#FFCC00" }, { label: "Licences", v: 90, c: "#FFCC00" },
    ],
    alerts: [
      "White card expires in 14 days · Jamie L.",
      "SWMS revision due · Heights work — Site #4",
      "AI flagged: 2 incidents same hazard pattern",
    ],
  },
  {
    slug: "hospitality", label: "Hospitality", icon: ChefHat, accent: "#E87722",
    bg: "bg-[#5B2A0A]", text: "text-white",
    cta: "Create HACCP plan", primaryWidget: "Food Safety + WHS",
    score: 87, scoreLabel: "Safety + Food Safety",
    subs: [
      { label: "WHS", v: 90, c: "#E87722" }, { label: "Food Safety", v: 85, c: "#E87722" },
      { label: "Staff Certs", v: 92, c: "#E87722" }, { label: "Cleaning", v: 80, c: "#E87722" },
    ],
    alerts: [
      "Walk-in fridge above target · 3 hours ago",
      "RSA expires in 9 days · Mike T.",
      "Council inspection due in 6 weeks",
    ],
  },
  {
    slug: "transport", label: "Transport", icon: Truck, accent: "#0DC4B5",
    bg: "bg-[#0E3B3B]", text: "text-white",
    cta: "Generate CoR plan", primaryWidget: "Fleet & CoR",
    score: 81, scoreLabel: "WHS + CoR",
    subs: [
      { label: "WHS", v: 85, c: "#0DC4B5" }, { label: "Fatigue", v: 78, c: "#FF6B35" },
      { label: "Drivers", v: 82, c: "#0DC4B5" }, { label: "Fleet", v: 80, c: "#0DC4B5" },
    ],
    alerts: [
      "Driver fatigue at limit · HC-204",
      "Pre-trip overdue · ABC-123 (truck)",
      "MC licence expires in 21 days · Dean S.",
    ],
  },
  {
    slug: "healthcare", label: "Healthcare", icon: HeartStraight, accent: "#2196A6",
    bg: "bg-[#1E3A8A]", text: "text-white",
    cta: "Track AHPRA", primaryWidget: "Care Quality + AHPRA",
    score: 89, scoreLabel: "WHS + Care Quality",
    subs: [
      { label: "WHS", v: 90, c: "#2196A6" }, { label: "AHPRA", v: 95, c: "#4CAF8F" },
      { label: "Standards", v: 85, c: "#7C3AED" }, { label: "Screening", v: 88, c: "#2196A6" },
    ],
    alerts: [
      "AHPRA expires in 28 days · Dr P. Hughes",
      "NDIS screening renewal · Riley K.",
      "Standard 4 evidence overdue",
    ],
  },
  {
    slug: "retail", label: "Retail", icon: ShoppingBag, accent: "#A855F7",
    bg: "bg-[#4C1D95]", text: "text-white",
    cta: "Quick-induct casual", primaryWidget: "Inductions + Lone Worker",
    score: 84, scoreLabel: "Workplace Safety",
    subs: [
      { label: "Documents", v: 80, c: "#A855F7" }, { label: "Inductions", v: 75, c: "#E91E8C" },
      { label: "Credentials", v: 90, c: "#A855F7" }, { label: "Lone Worker", v: 100, c: "#0DC4B5" },
    ],
    alerts: [
      "3 casuals on roster not yet inducted",
      "Lone worker on shift: Sam T. · Store #2",
      "First aid expires in 12 days · Casey W.",
    ],
  },
];

export default function IndustryDashboardPreview() {
  const [active, setActive] = useState("trades");
  const ind = INDUSTRIES.find((i) => i.slug === active);

  return (
    <section className="border-b border-border" data-testid="industry-dashboard-preview">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* COPY */}
          <div className="lg:col-span-4">
            <div className="label-eyebrow mb-3">/ One platform · Five industries</div>
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">
              Preview your<br />dashboard.
            </h2>
            <p className="text-base text-muted-foreground mt-5 max-w-md">
              SafeBase configures itself completely for your industry. Tap a tab — see exactly what your team will see on day one.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {INDUSTRIES.map((i) => {
                const isActive = active === i.slug;
                return (
                  <button
                    key={i.slug}
                    onClick={() => setActive(i.slug)}
                    data-testid={`landing-preview-tab-${i.slug}`}
                    className={`flex items-center gap-3 px-4 py-3 text-left border-2 transition-all ${isActive ? "border-ink" : "border-transparent hover:border-ink/30"}`}
                    style={isActive ? { background: i.accent, color: "#0A0A0A" } : {}}
                  >
                    <i.icon weight="fill" size={22} />
                    <span className="font-display font-black tracking-tight">{i.label}</span>
                    {isActive && <ArrowRight size={16} className="ml-auto" />}
                  </button>
                );
              })}
            </div>
            <Link to={`/register?industry=${active}`} className="inline-flex items-center gap-2 mt-6 font-display font-black underline" data-testid="landing-preview-cta">
              Try this dashboard live <ArrowRight />
            </Link>
          </div>

          {/* MOCKUP */}
          <div className="lg:col-span-8">
            <div className={`${ind.bg} ${ind.text} p-6 lg:p-8 transition-all duration-300`} style={{ borderLeft: `8px solid ${ind.accent}` }} data-testid={`landing-preview-mockup-${ind.slug}`}>
              {/* Mock top bar */}
              <div className="flex items-end justify-between flex-wrap gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="label-eyebrow" style={{ color: ind.accent }}>/ {ind.label} · Today</div>
                  <div className="font-display font-black text-2xl mt-1">G'day, Jamie. {ind.primaryWidget} ready.</div>
                </div>
                <button className="btn-sharp h-10 px-4 text-ink font-display font-black text-sm flex items-center gap-2" style={{ background: ind.accent }}>
                  <Sparkle weight="fill" size={14} /> {ind.cta.toUpperCase()}
                </button>
              </div>

              {/* Mock score + sub-bars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
                <div className="md:col-span-1 bg-black/20 p-5">
                  <div className="label-eyebrow opacity-60">/ {ind.scoreLabel}</div>
                  <div className="font-display font-black text-6xl mt-1" style={{ color: ind.accent }}>{ind.score}<span className="text-2xl opacity-60">/100</span></div>
                  <div className="text-xs opacity-70 mt-1">Audit ready · live</div>
                </div>
                <div className="md:col-span-2 bg-black/20 p-5 space-y-3">
                  {ind.subs.map((s) => (
                    <div key={s.label}>
                      <div className="flex items-end justify-between text-xs">
                        <span className="opacity-80">{s.label}</span>
                        <span className="font-display font-black">{s.v}</span>
                      </div>
                      <div className="h-2 bg-white/10 mt-1 overflow-hidden">
                        <div className="h-full transition-all duration-500" style={{ width: `${s.v}%`, background: s.c }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock AI alerts */}
              <div className="mt-5 bg-black/20 p-5">
                <div className="label-eyebrow opacity-60">/ AI alerts</div>
                <ul className="mt-3 space-y-2 text-sm">
                  {ind.alerts.map((a) => (
                    <li key={a} className="flex items-start gap-2 border-l-4 pl-3 py-1" style={{ borderColor: ind.accent }}>
                      <Warning size={14} className="shrink-0 mt-1 opacity-60" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
