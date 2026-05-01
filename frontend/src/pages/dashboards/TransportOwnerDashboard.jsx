/**
 * TransportOwnerDashboard — dark charcoal command-centre theme.
 * Layout: full-width fleet status strip (horizontal scroll) → three-column
 * below (left: drivers compliance today; centre: dual gauges + CoR matrix;
 * right: AI alerts + recent trips).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  Truck, Lightning, Sparkle, ArrowRight, Plus, Warning, ShieldCheck,
  CheckCircle, XCircle, ClockCounterClockwise,
} from "@phosphor-icons/react";

const CHARCOAL = "bg-[#1C2526]";
const CHARCOAL_2 = "bg-[#252F30]";
const TEAL = "#0DC4B5";
const ORANGE = "#FF6B35";

function MiniGauge({ value, color, label }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div className="text-center" data-testid={`transport-gauge-${label.toLowerCase()}`}>
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        <circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="9" fill="none" />
        <circle cx="50" cy="50" r={r} stroke={color} strokeWidth="9" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="square" transform="rotate(-90 50 50)" />
        <text x="50" y="54" textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff">{value}</text>
      </svg>
      <div className="font-display font-black text-sm tracking-widest text-white/60 mt-1">{label}</div>
    </div>
  );
}

function CorRow({ label, status }) {
  const map = {
    ok: { icon: CheckCircle, color: "text-emerald-400" },
    warn: { icon: Warning, color: "text-amber-400" },
    fail: { icon: XCircle, color: "text-red-500" },
  };
  const Icon = map[status].icon;
  return (
    <div className="flex items-center gap-2 text-sm py-1.5 border-b border-white/5 last:border-0" data-testid={`transport-cor-${label.replace(/\s+/g, "-").toLowerCase()}`}>
      <Icon size={16} className={map[status].color} />
      <span className="text-white/80">{label}</span>
    </div>
  );
}

const STARTER_FLEET = [
  { rego: "ABC-123", type: "HC Prime mover", driver: null },
  { rego: "DEF-456", type: "HR Rigid 12T", driver: null },
];

export default function TransportOwnerDashboard() {
  const { user } = useAuth();
  const [score, setScore] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    api.get("/compliance/score").then((r) => setScore(r.data)).catch(() => {});
    api.get("/incidents").then((r) => setIncidents(r.data || [])).catch(() => {});
    api.get("/workers").then((r) => setWorkers(r.data || [])).catch(() => {});
  }, []);

  const overall = score?.score ?? 0;
  const whsScore = overall;
  const corScore = Math.max(0, Math.min(100, overall - 8));
  const drivers = workers.slice(0, 5);
  const recentIncidents = incidents.slice(0, 4);

  return (
    <div className={`-mx-4 -my-4 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 ${CHARCOAL} text-white min-h-screen`} data-testid="transport-owner-dashboard">
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Top header */}
        <div className="flex items-end justify-between flex-wrap gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="label-eyebrow" style={{ color: TEAL }}>/ Transport command · {new Date().toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</div>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tighter mt-1" data-testid="transport-greeting">
              {user?.name?.split(" ")[0] || "Operator"} · Fleet Control
            </h1>
          </div>
          <Link to="/dashboard/document-library">
            <Button className="btn-sharp h-12 hover:opacity-90 text-white" style={{ background: ORANGE }} data-testid="transport-quick-cor">
              <Sparkle className="mr-2" weight="fill" /> Generate CoR plan
            </Button>
          </Link>
        </div>

        {/* FLEET STATUS STRIP */}
        <div className={`${CHARCOAL_2} p-5`} data-testid="transport-fleet-strip">
          <div className="flex items-center justify-between mb-3">
            <div className="label-eyebrow" style={{ color: TEAL }}>/ Fleet status</div>
            <Link to="/dashboard/document-library" className="text-xs font-bold tracking-widest text-white/60 hover:text-white">+ ADD VEHICLE</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {STARTER_FLEET.map((v) => (
              <div key={v.rego} className="bg-black/30 border border-white/10 p-4 min-w-[220px]" data-testid={`transport-vehicle-${v.rego.toLowerCase()}`}>
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-base tracking-tight">{v.rego}</span>
                  <Truck weight="duotone" size={20} className="text-white/40" />
                </div>
                <div className="text-xs text-white/60 mt-1">{v.type}</div>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold tracking-widest">
                  <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300">IN DEPOT</span>
                  <span className="px-2 py-0.5 bg-amber-900/40 text-amber-300">PRE-TRIP DUE</span>
                </div>
                <div className="text-xs text-white/50 mt-2">No driver assigned</div>
              </div>
            ))}
            <Link to="/dashboard/document-library" className="border-2 border-dashed border-white/20 p-4 min-w-[160px] flex flex-col items-center justify-center hover:border-white/50 transition-colors">
              <Plus size={28} className="text-white/40" />
              <span className="text-xs font-bold tracking-widest text-white/40 mt-2">ADD VEHICLE</span>
            </Link>
          </div>
        </div>

        {/* THREE-COLUMN BELOW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT 35% — drivers compliance */}
          <div className={`lg:col-span-4 ${CHARCOAL_2} p-5`} data-testid="transport-driver-compliance">
            <div className="label-eyebrow" style={{ color: TEAL }}>/ Today's drivers</div>
            <div className="font-display font-black text-xl mt-1">{drivers.length} on roster</div>
            {drivers.length === 0 ? (
              <div className="text-sm text-white/60 py-6 text-center">No drivers added yet. Add your first driver to start tracking fitness for duty + fatigue.</div>
            ) : (
              <ul className="mt-4 divide-y divide-white/10">
                {drivers.map((d) => (
                  <li key={d.worker_id} className="py-3 flex items-center gap-3" data-testid={`transport-driver-${d.worker_id}`}>
                    <div className="w-8 h-8 flex items-center justify-center font-display font-black" style={{ background: TEAL, color: "#000" }}>{d.name?.[0]}</div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{d.name}</div>
                      <div className="text-xs text-white/50">{d.role || "Driver"}</div>
                    </div>
                    <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 bg-amber-900/40 text-amber-300">PENDING FFD</span>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" className="w-full mt-4 btn-sharp h-10 border-white/20 text-white hover:bg-white/10 bg-transparent" data-testid="transport-send-ffd">
              <Lightning className="mr-2" size={14} /> Send FFD reminder
            </Button>
          </div>

          {/* CENTRE 30% — dual gauge + CoR matrix */}
          <div className={`lg:col-span-4 space-y-4`}>
            <div className={`${CHARCOAL_2} p-5`} data-testid="transport-dual-score">
              <div className="label-eyebrow" style={{ color: TEAL }}>/ Compliance</div>
              <div className="flex items-center justify-around mt-3">
                <MiniGauge value={whsScore} color={TEAL} label="WHS" />
                <MiniGauge value={corScore} color={ORANGE} label="CoR" />
              </div>
              <div className="text-center mt-2 text-sm">
                Overall <span className="font-display font-black text-2xl text-white">{Math.round((whsScore + corScore) / 2)}</span><span className="text-white/40">/100</span>
              </div>
            </div>

            <div className={`${CHARCOAL_2} p-5`} data-testid="transport-cor-matrix">
              <div className="label-eyebrow" style={{ color: ORANGE }}>/ CoR management</div>
              <div className="font-display font-bold text-base mt-1 mb-2">Six elements · current status</div>
              <CorRow label="Fatigue management" status="warn" />
              <CorRow label="Speed management" status="ok" />
              <CorRow label="Mass and dimension" status="ok" />
              <CorRow label="Load restraint" status="warn" />
              <CorRow label="Vehicle standards" status="ok" />
              <CorRow label="Scheduling and dispatch" status="warn" />
            </div>
          </div>

          {/* RIGHT 35% — AI alerts */}
          <div className="lg:col-span-4 space-y-4">
            <div className={`${CHARCOAL_2} p-5`} data-testid="transport-ai-alerts">
              <div className="label-eyebrow" style={{ color: ORANGE }}>/ AI alerts</div>
              <div className="font-display font-black text-xl mt-1">{recentIncidents.length} active</div>
              <ul className="mt-3 space-y-2">
                {recentIncidents.length === 0 && (
                  <li className="text-sm text-white/60">All clear. No CoR breaches detected.</li>
                )}
                {recentIncidents.map((i) => (
                  <li key={i.incident_id} className="border-l-4 pl-3 py-1.5" style={{ borderColor: ORANGE }}>
                    <div className="font-bold text-sm">{i.title || i.incident_type}</div>
                    <div className="text-xs text-white/50">{(i.created_at || "").slice(0, 10)} · {i.severity}</div>
                  </li>
                ))}
              </ul>
              <Link to="/dashboard/incidents" className="text-xs font-bold underline mt-3 inline-block" style={{ color: ORANGE }}>View all →</Link>
            </div>

            <div className={`${CHARCOAL_2} p-5`} data-testid="transport-recent-trips">
              <div className="label-eyebrow" style={{ color: TEAL }}>/ Recent trips</div>
              <div className="font-display font-bold text-base mt-1">No trip data yet</div>
              <p className="text-sm text-white/60 mt-2">When you log fitness-for-duty declarations and pre-trip inspections, recent trips appear here.</p>
              <Link to="/dashboard/document-library" className="text-xs font-bold underline mt-3 inline-block" style={{ color: TEAL }}>Start logging trips →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
