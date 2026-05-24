import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowRight, FileText, Warning, IdentificationBadge, Users, ChartLineUp, Sparkle,
  Lightbulb, Siren, Clock, CheckCircle, Bell, Buildings, X, QrCode, ShieldCheck,
  GraduationCap, DeviceMobile, Lock,
} from "@phosphor-icons/react";
import EnterpriseUpsellModal from "@/components/EnterpriseUpsellModal";
import ComplianceInboxWidget from "@/components/ComplianceInboxWidget";
import RegulatoryDigestWidget from "@/components/RegulatoryDigestWidget";
import RegulatorPipelineWidget from "@/components/RegulatorPipelineWidget";
import useTier from "@/hooks/useTier";
import useIndustry from "@/hooks/useIndustry";
import WorkerDashboard from "./dashboards/WorkerDashboard";
import SafetyLeadDashboard from "./dashboards/SafetyLeadDashboard";
import SupervisorDashboard from "./dashboards/SupervisorDashboard";
import HospitalityOwnerDashboard from "./dashboards/HospitalityOwnerDashboard";
import TransportOwnerDashboard from "./dashboards/TransportOwnerDashboard";
import HealthcareOwnerDashboard from "./dashboards/HealthcareOwnerDashboard";
import RetailOwnerDashboard from "./dashboards/RetailOwnerDashboard";
import IndustryAlertTile from "@/components/IndustryAlertTile";

// Growing Business plan covers 5 active sites — 6+ triggers Enterprise upsell banner.
const GROWING_SITES_CAP = 5;

function ScoreRing({ value }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const color = value >= 80 ? "#0A0A0A" : value >= 50 ? "#FFCC00" : "#DC2626";
  return (
    <svg viewBox="0 0 140 140" className="w-40 h-40">
      <circle cx="70" cy="70" r={r} stroke="rgba(0,0,0,0.08)" strokeWidth="12" fill="none" />
      <circle cx="70" cy="70" r={r} stroke={color} strokeWidth="12" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="square" transform="rotate(-90 70 70)" />
      <text x="70" y="70" textAnchor="middle" dy="0.1em" className="font-display" fontSize="36" fontWeight="900" fill="#0A0A0A">{value}</text>
      <text x="70" y="92" textAnchor="middle" fontSize="9" letterSpacing="3" fontWeight="700" fill="#666">SCORE</text>
    </svg>
  );
}

const STAT_CARDS_BASE = [
  { key: "documents", labelDefault: "Active SWMS", icon: FileText, link: "/dashboard/documents" },
  { key: "incidents_open", labelDefault: "Open Incidents", icon: Warning, link: "/dashboard/incidents" },
  { key: "workers", labelDefault: "Workers", icon: Users, link: "/dashboard/workers" },
  { key: "licences_expiring_30d", labelDefault: "Licences expiring", icon: IdentificationBadge, link: "/dashboard/licences" },
];

const sevStyle = {
  near_miss: "bg-muted text-foreground",
  minor: "bg-warning text-ink",
  moderate: "bg-orange-500 text-white",
  serious: "bg-red-600 text-white",
  critical: "bg-ink text-warning",
};

import { RoleVariantDashboard } from "@/pages/dashboards/RoleVariantDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const variant = user?.role_variant || "owner";
  const industry = user?.industry || "trades";
  const role_title = (user?.role_title || "").toLowerCase();

  // Variant-specific dashboards (industry × role)
  if (industry === "hospitality" && (role_title === "food_safety_supervisor" || variant === "safety_lead")) {
    return <RoleVariantDashboard variant_key="food_safety_supervisor" />;
  }
  if (industry === "transport" && (role_title === "dispatcher" || role_title === "scheduler")) {
    return <RoleVariantDashboard variant_key="dispatcher" />;
  }
  if (industry === "healthcare" && variant === "manager") {
    return <RoleVariantDashboard variant_key="healthcare_manager" />;
  }

  if (variant === "worker") return <WorkerDashboard />;
  if (variant === "safety_lead") return <SafetyLeadDashboard />;
  if (variant === "supervisor") return <SupervisorDashboard />;
  // Owner variant — route by industry to industry-specific layouts
  if (industry === "hospitality") return <HospitalityOwnerDashboard />;
  if (industry === "transport") return <TransportOwnerDashboard />;
  if (industry === "healthcare") return <HealthcareOwnerDashboard />;
  if (industry === "retail") return <RetailOwnerDashboard />;
  return <OwnerDashboard />;  // Trades — preserved unchanged
}

function OwnerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [licences, setLicences] = useState([]);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [sitesUpsellOpen, setSitesUpsellOpen] = useState(false);
  const [competency, setCompetency] = useState(null);
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(
    typeof window !== "undefined" && localStorage.getItem("trial_banner_dismissed_v1") === "1"
  );
  const { isEnterprise, onTrial, trialDaysLeft, trialExpired, readOnly } = useTier();
  const { slug: industrySlug, term: industryTerm, meta: industryMeta } = useIndustry();

  // Industry-aware stat labels: Workers → Drivers / Team depending on vertical.
  const STAT_CARDS = STAT_CARDS_BASE.map((c) => {
    if (c.key === "workers") {
      return { ...c, label: industryTerm.worker_plural.replace(/^./, (ch) => ch.toUpperCase()) };
    }
    if (c.key === "documents") {
      return { ...c, label: industryTerm.primary_doc_label };
    }
    return { ...c, label: c.labelDefault };
  });

  // Stripe checkout return handler: poll billing status until paid (up to ~20s)
  useEffect(() => {
    const billing = params.get("billing");
    const sessionId = params.get("session_id");
    if (billing === "success" && sessionId) {
      let tries = 0;
      const poll = async () => {
        try {
          const r = await api.get(`/billing/status/${sessionId}`);
          if (r.data?.payment_status === "paid") {
            toast.success("🎉 Welcome aboard — your subscription is active!");
            params.delete("billing"); params.delete("session_id");
            setParams(params, { replace: true });
            return;
          }
          // if backend says pending (Stripe not ready yet), just retry
        } catch (e) { /* keep polling */ }
        if (tries < 10) { tries += 1; setTimeout(poll, 2000); }
        else toast.info("Payment is processing — we'll email you when it's confirmed.");
      };
      poll();
    } else if (billing === "cancelled") {
      toast.info("Checkout cancelled — you can upgrade anytime from Settings → Billing.");
      params.delete("billing");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    api.get("/compliance/score").then((r) => setData(r.data)).catch(() => {});
    api.get("/incidents").then((r) => setIncidents(r.data)).catch(() => {});
    api.get("/licences").then((r) => setLicences(r.data)).catch(() => {});
    api.get("/competency/dashboard").then((r) => setCompetency(r.data)).catch(() => {});
  }, []);

  const upcomingExpiries = [...licences]
    .filter((l) => l.days_until_expiry != null && l.days_until_expiry < 90)
    .sort((a, b) => a.days_until_expiry - b.days_until_expiry)
    .slice(0, 5);

  const recentIncidents = incidents.slice(0, 5);

  // Trigger 4: unique sites across incidents — surfaces Enterprise upsell when >5.
  const uniqueSites = Array.from(new Set(incidents.map((i) => (i.site || "").trim()).filter(Boolean)));
  const showSitesUpsell = !isEnterprise && uniqueSites.length > GROWING_SITES_CAP;

  const aiAlerts = [];
  const expSoon = licences.filter((l) => l.status === "expiring_soon" || l.status === "expired");
  if (expSoon.length) aiAlerts.push({ tone: "red", tag: "LICENCE", text: `${expSoon.length} worker credential(s) expired or expiring in 30 days — review and renew now.` });
  const criticalInc = incidents.filter((i) => i.severity === "critical" || i.severity === "serious");
  if (criticalInc.length) aiAlerts.push({ tone: "red", tag: "INCIDENT", text: `${criticalInc.length} serious/critical incident(s) logged — regulator notification may apply.` });
  const openInc = incidents.filter((i) => i.status === "open");
  if (openInc.length > 2) aiAlerts.push({ tone: "amber", tag: "PATTERN", text: `${openInc.length} incidents still open — close investigations within 14 days of occurrence.` });
  if (aiAlerts.length === 0) aiAlerts.push({ tone: "green", tag: "ALL CLEAR", text: "No flags right now. Keep generating SWMS and logging near-misses to maintain your score." });

  return (
    <div className="space-y-6" data-testid="dashboard-overview">
      {/* Trial expired — read-only banner (top priority, non-dismissable) */}
      {readOnly && (
        <div className="bg-red-700 text-white border-2 border-red-700 p-5 flex items-start gap-3" data-testid="trial-expired-banner">
          <Lock weight="fill" size={28} className="shrink-0 mt-1 text-warning" />
          <div className="flex-1">
            <div className="label-eyebrow text-warning">READ-ONLY MODE — TRIAL ENDED</div>
            <h2 className="font-display text-xl md:text-2xl font-black mt-1">
              Your free trial has ended. Pick a plan to keep building.
            </h2>
            <p className="text-sm text-white/80 mt-1">
              All your data is preserved — you can still view + export everything.
              Choose a plan to unlock create &amp; edit again.
            </p>
          </div>
          <Link to="/dashboard/settings?tab=billing" className="shrink-0">
            <Button className="btn-sharp bg-warning text-ink hover:bg-yellow-400 h-11" data-testid="trial-expired-cta">
              Choose plan <ArrowRight className="ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* Active trial banner — dismissable */}
      {onTrial && !trialExpired && !trialBannerDismissed && trialDaysLeft != null && (
        <div className="bg-ink text-white border-2 border-ink p-5 relative" data-testid="trial-active-banner">
          <button
            type="button"
            onClick={() => { localStorage.setItem("trial_banner_dismissed_v1", "1"); setTrialBannerDismissed(true); }}
            className="absolute top-2 right-2 text-white/60 hover:text-white"
            aria-label="Dismiss"
            data-testid="trial-banner-dismiss"
          ><X size={18} /></button>
          <div className="flex items-start gap-3 flex-wrap">
            <Sparkle weight="fill" size={28} className="shrink-0 mt-1 text-warning" />
            <div className="flex-1 min-w-[260px]">
              <div className="label-eyebrow text-warning">FREE TRIAL · {trialDaysLeft} DAY{trialDaysLeft === 1 ? "" : "S"} LEFT</div>
              <h2 className="font-display text-xl md:text-2xl font-black mt-1">
                Full access to every module &amp; add-on — no card required.
              </h2>
              <p className="text-sm text-white/80 mt-1">
                SWMS · Incidents · Risk Register · Toolbox Talks · TradeInduct · TradeCheck ·
                Academy · Automations · Worker PWA. Add a plan anytime to lock in your data.
              </p>
            </div>
            <Link to="/dashboard/settings?tab=billing" className="shrink-0">
              <Button className="btn-sharp bg-warning text-ink hover:bg-yellow-400 h-11" data-testid="trial-banner-cta">
                Choose a plan <ArrowRight className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow" data-testid="dashboard-eyebrow">/ Overview · {industryMeta?.badge || "Multi-industry"} · {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1" data-testid="dashboard-greeting">G'day, {user?.name?.split(" ")[0] || industryTerm.greeting.replace(/^./, (ch) => ch.toUpperCase())}.</h1>
        </div>
        <Link to={industryTerm.primary_doc_route}><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="quick-generate-btn"><Sparkle className="mr-2" weight="fill" />{industryTerm.primary_doc_cta_label}</Button></Link>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-background border border-border p-6">
          <div className="label-eyebrow mb-2">Compliance Score</div>
          <div className="flex items-center gap-6">
            <ScoreRing value={data?.score ?? 0} />
            <div className="flex-1">
              <div className="font-display text-2xl font-bold leading-tight">{(data?.score ?? 0) >= 80 ? "Audit ready" : (data?.score ?? 0) >= 50 ? "Action needed" : "At risk"}</div>
              <div className="text-sm text-muted-foreground mt-1">Live across documents, licences, incidents.</div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 bg-ink text-white p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="label-eyebrow text-warning">/ AI flagged {aiAlerts.length} item(s)</div>
            <Bell weight="duotone" className="text-warning" />
          </div>
          <ul className="space-y-3">
            {aiAlerts.map((a, idx) => (
              <li key={idx} className="flex gap-3 border-b border-white/10 pb-3 last:border-0" data-testid={`ai-alert-${idx}`}>
                <Lightbulb weight="duotone" className={`shrink-0 ${a.tone === "red" ? "text-red-400" : a.tone === "amber" ? "text-warning" : "text-emerald-400"}`} />
                <div>
                  <div className="label-eyebrow text-warning">{a.tag}</div>
                  <div className="mt-1 text-sm">{a.text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((c) => (
          <Link to={c.link} key={c.key} className="bg-background border border-border p-5 hover:bg-warning hover:border-ink transition-colors" data-testid={`stat-${c.key}`}>
            <div className="flex items-start justify-between">
              <c.icon size={28} weight="duotone" />
              <ArrowRight className="opacity-40" />
            </div>
            <div className="mt-6 font-display font-black text-4xl">{data?.metrics?.[c.key] ?? 0}</div>
            <div className="label-eyebrow mt-1">{c.label}</div>
          </Link>
        ))}
      </div>

      {/* Trades credential expiry alerts — Iter55 */}
      {industrySlug === "trades" && <IndustryAlertTile industry="trades" />}

      {/* Industry starter — surfaces industry-specific doc shortcuts (new tenants) */}
      <div
        className="bg-background border border-border p-5"
        data-testid={`industry-starter-${industrySlug}`}
      >
        <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="label-eyebrow">/ {industryMeta?.badge || "Industry"} starter</div>
            <h2 className="font-display text-xl md:text-2xl font-black tracking-tighter mt-1">
              {industryTerm.starter_title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {industryTerm.starter_blurb}
            </p>
          </div>
          <Link to="/dashboard/settings" className="label-eyebrow underline" data-testid="industry-change-link">
            Change industry →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {industryTerm.starter_actions.map((a) => (
            <Link
              key={a.testid}
              to={a.to}
              data-testid={a.testid}
              className="group border border-border p-4 hover:border-ink hover:bg-warning transition-colors flex items-center justify-between"
            >
              <span className="font-display font-black text-base">{a.label}</span>
              <ArrowRight className="opacity-40 group-hover:opacity-100 group-hover:text-ink" />
            </Link>
          ))}
        </div>
      </div>

      {/* Regulator pipeline — shows only if cases pending (SIRS/NDIS/NHVR) */}
      <RegulatorPipelineWidget />

      {/* Compliance Inbox widget — cross-industry ranked deadlines */}
      <ComplianceInboxWidget />

      {/* Regulatory Digest widget — top-3 regulatory changes for user's industry */}
      <RegulatoryDigestWidget />

      {/* Apps & Add-ons — discoverability for ecosystem (always visible) */}
      <div className="bg-background border border-border p-5" data-testid="apps-addons-section">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="label-eyebrow">/ Apps &amp; Add-ons</div>
            <h2 className="font-display text-xl md:text-2xl font-black tracking-tighter mt-1">
              Included with every SafeBase plan
            </h2>
          </div>
          {onTrial && !trialExpired && (
            <span className="bg-warning text-ink px-2 py-1 text-[10px] font-bold tracking-widest" data-testid="apps-trial-pill">
              ALL UNLOCKED IN TRIAL
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { to: "/dashboard/tradeinduct", label: "TradeInduct", icon: QrCode, blurb: "QR-based subbie inductions — capture details in 60 seconds." },
            { to: "/dashboard/tradecheck", label: "TradeCheck", icon: ShieldCheck, blurb: "Verify any contractor's licences and insurances on the job site." },
            { to: "/dashboard/academy", label: "Academy", icon: GraduationCap, blurb: "Worker micro-courses with certificates — link to the Competency Matrix." },
            { to: "/worker", label: "Mobile Worker", icon: DeviceMobile, blurb: "Installable PWA — sign SWMS, see toolbox talks, photograph incidents." },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group border border-border p-4 hover:border-ink hover:bg-warning transition-colors"
              data-testid={`apps-card-${a.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-start justify-between">
                <a.icon size={28} weight="duotone" />
                <ArrowRight className="opacity-40 group-hover:opacity-100 group-hover:text-ink" />
              </div>
              <div className="font-display text-lg font-black mt-3">{a.label}</div>
              <div className="text-xs text-muted-foreground group-hover:text-ink mt-1">{a.blurb}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Unbriefed workers × active hazards (reverse-loop telemetry) */}
      {competency && competency.active_hazards?.length > 0 && (
        <div className="bg-red-700 text-white border-2 border-red-700 p-5" data-testid="competency-widget">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="label-eyebrow text-warning">/ UNBRIEFED WORKERS × ACTIVE HAZARDS</div>
              <h2 className="font-display text-xl md:text-2xl font-black mt-1">
                {competency.active_hazards.reduce((s, h) => s + h.unbriefed_count, 0)} worker briefing{" "}
                gap{competency.active_hazards.length === 1 ? "" : "s"} across{" "}
                {competency.active_hazards.length} hazard{competency.active_hazards.length === 1 ? "" : "s"}
              </h2>
              <p className="text-sm text-white/80 mt-1 max-w-2xl">
                Hazards with open SWMS revisions or recent failing controls — who on your {industryTerm.worker_plural}{" "}
                still hasn't been briefed?
              </p>
            </div>
            <Link to="/dashboard/competency-matrix">
              <Button variant="outline" className="btn-sharp border-white text-white bg-transparent hover:bg-white/10 h-10" data-testid="open-matrix-btn">
                <Users className="mr-2" />Open matrix
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {competency.active_hazards.map((h, i) => (
              <div key={i} className="bg-white/10 border border-white/20 p-3" data-testid={`hazard-${i}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-black text-lg leading-tight">{h.hazard}</div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold tracking-widest ${h.coverage_pct >= 80 ? "bg-emerald-600" : h.coverage_pct >= 50 ? "bg-amber-500 text-ink" : "bg-red-900"}`}>
                    {h.coverage_pct}% BRIEFED
                  </span>
                </div>
                <div className="mt-2 text-sm">
                  <strong className="text-warning">{h.unbriefed_count}</strong> of {h.total_workers} workers unbriefed
                </div>
                <div className="text-[11px] text-white/70 mt-1">
                  {h.source_count} active source{h.source_count === 1 ? "" : "s"} ·{" "}
                  {h.sources.map((s) => s.type === "swms_revision" ? "SWMS rev" : "Risk review").join(" · ")}
                </div>
                <Link
                  to="/dashboard/toolbox-talks"
                  className="mt-3 inline-flex items-center gap-1 text-xs underline hover:text-warning"
                  data-testid={`hazard-schedule-${i}`}
                >
                  Schedule toolbox <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incidents + Expiries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-background border border-border" data-testid="recent-incidents-panel">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <div className="label-eyebrow">/ Recent incidents</div>
              <div className="font-display font-bold text-lg mt-1">Last logged</div>
            </div>
            <Link to="/dashboard/incidents" className="label-eyebrow underline">View all →</Link>
          </div>
          {recentIncidents.length === 0 ? (
            <div className="p-8 text-center">
              <Siren size={28} weight="duotone" className="mx-auto opacity-40" />
              <div className="text-sm text-muted-foreground mt-2">No incidents — a clean register is a healthy register.</div>
            </div>
          ) : (
            <ul>
              {recentIncidents.map((i) => (
                <li key={i.incident_id} className="p-5 border-b border-border last:border-0 flex items-start gap-3">
                  <span className={`px-2 py-0.5 text-[10px] font-bold tracking-widest shrink-0 ${sevStyle[i.severity] || "bg-muted"}`}>{(i.severity || "").replace(/_/g, ' ').toUpperCase()}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm line-clamp-1">{i.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{i.site || "—"} · {new Date(i.created_at).toLocaleDateString("en-AU")}</div>
                  </div>
                  <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 ${i.status === "closed" ? "bg-emerald-600 text-white" : "bg-warning text-ink"}`}>{(i.status || "open").toUpperCase()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-background border border-border" data-testid="upcoming-expiries-panel">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <div className="label-eyebrow">/ Upcoming expiries</div>
              <div className="font-display font-bold text-lg mt-1">Next 90 days</div>
            </div>
            <Link to="/dashboard/licences" className="label-eyebrow underline">View all →</Link>
          </div>
          {upcomingExpiries.length === 0 ? (
            <div className="p-8 text-center">
              <IdentificationBadge size={28} weight="duotone" className="mx-auto opacity-40" />
              <div className="text-sm text-muted-foreground mt-2">No licences lapsing. Add worker credentials to enable tracking.</div>
            </div>
          ) : (
            <ul>
              {upcomingExpiries.map((l) => (
                <li key={l.licence_id} className="p-5 border-b border-border last:border-0 flex items-center gap-3">
                  <Clock weight="duotone" className={l.days_until_expiry < 0 ? "text-red-600" : l.days_until_expiry < 30 ? "text-warning" : "text-muted-foreground"} size={20} />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{l.licence_type.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-muted-foreground mt-1">{l.licence_number} · exp {l.expiry_date}</div>
                  </div>
                  <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 ${l.days_until_expiry < 0 ? "bg-red-600 text-white" : l.days_until_expiry <= 30 ? "bg-warning text-ink" : "bg-muted"}`}>
                    {l.days_until_expiry < 0 ? `${-l.days_until_expiry}d overdue` : `${l.days_until_expiry}d`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to={industryTerm.primary_doc_route} className="bg-background border border-border p-6 hover:bg-muted transition-colors" data-testid="quick-action-primary">
          <FileText size={32} weight="duotone" />
          <div className="font-display font-bold text-xl mt-4">{industryTerm.primary_doc_cta_label}</div>
          <div className="text-sm text-muted-foreground mt-1">{industryTerm.primary_doc_cta_blurb}</div>
        </Link>
        <Link to="/dashboard/incidents" className="bg-background border border-border p-6 hover:bg-muted transition-colors">
          <Warning size={32} weight="duotone" />
          <div className="font-display font-bold text-xl mt-4">Log incident</div>
          <div className="text-sm text-muted-foreground mt-1">Mobile-first capture from the {industryTerm.site_singular}.</div>
        </Link>
        <Link to="/dashboard/workers" className="bg-background border border-border p-6 hover:bg-muted transition-colors">
          <Users size={32} weight="duotone" />
          <div className="font-display font-bold text-xl mt-4">Add {industryTerm.worker_singular}</div>
          <div className="text-sm text-muted-foreground mt-1">Track licences, certificates, induction records.</div>
        </Link>
      </div>

      {/* Sites upsell banner (Trigger 4: >5 active sites) */}
      {showSitesUpsell && (
        <div
          className="bg-ink text-warning border-2 border-ink p-6 flex items-center justify-between flex-wrap gap-4"
          data-testid="sites-upsell-banner"
        >
          <div className="flex items-start gap-3">
            <Buildings size={28} weight="duotone" className="shrink-0" />
            <div>
              <div className="label-eyebrow text-warning">/ Multi-{industryTerm.site_singular} detected</div>
              <div className="font-display font-bold text-lg mt-1 text-white">You're running {uniqueSites.length} active {industryTerm.site_plural}.</div>
              <div className="text-sm text-white/70">Growing Business caps at 5. Enterprise unlocks unlimited {industryTerm.site_plural} + regional rollups — from A$3,999/mo + GST.</div>
            </div>
          </div>
          <Button
            onClick={() => setSitesUpsellOpen(true)}
            className="btn-sharp bg-warning text-ink hover:bg-warning/90 h-11"
            data-testid="sites-upsell-cta"
          >
            See Enterprise plan <ArrowRight className="ml-2" />
          </Button>
        </div>
      )}

      {/* Plan upsell */}
      <div className="bg-warning border-2 border-ink p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="label-eyebrow">/ Plan</div>
          <div className="font-display font-bold text-lg mt-1">Solo Tradie · A$799/month + GST</div>
          <div className="text-sm">Unlock contractor compliance, SafeInduct and AI pattern detection. Upgrade to Small Team for A$1,599/month + GST — or jump to Enterprise for A$3,999/mo + GST with a dedicated Account Manager.</div>
        </div>
        <Link to="/pricing"><Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" data-testid="upgrade-plan-btn">Upgrade plan <ArrowRight className="ml-2" /></Button></Link>
      </div>
      <EnterpriseUpsellModal open={sitesUpsellOpen} onOpenChange={setSitesUpsellOpen} trigger="sites" />
    </div>
  );
}
