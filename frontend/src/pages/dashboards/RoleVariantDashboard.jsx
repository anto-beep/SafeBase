import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Thermometer, ClipboardText, FirstAidKit, Truck, Warning, ShieldWarning, GraduationCap, ArrowRight, Sparkle } from "@phosphor-icons/react";

/**
 * Role-variant industry dashboards (Part 3 of the multi-industry brief).
 *
 * These are tighter, focused dashboards for specific (industry × role)
 * combinations — Food Safety Supervisor, Dispatcher, Healthcare Manager.
 * Each one prioritises the dominant widget for that role and hides
 * everything they don't need.
 */

const VARIANTS = {
  food_safety_supervisor: {
    label: "Food Safety Supervisor",
    icon: <Thermometer weight="fill" />,
    accent: "#7C1D3F",
    dominant_widget: "temperature",
    score_label: "Food Safety Score",
    sub_pillars: ["Temperature", "HACCP", "Allergen", "Cleaning", "Staff certs"],
    urgent_actions: ["Outstanding temperature checks", "Out-of-range items requiring resolution", "Certifications expiring this week"],
    quick_links: [
      { label: "Today's checks", to: "/dashboard/document-library", icon: ClipboardText },
      { label: "HACCP plans", to: "/dashboard/document-library/haccp_plan", icon: ClipboardText },
      { label: "Generate AI doc", to: "/dashboard/ai-docs", icon: Sparkle },
    ],
  },
  dispatcher: {
    label: "Dispatcher / Scheduler",
    icon: <Truck weight="fill" />,
    accent: "#0DC4B5",
    dominant_widget: "dispatch",
    score_label: "CoR Compliance",
    sub_pillars: ["Fatigue", "Speed", "Mass", "Load", "Vehicle", "Scheduling"],
    urgent_actions: ["Drivers approaching hour limits", "Drivers with missed declarations", "Vehicles out of service"],
    quick_links: [
      { label: "Driver fitness forms", to: "/dashboard/document-library", icon: ClipboardText },
      { label: "Pre-trip checks", to: "/dashboard/inspections", icon: ClipboardText },
      { label: "CoR Plan", to: "/dashboard/ai-docs", icon: Sparkle },
    ],
  },
  healthcare_manager: {
    label: "Healthcare Manager",
    icon: <FirstAidKit weight="fill" />,
    accent: "#2196A6",
    dominant_widget: "credentials",
    score_label: "Care Quality",
    sub_pillars: ["AHPRA", "NDIS Screening", "Vaccination", "First Aid", "Manual Handling"],
    urgent_actions: ["AHPRA expiring this week", "NDIS Worker Screening lapses", "Manual handling incident pattern alerts"],
    quick_links: [
      { label: "Credentials", to: "/dashboard/licences", icon: ClipboardText },
      { label: "Clinical events", to: "/dashboard/incidents", icon: Warning },
      { label: "ACQSC Pack", to: "/dashboard/ai-docs", icon: Sparkle },
    ],
  },
};


export function RoleVariantDashboard({ variant_key }) {
  const cfg = VARIANTS[variant_key];
  const { user } = useAuth();
  const [score, setScore] = useState(null);
  useEffect(() => {
    api.get("/compliance/score").then((r) => setScore(r.data)).catch(() => {});
  }, []);

  if (!cfg) return null;
  return (
    <div className="space-y-6 p-6 lg:p-10" data-testid={`variant-dashboard-${variant_key}`} style={{ minHeight: "100vh" }}>
      <header className="border-b-4 pb-4" style={{ borderColor: cfg.accent }}>
        <div className="label-eyebrow flex items-center gap-2">
          <span style={{ color: cfg.accent }}>{cfg.icon}</span>
          <span>{cfg.label} · {user?.industry}</span>
        </div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-2">G'day, {user?.name?.split(" ")[0]}.</h1>
        <p className="text-muted-foreground mt-1">Today's focus is {cfg.score_label.toLowerCase()}.</p>
      </header>

      {/* Dominant widget */}
      <section className="border-2 p-6 bg-background" style={{ borderColor: cfg.accent }} data-testid={`dominant-${variant_key}`}>
        <div className="label-eyebrow text-muted-foreground">/ Today's priority</div>
        <h2 className="font-display text-2xl font-black tracking-tight mt-2">
          {cfg.dominant_widget === "temperature" && "Temperature checks"}
          {cfg.dominant_widget === "dispatch" && "Today's dispatch"}
          {cfg.dominant_widget === "credentials" && "Credential status"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {cfg.dominant_widget === "temperature" && "Real-time temperature status of all configured equipment. Open Document Library → Temperature Logs to enter today's reading."}
          {cfg.dominant_widget === "dispatch" && "All scheduled trips today, with fatigue + declaration + pre-trip status per driver. Block trips with unresolved compliance issues."}
          {cfg.dominant_widget === "credentials" && "All staff with credential status — AHPRA, screening, vaccination. Critical-gap flags shown in red."}
        </p>
        <div className="flex gap-2 mt-4">
          {cfg.quick_links.map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.to} to={q.to}>
                <Button className="btn-sharp h-10 bg-ink text-white hover:bg-authority uppercase tracking-widest text-xs" data-testid={`variant-link-${q.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Icon size={14} className="mr-2" />
                  {q.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Compliance score */}
      <section className="border border-border p-6 bg-background" data-testid={`score-${variant_key}`}>
        <div className="label-eyebrow text-muted-foreground">/ {cfg.score_label}</div>
        <div className="flex items-center gap-4 mt-2">
          <div className="font-display text-5xl font-black" style={{ color: cfg.accent }}>{score?.overall_score ?? "--"}</div>
          <div className="text-xs text-muted-foreground">{score?.status || "loading…"}</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
          {cfg.sub_pillars.map((p, i) => (
            <div key={i} className="bg-muted p-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p}</div>
              <div className="font-display text-xl font-black mt-1">{score?.sub_scores?.[p.toLowerCase().replace(/\s/g, "_")] ?? "—"}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Urgent actions */}
      <section className="border border-border p-6 bg-background" data-testid={`urgent-${variant_key}`}>
        <div className="flex items-center gap-2">
          <ShieldWarning weight="fill" className="text-red-600" size={20} />
          <h2 className="font-display text-xl font-black tracking-tight">Urgent actions</h2>
        </div>
        <ul className="mt-4 space-y-2">
          {cfg.urgent_actions.map((a, i) => (
            <li key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
              <span className="text-sm">{a}</span>
              <ArrowRight size={14} className="text-muted-foreground" />
            </li>
          ))}
        </ul>
      </section>

      <div className="text-center text-xs text-muted-foreground italic">Tip: this dashboard is built for the {cfg.label.toLowerCase()} role. Owner can see the full picture.</div>
    </div>
  );
}

export default RoleVariantDashboard;
