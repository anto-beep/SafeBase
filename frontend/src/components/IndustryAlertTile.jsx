/**
 * IndustryAlertTile — per-industry "headline alert" tile for the owner dashboard.
 * Industries: hospitality (temperature), transport (fatigue), healthcare (AHPRA).
 *
 * Reads from /api/dashboard/widget/{temp-alert|fatigue-alert|ahpra-expiry}
 * and falls back to a calm empty state when the user has no data yet.
 *
 * Used by HospitalityOwnerDashboard, TransportOwnerDashboard, HealthcareOwnerDashboard.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import {
  Thermometer, Truck, Stethoscope, Warning, CheckCircle, Clock, ArrowRight,
} from "@phosphor-icons/react";

const CONFIG = {
  hospitality: {
    endpoint: "/dashboard/widget/temp-alert",
    accent: "#F59E0B",
    label: "Temperature monitoring",
    cta: { label: "Open Food Safety", to: "/dashboard/food-safety" },
    icon: Thermometer,
  },
  transport: {
    endpoint: "/dashboard/widget/fatigue-alert",
    accent: "#0DC4B5",
    label: "Driver fatigue (24h)",
    cta: { label: "Open Fleet & CoR", to: "/dashboard/fleet" },
    icon: Truck,
  },
  healthcare: {
    endpoint: "/dashboard/widget/ahpra-expiry",
    accent: "#2196A6",
    label: "AHPRA registrations",
    cta: { label: "Open clinicians", to: "/dashboard/team" },
    icon: Stethoscope,
  },
};

export default function IndustryAlertTile({ industry }) {
  const cfg = CONFIG[industry];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cfg) return;
    setLoading(true);
    api.get(cfg.endpoint)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [cfg]);

  if (!cfg) return null;

  const Icon = cfg.icon;

  return (
    <section
      className="border-2 border-ink bg-background p-6"
      data-testid={`industry-alert-tile-${industry}`}
      style={{ borderColor: cfg.accent }}
    >
      <header className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: cfg.accent }}>
            <Icon size={22} weight="duotone" className="text-ink" />
          </div>
          <div>
            <div className="label-eyebrow" style={{ color: cfg.accent }}>/ {cfg.label}</div>
            <div className="font-display font-black text-xl tracking-tight mt-0.5">
              {industry === "hospitality" && "Temperature alerts"}
              {industry === "transport" && "Fatigue alerts"}
              {industry === "healthcare" && "AHPRA renewals"}
            </div>
          </div>
        </div>
        <Link
          to={cfg.cta.to}
          className="text-xs font-mono uppercase tracking-widest hover:underline whitespace-nowrap"
          data-testid={`industry-alert-tile-${industry}-cta`}
        >
          {cfg.cta.label} <ArrowRight className="inline -mt-0.5" size={12} weight="bold" />
        </Link>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground py-6">Loading…</div>
      ) : !data ? (
        <div className="text-sm text-muted-foreground py-6">Couldn't load the data right now — please refresh.</div>
      ) : (
        <Body industry={industry} data={data} accent={cfg.accent} />
      )}
    </section>
  );
}

function Body({ industry, data, accent }) {
  if (industry === "hospitality") return <HospitalityBody data={data} accent={accent} />;
  if (industry === "transport")   return <TransportBody   data={data} accent={accent} />;
  if (industry === "healthcare")  return <HealthcareBody  data={data} accent={accent} />;
  return null;
}

/* ───────────────────── Hospitality body ───────────────────── */
function HospitalityBody({ data, accent }) {
  const overdue = data.overdue_today || [];
  const oor = data.out_of_range || [];
  const allOk = overdue.length === 0 && oor.length === 0 && data.total_units > 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Units tracked" value={data.total_units} />
        <Stat label="Overdue today" value={overdue.length} highlight={overdue.length > 0} />
        <Stat label="Out of range" value={oor.length} danger={oor.length > 0} />
      </div>
      {data.total_units === 0 && (
        <EmptyState
          accent={accent}
          message="No temperature units configured yet."
          cta="Add units"
          to="/dashboard/food-safety"
        />
      )}
      {allOk && (
        <div className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm flex items-center gap-2" data-testid="industry-alert-tile-hospitality-ok">
          <CheckCircle weight="fill" className="text-emerald-600 shrink-0" />
          All units logged on time and within range today.
        </div>
      )}
      {oor.slice(0, 3).map((u) => (
        <Row
          key={`oor-${u.name}`}
          testid={`industry-alert-tile-hospitality-oor-${u.name.replace(/\s+/g, '-')}`}
          severity="danger"
          title={`${u.name} — ${u.last_temp_c}°C`}
          subtitle={`Target ${u.target_range}`}
        />
      ))}
      {overdue.slice(0, 3).map((u) => (
        <Row
          key={`overdue-${u.name}`}
          testid={`industry-alert-tile-hospitality-overdue-${u.name.replace(/\s+/g, '-')}`}
          severity="warn"
          title={`${u.name} — log overdue today`}
          subtitle={u.last_reading_at ? `Last reading ${formatRelative(u.last_reading_at)}` : "No reading on record"}
        />
      ))}
    </div>
  );
}

