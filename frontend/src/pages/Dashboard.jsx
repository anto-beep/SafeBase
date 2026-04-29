import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Warning, IdentificationBadge, Users, ChartLineUp, Sparkle, CheckCircle } from "@phosphor-icons/react";

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
  { key: "documents", label: "Documents", icon: FileText, link: "/dashboard/documents" },
  { key: "incidents_open", label: "Open Incidents", icon: Warning, link: "/dashboard/incidents" },
  { key: "workers", label: "Workers", icon: Users, link: "/dashboard/workers" },
  { key: "licences_expiring_30d", label: "Licences expiring", icon: IdentificationBadge, link: "/dashboard/licences" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/compliance/score").then((r) => setData(r.data)).catch(() => {}); }, []);

  return (
    <div className="space-y-6" data-testid="dashboard-overview">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ Overview · {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">G'day, {user?.name?.split(" ")[0] || "Tradie"}.</h1>
        </div>
        <Link to="/dashboard/documents"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="quick-generate-btn"><Sparkle className="mr-2" weight="fill" />Generate document</Button></Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-background border border-border p-6">
          <div className="label-eyebrow mb-2">Compliance Score</div>
          <div className="flex items-center gap-6">
            <ScoreRing value={data?.score ?? 0} />
            <div className="flex-1">
              <div className="font-display text-2xl font-bold leading-tight">{data?.score >= 80 ? "Audit ready" : data?.score >= 50 ? "Action needed" : "At risk"}</div>
              <div className="text-sm text-muted-foreground mt-1">Live across documents, licences, incidents.</div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 bg-ink text-white p-6">
          <div className="label-eyebrow text-warning mb-3">/ AI Compliance Intelligence</div>
          <ul className="space-y-2">
            {(data?.insights || ["Loading insights…"]).map((i, idx) => (
              <li key={idx} className="flex gap-3 text-sm border-b border-white/10 pb-2 last:border-0">
                <ChartLineUp weight="duotone" className="text-warning shrink-0" /> {i}
              </li>
            ))}
          </ul>
        </div>
      </div>

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
    </div>
  );
}
