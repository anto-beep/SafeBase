import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Warning, MagnifyingGlass, ShieldWarning, Plus } from "@phosphor-icons/react";

/**
 * Hazard Library — industry-specific catalogue of common workplace hazards.
 * Read-only browsable register that feeds Risk Register risk creation.
 */
export default function HazardLibrary() {
  const nav = useNavigate();
  const [data, setData] = useState({ industry: "", total: 0, categories: [], hazards: [] });
  const [q, setQ] = useState("");
  const [openCode, setOpenCode] = useState(null);

  useEffect(() => {
    api.get("/hazard-library").then((r) => setData(r.data || {})).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return data.hazards || [];
    return (data.hazards || []).filter(
      (h) =>
        h.name.toLowerCase().includes(ql) ||
        h.description.toLowerCase().includes(ql) ||
        h.category.toLowerCase().includes(ql) ||
        (h.regulation || "").toLowerCase().includes(ql),
    );
  }, [q, data.hazards]);

  const detail = (data.hazards || []).find((h) => h.code === openCode);

  return (
    <div className="space-y-6" data-testid="hazard-library-page">
      <div className="border-b border-border pb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-eyebrow flex items-center gap-2">
            <ShieldWarning size={14} className="text-warning" />
            <span>Hazard Library · {data.industry}</span>
          </div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-2">Industry hazards.</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {data.total} common {data.industry} hazards, each mapped to typical consequences, controls, and the Australian regulation. Click any hazard to drill in.
          </p>
        </div>
        <div className="relative">
          <MagnifyingGlass size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search hazards…"
            className="h-10 rounded-none border-ink pl-7 w-72"
            data-testid="hazard-search"
          />
        </div>
      </div>

      {/* Cards grouped by category */}
      <div className="space-y-6">
        {(data.categories || []).map((cat) => {
          const items = cat.hazards.filter((h) => !q || filtered.includes(h));
          if (items.length === 0) return null;
          return (
            <div key={cat.category} data-testid={`hazard-cat-${cat.category}`}>
              <div className="label-eyebrow mb-3">{cat.category}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((h) => (
                  <button
                    key={h.code}
                    type="button"
                    onClick={() => setOpenCode(h.code)}
                    className="text-left border border-border bg-background p-4 hover:border-ink transition-colors"
                    data-testid={`hazard-${h.code}`}
                  >
                    <div className="flex items-center gap-2">
                      <Warning size={16} weight="bold" className="text-warning shrink-0" />
                      <div className="font-bold text-sm leading-tight">{h.name}</div>
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">{h.regulation}</div>
                    <div className="text-xs text-muted-foreground mt-2 line-clamp-2">{h.description}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => setOpenCode(null)}
          data-testid="hazard-detail-modal"
        >
          <div
            className="bg-background border border-ink max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="label-eyebrow">{detail.category} hazard</div>
            <h2 className="font-display text-3xl font-black mt-2">{detail.name}</h2>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              {detail.regulation}
            </div>
            <p className="text-sm mt-4">{detail.description}</p>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div>
                <div className="label-eyebrow mb-2">Typical consequences</div>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {detail.typical_consequences.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
              <div>
                <div className="label-eyebrow mb-2">Typical controls</div>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {detail.typical_controls.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={() => nav("/dashboard/risk-register/new", { state: { hazard: detail } })}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-ink text-white px-4 py-2 hover:bg-ink/90"
                data-testid="hazard-add-to-risk-register"
              >
                <Plus size={14} weight="bold" />
                Add to Risk Register
              </button>
              <button
                onClick={() => setOpenCode(null)}
                className="text-xs uppercase tracking-widest border border-ink px-4 py-2 hover:bg-ink hover:text-white"
                data-testid="hazard-detail-close"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