/* ───────────────────── Transport body ───────────────────── */
function TransportBody({ data, accent }) {
  const exceeding = data.exceeding || [];
  const approaching = data.approaching || [];
  const allOk = exceeding.length === 0 && approaching.length === 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Approaching cap (≥85%)" value={approaching.length} highlight={approaching.length > 0} />
        <Stat label="Exceeding fatigue cap" value={exceeding.length} danger={exceeding.length > 0} />
      </div>
      {allOk && (
        <div className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm flex items-center gap-2" data-testid="industry-alert-tile-transport-ok">
          <CheckCircle weight="fill" className="text-emerald-600 shrink-0" />
          No drivers approaching their fatigue cap in the last 24 hours.
        </div>
      )}
      {exceeding.map((d) => (
        <Row
          key={`ex-${d.driver_id}`}
          testid={`industry-alert-tile-transport-ex-${d.driver_id}`}
          severity="danger"
          title={`${d.name} — ${d.hours_24h}h / ${d.cap_hours}h (${d.scheme})`}
          subtitle={`${d.pct}% of fatigue cap · stop scheduling immediately`}
        />
      ))}
      {approaching.map((d) => (
        <Row
          key={`ap-${d.driver_id}`}
          testid={`industry-alert-tile-transport-ap-${d.driver_id}`}
          severity="warn"
          title={`${d.name} — ${d.hours_24h}h / ${d.cap_hours}h (${d.scheme})`}
          subtitle={`${d.pct}% of fatigue cap · review next trip`}
        />
      ))}
    </div>
  );
}

/* ───────────────────── Healthcare body ───────────────────── */
function HealthcareBody({ data, accent }) {
  const soon = data.expiring_soon || [];
  const expired = data.expired || [];
  const allOk = soon.length === 0 && expired.length === 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Expiring in 60 days" value={soon.length} highlight={soon.length > 0} />
        <Stat label="Already expired" value={expired.length} danger={expired.length > 0} />
      </div>
      {allOk && (
        <div className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm flex items-center gap-2" data-testid="industry-alert-tile-healthcare-ok">
          <CheckCircle weight="fill" className="text-emerald-600 shrink-0" />
          Every AHPRA registration is current and not due to renew in the next 60 days.
        </div>
      )}
      {expired.slice(0, 4).map((c) => (
        <Row
          key={`exp-${c.clinician_id}`}
          testid={`industry-alert-tile-healthcare-exp-${c.clinician_id}`}
          severity="danger"
          title={`${c.name} — ${c.profession}`}
          subtitle={`${c.registration_number || ""} · EXPIRED ${Math.abs(c.days_left)} day${Math.abs(c.days_left) === 1 ? "" : "s"} ago`}
        />
      ))}
      {soon.slice(0, 4).map((c) => (
        <Row
          key={`soon-${c.clinician_id}`}
          testid={`industry-alert-tile-healthcare-soon-${c.clinician_id}`}
          severity={c.days_left <= 14 ? "danger" : "warn"}
          title={`${c.name} — ${c.profession}`}
          subtitle={`${c.registration_number || ""} · ${c.days_left} day${c.days_left === 1 ? "" : "s"} to renewal`}
        />
      ))}
    </div>
  );
}

/* ───────────────────── Shared sub-components ───────────────────── */
function Stat({ label, value, highlight = false, danger = false }) {
  const color = danger ? "text-red-600" : highlight ? "text-amber-600" : "text-ink";
  return (
    <div className="border border-border bg-muted/40 px-3 py-2">
      <div className="label-eyebrow text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-display font-black text-2xl tracking-tight mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function Row({ severity, title, subtitle, testid }) {
  const styles = {
    danger: "border-red-300 bg-red-50",
    warn:   "border-amber-300 bg-amber-50",
  };
  const Icon = severity === "danger" ? Warning : Clock;
  const iconColor = severity === "danger" ? "text-red-600" : "text-amber-600";
  return (
    <div className={`border ${styles[severity]} px-3 py-2 flex items-start gap-2`} data-testid={testid}>
      <Icon weight="fill" className={`${iconColor} shrink-0 mt-0.5`} size={16} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold leading-tight">{title}</div>
        <div className="text-xs text-muted-foreground leading-snug mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}

function EmptyState({ accent, message, cta, to }) {
  return (
    <div className="border border-dashed border-border px-4 py-6 text-center">
      <div className="text-sm text-muted-foreground">{message}</div>
      <Link to={to} className="inline-block mt-3 text-xs font-mono uppercase tracking-widest hover:underline" style={{ color: accent }}>
        {cta} <ArrowRight className="inline -mt-0.5" size={12} weight="bold" />
      </Link>
    </div>
  );
}

function formatRelative(iso) {
  try {
    const d = new Date(iso);
    const diffH = Math.round((Date.now() - d.getTime()) / 36e5);
    if (diffH < 1) return "less than an hour ago";
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.round(diffH / 24)}d ago`;
  } catch { return iso; }
}
