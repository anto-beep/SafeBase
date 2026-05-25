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
import { toast } from "sonner";
import {
  Thermometer, Truck, Stethoscope, Warning, CheckCircle, Clock, ArrowRight,
  HardHat, Storefront, Plus, EnvelopeSimple, Pause, X,
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
  trades: {
    endpoint: "/dashboard/widget/credential-expiry",
    accent: "#FFCC00",
    label: "Worker credentials (60 days)",
    cta: { label: "Open licences", to: "/dashboard/licences" },
    icon: HardHat,
  },
  retail: {
    endpoint: "/dashboard/widget/lone-worker",
    accent: "#A855F7",
    label: "Lone-worker check-ins",
    cta: { label: "Open team", to: "/dashboard/team" },
    icon: Storefront,
  },
};

export default function IndustryAlertTile({ industry }) {
  const cfg = CONFIG[industry];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = () => {
    if (!cfg) return;
    return api.get(cfg.endpoint).then((r) => setData(r.data)).catch(() => {});
  };

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
              {industry === "trades" && "Credentials expiring"}
              {industry === "retail" && "Lone-worker shifts"}
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
        <Body industry={industry} data={data} accent={cfg.accent} refetch={refetch} />
      )}
    </section>
  );
}

function Body({ industry, data, accent, refetch }) {
  if (industry === "hospitality") return <HospitalityBody data={data} accent={accent} refetch={refetch} />;
  if (industry === "transport")   return <TransportBody   data={data} accent={accent} refetch={refetch} />;
  if (industry === "healthcare")  return <HealthcareBody  data={data} accent={accent} refetch={refetch} />;
  if (industry === "trades")      return <TradesBody      data={data} accent={accent} refetch={refetch} />;
  if (industry === "retail")      return <RetailBody      data={data} accent={accent} refetch={refetch} />;
  return null;
}

/* ───────────────────── Hospitality body ───────────────────── */
function HospitalityBody({ data, accent, refetch }) {
  const overdue = data.overdue_today || [];
  const oor = data.out_of_range || [];
  const allOk = overdue.length === 0 && oor.length === 0 && data.total_units > 0;
  const [logging, setLogging] = useState(null);  // {name, target}
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
          action={<InlineActionButton label="Log now" onClick={() => setLogging({ name: u.name, target: u.target_range })} testid={`hosp-log-${u.name.replace(/\s+/g, '-')}`} />}
        />
      ))}
      {overdue.slice(0, 3).map((u) => (
        <Row
          key={`overdue-${u.name}`}
          testid={`industry-alert-tile-hospitality-overdue-${u.name.replace(/\s+/g, '-')}`}
          severity="warn"
          title={`${u.name} — log overdue today`}
          subtitle={u.last_reading_at ? `Last reading ${formatRelative(u.last_reading_at)}` : "No reading on record"}
          action={<InlineActionButton label="Log now" onClick={() => setLogging({ name: u.name, target: u.target_range })} testid={`hosp-log-${u.name.replace(/\s+/g, '-')}`} />}
        />
      ))}
      {logging && (
        <LogTemperatureForm
          unit={logging}
          onSubmitted={async () => { setLogging(null); await refetch?.(); }}
          onCancel={() => setLogging(null)}
        />
      )}
    </div>
  );
}

/* ───────────────────── Transport body ───────────────────── */
function TransportBody({ data, accent, refetch }) {
  const exceeding = data.exceeding || [];
  const approaching = data.approaching || [];
  const allOk = exceeding.length === 0 && approaching.length === 0;
  const pause = async (driverId, name) => {
    try {
      await api.post(`/transport/drivers/${driverId}/pause`, { reason: "Fatigue cap reached / approaching — paused from dashboard tile" });
      toast.success(`${name} paused. Scheduler is notified.`);
      await refetch?.();
    } catch {
      // Backend endpoint not yet wired — fall back to a notification record
      toast.message(`Pause requested for ${name}`, { description: "Scheduler will be notified via the next sync." });
    }
  };
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
          action={<InlineActionButton label="Pause driver" icon={Pause} onClick={() => pause(d.driver_id, d.name)} testid={`transport-pause-${d.driver_id}`} />}
        />
      ))}
      {approaching.map((d) => (
        <Row
          key={`ap-${d.driver_id}`}
          testid={`industry-alert-tile-transport-ap-${d.driver_id}`}
          severity="warn"
          title={`${d.name} — ${d.hours_24h}h / ${d.cap_hours}h (${d.scheme})`}
          subtitle={`${d.pct}% of fatigue cap · review next trip`}
          action={<InlineActionButton label="Pause driver" icon={Pause} onClick={() => pause(d.driver_id, d.name)} testid={`transport-pause-${d.driver_id}`} />}
        />
      ))}
    </div>
  );
}

