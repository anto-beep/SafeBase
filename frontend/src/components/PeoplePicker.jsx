import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { User, MagnifyingGlass, X, Check, CaretDown } from "@phosphor-icons/react";

/**
 * PeoplePicker — reusable person/people resolver used across SafeBase.
 *
 * Backend contract:
 *   GET /api/users/picker?q=&include_me=true&limit=20
 *   Returns: [{user_id, worker_id, display_name, email, role, source_type}, ...]
 *
 * Stored value SHAPE (never a plain string):
 *   {user_id, worker_id, display_name, email, role, source_type}
 *
 * Props:
 *   value          — single object (or null) OR array of objects when multi.
 *   onChange       — receives the new value in the same shape.
 *   multi          — boolean. If true, value is an array.
 *   includeMe      — boolean (default true). Pins "Me" first.
 *   placeholder    — input placeholder.
 *   testId         — data-testid prefix (default "people-picker").
 *
 * Backward-compat: if `value` is a plain string (legacy data), it renders as
 * display_name only and offers a "Replace" pill to repick.
 */
export function PeoplePicker({
  value,
  onChange,
  multi = false,
  includeMe = true,
  placeholder = "Search people…",
  testId = "people-picker",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const isLegacyString = typeof value === "string" && value.length > 0;
  const selected = multi
    ? (Array.isArray(value) ? value : [])
    : (value && typeof value === "object" ? value : null);

  const fetchResults = async (query) => {
    setLoading(true);
    try {
      const r = await api.get("/users/picker", {
        params: { q: query || "", include_me: includeMe ? "true" : "false", limit: 20 },
      });
      setResults(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(q), 180);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [q, open, includeMe]);

  const isSelected = (row) => {
    if (multi) {
      return selected.some(
        (s) =>
          (row.user_id && s.user_id === row.user_id) ||
          (row.worker_id && s.worker_id === row.worker_id)
      );
    }
    if (!selected) return false;
    return (
      (row.user_id && selected.user_id === row.user_id) ||
      (row.worker_id && selected.worker_id === row.worker_id)
    );
  };

  const stripMe = (row) => {
    // Normalise "Me (Display Name)" → just the display_name for storage.
    if (row.source_type === "me") {
      const m = (row.display_name || "").match(/^Me \((.+)\)$/);
      return { ...row, display_name: m ? m[1] : row.display_name };
    }
    return row;
  };

  const pick = (row) => {
    const v = stripMe(row);
    if (multi) {
      if (isSelected(row)) {
        onChange(selected.filter((s) => !(
          (v.user_id && s.user_id === v.user_id) ||
          (v.worker_id && s.worker_id === v.worker_id)
        )));
      } else {
        onChange([...selected, v]);
      }
    } else {
      onChange(v);
      setOpen(false);
      setQ("");
    }
  };

  const clear = (target = null) => {
    if (multi) {
      onChange(selected.filter((s) => s !== target));
    } else {
      onChange(null);
    }
  };

  // Render selected pill(s) summary on the trigger
  const triggerLabel = () => {
    if (isLegacyString) return value;
    if (multi) {
      if (selected.length === 0) return placeholder;
      if (selected.length === 1) return selected[0].display_name;
      return `${selected.length} people`;
    }
    if (!selected) return placeholder;
    return selected.display_name;
  };

  return (
    <div className="space-y-1" data-testid={testId}>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) fetchResults(""); }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={`btn-sharp border-ink h-9 w-full justify-between font-normal ${(!selected && !isLegacyString && (!multi || selected?.length === 0)) ? "text-muted-foreground" : ""}`}
            data-testid={`${testId}-trigger`}
          >
            <span className="flex items-center gap-2 truncate">
              <User size={14} weight="bold" />
              <span className="truncate">{triggerLabel()}</span>
              {isLegacyString && (
                <span className="text-[9px] uppercase tracking-widest bg-amber-100 text-amber-900 px-1.5 py-0.5">legacy</span>
              )}
            </span>
            <CaretDown size={14} className="opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] border-ink" align="start">
          <div className="border-b border-border p-2 flex items-center gap-2">
            <MagnifyingGlass size={14} className="text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, role…"
              className="h-8 border-0 focus-visible:ring-0 px-1"
              data-testid={`${testId}-input`}
            />
          </div>
          <div className="max-h-64 overflow-y-auto" data-testid={`${testId}-results`}>
            {loading && <div className="p-3 text-xs text-muted-foreground">Searching…</div>}
            {!loading && results.length === 0 && (
              <div className="p-3 text-xs text-muted-foreground">No matches.</div>
            )}
            {!loading && results.map((row, i) => {
              const sel = isSelected(row);
              return (
                <button
                  key={`${row.user_id || ""}-${row.worker_id || ""}-${i}`}
                  type="button"
                  onClick={() => pick(row)}
                  className={`w-full text-left flex items-start gap-2 px-3 py-2 border-b border-border last:border-b-0 hover:bg-muted ${sel ? "bg-muted" : ""}`}
                  data-testid={`${testId}-row-${row.user_id || row.worker_id || i}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {row.source_type === "me" ? (
                      <span className="inline-flex w-7 h-7 items-center justify-center bg-warning text-ink font-black text-xs">ME</span>
                    ) : (
                      <span className="inline-flex w-7 h-7 items-center justify-center bg-ink text-white">
                        <User size={12} weight="bold" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold truncate">{row.display_name}</div>
                      {row.source_type === "worker" && (
                        <span className="text-[9px] uppercase tracking-widest bg-muted text-muted-foreground px-1.5 py-0.5">worker</span>
                      )}
                      {row.source_type === "me" && (
                        <span className="text-[9px] uppercase tracking-widest bg-warning text-ink px-1.5 py-0.5">me</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {row.email || row.role}
                      {row.email && row.role ? ` · ${row.role}` : ""}
                    </div>
                  </div>
                  {sel && <Check size={16} weight="bold" className="text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected chips (multi) */}
      {multi && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid={`${testId}-chips`}>
          {selected.map((s, i) => (
            <span
              key={`${s.user_id || ""}-${s.worker_id || ""}-${i}`}
              className="inline-flex items-center gap-1 text-xs bg-muted border border-border px-2 py-0.5"
            >
              {s.display_name}
              <button
                type="button"
                onClick={() => clear(s)}
                className="text-muted-foreground hover:text-ink"
                aria-label={`Remove ${s.display_name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Clear button (single) */}
      {!multi && selected && !disabled && (
        <button
          type="button"
          onClick={() => clear()}
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-ink"
          data-testid={`${testId}-clear`}
        >
          Clear
        </button>
      )}
      {!multi && isLegacyString && (
        <button
          type="button"
          onClick={() => { onChange(null); setOpen(true); }}
          className="text-[10px] uppercase tracking-widest text-amber-700 hover:underline"
          data-testid={`${testId}-replace-legacy`}
        >
          Replace legacy value
        </button>
      )}
    </div>
  );
}

export default PeoplePicker;

/**
 * Helper: take a stored people-picker value (object | string | null) and
 * return a safe display string for read-only UI (e.g. tables, audit log).
 */
export function personLabel(v) {
  if (!v) return "—";
  if (typeof v === "string") return v;
  return v.display_name || v.email || v.user_id || "—";
}
