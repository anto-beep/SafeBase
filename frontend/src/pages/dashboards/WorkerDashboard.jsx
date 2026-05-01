/**
 * WorkerDashboard — mobile-first simplified view per Part 1 of the brief.
 *
 * Renders for users whose role.variant === "worker" (e.g. apprentice,
 * casual, driver, support worker). Industry-specific quick action shown.
 */
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Warning, IdentificationBadge, GraduationCap, ListChecks,
  Thermometer, Truck, FirstAidKit, Bell, ArrowRight, Calendar,
} from "@phosphor-icons/react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import useIndustry from "@/hooks/useIndustry";

const QUICK_ACTION_BY_INDUSTRY = {
  trades: { icon: ListChecks, label: "Sign SWMS", to: "/dashboard/swms", testid: "worker-quick-trades" },
  hospitality: { icon: Thermometer, label: "Log Temperature Check", to: "/dashboard/document-library", testid: "worker-quick-hospitality" },
  transport: { icon: Truck, label: "Submit Fitness for Duty", to: "/dashboard/document-library", testid: "worker-quick-transport" },
  healthcare: { icon: FirstAidKit, label: "Log Clinical Event", to: "/dashboard/incidents", testid: "worker-quick-healthcare" },
  retail: { icon: Bell, label: "Check In — Lone Worker", to: "/dashboard/document-library", testid: "worker-quick-retail" },
};

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { slug, term, meta } = useIndustry();
  const quick = QUICK_ACTION_BY_INDUSTRY[slug] || QUICK_ACTION_BY_INDUSTRY.trades;
  const QIcon = quick.icon;
  const [licences, setLicences] = useState([]);

  useEffect(() => {
    api.get("/licences").then((r) => setLicences(r.data || [])).catch(() => {});
  }, []);

  const myLicences = licences.slice(0, 5);

  return (
    <div className="space-y-5 max-w-2xl mx-auto" data-testid={`worker-dashboard-${slug}`}>
      <div className="border-b border-border pb-5">
        <div className="label-eyebrow">/ My Day · {meta?.badge}</div>
        <h1 className="font-display text-3xl md:text-4xl font-black tracking-tighter mt-1" data-testid="worker-greeting">
          G'day, {user?.name?.split(" ")[0] || term.greeting}.
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your shift dashboard. Tap any tile to take action.</p>
      </div>

      {/* Industry-specific primary CTA — designed for big-thumb mobile */}
      <Link
        to={quick.to}
        className="block bg-ink text-warning hover:bg-authority p-6 transition-colors"
        data-testid={quick.testid}
      >
        <div className="flex items-start gap-4">
          <QIcon weight="fill" size={42} className="shrink-0" />
          <div className="flex-1">
            <div className="label-eyebrow text-warning">/ Primary action</div>
            <div className="font-display text-2xl font-black mt-1 text-white">{quick.label}</div>
            <div className="text-sm text-white/70 mt-1">Takes 30 seconds. One tap to start.</div>
          </div>
          <ArrowRight size={28} className="shrink-0 mt-2" />
        </div>
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/dashboard/incidents/new" className="bg-red-600 text-white p-5 hover:bg-red-700 transition-colors" data-testid="worker-report-incident">
          <Warning weight="fill" size={28} />
          <div className="font-display font-black text-lg mt-3">Report Incident</div>
          <div className="text-sm text-white/80 mt-1">Voice or 60-second form.</div>
        </Link>
        <Link to="/dashboard/academy" className="bg-warning text-ink p-5 hover:bg-yellow-300 transition-colors" data-testid="worker-my-training">
          <GraduationCap weight="fill" size={28} />
          <div className="font-display font-black text-lg mt-3">My Training</div>
          <div className="text-sm mt-1 text-ink/80">Modules assigned to you.</div>
        </Link>
      </div>

      <div className="bg-background border border-border p-5" data-testid="worker-credentials">
        <div className="flex items-center justify-between">
          <div>
            <div className="label-eyebrow">/ My Credentials</div>
            <div className="font-display font-bold text-lg mt-1">Expiry status</div>
          </div>
          <IdentificationBadge size={24} weight="duotone" className="text-muted-foreground" />
        </div>
        {myLicences.length === 0 ? (
          <div className="mt-4 text-sm text-muted-foreground">No credentials on file yet. Ask your supervisor to add yours.</div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {myLicences.map((l) => (
              <li key={l.licence_id} className="py-3 flex items-center gap-3" data-testid={`worker-cred-${l.licence_id}`}>
                <Calendar size={18} className={l.days_until_expiry < 0 ? "text-red-600" : l.days_until_expiry < 30 ? "text-warning" : "text-muted-foreground"} />
                <div className="flex-1">
                  <div className="font-bold text-sm">{(l.licence_type || "").replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">{l.licence_number} · exp {l.expiry_date}</div>
                </div>
                <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 ${l.days_until_expiry < 0 ? "bg-red-600 text-white" : l.days_until_expiry <= 30 ? "bg-warning text-ink" : "bg-muted"}`}>
                  {l.days_until_expiry < 0 ? `${-l.days_until_expiry}d overdue` : `${l.days_until_expiry}d`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-muted border border-border p-5" data-testid="worker-tasks">
        <div className="label-eyebrow">/ My Tasks Today</div>
        <p className="text-sm text-muted-foreground mt-2">
          Your supervisor hasn't assigned any tasks for today. Open the worker app to see toolbox talks and SWMS to sign.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/worker"><Button variant="outline" className="btn-sharp h-10 border-ink" data-testid="worker-open-app">Open worker app</Button></Link>
        </div>
      </div>
    </div>
  );
}
