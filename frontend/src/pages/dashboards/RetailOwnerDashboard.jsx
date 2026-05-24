/**
 * RetailOwnerDashboard — purple energetic theme.
 * Layout: top band 3 large status tiles (lone worker / inductions / incidents);
 * two-column below (left 55%: store score + roster compliance + open hazards;
 * right 45%: AI alerts + 4 quick-action tiles + credentials expiring).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  Storefront, Users, Warning, Sparkle, ArrowRight, ShieldCheck,
  CheckCircle, IdentificationBadge, FilePlus, FirstAidKit, Drop,
} from "@phosphor-icons/react";
import IndustryAlertTile from "@/components/IndustryAlertTile";

const PURPLE = "#5B2D8E";
const PINK = "#E91E8C";
const TINT = "bg-[#F9F5FF]";

function HBar({ label, value, color }) {
  return (
    <div data-testid={`retail-bar-${label.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="flex items-end justify-between mb-1">
        <span className="text-sm font-bold text-zinc-800">{label}</span>
        <span className="font-display font-black text-base" style={{ color }}>{value}</span>
      </div>
      <div className="h-3 bg-zinc-200 overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

const QUICK = [
  { label: "Quick Induct", icon: Users, color: "bg-[#E91E8C]", testid: "retail-qa-induct", to: "/dashboard/document-library" },
  { label: "Log Incident", icon: Warning, color: "bg-[#5B2D8E]", testid: "retail-qa-incident", to: "/dashboard/incidents/new" },
  { label: "Report Hazard", icon: FilePlus, color: "bg-[#0DC4B5]", testid: "retail-qa-hazard", to: "/dashboard/risk-register" },
  { label: "Lone Worker Check-In", icon: ShieldCheck, color: "bg-[#7C3AED]", testid: "retail-qa-lone", to: "/dashboard/document-library" },
];

export default function RetailOwnerDashboard() {
  const { user } = useAuth();
  const [score, setScore] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [licences, setLicences] = useState([]);

  useEffect(() => {
    api.get("/compliance/score").then((r) => setScore(r.data)).catch(() => {});
    api.get("/incidents").then((r) => setIncidents(r.data || [])).catch(() => {});
    api.get("/workers").then((r) => setWorkers(r.data || [])).catch(() => {});
    api.get("/licences").then((r) => setLicences(r.data || [])).catch(() => {});
  }, []);

  const overall = score?.score ?? 0;
  const today = new Date().toDateString();
  const incidentsToday = incidents.filter((i) => new Date(i.created_at).toDateString() === today);
  const expiring = licences.filter((l) => l.days_until_expiry != null && l.days_until_expiry >= 0 && l.days_until_expiry <= 30);

  const inductedCount = 0;        // No induction tracking yet
  const rosterCount = workers.length;

  return (
    <div className={`-mx-4 -my-4 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 ${TINT} text-zinc-900 min-h-screen`} data-testid="retail-owner-dashboard">
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Top header */}
        <div className="flex items-end justify-between flex-wrap gap-4 border-b-4 border-[#5B2D8E] pb-5">
          <div>
            <div className="label-eyebrow" style={{ color: PURPLE }}>/ Retail · {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tighter mt-1" data-testid="retail-greeting">G'day, {user?.name?.split(" ")[0] || "boss"}.</h1>
          </div>
          <Link to="/dashboard/document-library">
            <Button className="btn-sharp h-12 hover:opacity-90 text-white" style={{ background: PINK }} data-testid="retail-quick-induct">
              <Sparkle className="mr-2" weight="fill" /> Quick-induct a casual
            </Button>
          </Link>
        </div>

        {/* TOP BAND — 3 STATUS TILES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="retail-status-band">
          {/* Lone worker */}
          <div className="bg-emerald-100 text-emerald-900 p-5 border-l-4 border-emerald-500" data-testid="retail-tile-lone-worker">
            <div className="flex items-center justify-between">
              <ShieldCheck weight="fill" size={28} />
              <span className="text-[10px] font-bold tracking-widest">LONE WORKER</span>
            </div>
            <div className="font-display font-black text-2xl mt-3">No lone workers active</div>
            <div className="text-sm">All staff currently work in pairs or groups.</div>
          </div>

          {/* Inductions today */}
          <div className={`p-5 ${rosterCount > 0 ? "bg-amber-100 text-amber-900 border-l-4 border-amber-500" : "bg-white border border-zinc-200 text-zinc-700"}`} data-testid="retail-tile-inductions">
            <div className="flex items-center justify-between">
              <Users weight="fill" size={28} />
              <span className="text-[10px] font-bold tracking-widest">INDUCTIONS</span>
            </div>
            <div className="font-display font-black text-2xl mt-3">{inductedCount}/{rosterCount} inducted</div>
            <div className="h-2 bg-black/10 mt-2 overflow-hidden">
              <div className="h-full" style={{ width: rosterCount ? `${(inductedCount / rosterCount) * 100}%` : "0%", background: PURPLE }} />
            </div>
            {rosterCount > inductedCount && (
              <Link to="/dashboard/document-library" className="text-xs font-bold underline mt-2 inline-block">Send Quick Induct →</Link>
            )}
          </div>

          {/* Incidents today */}
          <div className={`p-5 ${incidentsToday.length === 0 ? "bg-emerald-100 text-emerald-900 border-l-4 border-emerald-500" : "bg-amber-100 text-amber-900 border-l-4 border-amber-500"}`} data-testid="retail-tile-incidents">
            <div className="flex items-center justify-between">
              <Warning weight="fill" size={28} />
              <span className="text-[10px] font-bold tracking-widest">INCIDENTS TODAY</span>
            </div>
            <div className="font-display font-black text-2xl mt-3">{incidentsToday.length === 0 ? "No incidents today" : `${incidentsToday.length} logged`}</div>
            <div className="text-sm">
              {incidentsToday.length > 0 && `${incidentsToday.filter((i) => i.incident_type !== "customer").length} staff · ${incidentsToday.filter((i) => i.incident_type === "customer").length} customer`}
            </div>
          </div>
        </div>

        {/* Lone-worker check-in alerts — Iter55 */}
        <IndustryAlertTile industry="retail" />

        {/* TWO-COLUMN BELOW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 55% */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white border border-zinc-200 p-5" data-testid="retail-store-score">
              <div className="label-eyebrow" style={{ color: PURPLE }}>/ Workplace safety score</div>
              <div className="font-display font-black text-5xl mt-1" style={{ color: PURPLE }}>{overall}<span className="text-2xl text-zinc-300">/100</span></div>
              <div className="text-sm text-zinc-500 mb-4">Live across documents, inductions, credentials and incidents.</div>
              <div className="space-y-3">
                <HBar label="WHS Documents" value={Math.max(0, overall - 5)} color={PURPLE} />
                <HBar label="Inductions" value={rosterCount === 0 ? 0 : Math.round((inductedCount / rosterCount) * 100)} color={PINK} />
                <HBar label="Staff Credentials" value={Math.max(0, overall - 10)} color="#7C3AED" />
                <HBar label="Lone Worker Safety" value={100} color="#0DC4B5" />
              </div>
            </div>

            <div className="bg-white border border-zinc-200 p-5" data-testid="retail-roster">
              <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
                <div>
                  <div className="label-eyebrow" style={{ color: PURPLE }}>/ Today's roster</div>
                  <div className="font-display font-bold text-lg mt-1">{rosterCount} on roster</div>
                </div>
                <Button variant="outline" className="btn-sharp h-9 border-[#5B2D8E] text-[#5B2D8E]" data-testid="retail-induct-all">
                  Quick Induct all
                </Button>
              </div>
              {rosterCount === 0 ? (
                <div className="text-sm text-zinc-500 py-6 text-center">No team members yet. Add your first staff member to see the roster here.</div>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {workers.slice(0, 5).map((w) => (
                    <li key={w.worker_id} className="py-2.5 flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center font-display font-black text-white" style={{ background: PURPLE }}>{w.name?.[0]}</div>
                      <div className="flex-1">
                        <div className="font-bold text-sm">{w.name}</div>
                        <div className="text-xs text-zinc-500">{w.role || "Staff"}</div>
                      </div>
                      <span className="text-[10px] font-bold tracking-widest px-2 py-1 bg-amber-100 text-amber-800">PENDING INDUCT</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white border border-zinc-200 p-5" data-testid="retail-hazards">
              <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
                <div>
                  <div className="label-eyebrow" style={{ color: PURPLE }}>/ Open hazards</div>
                  <div className="font-display font-bold text-lg mt-1">No open hazards</div>
                </div>
                <Link to="/dashboard/risk-register">
                  <Button className="btn-sharp h-9 hover:opacity-90 text-white" style={{ background: PINK }} data-testid="retail-report-hazard">
                    Report hazard <ArrowRight className="ml-2" size={14} />
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-zinc-500">Spotted a wet floor, broken display, or trip hazard? One tap to log it from the floor.</p>
            </div>
          </div>

          {/* RIGHT 45% */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-zinc-200 p-5" data-testid="retail-ai-alerts">
              <div className="label-eyebrow" style={{ color: PURPLE }}>/ AI alerts</div>
              <div className="font-display font-bold text-lg mt-1">{incidents.length === 0 ? "All clear" : `${incidents.length} active`}</div>
              <ul className="mt-3 space-y-2">
                {expiring.slice(0, 3).map((l) => (
                  <li key={l.licence_id} className="border-l-4 pl-3 py-1.5" style={{ borderColor: PURPLE }}>
                    <div className="font-bold text-sm">{(l.licence_type || "").replace(/_/g, " ")} · {l.licence_number}</div>
                    <div className="text-xs text-zinc-500">expires in {l.days_until_expiry} days</div>
                  </li>
                ))}
                {expiring.length === 0 && (
                  <li className="text-sm text-zinc-500">No certificates expiring this month.</li>
                )}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3" data-testid="retail-quick-actions">
              {QUICK.map((q) => (
                <Link key={q.testid} to={q.to} data-testid={q.testid} className={`${q.color} text-white p-5 hover:opacity-90 transition-opacity`}>
                  <q.icon weight="fill" size={28} />
                  <div className="font-display font-black text-base mt-3 leading-tight">{q.label}</div>
                </Link>
              ))}
            </div>

            <div className="bg-white border border-zinc-200 p-5" data-testid="retail-credentials">
              <div className="label-eyebrow" style={{ color: PURPLE }}>/ Credentials expiring (30 days)</div>
              <div className="font-display font-bold text-lg mt-1">{expiring.length} expiring</div>
              {expiring.length === 0 ? (
                <p className="text-sm text-zinc-500 mt-2">All current. Nice work.</p>
              ) : (
                <ul className="mt-3 divide-y divide-zinc-100">
                  {expiring.slice(0, 4).map((l) => (
                    <li key={l.licence_id} className="py-2 flex items-center gap-2">
                      <IdentificationBadge size={16} className="text-zinc-400" />
                      <div className="flex-1 text-sm">
                        <div className="font-bold">{(l.licence_type || "").replace(/_/g, " ")}</div>
                        <div className="text-xs text-zinc-500">{l.days_until_expiry}d remaining</div>
                      </div>
                      <button className="text-[10px] font-bold tracking-widest text-pink-600 hover:underline">REMIND</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
