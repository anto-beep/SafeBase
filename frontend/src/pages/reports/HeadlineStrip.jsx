/**
 * HeadlineStrip — AI-generated one-sentence weekly summary at the top of
 * /dashboard/reports. Driven by GET /api/analytics/headline (backed by
 * Claude Sonnet via emergentintegrations, cached 24h per account+site).
 */
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { Sparkle, ArrowsClockwise } from "@phosphor-icons/react";

export default function HeadlineStrip({ siteId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((force = false) => {
    setLoading(true);
    const params = new URLSearchParams({ site_id: siteId || "all" });
    if (force) params.set("force", "true");
    api.get(`/analytics/headline?${params.toString()}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [siteId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="bg-ink text-white border-2 border-warning p-4 flex items-start gap-3" data-testid="ai-headline-strip">
      <Sparkle weight="bold" className="text-warning flex-shrink-0 mt-1" size={20} />
      <div className="flex-1 min-w-0">
        <div className="label-eyebrow text-warning text-[10px]">This week's headline · AI-generated</div>
        <div className="font-display text-base md:text-lg font-bold mt-1 leading-snug" data-testid="ai-headline-text">
          {loading ? <span className="opacity-60 italic">Generating…</span> : (data?.headline || "No headline available.")}
        </div>
        {data?.generated_at && (
          <div className="text-[10px] text-white/40 mt-1">
            {data.cached ? "Cached" : "Just generated"} · {new Date(data.generated_at).toLocaleString("en-AU")}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => load(true)}
        disabled={loading}
        className="text-warning hover:text-white text-[10px] uppercase tracking-widest font-bold inline-flex items-center gap-1 flex-shrink-0"
        title="Regenerate headline (skip 24h cache)"
        data-testid="headline-refresh-btn"
      >
        <ArrowsClockwise weight="bold" size={12} />
        Refresh
      </button>
    </div>
  );
}
