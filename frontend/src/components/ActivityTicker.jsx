import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Pulse, Sparkle } from "@phosphor-icons/react";

/**
 * Live "today on SafeBase" activity ticker. Polls the public aggregate
 * endpoint every 60s. Renders as a thin sticky strip above the dashboard
 * content. Each metric pulses on update. Drives FOMO / social proof.
 */
export default function ActivityTicker() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await api.get("/public/safebase-activity/today");
        if (!cancelled) setData(r.data);
      } catch (_e) { /* silent — ticker is non-essential */ }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (!data) return null;
  const items = [
    { label: "SWMS generated", value: data.swms_generated },
    { label: "Incidents logged", value: data.incidents_logged },
    { label: "Inductions completed", value: data.inductions_completed },
    { label: "Documents generated", value: data.documents_generated },
    { label: "Toolbox talks conducted", value: data.toolbox_talks_conducted },
    { label: "New businesses this week", value: data.new_businesses_this_week, suffix: "this week" },
  ].filter((i) => (i.value || 0) > 0);

  if (items.length === 0) {
    // First-day fallback so the ticker isn't empty
    items.push({ label: "platform live since 2025", value: "🟢", silent: true });
  }

  return (
    <div className="bg-ink text-warning border-y border-warning/20 overflow-hidden" data-testid="activity-ticker">
      <div className="max-w-7xl mx-auto flex items-center gap-2 px-4 lg:px-8 py-2 text-xs font-mono">
        <span className="flex items-center gap-1.5 shrink-0">
          <Pulse weight="fill" className="text-emerald-400 animate-pulse" size={14} />
          <span className="font-bold uppercase tracking-widest">Live · today on SafeBase</span>
        </span>
        <div className="flex-1 flex flex-wrap items-center gap-x-5 gap-y-1 overflow-hidden">
          {items.map((it, idx) => (
            <span key={idx} className="flex items-center gap-1.5 whitespace-nowrap" data-testid={`ticker-item-${idx}`}>
              {!it.silent && <Sparkle size={10} className="text-warning/60" />}
              <span className="font-bold text-white">{it.value}</span>
              <span className="text-white/70">{it.label}</span>
              {it.suffix && <span className="text-white/40 italic">· {it.suffix}</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
