/**
 * ProductTour — real captured-screenshot product tour.
 *
 * Two modes:
 *   <ProductTour industry="trades" />    → fixed-industry tour (used on /industries/{slug})
 *   <ProductTour switcher />             → tabbed switcher across all 5 industries (homepage)
 *
 * Screenshots are stored at /product-tour/{industry}-{slug}.png and were
 * captured live from the SafeBase product itself — same product every paid
 * account runs.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const INDUSTRIES = [
  { slug: "trades",       label: "Trades & Construction", accent: "#FFCC00" },
  { slug: "hospitality",  label: "Hospitality",            accent: "#7C1D3F" },
  { slug: "transport",    label: "Transport & Logistics",  accent: "#0DC4B5" },
  { slug: "healthcare",   label: "Healthcare & Aged Care", accent: "#2196A6" },
  { slug: "retail",       label: "Retail",                 accent: "#A855F7" },
];

const SHOTS = [
  { slug: "overview", url: "/dashboard",            cap: "Live overview", desc: "Compliance score, AI-flagged patterns, and the one action that needs attention today." },
  { slug: "swms",     url: "/dashboard/swms",       cap: "AI document library",  desc: "Generate a compliant statement, HACCP plan, or CoR plan in 60 seconds." },
  { slug: "licences", url: "/dashboard/licences",   cap: "Credential tracker",   desc: "Every licence, AHPRA registration, RSA, every expiry — alerted before it bites." },
  { slug: "risk",     url: "/dashboard/risk-register", cap: "Risk register",     desc: "Every hazard, every control, every review — permanent, auditable, exportable." },
];

function WindowChrome({ children, accent }) {
  return (
    <div className="border border-border overflow-hidden bg-ink shadow-2xl" style={{ boxShadow: `0 24px 48px -12px ${accent}22` }}>
      <div className="flex items-center gap-2 bg-[#0A0F1A] px-4 py-2.5 border-b border-white/10">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-4 text-[11px] font-mono text-white/40 truncate">{children.url}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-white/60">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} /> Live
        </span>
      </div>
      {children.body}
    </div>
  );
}

function Figure({ industry, shot, accent, span = 8, testid }) {
  const src = `/product-tour/${industry}-${shot.slug}.png`;
  const colSpan = span === 8 ? "lg:col-span-8" : "lg:col-span-4";
  return (
    <figure className={colSpan} data-testid={testid}>
      <WindowChrome accent={accent}>
        {{
          url: `safebase.app${shot.url}`,
          body: (
            <>
              <img
                src={src}
                alt={`SafeBase ${industry} dashboard — ${shot.cap}`}
                loading="lazy"
                className="w-full block"
              />
              <figcaption className="p-5 text-sm bg-background border-t border-border">
                <span className="font-display font-black tracking-tight">{shot.cap}</span>
                <span className="text-muted-foreground"> — {shot.desc}</span>
              </figcaption>
            </>
          ),
        }}
      </WindowChrome>
    </figure>
  );
}

/** Fixed industry tour — used on /industries/{slug} */
function FixedTour({ industry, accent, label }) {
  return (
    <section className="py-24 bg-background border-t border-border" data-testid={`industry-product-tour-${industry}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-3xl">
          <div className="label-eyebrow" style={{ color: accent }}>/ Product tour · {label.toLowerCase()}</div>
          <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mt-3">
            Not a marketing mockup.<br />The actual product, configured for {label}.
          </h2>
          <p className="text-base text-muted-foreground mt-5 max-w-2xl">
            Every screen below is captured live from SafeBase running in {label} mode — the same product every {label.toLowerCase()} account uses, with the {label.toLowerCase()}-specific modules pre-loaded.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-14">
          <Figure industry={industry} shot={SHOTS[0]} accent={accent} span={8} testid={`tour-${industry}-overview`} />
          <Figure industry={industry} shot={SHOTS[1]} accent={accent} span={4} testid={`tour-${industry}-swms`} />
          <Figure industry={industry} shot={SHOTS[2]} accent={accent} span={4} testid={`tour-${industry}-licences`} />
          <Figure industry={industry} shot={SHOTS[3]} accent={accent} span={8} testid={`tour-${industry}-risk`} />
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link to={`/register?industry=${industry}`}>
            <Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid={`tour-${industry}-cta`}>
              Start free 14-day trial <ArrowRight className="ml-2" />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="outline" className="btn-sharp h-12 border-ink" data-testid={`tour-${industry}-pricing`}>
              See pricing
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Tabbed switcher tour — used on the homepage. */
function SwitcherTour() {
  const [active, setActive] = useState("trades");
  const ind = INDUSTRIES.find((i) => i.slug === active);

  return (
    <section className="py-24 bg-background border-t border-border" data-testid="home-product-tour">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-3xl">
          <div className="label-eyebrow">/ Product tour · the real thing</div>
          <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mt-3">
            Not a marketing mockup.<br />The actual product — for every industry.
          </h2>
          <p className="text-base text-muted-foreground mt-5 max-w-2xl">
            Every screen below is captured live from SafeBase. Tap an industry to see the same product configured for trades, hospitality, transport, healthcare, or retail.
          </p>
        </div>

        {/* INDUSTRY TABS */}
        <div className="mt-10 flex flex-wrap gap-1 border-b-2 border-ink">
          {INDUSTRIES.map((i) => {
            const isActive = i.slug === active;
            return (
              <button
                key={i.slug}
                onClick={() => setActive(i.slug)}
                data-testid={`home-tour-tab-${i.slug}`}
                className={`px-5 py-3 text-sm font-display font-black tracking-tight uppercase border-b-4 -mb-0.5 transition-all ${isActive ? "text-ink" : "text-muted-foreground hover:text-ink border-transparent"}`}
                style={isActive ? { borderColor: i.accent } : {}}
              >
                {i.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-10" key={active}>
          <Figure industry={active} shot={SHOTS[0]} accent={ind.accent} span={8} testid={`home-tour-${active}-overview`} />
          <Figure industry={active} shot={SHOTS[1]} accent={ind.accent} span={4} testid={`home-tour-${active}-swms`} />
          <Figure industry={active} shot={SHOTS[2]} accent={ind.accent} span={4} testid={`home-tour-${active}-licences`} />
          <Figure industry={active} shot={SHOTS[3]} accent={ind.accent} span={8} testid={`home-tour-${active}-risk`} />
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link to={`/register?industry=${active}`}>
            <Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="home-tour-cta">
              Start free trial in {ind.label} <ArrowRight className="ml-2" />
            </Button>
          </Link>
          <Link to={`/industries/${active}`}>
            <Button variant="outline" className="btn-sharp h-12 border-ink" data-testid="home-tour-industry-link">
              Read the {ind.label} story
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function ProductTour({ industry, switcher }) {
  if (switcher) return <SwitcherTour />;
  const ind = INDUSTRIES.find((i) => i.slug === industry) || INDUSTRIES[0];
  return <FixedTour industry={ind.slug} accent={ind.accent} label={ind.label} />;
}
