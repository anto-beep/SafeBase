import { useState } from "react";
import { BODY_AREAS } from "./constants";

// Interactive body map. Front/back tabs, clickable regions (circular hotspots
// positioned by percentage). Selected regions are tracked by key and rendered
// in red so the user always sees their selection at a glance.
export default function BodyMap({ value = [], onChange }) {
  const [side, setSide] = useState("front");
  const toggle = (k) => {
    onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  };
  const visible = BODY_AREAS.filter(([, , s]) => s === side || s === "both");
  return (
    <div className="bg-muted border border-border p-4" data-testid="body-map">
      <div className="flex items-center justify-between mb-3">
        <div className="label-eyebrow">Tap the affected area(s)</div>
        <div className="inline-flex border-2 border-ink bg-background">
          <button type="button" onClick={() => setSide("front")}
            className={`px-3 py-1 text-xs font-bold tracking-widest ${side === "front" ? "bg-ink text-warning" : ""}`}
            data-testid="body-map-front">FRONT</button>
          <button type="button" onClick={() => setSide("back")}
            className={`px-3 py-1 text-xs font-bold tracking-widest border-l-2 border-ink ${side === "back" ? "bg-ink text-warning" : ""}`}
            data-testid="body-map-back">BACK</button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative mx-auto" style={{ width: 240, height: 440 }}>
          {/* Silhouette */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full text-border">
            <ellipse cx="50" cy="8" rx="7" ry="7" fill="currentColor" />
            <rect x="44" y="14" width="12" height="6" fill="currentColor" />
            <polygon points="30,20 70,20 64,50 36,50" fill="currentColor" />
            <rect x="33" y="50" width="14" height="38" fill="currentColor" />
            <rect x="53" y="50" width="14" height="38" fill="currentColor" />
            <rect x="25" y="22" width="8" height="34" fill="currentColor" />
            <rect x="67" y="22" width="8" height="34" fill="currentColor" />
          </svg>
          {visible.map(([k, label, , x, y]) => {
            const active = value.includes(k);
            return (
              <button
                type="button"
                key={k}
                data-testid={`body-area-${k}`}
                onClick={() => toggle(k)}
                title={label}
                className={`absolute rounded-full border-2 ${active ? "bg-red-600 border-red-900" : "bg-white/60 border-ink/30 hover:border-ink"}`}
                style={{
                  left: `${x}%`, top: `${y}%`,
                  width: 20, height: 20, transform: "translate(-50%, -50%)",
                }}
              />
            );
          })}
        </div>
        <div className="flex-1">
          <div className="label-eyebrow mb-2">Selected ({value.length})</div>
          {value.length === 0 && <div className="text-xs text-muted-foreground">Tap any area on the diagram to select. Tap again to deselect.</div>}
          <ul className="space-y-1 text-sm">
            {value.map((k) => {
              const row = BODY_AREAS.find(([x]) => x === k);
              return row ? (
                <li key={k} className="flex items-center justify-between border border-border px-2 py-1">
                  <span>{row[1]}</span>
                  <button type="button" onClick={() => toggle(k)} className="text-xs underline">remove</button>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
