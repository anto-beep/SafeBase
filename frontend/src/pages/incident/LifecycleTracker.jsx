import { CheckCircle, Warning } from "@phosphor-icons/react";
import { STAGES } from "./constants";

// Visual lifecycle tracker — always rendered at the top of an incident record.
// Given a lifecycle payload from the backend (nodes[] + current + overdue + total_days)
// it renders the 5 nodes, days-elapsed markers, and a red badge when overdue.
export default function LifecycleTracker({ lifecycle }) {
  if (!lifecycle) return null;
  const { nodes = [], current, overdue, total_days } = lifecycle;
  return (
    <div className="bg-background border-2 border-ink p-4" data-testid="lifecycle-tracker">
      <div className="flex items-center justify-between mb-3">
        <div className="label-eyebrow">/ Lifecycle</div>
        <div className="flex items-center gap-3 text-xs">
          {overdue && (
            <span className="bg-red-700 text-white px-2 py-0.5 font-bold tracking-widest" data-testid="lifecycle-overdue">
              <Warning weight="fill" className="inline mr-1" />OVERDUE
            </span>
          )}
          {typeof total_days === "number" && (
            <span className="text-muted-foreground">Total: <strong>{total_days}d</strong></span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between relative">
        {nodes.map((n, i) => {
          const meta = STAGES[i];
          const done = n.status === "done";
          const isCurrent = n.status === "current";
          const color = done ? "bg-emerald-600 text-white" : isCurrent ? "bg-ink text-warning animate-pulse" : "bg-muted text-muted-foreground";
          const overdueNode = isCurrent && overdue;
          return (
            <div key={n.stage} className="flex-1 flex items-center" data-testid={`lifecycle-node-${n.stage}`}>
              <div className="flex flex-col items-center z-10 min-w-[80px]">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${overdueNode ? "bg-red-700 text-white" : color}`}>
                  {done ? <CheckCircle weight="fill" /> : i + 1}
                </div>
                <div className="label-eyebrow text-[10px] mt-2 text-center">{meta?.label}</div>
                {n.ts && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.ts).toLocaleDateString("en-AU")}</div>
                )}
              </div>
              {i < nodes.length - 1 && (
                <div className="flex-1 relative h-10 flex items-center">
                  <div className="h-0.5 w-full bg-border" />
                  {typeof n.days_from_prev === "number" && i > 0 && (
                    <span className="absolute left-1/2 -translate-x-1/2 -top-1 text-[10px] text-muted-foreground bg-background px-2">
                      {n.days_from_prev}d
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
