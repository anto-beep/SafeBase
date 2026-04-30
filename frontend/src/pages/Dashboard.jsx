import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowRight, FileText, Warning, IdentificationBadge, Users, ChartLineUp, Sparkle,
  Lightbulb, Siren, Clock, CheckCircle, Bell, Buildings
} from "@phosphor-icons/react";
import EnterpriseUpsellModal from "@/components/EnterpriseUpsellModal";
import useTier from "@/hooks/useTier";

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

const STAT_CARDS = [
  { key: "documents", label: "Active SWMS", icon: FileText, link: "/dashboard/documents" },
  { key: "incidents_open", label: "Open Incidents", icon: Warning, link: "/dashboard/incidents" },
  { key: "workers", label: "Workers", icon: Users, link: "/dashboard/workers" },
  { key: "licences_expiring_30d", label: "Licences expiring", icon: IdentificationBadge, link: "/dashboard/licences" },
];

const sevStyle = {
  near_miss: "bg-muted text-foreground",
  minor: "bg-warning text-ink",
  moderate: "bg-orange-500 text-white",
  serious: "bg-red-600 text-white",
  critical: "bg-ink text-warning",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [licences, setLicences] = useState([]);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [sitesUpsellOpen, setSitesUpsellOpen] = useState(false);
  const { isEnterprise } = useTier();

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
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ Overview · {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">G'day, {user?.name?.split(" ")[0] || "Tradie"}.</h1>
        </div>
        <Link to="/dashboard/documents"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="quick-generate-btn"><Sparkle className="mr-2" weight="fill" />Generate SWMS</Button></Link>
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
        <Link to="/dashboard/documents" className="bg-background border border-border p-6 hover:bg-muted transition-colors">
          <FileText size={32} weight="duotone" />
          <div className="font-display font-bold text-xl mt-4">Generate SWMS</div>
          <div className="text-sm text-muted-foreground mt-1">AI-built safe work method statement in 60 seconds.</div>
        </Link>
        <Link to="/dashboard/incidents" className="bg-background border border-border p-6 hover:bg-muted transition-colors">
          <Warning size={32} weight="duotone" />
          <div className="font-display font-bold text-xl mt-4">Log incident</div>
          <div className="text-sm text-muted-foreground mt-1">Mobile-first capture from the job site.</div>
        </Link>
        <Link to="/dashboard/workers" className="bg-background border border-border p-6 hover:bg-muted transition-colors">
          <Users size={32} weight="duotone" />
          <div className="font-display font-bold text-xl mt-4">Add worker</div>
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
              <div className="label-eyebrow text-warning">/ Multi-site detected</div>
              <div className="font-display font-bold text-lg mt-1 text-white">You're running {uniqueSites.length} active sites.</div>
              <div className="text-sm text-white/70">Growing Business caps at 5. Enterprise unlocks unlimited sites + regional rollups — A$1,299/mo + GST.</div>
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
          <div className="font-display font-bold text-lg mt-1">Sole Trader · A$249/month + GST</div>
          <div className="text-sm">Unlock contractor compliance, TradeInduct and AI pattern detection. Upgrade to Small Business for A$499/month + GST — or jump to Enterprise for A$1,299/mo + GST with a dedicated Account Manager.</div>
        </div>
        <Link to="/pricing"><Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" data-testid="upgrade-plan-btn">Upgrade plan <ArrowRight className="ml-2" /></Button></Link>
      </div>
      <EnterpriseUpsellModal open={sitesUpsellOpen} onOpenChange={setSitesUpsellOpen} trigger="sites" />
    </div>
  );
}
