import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Dashboard widget — shows open regulator cases with deadline & overdue state.
 * Visible to owners (and safety-managers later). Silent when no open cases.
 */
export default function RegulatorPipelineWidget() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("safetradie_token") || localStorage.getItem("safebase_token");
    axios.get(`${API}/api/regulator-pipeline/pending`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setCases(r.data.cases || []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!cases.length) return null; // Silent when nothing pending

  return (
    <Card className="p-6 bg-white border-2 border-destructive" data-testid="regulator-widget">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="label-eyebrow text-destructive">REGULATOR NOTIFICATIONS PENDING</div>
          <div className="font-display text-xl font-black tracking-tight mt-1" data-testid="regulator-widget-title">
            {cases.length} case{cases.length > 1 ? "s" : ""} awaiting submission
          </div>
        </div>
        <Link to="/dashboard/regulator-cases" className="text-sm underline font-semibold" data-testid="regulator-widget-link">
          Manage cases →
        </Link>
      </div>
      <ul className="space-y-2">
        {cases.slice(0, 3).map((c) => {
          const pipelines = (c.matches || []).map(m => m.pipeline).join(" · ");
          const overdue = c.overdue;
          return (
            <li key={c.id} className="flex items-center justify-between py-2 border-b last:border-b-0" data-testid={`regulator-case-${c.id}`}>
              <div>
                <div className="text-sm font-semibold">{c.incident_type || "Incident"} · {pipelines}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">{c.description}</div>
              </div>
              <Badge variant={overdue ? "destructive" : "outline"} className="shrink-0">
                {overdue ? "OVERDUE" : `${c.hours_remaining}h remaining`}
              </Badge>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
