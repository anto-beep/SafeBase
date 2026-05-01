/**
 * SafetyLeadDashboard — compliance-lead variant.
 * Compliance score dominant + incidents + risk register + corrective actions.
 *
 * Renders for users whose role.variant === "safety_lead"
 * (Safety Officer / WHS Manager / Clinical Governance / Food Safety Supervisor).
 */
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Warning, ChartLineUp, Lightbulb, ArrowRight, ListChecks,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import useIndustry from "@/hooks/useIndustry";

function ScoreRing({ value }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const color = value >= 80 ? "#0A0A0A" : value >= 50 ? "#FFCC00" : "#DC2626";
  return (
    <svg viewBox="0 0 140 140" className="w-44 h-44">
      <circle cx="70" cy="70" r={r} stroke="rgba(0,0,0,0.08)" strokeWidth="14" fill="none" />
      <circle cx="70" cy="70" r={r} stroke={color} strokeWidth="14" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="square" transform="rotate(-90 70 70)" />
      <text x="70" y="70" textAnchor="middle" dy="0.1em" className="font-display" fontSize="40" fontWeight="900" fill="#0A0A0A">{value}</text>
      <text x="70" y="92" textAnchor="middle" fontSize="9" letterSpacing="3" fontWeight="700" fill="#666">SCORE</text>
    </svg>
  );
}

export default function SafetyLeadDashboard() {
  const { user } = useAuth();
  const { meta, term } = useIndustry();
  const [score, setScore] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [risks, setRisks] = useState([]);

  useEffect(() => {
    api.get("/compliance/score").then((r) => setScore(r.data)).catch(() => {});
    api.get("/incidents").then((r) => setIncidents(r.data || [])).catch(() => {});
    api.get("/risks").then((r) => setRisks(r.data || [])).catch(() => {});
  }, []);

  const openInc = incidents.filter((i) => i.status !== "closed");
  const seriousInc = incidents.filter((i) => ["serious", "critical"].includes(i.severity));
  const highRisks = (risks || []).filter((r) => (r.residual_risk_score || r.inherent_risk_score || 0) >= 15);

  return (
    <div className="space-y-6" data-testid="safety-lead-dashboard">
      <div className="border-b border-border pb-5">
        <div className="label-eyebrow">/ Compliance lead view · {meta?.badge}</div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-1">G'day, {user?.name?.split(" ")[0]}.</h1>
        <p className="text-sm text-muted-foreground mt-1">Score, incidents, risk register, corrective actions — your daily focus.</p>
      </div>

      {/* Compliance score takes the centre */}
      <div className="bg-background border-2 border-ink p-6 grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="safety-lead-score">
        <div className="md:col-span-1 flex items-center justify-center">
          <ScoreRing value={score?.score ?? 0} />
        </div>
        <div className="md:col-span-2">
          <div className="label-eyebrow">/ {meta?.badge || "Industry"} Compliance</div>
          <div className="font-display text-3xl font-black mt-1">
            {(score?.score ?? 0) >= 80 ? "Audit ready" : (score?.score ?? 0) >= 50 ? "Action needed" : "At risk"}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Live across documents, licences, incidents and corrective actions for your {term.site_plural}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/dashboard/reports"><Button className="btn-sharp h-10 bg-ink text-white hover:bg-authority">View full report</Button></Link>
            <Link to="/dashboard/risk-register"><Button variant="outline" className="btn-sharp h-10 border-ink">Risk register</Button></Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-600 text-white p-5" data-testid="safety-lead-stat-incidents">
          <Warning weight="fill" size={28} />
          <div className="font-display font-black text-4xl mt-3">{openInc.length}</div>
          <div className="label-eyebrow text-white/90 mt-1">OPEN INCIDENTS</div>
          <Link to="/dashboard/incidents" className="text-sm underline mt-2 inline-block">Open register →</Link>
        </div>
        <div className="bg-warning text-ink p-5" data-testid="safety-lead-stat-serious">
          <ShieldCheck weight="fill" size={28} />
          <div className="font-display font-black text-4xl mt-3">{seriousInc.length}</div>
          <div className="label-eyebrow mt-1">SERIOUS / CRITICAL</div>
          <Link to="/dashboard/incidents" className="text-sm underline mt-2 inline-block">Investigate →</Link>
        </div>
        <div className="bg-ink text-warning p-5" data-testid="safety-lead-stat-risks">
          <ChartLineUp weight="fill" size={28} />
          <div className="font-display font-black text-4xl mt-3 text-white">{highRisks.length}</div>
          <div className="label-eyebrow mt-1">HIGH RESIDUAL RISKS</div>
          <Link to="/dashboard/risk-register" className="text-sm underline mt-2 inline-block">Review →</Link>
        </div>
      </div>

      <div className="bg-muted border border-border p-5" data-testid="safety-lead-actions">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="label-eyebrow">/ Daily focus</div>
            <div className="font-display font-black text-xl mt-1">Corrective actions due this week</div>
          </div>
          <Link to="/dashboard/reports"><Button variant="outline" className="btn-sharp h-10 border-ink">View all</Button></Link>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex items-start gap-2"><Lightbulb weight="duotone" className="text-warning shrink-0" />Close any open incidents older than 14 days.</li>
          <li className="flex items-start gap-2"><ListChecks weight="duotone" className="text-warning shrink-0" />Review residual scores for risks last reviewed &gt; 12 months ago.</li>
          <li className="flex items-start gap-2"><ShieldCheck weight="duotone" className="text-warning shrink-0" />Confirm SWMS revisions linked to failed control reviews are completed.</li>
        </ul>
        <div className="mt-4">
          <Link to="/dashboard/incidents/new"><Button className="btn-sharp h-10 bg-ink text-white hover:bg-authority">Log incident <ArrowRight className="ml-2" /></Button></Link>
        </div>
      </div>
    </div>
  );
}