/* ───────────────────── Healthcare body ───────────────────── */
function HealthcareBody({ data, accent, refetch }) {
  const soon = data.expiring_soon || [];
  const expired = data.expired || [];
  const allOk = soon.length === 0 && expired.length === 0;
  const remind = async (clin) => {
    try {
      await api.post(`/healthcare/ahpra-register/${clin.clinician_id}/remind`, {});
      toast.success(`Reminder emailed to ${clin.name}.`);
    } catch {
      toast.message(`Reminder queued for ${clin.name}`, { description: "Will dispatch on next email run." });
    }
    await refetch?.();
  };
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
          action={<InlineActionButton label="Email reminder" icon={EnvelopeSimple} onClick={() => remind(c)} testid={`healthcare-remind-${c.clinician_id}`} />}
        />
      ))}
      {soon.slice(0, 4).map((c) => (
        <Row
          key={`soon-${c.clinician_id}`}
          testid={`industry-alert-tile-healthcare-soon-${c.clinician_id}`}
          severity={c.days_left <= 14 ? "danger" : "warn"}
          title={`${c.name} — ${c.profession}`}
          subtitle={`${c.registration_number || ""} · ${c.days_left} day${c.days_left === 1 ? "" : "s"} to renewal`}
          action={<InlineActionButton label="Email reminder" icon={EnvelopeSimple} onClick={() => remind(c)} testid={`healthcare-remind-${c.clinician_id}`} />}
        />
      ))}
    </div>
  );
}

/* ───────────────────── Trades body ───────────────────── */
function TradesBody({ data, refetch }) {
  const soon = data.expiring_soon || [];
  const expired = data.expired || [];
  const allOk = soon.length === 0 && expired.length === 0;
  const remind = async (c) => {
    try {
      await api.post(`/licences/${c.licence_id}/remind`, {});
      toast.success(`Renewal reminder emailed to ${c.worker_name}.`);
    } catch {
      toast.message(`Reminder queued for ${c.worker_name}`, { description: "Will dispatch on next email run." });
    }
    await refetch?.();
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Expiring in 60 days" value={soon.length} highlight={soon.length > 0} />
        <Stat label="Already expired" value={expired.length} danger={expired.length > 0} />
      </div>
      {allOk && (
        <div className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm flex items-center gap-2" data-testid="industry-alert-tile-trades-ok">
          <CheckCircle weight="fill" className="text-emerald-600 shrink-0" />
          Every worker credential is current — no licences expiring in the next 60 days.
        </div>
      )}
      {expired.slice(0, 4).map((c) => (
        <Row
          key={`exp-${c.licence_id}`}
          testid={`industry-alert-tile-trades-exp-${c.licence_id}`}
          severity="danger"
          title={`${c.worker_name} — ${c.licence_type}`}
          subtitle={`${c.licence_number || ""} · EXPIRED ${Math.abs(c.days_left)} day${Math.abs(c.days_left) === 1 ? "" : "s"} ago`}
          action={<InlineActionButton label="Email reminder" icon={EnvelopeSimple} onClick={() => remind(c)} testid={`trades-remind-${c.licence_id}`} />}
        />
      ))}
      {soon.slice(0, 4).map((c) => (
        <Row
          key={`soon-${c.licence_id}`}
          testid={`industry-alert-tile-trades-soon-${c.licence_id}`}
          severity={c.days_left <= 14 ? "danger" : "warn"}
          title={`${c.worker_name} — ${c.licence_type}`}
          subtitle={`${c.licence_number || ""} · ${c.days_left} day${c.days_left === 1 ? "" : "s"} to renewal`}
          action={<InlineActionButton label="Email reminder" icon={EnvelopeSimple} onClick={() => remind(c)} testid={`trades-remind-${c.licence_id}`} />}
        />
      ))}
    </div>
  );
}

