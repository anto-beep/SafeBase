import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Tray as Inbox, Warning, ListChecks, ShieldWarning, ArrowSquareOut, Clock,
} from "@phosphor-icons/react";
import { personLabel } from "@/components/PeoplePicker";

/**
 * "Mentioned me" inbox — single "what's mine?" view that aggregates CAPA,
 * risk-owner, risk actions, and incident actions assigned to the current user.
 */
export default function MyInbox() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, open: 0, overdue: 0, by_kind: {} });
  const [filter, setFilter] = useState("all");

  const load = async () => {
    try {
      const [r, s] = await Promise.all([
        api.get("/me/inbox"),
        api.get("/me/inbox/summary"),
      ]);
      setItems(Array.isArray(r.data) ? r.data : []);
      setSummary(s.data || {});
    } catch (e) { /* */ }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "overdue") {
      const now = new Date().toISOString();
      return items.filter((i) => i.due_date && i.due_date < now && i.status !== "closed");
    }
    return items.filter((i) => i.kind === filter);
  }, [items, filter]);

  return (
    <div className="space-y-6" data-testid="inbox-page">
      <div className="border-b border-border pb-4">
        <div className="label-eyebrow flex items-center gap-2">
          <Inbox size={14} className="text-warning" />
          <span>My inbox</span>
        </div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-2">
          What's mine.
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Every CAPA, risk, and incident action assigned to you across this account — one view, no excuses.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="inbox-stats">
        <Stat label="Total" value={summary.total} icon={<Inbox weight="bold" />} />
        <Stat label="Open" value={summary.open} icon={<ListChecks className="text-blue-600" weight="bold" />} />
        <Stat label="Overdue" value={summary.overdue} icon={<Warning className="text-red-600" weight="bold" />} red={summary.overdue > 0} />
        <Stat label="Risk actions" value={(summary.by_kind?.risk_action || 0) + (summary.by_kind?.risk_owner || 0)} icon={<ShieldWarning weight="bold" />} />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3" data-testid="inbox-filters">
        {[
          ["all", "All"],
          ["overdue", "Overdue"],
          ["capa", "CAPA"],
          ["risk_owner", "Risks I own"],
          ["risk_action", "Risk actions"],
          ["incident_corrective_action", "Incident actions"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${
              filter === key
                ? "border-ink bg-ink text-white"
                : "border-border bg-background hover:border-ink"
            }`}
            data-testid={`inbox-filter-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2" data-testid="inbox-list">
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground italic py-12 text-center border border-dashed border-border">
            Nothing assigned to you in this view. Good to go.
          </div>
        )}
        {filtered.map((it) => {
          const overdue = it.due_date && it.due_date < new Date().toISOString() && it.status !== "closed";
          return (
            <div key={`${it.kind}-${it.id}`} className="border border-border bg-background p-3 flex items-start gap-3" data-testid={`inbox-item-${it.id}`}>
              <KindIcon kind={it.kind} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-bold text-sm truncate">{it.title}</div>
                  <span className="text-[9px] uppercase tracking-widest bg-muted text-muted-foreground px-1.5 py-0.5">
                    {it.kind.replace(/_/g, " ")}
                  </span>
                  {it.priority && (
                    <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 ${
                      it.priority === "critical" || it.priority === "high" ? "bg-red-100 text-red-800"
                      : it.priority === "medium" ? "bg-amber-100 text-amber-800"
                      : "bg-muted text-muted-foreground"
                    }`}>{it.priority}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {it.linked_entity_label && <span>{it.linked_entity_label} · </span>}
                  Assigned to {personLabel(it.assigned_to)}
                  {it.due_date && (
                    <span className={overdue ? "text-red-600 font-bold ml-2" : "ml-2"}>
                      <Clock size={10} className="inline -mt-0.5 mr-0.5" />
                      Due {new Date(it.due_date).toLocaleDateString("en-AU")}
                      {overdue && " · overdue"}
                    </span>
                  )}
                </div>
              </div>
              <Link
                to={it.open_url}
                className="text-xs underline shrink-0"
                data-testid={`inbox-open-${it.id}`}
              >
                Open <ArrowSquareOut size={11} className="inline -mt-0.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function Stat({ label, value, icon, red }) {
  return (
    <div className={`border bg-background p-4 flex items-center gap-3 ${red ? "border-red-500" : "border-border"}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-3xl font-display font-black">{value}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function KindIcon({ kind }) {
  if (kind === "capa") return <ListChecks size={20} weight="bold" className="text-amber-600 mt-0.5" />;
  if (kind === "risk_owner" || kind === "risk_action") return <ShieldWarning size={20} weight="bold" className="text-blue-600 mt-0.5" />;
  return <Warning size={20} weight="bold" className="text-red-600 mt-0.5" />;
}
