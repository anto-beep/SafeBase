/**
 * SafeBase — inline industry dashboard mockup.
 *
 * Rendered between Hero and Fear on every industry page. Shows a
 * realistic-looking in-app dashboard chrome per industry so the
 * marketing page actually showcases the product.
 *
 * Zero external images — purely HTML/CSS so it always renders sharp.
 */
import { useMemo } from "react";
import {
  Thermometer, Truck, HeartStraight, ShoppingBag, HardHat,
  CheckCircle, Warning, Clock, IdentificationBadge, QrCode,
  FileText, ShieldCheck, ArrowRight,
} from "@phosphor-icons/react";

function Shell({ title, subtitle, statusLabel, statusColor, children, accent }) {
  return (
    <div className="bg-[#0B1220] border border-white/10 text-white shadow-2xl" data-testid="industry-dash-preview">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 bg-[#0A0F1A]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-4 text-[11px] font-mono text-white/40">safebase.app — {title.toLowerCase()}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-white/60">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusColor }} /> {statusLabel}
        </span>
      </div>

      {/* Top bar */}
      <div className="px-6 pt-5 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: accent }}>/ Live preview</div>
          <h3 className="font-display font-black text-xl tracking-tight mt-1">{title}</h3>
          <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>
        </div>
        <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border" style={{ borderColor: accent, color: accent }}>
          View in-app →
        </div>
      </div>

      {/* Body */}
      <div className="p-6">{children}</div>
    </div>
  );
}

function KPI({ label, value, accent, delta }) {
  return (
    <div className="border border-white/10 p-3">
      <div className="text-[9px] font-mono uppercase tracking-widest text-white/50">{label}</div>
      <div className="font-display font-black text-2xl mt-1 leading-none">{value}</div>
      {delta && <div className="text-[10px] font-mono mt-1" style={{ color: accent }}>{delta}</div>}
    </div>
  );
}

function Row({ cols, last, accent }) {
  return (
    <div className={`grid grid-cols-12 items-center py-2 text-xs ${last ? "" : "border-b border-white/5"}`}>
      {cols.map((c, i) => (
        <div key={i} className={`${c.span || "col-span-3"} ${c.tone === "muted" ? "text-white/50" : c.tone === "accent" ? "font-mono" : ""}`}
             style={c.tone === "accent" ? { color: accent } : {}}>
          {c.label}
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── TRADES ─────────────────────────
function TradesDash({ accent }) {
  return (
    <Shell
      title="SWMS & Credential Register"
      subtitle="Reyes Electrical · 14 workers · 3 sites active"
      statusLabel="Audit-ready"
      statusColor="#22c55e"
      accent={accent}
    >
      <div className="grid grid-cols-3 gap-3">
        <KPI label="SWMS active" value="37" accent={accent} delta="▲ 6 this week" />
        <KPI label="Compliance" value="94%" accent={accent} delta="▲ 2.1%" />
        <KPI label="Expiries 30d" value="2" accent="#f59e0b" delta="white card · HRWL" />
      </div>

      <div className="mt-5 border border-white/10">
        <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-white/60">
          <div className="col-span-5">SWMS · Activity</div>
          <div className="col-span-3">HRCW</div>
          <div className="col-span-2">Reg 299</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        <div className="px-3">
          {[
            { a: "Live electrical work — 415V board", h: "Electrical · Heights", r: "✓", s: "Active", tone: "accent" },
            { a: "Formwork — L2 slab, 12 Crown St", h: "Formwork · Falls", r: "✓", s: "Active", tone: "accent" },
            { a: "Confined space entry — pit 4", h: "Confined space", r: "✓", s: "Pending sign-off", tone: "warn" },
            { a: "Demolition — Stage B partition", h: "Demolition · Silica", r: "✓", s: "Active", tone: "accent" },
          ].map((row, i, arr) => (
            <div key={i} className={`grid grid-cols-12 items-center py-2.5 text-xs ${i === arr.length - 1 ? "" : "border-b border-white/5"}`}>
              <div className="col-span-5 flex items-center gap-2">
                <HardHat size={14} weight="duotone" style={{ color: accent }} /> {row.a}
              </div>
              <div className="col-span-3 text-white/50 font-mono">{row.h}</div>
              <div className="col-span-2 font-mono" style={{ color: accent }}>{row.r}</div>
              <div className={`col-span-2 text-right font-mono ${row.tone === "warn" ? "text-[#f59e0b]" : ""}`} style={row.tone === "accent" ? { color: accent } : {}}>{row.s}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-l-2 p-3 bg-white/[0.03] text-xs" style={{ borderColor: accent }}>
        <span className="font-mono uppercase tracking-widest text-[10px]" style={{ color: accent }}>AI insight · pattern</span>
        <div className="mt-1 text-white/80">Jake M.'s HRWL expires in <span className="font-mono" style={{ color: accent }}>12 days</span> — he has 2 upcoming jobs flagged as EWP.</div>
      </div>
    </Shell>
  );
}

// ───────────────────────── HOSPITALITY ─────────────────────────
function HospitalityDash({ accent }) {
  return (
    <Shell
      title="Temperature & HACCP Monitor"
      subtitle="Crown Hotel · kitchen + 2 cool rooms · Std 3.2.2A"
      statusLabel="All in range"
      statusColor="#22c55e"
      accent={accent}
    >
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Units monitored" value="14" accent={accent} delta="Fridges · cool rooms" />
        <KPI label="Logs today" value="42" accent={accent} delta="All on schedule" />
        <KPI label="Allergen items" value="86" accent={accent} delta="Menu synced 08:14" />
        <KPI label="FSS current" value="3/3" accent={accent} delta="Next exp 2027-03" />
      </div>

      {/* Sparkline row */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { name: "Cool Room 1", temp: "3.2°C", ok: true, range: "0.5 – 5.0" },
          { name: "Cool Room 2", temp: "4.8°C", ok: true, range: "0.5 – 5.0" },
          { name: "Bain-marie service", temp: "68°C", ok: true, range: ">60" },
        ].map((u, i) => (
          <div key={i} className="border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">{u.name}</div>
              <Thermometer size={16} weight="duotone" style={{ color: accent }} />
            </div>
            <div className="font-display font-black text-3xl mt-2">{u.temp}</div>
            <div className="text-[10px] font-mono text-white/40 mt-1">Target {u.range}</div>
            <svg viewBox="0 0 100 24" className="mt-3 w-full h-6">
              <polyline fill="none" stroke={accent} strokeWidth="1.5"
                points={Array.from({ length: 12 }, (_, j) => `${j * 9},${12 + Math.sin(j + i) * 4}`).join(" ")} />
            </svg>
          </div>
        ))}
      </div>

      <div className="mt-4 border-l-2 p-3 bg-white/[0.03] text-xs" style={{ borderColor: accent }}>
        <span className="font-mono uppercase tracking-widest text-[10px]" style={{ color: accent }}>Council audit pack</span>
        <div className="mt-1 text-white/80">HACCP plan, 90-day logs, allergen register — export ready in <span className="font-mono" style={{ color: accent }}>&lt; 2 min</span>.</div>
      </div>
    </Shell>
  );
}

// ───────────────────────── TRANSPORT ─────────────────────────
function TransportDash({ accent }) {
  return (
    <Shell
      title="CoR & Fatigue Control Tower"
      subtitle="Ridge Haulage · 18 drivers · 12 heavy vehicles"
      statusLabel="All trips clear"
      statusColor="#22c55e"
      accent={accent}
    >
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Pre-trip checks" value="11/12" accent={accent} delta="1 waiting" />
        <KPI label="Fatigue flags" value="0" accent={accent} delta="Std + BFM OK" />
        <KPI label="HR / MC lic." value="18/18" accent={accent} delta="None within 30d" />
        <KPI label="CoR events" value="0" accent={accent} delta="Last: 42 days" />
      </div>

      <div className="mt-5 border border-white/10">
        <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-white/60">
          <div className="col-span-4">Driver · Trip</div>
          <div className="col-span-3">Rest (last 24h)</div>
          <div className="col-span-3">Vehicle</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        <div className="px-3">
          {[
            { d: "S. Nguyen · SYD → GFF", r: "9h 14m", v: "HV-2284 (B-double)", s: "On-road" },
            { d: "M. Patel · BNE → MEL", r: "10h 02m", v: "HV-2301 (B-double)", s: "On-road" },
            { d: "T. O'Brien · pre-trip", r: "11h 46m", v: "HV-2207 (semi)", s: "Cleared 06:12" },
            { d: "L. Chen · load restraint", r: "—", v: "Bay 3 · consignor", s: "Check queued" },
          ].map((row, i, arr) => (
            <div key={i} className={`grid grid-cols-12 items-center py-2.5 text-xs ${i === arr.length - 1 ? "" : "border-b border-white/5"}`}>
              <div className="col-span-4 flex items-center gap-2">
                <Truck size={14} weight="duotone" style={{ color: accent }} /> {row.d}
              </div>
              <div className="col-span-3 font-mono text-white/60">{row.r}</div>
              <div className="col-span-3 text-white/70">{row.v}</div>
              <div className="col-span-2 text-right font-mono" style={{ color: accent }}>{row.s}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-l-2 p-3 bg-white/[0.03] text-xs" style={{ borderColor: accent }}>
        <span className="font-mono uppercase tracking-widest text-[10px]" style={{ color: accent }}>NHVR audit pack</span>
        <div className="mt-1 text-white/80">Work diaries · maintenance · load restraint · mass mgmt — one-click export for the primary-duty audit.</div>
      </div>
    </Shell>
  );
}

// ───────────────────────── HEALTHCARE ─────────────────────────
function HealthcareDash({ accent }) {
  return (
    <Shell
      title="Credentials & ACQSC Evidence"
      subtitle="Lighthouse Care · 4 sites · 142 clinicians"
      statusLabel="Audit-ready"
      statusColor="#22c55e"
      accent={accent}
    >
      <div className="grid grid-cols-4 gap-3">
        <KPI label="AHPRA current" value="142/142" accent={accent} delta="Checked 06:00" />
        <KPI label="Worker screening" value="138/142" accent="#f59e0b" delta="4 renewals queued" />
        <KPI label="ACQSC std coverage" value="8/8" accent={accent} delta="Evidence up to date" />
        <KPI label="SIRS P1 open" value="0" accent={accent} delta="Last: 61 days" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">Strengthened Standards · evidence</div>
            <Trophy accent={accent} />
          </div>
          {[
            { n: "Std 1 — Person of integrity", v: 94 },
            { n: "Std 3 — Clinical care", v: 91 },
            { n: "Std 5 — Clinical governance", v: 88 },
            { n: "Std 7 — Workforce", v: 96 },
          ].map((r, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/70">{r.n}</span>
                <span className="font-mono" style={{ color: accent }}>{r.v}%</span>
              </div>
              <div className="h-1 bg-white/10 mt-1">
                <div className="h-1" style={{ width: `${r.v}%`, background: accent }} />
              </div>
            </div>
          ))}
        </div>

        <div className="border border-white/10 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/50 mb-3">AHPRA monitor · live register</div>
          {[
            { n: "Dr J. Chen", k: "Medical · MED0001234567", s: "Current · exp 2027-09" },
            { n: "S. O'Neill RN", k: "Nursing · NMW0009876", s: "Current · exp 2026-11" },
            { n: "A. Ramos OT", k: "Occupational therapy", s: "Current · exp 2027-02" },
            { n: "M. Wu (allied)", k: "Physio · PHY004455", s: "Review 7 Apr", warn: true },
          ].map((r, i, arr) => (
            <div key={i} className={`py-2 text-xs ${i === arr.length - 1 ? "" : "border-b border-white/5"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono">{r.n}</div>
                  <div className="text-white/50">{r.k}</div>
                </div>
                <span className="font-mono text-[10px]" style={{ color: r.warn ? "#f59e0b" : accent }}>{r.s}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-l-2 p-3 bg-white/[0.03] text-xs" style={{ borderColor: accent }}>
        <span className="font-mono uppercase tracking-widest text-[10px]" style={{ color: accent }}>Regulator pipeline</span>
        <div className="mt-1 text-white/80">Incident-to-SIRS auto-triage live. 24-hour clock starts automatically. Zero owner memory required.</div>
      </div>
    </Shell>
  );
}

function Trophy({ accent }) {
  return <HeartStraight size={16} weight="duotone" style={{ color: accent }} />;
}

// ───────────────────────── RETAIL ─────────────────────────
function RetailDash({ accent }) {
  return (
    <Shell
      title="Quick Induct & Lone-Worker Control"
      subtitle="Coastal Retail Group · 17 stores · 238 casual staff"
      statusLabel="All staff accounted for"
      statusColor="#22c55e"
      accent={accent}
    >
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Inductions 7d" value="94" accent={accent} delta="Avg 2m 48s" />
        <KPI label="Lone workers now" value="11" accent={accent} delta="All checked-in" />
        <KPI label="Customer incidents" value="3" accent={accent} delta="All investigated" />
        <KPI label="RSA / forklift" value="62/62" accent={accent} delta="None within 30d" />
      </div>

      <div className="mt-5 grid grid-cols-5 gap-3">
        <div className="col-span-2 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">Quick Induct · QR</div>
            <QrCode size={18} weight="duotone" style={{ color: accent }} />
          </div>
          <div className="mt-4 aspect-square w-full flex items-center justify-center relative" style={{ background: accent }}>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg,#0B1220 0 4px,transparent 4px 8px)" }} />
            <QrCode size={92} weight="fill" className="relative text-[#0B1220]" />
          </div>
          <div className="text-[10px] font-mono mt-3 text-white/60 text-center">casual.safebase.com.au/s/CB-412</div>
        </div>

        <div className="col-span-3 border border-white/10 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/50 mb-3">Lone-worker check-ins · live</div>
          {[
            { n: "Bec — Erina · closing", t: "Next in 18m", ok: true },
            { n: "Aidan — Warriewood · open", t: "Checked 08:14", ok: true },
            { n: "Jas — Gosford · closing", t: "Next in 42m", ok: true },
            { n: "Tia — Tuggerah · closing", t: "Next in 08m", ok: true },
          ].map((r, i, arr) => (
            <div key={i} className={`py-2 text-xs flex items-center justify-between ${i === arr.length - 1 ? "" : "border-b border-white/5"}`}>
              <div className="flex items-center gap-2"><CheckCircle weight="fill" size={14} style={{ color: accent }} /> {r.n}</div>
              <div className="font-mono text-white/60">{r.t}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-l-2 p-3 bg-white/[0.03] text-xs" style={{ borderColor: accent }}>
        <span className="font-mono uppercase tracking-widest text-[10px]" style={{ color: accent }}>Network rollup</span>
        <div className="mt-1 text-white/80">Head office sees compliance per store. Low-scoring stores flagged before an inspector notices.</div>
      </div>
    </Shell>
  );
}

// ───────────────────────── ROUTER ─────────────────────────
const VARIANTS = {
  trades: TradesDash,
  hospitality: HospitalityDash,
  transport: TransportDash,
  healthcare: HealthcareDash,
  retail: RetailDash,
};

const HEADLINES = {
  trades: { eyebrow: "/ Inside SafeBase · Trades", h: "This is what your audit pack looks like — every day, not just on the day." },
  hospitality: { eyebrow: "/ Inside SafeBase · Hospitality", h: "Every fridge, every handler, every HACCP record — in one room." },
  transport: { eyebrow: "/ Inside SafeBase · Transport", h: "One control tower for every party in the chain." },
  healthcare: { eyebrow: "/ Inside SafeBase · Healthcare", h: "ACQSC, AHPRA, NDIS — continuously audit-ready, not panic-ready." },
  retail: { eyebrow: "/ Inside SafeBase · Retail", h: "From casual induction to closing check-in — one tool, every shift." },
};

export default function IndustryDashboardPreview({ industry, slug: slugProp, accent: accentProp }) {
  const slug = slugProp || industry?.slug;
  const Variant = useMemo(() => VARIANTS[slug] || TradesDash, [slug]);
  const copy = HEADLINES[slug] || HEADLINES.trades;
  const accent = accentProp || industry?.color?.accentText?.match(/#[0-9A-Fa-f]{6}/)?.[0] || "#FFCC00";

  return (
    <section className="py-24 bg-muted text-ink relative overflow-hidden" data-testid={`industry-dash-section-${slug}`}>
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
           style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #0A0A0A 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-4">
          <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: accent }}>{copy.eyebrow}</div>
          <h2 className="font-display text-3xl lg:text-4xl font-black tracking-tighter mt-3 leading-tight text-ink">{copy.h}</h2>
          <ul className="mt-6 space-y-3 text-sm text-ink/75">
            <li className="flex gap-2"><CheckCircle weight="fill" size={16} style={{ color: accent }} className="shrink-0 mt-0.5" />Live data from the same product every customer uses.</li>
            <li className="flex gap-2"><CheckCircle weight="fill" size={16} style={{ color: accent }} className="shrink-0 mt-0.5" />AI surfaces the one thing that needs attention today.</li>
            <li className="flex gap-2"><CheckCircle weight="fill" size={16} style={{ color: accent }} className="shrink-0 mt-0.5" />Audit pack exportable in under two minutes.</li>
          </ul>
          <div className="inline-flex items-center gap-2 mt-8 font-mono text-xs uppercase tracking-widest" style={{ color: accent }}>
            Scroll for features <ArrowRight size={14} />
          </div>
        </div>
        <div className="lg:col-span-8">
          <Variant accent={accent} />
        </div>
      </div>
    </section>
  );
}
