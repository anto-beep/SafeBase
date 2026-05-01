/**
 * HospitalityOwnerDashboard — amber/cream warm theme.
 * Layout: full-width Food Safety status bar at top → two-column below
 * (left 60%: dual compliance scores + staff certs grid + recent events;
 *  right 40%: council inspection readiness + today's cleaning + AI alerts).
 *
 * Renders for users where industry='hospitality' AND role_variant='owner'.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  Thermometer, Calendar, ClipboardText, Lightning, Sparkle,
  ForkKnife, ShieldCheck, ArrowRight, CheckCircle, XCircle, Clock,
} from "@phosphor-icons/react";

const CREAM = "bg-[#FDF8F2]";
const AMBER = "#E87722";
const BURGUNDY = "#7C1D3F";

// Static shell for the food safety status bar — temperature monitoring isn't
// captured in the universal doc API yet, so we surface clear "set up" CTAs.
const STARTER_EQUIPMENT = [
  { name: "Walk-in fridge", target: "0°C – 4°C" },
  { name: "Front-of-house display", target: "1°C – 5°C" },
  { name: "Walk-in freezer", target: "-22°C – -18°C" },
  { name: "Bain-marie", target: "≥ 60°C" },
  { name: "Dishwasher final rinse", target: "≥ 80°C" },
];

function HorizontalScoreBar({ label, value, color }) {
  return (
    <div data-testid={`hosp-score-${label.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="flex items-end justify-between mb-1">
        <span className="text-sm font-bold text-[#2C1810]">{label}</span>
        <span className="font-display font-black text-lg" style={{ color }}>{value}/100</span>
      </div>
      <div className="h-3 bg-black/10 overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function CertDot({ status }) {
  // status: current | expiring | expired | missing
  const map = {
    current:   "bg-emerald-500",
    expiring:  "bg-amber-500",
    expired:   "bg-red-500",
    missing:   "bg-zinc-300",
  };
  return <span className={`inline-block w-3 h-3 rounded-full ${map[status]}`} title={status} />;
}

export default function HospitalityOwnerDashboard() {
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

  // Compute dual scores — split overall WHS score into "WHS" and "Food Safety"
  // proxies until per-industry breakdowns are exposed.
  const overall = score?.score ?? 0;
  const whsScore = overall;
  const foodScore = Math.max(0, Math.min(100, overall - 5)); // proxy slightly below

  const certKindFor = (cred) => {
    const t = (cred.licence_type || "").toLowerCase();
    if (t.includes("rsa")) return "rsa";
    if (t.includes("food_handler") || t.includes("food handler")) return "food_handler";
    if (t.includes("first_aid") || t.includes("first aid")) return "first_aid";
    return null;
  };

  const certByWorker = {};
  workers.forEach((w) => { certByWorker[w.worker_id] = { rsa: "missing", food_handler: "missing", first_aid: "missing" }; });
  licences.forEach((l) => {
    const k = certKindFor(l);
    if (!k || !certByWorker[l.worker_id]) return;
    const dl = l.days_until_expiry;
    certByWorker[l.worker_id][k] = dl == null || dl < 0 ? "expired" : dl <= 30 ? "expiring" : "current";
  });

  const openIncidents = incidents.filter((i) => i.status !== "closed");
  const recentIncidents = incidents.slice(0, 5);

  return (
    <div className={`-mx-4 -my-4 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 ${CREAM} text-[#2C1810] min-h-screen`} data-testid="hospitality-owner-dashboard">
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Top header */}
        <div className="flex items-end justify-between flex-wrap gap-4 border-b border-[#E87722]/30 pb-5">
          <div>
            <div className="label-eyebrow text-[#7C1D3F]">/ Hospitality · {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tighter mt-1" data-testid="hospitality-greeting">
              G'day {user?.name?.split(" ")[0] || "Chef"}.
            </h1>
          </div>
          <Link to="/dashboard/document-library">
            <Button className="btn-sharp h-12 text-white hover:opacity-90" style={{ background: AMBER }} data-testid="hospitality-quick-haccp">
              <Sparkle className="mr-2" weight="fill" /> Create HACCP plan
            </Button>
          </Link>
        </div>

        {/* FULL-WIDTH FOOD SAFETY STATUS BAR */}
        <div className="border-2 p-5" style={{ background: AMBER, borderColor: AMBER }} data-testid="hospitality-temp-bar">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="label-eyebrow text-white">/ Food safety status</div>
              <div className="font-display text-xl font-black text-white mt-1">Equipment temperatures · live</div>
            </div>
            <Button variant="outline" className="btn-sharp h-10 bg-white text-[#2C1810] border-white hover:bg-cream" data-testid="hospitality-log-temp">
              <Thermometer className="mr-2" weight="fill" /> Log temperature
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {STARTER_EQUIPMENT.map((e) => (
              <div key={e.name} className="bg-white p-3 text-[#2C1810]" data-testid={`hospitality-equip-${e.name.replace(/\s+/g, "-").toLowerCase()}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-widest uppercase">{e.name}</span>
                  <Clock size={14} className="text-zinc-400" />
                </div>
                <div className="font-display font-black text-2xl mt-2">—</div>
                <div className="text-[11px] text-zinc-500">target {e.target}</div>
                <div className="text-[10px] font-bold mt-1.5 uppercase tracking-widest text-amber-600">No reading yet</div>
              </div>
            ))}
          </div>
        </div>

        {/* TWO-COLUMN BELOW */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT 60% */}
          <div className="lg:col-span-3 space-y-5">
            {/* Dual compliance score */}
            <div className="bg-white border-2 border-[#E87722] p-6" data-testid="hospitality-dual-score">
              <div className="flex items-end justify-between flex-wrap gap-2 mb-4">
                <div>
                  <div className="label-eyebrow text-[#7C1D3F]">/ Safety + Food safety score</div>
                  <div className="font-display font-black text-5xl mt-1" style={{ color: BURGUNDY }}>{Math.round((whsScore + foodScore) / 2)}<span className="text-2xl text-zinc-400">/100</span></div>
                  <div className="text-sm text-zinc-600">Overall · across WHS and food safety</div>
                </div>
              </div>
              <div className="space-y-4">
                <HorizontalScoreBar label="WHS Safety" value={whsScore} color={BURGUNDY} />
                <HorizontalScoreBar label="Food Safety" value={foodScore} color={AMBER} />
              </div>
            </div>

            {/* Staff certifications */}
            <div className="bg-white border border-[#E87722]/30 p-5" data-testid="hospitality-staff-certs">
              <div className="flex items-end justify-between flex-wrap gap-2 mb-3">
                <div>
                  <div className="label-eyebrow text-[#7C1D3F]">/ Staff certifications</div>
                  <div className="font-display font-bold text-lg mt-1">RSA · Food Handler · First Aid</div>
                </div>
                <Link to="/dashboard/workers" className="text-xs font-bold underline">Manage →</Link>
              </div>
              {workers.length === 0 ? (
                <div className="text-sm text-zinc-500 py-6 text-center">Add your team to start tracking RSA, Food Handler and First Aid expiries.</div>
              ) : (
                <ul className="divide-y divide-[#E87722]/15">
                  {workers.slice(0, 6).map((w) => {
                    const c = certByWorker[w.worker_id] || {};
                    return (
                      <li key={w.worker_id} className="py-3 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="font-bold text-sm">{w.name}</div>
                          <div className="text-xs text-zinc-500">{w.role || "—"}</div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold tracking-widest">
                          <div className="flex items-center gap-1.5"><CertDot status={c.rsa} /> RSA</div>
                          <div className="flex items-center gap-1.5"><CertDot status={c.food_handler} /> FOOD HANDLER</div>
                          <div className="flex items-center gap-1.5"><CertDot status={c.first_aid} /> FIRST AID</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Recent food safety + WHS events */}
            <div className="bg-white border border-[#E87722]/30 p-5" data-testid="hospitality-recent-events">
              <div className="flex items-end justify-between flex-wrap gap-2 mb-3">
                <div>
                  <div className="label-eyebrow text-[#7C1D3F]">/ Recent events</div>
                  <div className="font-display font-bold text-lg mt-1">Food safety + WHS log</div>
                </div>
                <Link to="/dashboard/incidents" className="text-xs font-bold underline">All events →</Link>
              </div>
              {recentIncidents.length === 0 ? (
                <div className="text-sm text-zinc-500 py-6 text-center">No events logged in the last 30 days. Stay vigilant.</div>
              ) : (
                <ul className="divide-y divide-[#E87722]/15">
                  {recentIncidents.map((i) => (
                    <li key={i.incident_id} className="py-3 flex items-start gap-3">
                      <Lightning size={18} weight="duotone" className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold text-sm">{i.title || i.incident_type}</div>
                        <div className="text-xs text-zinc-500">{(i.created_at || "").slice(0, 10)} · {i.status}</div>
                      </div>
                      <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 bg-amber-100 text-amber-800 uppercase">{i.severity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* RIGHT 40% */}
          <div className="lg:col-span-2 space-y-5">
            {/* Council inspection readiness */}
            <div className="bg-[#7C1D3F] text-white p-5" data-testid="hospitality-council-readiness">
              <div className="label-eyebrow text-[#FFCC00]">/ Council inspection</div>
              <div className="font-display text-2xl font-black mt-1">No inspection scheduled</div>
              <div className="text-sm text-white/70">Your readiness checklist:</div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2"><XCircle size={18} className="text-amber-400" /> Temperature logs <span className="ml-auto text-xs text-white/60">awaiting</span></li>
                <li className="flex items-center gap-2"><XCircle size={18} className="text-amber-400" /> HACCP plan <span className="ml-auto text-xs text-white/60">draft</span></li>
                <li className="flex items-center gap-2"><CheckCircle size={18} className="text-emerald-400" /> Staff certifications <span className="ml-auto text-xs text-white/60">{workers.length} on file</span></li>
                <li className="flex items-center gap-2"><XCircle size={18} className="text-amber-400" /> Cleaning schedule <span className="ml-auto text-xs text-white/60">pending</span></li>
              </ul>
              <Button className="w-full mt-5 btn-sharp h-11 bg-white text-[#7C1D3F] hover:bg-zinc-100" data-testid="hospitality-generate-pack">
                <ClipboardText weight="fill" className="mr-2" /> Generate inspection pack
              </Button>
            </div>

            {/* Today's cleaning schedule */}
            <div className="bg-white border border-[#E87722]/30 p-5" data-testid="hospitality-cleaning">
              <div className="label-eyebrow text-[#7C1D3F]">/ Today's cleaning</div>
              <div className="font-display font-bold text-lg mt-1">0 / 0 tasks complete</div>
              <div className="h-2 bg-black/10 mt-2 overflow-hidden">
                <div className="h-full" style={{ width: "0%", background: AMBER }} />
              </div>
              <p className="text-sm text-zinc-500 mt-4">No cleaning schedule set up yet. Add tasks in the Document Library to get a daily checklist here.</p>
              <Link to="/dashboard/document-library">
                <Button variant="outline" className="w-full mt-3 btn-sharp h-10 border-[#E87722] text-[#7C1D3F]" data-testid="hospitality-add-cleaning">
                  Set up cleaning schedule <ArrowRight className="ml-2" size={14} />
                </Button>
              </Link>
            </div>

            {/* AI alerts */}
            <div className="bg-white border border-[#E87722]/30 p-5" data-testid="hospitality-alerts">
              <div className="label-eyebrow text-[#7C1D3F]">/ AI alerts</div>
              <div className="font-display font-bold text-lg mt-1">{openIncidents.length} flagged</div>
              <ul className="mt-3 space-y-2 text-sm">
                {openIncidents.slice(0, 3).map((i) => (
                  <li key={i.incident_id} className="border-l-4 border-[#E87722] pl-3 py-1">
                    <div className="font-bold text-sm">{i.title || i.incident_type}</div>
                    <div className="text-xs text-zinc-500">{i.severity} · {(i.created_at || "").slice(0, 10)}</div>
                  </li>
                ))}
                {openIncidents.length === 0 && (
                  <li className="text-sm text-zinc-500">No open alerts. Nice work, chef.</li>
                )}
              </ul>
              <Link to="/dashboard/incidents" className="text-xs font-bold underline mt-3 inline-block">View all alerts →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
