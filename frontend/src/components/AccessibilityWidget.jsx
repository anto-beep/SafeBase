/**
 * AccessibilityWidget — bottom-left floating button + menu.
 * UserWay-style: font size · contrast · dyslexia font · pause anim · highlight links · big cursor · reading guide · reset.
 * Persists to backend (when logged in) AND localStorage (always).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PersonSimple, X, TextAa, Eye, Cursor, Pause, Link as LinkIcon, BookOpen, ArrowCounterClockwise } from "@phosphor-icons/react";
import api from "@/lib/api";

const STORAGE_KEY = "sb_a11y_prefs_v1";
const DEFAULTS = {
  font_scale: 1,       // 1 | 1.15 | 1.3 | 1.45
  high_contrast: false,
  dyslexia_font: false,
  pause_animations: false,
  highlight_links: false,
  big_cursor: false,
  reading_guide: false,
};

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}

function saveLocal(prefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
}

function applyToDOM(prefs) {
  const root = document.documentElement;
  // font scale via CSS variable read by [data-a11y-font-scale] css in index.css
  root.style.setProperty("--a11y-font-scale", String(prefs.font_scale || 1));
  root.dataset.a11yContrast = prefs.high_contrast ? "high" : "";
  root.dataset.a11yDyslexia = prefs.dyslexia_font ? "on" : "";
  root.dataset.a11yPauseAnim = prefs.pause_animations ? "on" : "";
  root.dataset.a11yHighlightLinks = prefs.highlight_links ? "on" : "";
  root.dataset.a11yBigCursor = prefs.big_cursor ? "on" : "";
  root.dataset.a11yReadingGuide = prefs.reading_guide ? "on" : "";
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(loadLocal);
  const [synced, setSynced] = useState(false);
  const guideRef = useRef(null);

  // Apply on every change
  useEffect(() => { applyToDOM(prefs); saveLocal(prefs); }, [prefs]);

  // Try to load from backend once on mount (if logged in)
  useEffect(() => {
    let alive = true;
    api.get("/accessibility/preferences").then((r) => {
      if (!alive) return;
      const remote = r.data?.preferences;
      if (remote) {
        setPrefs((p) => ({ ...p, ...remote }));
      }
    }).catch(() => {}).finally(() => { if (alive) setSynced(true); });
    return () => { alive = false; };
  }, []);

  // Persist to backend on change (best-effort, ignores 401)
  useEffect(() => {
    if (!synced) return;
    api.put("/accessibility/preferences", { preferences: prefs }).catch(() => {});
  }, [prefs, synced]);

  // Reading guide bar follows the cursor
  useEffect(() => {
    if (!prefs.reading_guide) return;
    const onMove = (e) => {
      if (guideRef.current) guideRef.current.style.top = `${e.clientY - 24}px`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [prefs.reading_guide]);

  const set = useCallback((patch) => setPrefs((p) => ({ ...p, ...patch })), []);
  const reset = useCallback(() => setPrefs(DEFAULTS), []);

  const fontSteps = [1, 1.15, 1.3, 1.45];
  const fontStep = useMemo(() => fontSteps.indexOf(prefs.font_scale) >= 0 ? fontSteps.indexOf(prefs.font_scale) : 0, [prefs.font_scale]);

  return (
    <>
      {/* Reading guide overlay */}
      {prefs.reading_guide && (
        <div ref={guideRef} aria-hidden className="fixed left-0 right-0 pointer-events-none z-[9990]"
             style={{ top: 0, height: "48px",
                      background: "rgba(255, 224, 102, 0.18)",
                      borderTop: "2px solid #facc15",
                      borderBottom: "2px solid #facc15" }} />
      )}

      <button
        type="button"
        aria-label="Open accessibility menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-testid="a11y-toggle"
        className="fixed bottom-5 left-5 z-[9995] w-12 h-12 rounded-full bg-blue-700 hover:bg-blue-600 text-white shadow-2xl flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        <PersonSimple size={26} weight="duotone" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Accessibility settings"
          data-testid="a11y-panel"
          className="fixed bottom-20 left-5 z-[9995] w-72 bg-white border-2 border-blue-700 shadow-2xl rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-black tracking-tight text-sm">Accessibility</div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-slate-500 hover:text-slate-900" data-testid="a11y-close"><X size={16} /></button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="border border-slate-200 p-2.5 rounded">
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-2"><TextAa size={14} weight="bold" /> Larger text</span>
                <span className="text-[10px] font-mono text-slate-500">{Math.round(prefs.font_scale * 100)}%</span>
              </div>
              <div className="flex gap-1">
                {fontSteps.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set({ font_scale: s })}
                    data-testid={`a11y-font-${i}`}
                    className={`flex-1 py-1 text-xs border ${prefs.font_scale === s ? "bg-blue-700 text-white border-blue-700" : "bg-white text-slate-700 border-slate-300 hover:border-blue-700"}`}
                  >
                    A{"a".repeat(i)}
                  </button>
                ))}
              </div>
            </div>

            <ToggleRow icon={Eye} label="High contrast" testid="a11y-contrast" checked={prefs.high_contrast} onChange={(v) => set({ high_contrast: v })} />
            <ToggleRow icon={TextAa} label="Dyslexia-friendly font" testid="a11y-dyslexia" checked={prefs.dyslexia_font} onChange={(v) => set({ dyslexia_font: v })} />
            <ToggleRow icon={Pause} label="Pause animations" testid="a11y-pauseanim" checked={prefs.pause_animations} onChange={(v) => set({ pause_animations: v })} />
            <ToggleRow icon={LinkIcon} label="Highlight links" testid="a11y-highlightlinks" checked={prefs.highlight_links} onChange={(v) => set({ highlight_links: v })} />
            <ToggleRow icon={Cursor} label="Bigger cursor" testid="a11y-bigcursor" checked={prefs.big_cursor} onChange={(v) => set({ big_cursor: v })} />
            <ToggleRow icon={BookOpen} label="Reading guide" testid="a11y-readingguide" checked={prefs.reading_guide} onChange={(v) => set({ reading_guide: v })} />

            <button
              type="button"
              onClick={reset}
              data-testid="a11y-reset"
              className="w-full mt-2 text-xs font-mono uppercase tracking-widest py-2 border border-slate-300 hover:bg-slate-50 inline-flex items-center justify-center gap-2"
            >
              <ArrowCounterClockwise size={12} /> Reset all
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ToggleRow({ icon: Icon, label, checked, onChange, testid }) {
  return (
    <label className="flex items-center justify-between gap-2 border border-slate-200 px-2.5 py-2 rounded cursor-pointer hover:border-blue-700" data-testid={`${testid}-row`}>
      <span className="flex items-center gap-2 text-sm"><Icon size={14} weight="bold" /> {label}</span>
      <span className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
          data-testid={testid}
        />
        <span className="block w-9 h-5 bg-slate-300 peer-checked:bg-blue-700 transition-colors rounded-full relative">
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? "translate-x-4" : ""}`} />
        </span>
      </span>
    </label>
  );
}
