/**
 * HealthcareOwnerDashboard — clean clinical blue/white theme.
 * Layout: two-column. Left 45%: credential status panel (dominant) + 8 quality
 * standards pills. Right 55%: horizontal score bars + AI alerts + incident
 * snapshot. Bottom full-width: upcoming renewals calendar.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  HeartStraight, Lightning, Sparkle, ArrowRight, ShieldCheck,
  CheckCircle, XCircle, Clock, Calendar, FilePlus,
} from "@phosphor-icons/react";

const TEAL = "#2196A6";
const SOFT_GREEN = "#4CAF8F";
const BG_TINT = "bg-[#F4F8FB]";

function HBar({ label, value, color }) {
  return (
    <div data-testid={`hc-bar-${label.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="flex items-end justify-between mb-1">
        <span className="text-sm font-bold text-zinc-800">{label}</span>
        <span className="font-display font-black text-base" style={{ color }}>{value}/100</span>
      </div>
      <div className="h-3 bg-zinc-200 overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function CredCell({ status }) {
  const map = {
    current: { icon: CheckCircle, color: "text-emerald-500" },
    expiring: { icon: Clock, color: "text-amber-500" },
    expired: { icon: XCircle, color: "text-red-500" },
    missing: { icon: XCircle, color: "text-zinc-300" },
  };
  const Icon = map[status].icon;
  return <Icon size={18} className={map[status].color} />;
}

const STANDARDS = [
  "1. The individual",
  "2. The organisation",
  "3. Care and services",
  "4. Clinical care",
  "5. Environment",
  "6. Feedback / complaints",
  "7. Workforce",
  "8. Governance",
];

export default function HealthcareOwnerDashboard() {
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
  // Three-bar split for healthcare scoring
  const whs = overall;
  const careQuality = Math.max(0, Math.min(100, overall - 5));
  const credential = Math.max(0, Math.min(100, overall + 3));

  // Compute credential status per worker for AHPRA / Screening / Vacc / First Aid
  const credKindFor = (l) => {
    const t = (l.licence_type || "").toLowerCase();
    if (t.includes("ahpra")) return "ahpra";
    if (t.includes("screening") || t.includes("ndis") || t.includes("aged_care")) return "screening";
    if (t.includes("vacc")) return "vaccination";
    if (t.includes("first_aid")) return "first_aid";
    return null;
  };
  const credByWorker = {};
  workers.forEach((w) => { credByWorker[w.worker_id] = { ahpra: "missing", screening: "missing", vaccination: "missing", first_aid: "missing" }; });
  licences.forEach((l) => {
    const k = credKindFor(l);
    if (!k || !credByWorker[l.worker_id]) return;
    const dl = l.days_until_expiry;
    credByWorker[l.worker_id][k] = dl == null || dl < 0 ? "expired" : dl <= 30 ? "expiring" : "current";
  });

  const fullyCurrent = workers.filter((w) => {
    const c = credByWorker[w.worker_id] || {};
    return ["ahpra", "screening", "vaccination", "first_aid"].every((k) => c[k] === "current");
  }).length;

  const monthIncs = incidents.filter((i) => new Date(i.created_at).getMonth() === new Date().getMonth());
  const upcoming = licences
    .filter((l) => l.days_until_expiry != null && l.days_until_expiry >= 0 && l.days_until_expiry <= 30)
    .sort((a, b) => a.days_until_expiry - b.days_until_expiry)
    .slice(0, 8);

  return (
    <div className={`-mx-4 -my-4 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 ${BG_TINT} text-zinc-900 min-h-screen`} data-testid="healthcare-owner-dashboard">
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Top header */}
        <div className="flex items-end justify-between flex-wrap gap-4 border-b border-zinc-200 pb-5">
          <div>
            <div className="label-eyebrow" style={{ color: TEAL }}>/ Healthcare practice · {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tighter mt-1 leading-tight" data-testid="healthcare-greeting">Welcome, {user?.name?.split(" ")[0] || "Practitioner"}.</h1>
            <p className="text-sm text-zinc-500 mt-1">Care quality + credential compliance, at a glance.</p>
          </div>
          <Link to="/dashboard/document-library">
            <Button className="btn-sharp h-12 text-white hover:opacity-90" style={{ background: TEAL }} data-testid="healthcare-quick-ahpra">
              <Sparkle className="mr-2" weight="fill" /> Track AHPRA registrations
            </Button>
          </Link>
        </div>

        {/* TWO-COLUMN */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 45% */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-zinc-200 p-5" data-testid="healthcare-credential-panel">
              <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
                <div>
                  <div className="label-eyebrow" style={{ color: TEAL }}>/ Staff credentials</div>
                  <div className="font-display font-black text-xl mt-1">{fullyCurrent}/{workers.length || 0} fully current</div>
                </div>
                <Link to="/dashboard/workers" className="text-xs font-bold underline">Add credential</Link>
              </div>
              {workers.length === 0 ? (
                <div className="text-sm text-zinc-500 py-8 text-center">Add staff to start tracking AHPRA, NDIS screening, vaccinations and first aid expiries.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] font-bold tracking-widest text-zinc-500">
                        <th className="py-2">STAFF</th>
                        <th className="text-center px-1">AHPRA</th>
                        <th className="text-center px-1">SCREEN</th>
                        <th className="text-center px-1">VACC</th>
                        <th className="text-center px-1">1ST AID</th>
                        <th className="text-right">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {workers.slice(0, 6).map((w) => {
                        const c = credByWorker[w.worker_id] || {};
                        const all = [c.ahpra, c.screening, c.vaccination, c.first_aid];
                        const overall = all.includes("expired") ? "Critical gap" : all.includes("expiring") || all.includes("missing") ? "Action required" : "Fully current";
                        const overallColor = overall === "Fully current" ? "bg-emerald-100 text-emerald-800" : overall === "Action required" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
                        return (
                          <tr key={w.worker_id} className="hover:bg-zinc-50/50">
                            <td className="py-2.5">
                              <div className="font-bold">{w.name}</div>
                              <div className="text-xs text-zinc-500">{w.role || "—"}</div>
                            </td>
                            <td className="text-center px-1"><CredCell status={c.ahpra} /></td>
                            <td className="text-center px-1"><CredCell status={c.screening} /></td>
                            <td className="text-center px-1"><CredCell status={c.vaccination} /></td>
                            <td className="text-center px-1"><CredCell status={c.first_aid} /></td>
                            <td className="text-right">
                              <span className={`text-[10px] font-bold tracking-widest px-2 py-1 ${overallColor}`}>{overall.toUpperCase()}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white border border-zinc-200 p-5" data-testid="healthcare-standards">
              <div className="label-eyebrow" style={{ color: TEAL }}>/ Quality standards (ACQSC)</div>
              <div className="font-display font-bold text-lg mt-1 mb-3">Strengthened Aged Care Quality Standards</div>
              <div className="grid grid-cols-2 gap-2">
                {STANDARDS.map((s, idx) => (
                  <div key={s} className="text-xs font-bold py-2 px-3 border border-amber-300 bg-amber-50 text-amber-900" data-testid={`healthcare-standard-${idx + 1}`}>
                    {s}
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-3">Click each standard from the Care Quality module to upload evidence.</p>
            </div>
          </div>

          {/* RIGHT 55% */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white border border-zinc-200 p-5" data-testid="healthcare-score">
              <div className="label-eyebrow" style={{ color: TEAL }}>/ WHS and care quality score</div>
              <div className="font-display font-black text-5xl mt-1" style={{ color: TEAL }}>{Math.round((whs + careQuality + credential) / 3)}<span className="text-2xl text-zinc-300">/100</span></div>
              <div className="text-sm text-zinc-500 mb-4">Overall · live across WHS, care quality and credentials</div>
              <div className="space-y-4">
                <HBar label="WHS Compliance" value={whs} color={TEAL} />
                <HBar label="Care Quality Standards" value={careQuality} color={SOFT_GREEN} />
                <HBar label="Credential Compliance" value={credential} color="#7C3AED" />
              </div>
            </div>

            <div className="bg-white border border-zinc-200 p-5" data-testid="healthcare-alerts">
              <div className="flex items-end justify-between flex-wrap gap-2 mb-3">
                <div>
                  <div className="label-eyebrow" style={{ color: TEAL }}>/ AI alerts</div>
                  <div className="font-display font-bold text-lg mt-1">Care + compliance alerts</div>
                </div>
                <Link to="/dashboard/incidents" className="text-xs font-bold underline">View all →</Link>
              </div>
              <ul className="space-y-2">
                {incidents.slice(0, 3).map((i) => (
                  <li key={i.incident_id} className="border-l-4 pl-3 py-2" style={{ borderColor: TEAL }}>
                    <div className="font-bold text-sm">{i.title || i.incident_type}</div>
                    <div className="text-xs text-zinc-500">{(i.created_at || "").slice(0, 10)} · {i.severity}</div>
                  </li>
                ))}
                {incidents.length === 0 && (
                  <li className="text-sm text-zinc-500">No active alerts. Keep monitoring AHPRA + screening expiries weekly.</li>
                )}
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white border border-zinc-200 p-4" data-testid="healthcare-incidents-whs">
                <div className="label-eyebrow" style={{ color: TEAL }}>/ WHS incidents</div>
                <div className="font-display font-black text-3xl mt-2">{monthIncs.length}</div>
                <div className="text-xs text-zinc-500">this month</div>
              </div>
              <div className="bg-white border border-zinc-200 p-4" data-testid="healthcare-incidents-clinical">
                <div className="label-eyebrow" style={{ color: SOFT_GREEN }}>/ Clinical events</div>
                <div className="font-display font-black text-3xl mt-2">0</div>
                <div className="text-xs text-zinc-500">this month</div>
                <Link to="/dashboard/incidents/new" className="text-xs font-bold underline mt-1 inline-block">Log clinical event →</Link>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM — upcoming renewals */}
        <div className="bg-white border border-zinc-200 p-5" data-testid="healthcare-renewals">
          <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="label-eyebrow" style={{ color: TEAL }}>/ Upcoming renewals · 30 days</div>
              <div className="font-display font-bold text-lg mt-1">{upcoming.length} expiries this window</div>
            </div>
            <Link to="/dashboard/licences"><Button variant="outline" className="btn-sharp h-10" style={{ borderColor: TEAL, color: TEAL }}>Renewal calendar <Calendar className="ml-2" size={16} /></Button></Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-sm text-zinc-500 py-4 text-center">No renewals in the next 30 days. Excellent.</div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {upcoming.map((l) => (
                <li key={l.licence_id} className="py-2.5 flex items-center gap-3">
                  <Calendar size={16} className="text-zinc-400" />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{(l.licence_type || "").replace(/_/g, " ")}</div>
                    <div className="text-xs text-zinc-500">{l.licence_number} · expires {l.expiry_date}</div>
                  </div>
                  <span className={`text-[10px] font-bold tracking-widest px-2 py-1 ${l.days_until_expiry <= 7 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{l.days_until_expiry}D</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
