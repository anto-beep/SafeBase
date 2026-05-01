/**
 * SupervisorDashboard — team-lead variant.
 *
 * Renders for users whose role.variant === "supervisor"
 * (Site Foreman / Head Chef / Sous Chef / Venue Manager / Floor Manager /
 *  Shift Supervisor / Warehouse Manager / Aged Care Manager etc).
 *
 * Focus: their team's credentials today, incidents today, compliance tasks
 * due today, and an industry-specific team focus widget.
 */
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Users, Warning, IdentificationBadge, FileText, ArrowRight, Clock,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import useIndustry from "@/hooks/useIndustry";

const TEAM_FOCUS_BY_INDUSTRY = {
  trades: { label: "Active SWMS on site", to: "/dashboard/swms", testid: "supervisor-focus-trades" },
  hospitality: { label: "Temperature checks status", to: "/dashboard/document-library", testid: "supervisor-focus-hospitality" },
  transport: { label: "Driver declarations today", to: "/dashboard/document-library", testid: "supervisor-focus-transport" },
  healthcare: { label: "Credential gaps on shift", to: "/dashboard/workers", testid: "supervisor-focus-healthcare" },
  retail: { label: "Induction status today", to: "/dashboard/document-library", testid: "supervisor-focus-retail" },
};

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const { slug, term, meta } = useIndustry();
  const focus = TEAM_FOCUS_BY_INDUSTRY[slug] || TEAM_FOCUS_BY_INDUSTRY.trades;

  const [workers, setWorkers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [licences, setLicences] = useState([]);

  useEffect(() => {
    api.get("/workers").then((r) => setWorkers(r.data || [])).catch(() => {});
    api.get("/incidents").then((r) => setIncidents(r.data || [])).catch(() => {});
    api.get("/licences").then((r) => setLicences(r.data || [])).catch(() => {});
  }, []);

  const today = new Date().toDateString();
  const incidentsToday = incidents.filter((i) => new Date(i.created_at).toDateString() === today);
  const expiringSoon = licences.filter((l) => l.days_until_expiry != null && l.days_until_expiry <= 30);

  return (
    <div className="space-y-6" data-testid="supervisor-dashboard">
      <div className="border-b border-border pb-5">
        <div className="label-eyebrow">/ Supervisor view · {meta?.badge}</div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Today's brief, {user?.name?.split(" ")[0] || term.greeting}.</h1>
        <p className="text-sm text-muted-foreground mt-1">Your {term.worker_plural}, today's tasks, and compliance status at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-background border border-border p-4" data-testid="supervisor-stat-team">
          <Users size={22} weight="duotone" />
          <div className="font-display font-black text-3xl mt-3">{workers.length}</div>
          <div className="label-eyebrow mt-1">{term.worker_plural.replace(/^./, (c) => c.toUpperCase())}</div>
        </div>
        <div className="bg-background border border-border p-4" data-testid="supervisor-stat-incidents">
          <Warning size={22} weight="duotone" />
          <div className="font-display font-black text-3xl mt-3">{incidentsToday.length}</div>
          <div className="label-eyebrow mt-1">Incidents today</div>
        </div>
        <div className="bg-background border border-border p-4" data-testid="supervisor-stat-credentials">
          <IdentificationBadge size={22} weight="duotone" />
          <div className="font-display font-black text-3xl mt-3">{expiringSoon.length}</div>
          <div className="label-eyebrow mt-1">Expiring ≤ 30d</div>
        </div>
        <Link to={focus.to} className="bg-ink text-warning border border-ink p-4 hover:bg-authority transition-colors" data-testid={focus.testid}>
          <FileText size={22} weight="duotone" />
          <div className="font-display font-black text-base mt-3 text-white">{focus.label}</div>
          <div className="label-eyebrow mt-1">Open →</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-background border border-border" data-testid="supervisor-team-list">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <div className="label-eyebrow">/ Today's {term.worker_plural}</div>
              <div className="font-display font-bold text-lg mt-1">Roster snapshot</div>
            </div>
            <Link to="/dashboard/workers" className="label-eyebrow underline">All →</Link>
          </div>
          {workers.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No {term.worker_plural} on file.</div>
          ) : (
            <ul>
              {workers.slice(0, 6).map((w) => (
                <li key={w.worker_id} className="p-4 border-b border-border last:border-0 flex items-center gap-3">
                  <div className="w-9 h-9 bg-warning text-ink flex items-center justify-center font-display font-black">{(w.name || "?")[0]}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{w.name}</div>
                    <div className="text-xs text-muted-foreground">{w.role || "—"}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-background border border-border" data-testid="supervisor-tasks">
          <div className="p-5 border-b border-border">
            <div className="label-eyebrow">/ Compliance tasks due today</div>
            <div className="font-display font-bold text-lg mt-1">Action items</div>
          </div>
          <ul className="p-5 space-y-3 text-sm">
            <li className="flex items-start gap-2"><Clock weight="duotone" className="text-warning shrink-0" />Sign off any toolbox talks scheduled for today.</li>
            <li className="flex items-start gap-2"><Clock weight="duotone" className="text-warning shrink-0" />Confirm pre-shift checks complete for every {term.worker_singular} on the roster.</li>
            <li className="flex items-start gap-2"><Clock weight="duotone" className="text-warning shrink-0" />Review any incidents logged in the last 24 hours.</li>
          </ul>
          <div className="px-5 pb-5">
            <Link to="/dashboard/incidents/new"><Button className="btn-sharp h-10 bg-ink text-white hover:bg-authority">Log incident <ArrowRight className="ml-2" /></Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