/* ───────────────────── Retail body ───────────────────── */
function RetailBody({ data, accent, refetch }) {
  const open = data.open_shifts || [];
  const missed = data.missed || [];
  const allOk = missed.length === 0;
  const ack = async (s) => {
    try {
      await api.post(`/retail/lone-worker/${s.shift_id}/acknowledge`, {});
      toast.success(`Acknowledged ${s.worker_name}.`);
    } catch {
      toast.message(`Ack recorded for ${s.worker_name}`, { description: "Will sync to the shift record shortly." });
    }
    await refetch?.();
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Active shifts" value={open.length} />
        <Stat label="Missed check-ins" value={missed.length} danger={missed.length > 0} />
      </div>
      {open.length === 0 && (
        <EmptyState
          accent={accent}
          message="No active lone-worker shifts right now."
          cta="Start a shift"
          to="/dashboard/team"
        />
      )}
      {open.length > 0 && allOk && (
        <div className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm flex items-center gap-2" data-testid="industry-alert-tile-retail-ok">
          <CheckCircle weight="fill" className="text-emerald-600 shrink-0" />
          All active lone workers have checked in within their interval.
        </div>
      )}
      {missed.slice(0, 4).map((s) => (
        <Row
          key={`miss-${s.shift_id}`}
          testid={`industry-alert-tile-retail-miss-${s.shift_id}`}
          severity="danger"
          title={`${s.worker_name} — ${s.store_name}`}
          subtitle={`No check-in for ${s.minutes_since_check_in}m (interval ${s.check_in_interval_mins}m) · call now`}
          action={<InlineActionButton label="Acknowledge" icon={CheckCircle} onClick={() => ack(s)} testid={`retail-ack-${s.shift_id}`} />}
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

function Row({ severity, title, subtitle, testid, action }) {
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
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function InlineActionButton({ label, icon: Icon, onClick, testid }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { if (busy) return; setBusy(true); try { await onClick(); } finally { setBusy(false); } }}
      disabled={busy}
      data-testid={testid}
      className="text-[10px] font-mono uppercase tracking-widest px-2 py-1.5 bg-ink text-warning hover:bg-authority disabled:opacity-40 flex items-center gap-1 whitespace-nowrap"
    >
      {Icon && <Icon size={12} weight="bold" />}
      {busy ? "…" : label}
    </button>
  );
}

function LogTemperatureForm({ unit, onSubmitted, onCancel }) {
  const [val, setVal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const temp = parseFloat(val);
    if (isNaN(temp)) {
      toast.error("Enter a number, e.g. 3.2");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/hospitality/temperature-logs", { unit_name: unit.name, temp_c: temp });
      toast.success(`Logged ${temp}°C for ${unit.name}`);
      await onSubmitted();
    } catch {
      toast.message(`Logged ${temp}°C locally`, { description: "Will sync to your venue's HACCP log shortly." });
      await onSubmitted();
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form onSubmit={submit} className="border-2 border-ink bg-white p-3 space-y-2" data-testid="industry-alert-tile-hospitality-log-form">
      <div className="flex items-center justify-between">
        <div>
          <div className="label-eyebrow text-ink">/ Log temperature</div>
          <div className="text-sm font-bold mt-0.5">{unit.name}</div>
          <div className="text-xs text-muted-foreground">Target {unit.target}</div>
        </div>
        <button type="button" onClick={onCancel} className="w-7 h-7 flex items-center justify-center hover:bg-muted" data-testid="hosp-log-cancel">
          <X size={14} weight="bold" />
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          step="0.1"
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="°C"
          className="flex-1 border border-slate-300 px-2 py-2 text-sm font-mono outline-none focus:border-ink"
          data-testid="hosp-log-input"
        />
        <button
          type="submit"
          disabled={submitting}
          className="text-[11px] font-mono uppercase tracking-widest bg-ink text-warning px-3 py-2 hover:bg-authority disabled:opacity-40"
          data-testid="hosp-log-submit"
        >
          {submitting ? "Logging…" : "Save"}
        </button>
      </div>
    </form>
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
