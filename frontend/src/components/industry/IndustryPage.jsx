/**
 * SafeBase — shared industry page template.
 * Renders all sections defined in /data/industries.config.js for a given industry.
 *
 * Each industry page is a thin wrapper:
 *   <IndustryPage industry={INDUSTRIES.trades} />
 */
import { Link } from "react-router-dom";
import {
  Warning, Clock, FileText, Lightning, Microphone, ShieldCheck, Clipboard, Handshake, Brain,
  Thermometer, IdentificationBadge, Detective, Broom, Truck, Scales, ChefHat, ForkKnife,
  Trophy, FirstAidKit, Person, UserCircle, HeartStraight, ShoppingBag, Moon, QrCode,
  Bell, ShieldWarning, Buildings, HardHat, Certificate, ArrowRight, CheckCircle,
  Quotes, ArrowDown,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";

const ICONS = {
  Warning, Clock, FileText, Lightning, Microphone, ShieldCheck, Clipboard, Handshake, Brain,
  Thermometer, IdentificationBadge, Detective, Broom, Truck, Scales, ChefHat, ForkKnife,
  Trophy, FirstAidKit, Person, UserCircle, HeartStraight, ShoppingBag, Moon, QrCode,
  Bell, ShieldWarning, Buildings, HardHat, Certificate,
};

function Icon({ name, size = 24, weight = "duotone", className = "" }) {
  const Cmp = ICONS[name] || FileText;
  return <Cmp size={size} weight={weight} className={className} />;
}

// ──────────────────────────────  HERO  ───────────────────────────────────
function Hero({ industry }) {
  const c = industry.color;
  return (
    <section
      data-testid="industry-hero"
      className={`relative overflow-hidden text-white bg-gradient-to-br ${c.from} ${c.to}`}
    >
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
           style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
        <Badge className={`${c.accent} text-ink rounded-none border-0 mb-6 uppercase tracking-widest font-mono text-xs`}>
          {industry.badge}
        </Badge>
        <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95] max-w-4xl">
          {industry.hero.headline.map((l, i) => (<span key={i} className="block">{l}</span>))}
        </h1>
        <p className="text-lg lg:text-xl text-white/80 mt-8 max-w-2xl leading-relaxed">{industry.hero.subheadline}</p>
        <div className="flex flex-wrap gap-3 mt-10">
          <Link to="/register">
            <Button size="lg" className={`btn-sharp ${c.accent} text-ink hover:opacity-90 uppercase tracking-widest font-bold h-12 px-6`} data-testid="hero-cta-primary">
              {industry.hero.ctaPrimary} <ArrowRight className="ml-2" />
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline" className="btn-sharp border-white text-white hover:bg-white hover:text-ink uppercase tracking-widest h-12 px-6" data-testid="hero-cta-secondary">
              {industry.hero.ctaSecondary}
            </Button>
          </a>
        </div>
      </div>
      <div className={`${c.accent} text-ink py-4`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-mono">
          {industry.statBar.map((s, i) => (<div key={i} className="text-center md:text-left">{s}</div>))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────  FEAR / PROBLEM  ─────────────────────────
function Fear({ industry }) {
  const f = industry.fear;
  return (
    <section data-testid="industry-fear" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mb-12">
          <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">{f.headline}</h2>
          {f.subheadline && <p className="text-lg text-muted-foreground mt-6 leading-relaxed">{f.subheadline}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {f.pains.map((p, i) => (
            <div key={i} className="border-l-4 border-red-600 bg-red-50/40 dark:bg-red-950/20 p-6" data-testid={`fear-card-${i}`}>
              <Icon name={p.icon} size={32} className="text-red-600" />
              <h3 className="font-display text-xl font-black tracking-tight mt-4">{p.title}</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
        {f.footnote && <p className="text-sm text-muted-foreground mt-8 italic">{f.footnote}</p>}
      </div>
    </section>
  );
}

// ──────────────────────────────  FEATURES  ───────────────────────────────
function Features({ industry }) {
  const c = industry.color;
  return (
    <section data-testid="industry-features" id="features" className="py-24 bg-muted/40">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">{industry.features.headline}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {industry.features.blocks.map((b, i) => (
            <div key={i} data-testid={`feature-block-${i}`} className="bg-background border border-border p-7 hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 ${c.accent} text-ink flex items-center justify-center mb-4`}>
                <Icon name={b.icon} size={24} weight="bold" />
              </div>
              <h3 className="font-display text-xl font-black tracking-tight">{b.title}</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{b.body}</p>
              {b.proof && <p className={`text-xs ${c.accentText} font-mono mt-4 uppercase tracking-widest`}>{b.proof}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────  TYPES GRID  ─────────────────────────────
function Types({ industry }) {
  const t = industry.types;
  if (!t) return null;
  return (
    <section data-testid="industry-types" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">{t.headline}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
          {t.grid.map((it, i) => (
            <div key={i} data-testid={`type-${i}`} className="border border-border p-5 hover:border-ink transition-colors">
              <div className="font-display text-lg font-black tracking-tight">{it.name}</div>
              {it.note && <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{it.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────  TWO/THREE-COL OBLIGATIONS  ──────────────
function ColumnsBlock({ headline, cols, testId }) {
  const gridCols = cols.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";
  return (
    <section data-testid={testId} className="py-24 bg-muted/40">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">{headline}</h2>
        <div className={`grid grid-cols-1 ${gridCols} gap-8 mt-12`}>
          {cols.map((col, i) => (
            <div key={i} className="bg-background border border-border p-7" data-testid={`${testId}-col-${i}`}>
              <h3 className="label-eyebrow mb-4">{col.title}</h3>
              <ul className="space-y-3">
                {col.items.map((it, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm leading-relaxed">
                    <CheckCircle size={18} weight="fill" className="text-ink shrink-0 mt-0.5" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────  CHAIN (transport)  ──────────────────────
function Chain({ industry }) {
  const c = industry.chain;
  if (!c) return null;
  const accent = industry.color;
  return (
    <section data-testid="industry-chain" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">{c.headline}</h2>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 mt-12">
          {c.nodes.map((n, i) => (
            <div key={i} data-testid={`chain-${i}`} className="border border-border bg-muted/40 p-4 relative">
              <div className={`w-8 h-8 ${accent.accent} text-ink flex items-center justify-center font-mono text-xs font-bold mb-3`}>{i + 1}</div>
              <div className="font-display font-black tracking-tight text-sm">{n.role}</div>
              <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{n.obligation}</div>
              {i < c.nodes.length - 1 && <ArrowRight size={16} className="hidden md:block absolute -right-2 top-1/2 text-muted-foreground" />}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground italic mt-8 max-w-3xl">{c.caption}</p>
      </div>
    </section>
  );
}

// ──────────────────────────────  DOCUMENTS  ──────────────────────────────
function Docs({ industry }) {
  const d = industry.docs;
  return (
    <section data-testid="industry-docs" className="py-24 bg-muted/40">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">{d.headline}</h2>
        <div className={`grid grid-cols-1 ${d.groups.length > 1 ? "md:grid-cols-2 lg:grid-cols-4" : ""} gap-6 mt-12`}>
          {d.groups.map((g, i) => (
            <div key={i} className="bg-background border border-border p-6" data-testid={`docs-group-${i}`}>
              <h3 className="label-eyebrow mb-4">{g.title}</h3>
              <ul className="space-y-2">
                {g.items.map((it, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <FileText size={14} weight="bold" className="text-ink shrink-0 mt-1" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────  ASSOCIATIONS (trades)  ──────────────────
function Association({ industry }) {
  const a = industry.association;
  if (!a) return null;
  return (
    <section data-testid="industry-association" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">{a.headline}</h2>
        <p className="text-lg text-muted-foreground mt-6 max-w-3xl leading-relaxed">{a.body}</p>
        <div className="mt-10 border-t border-border pt-8">
          <div className="label-eyebrow text-muted-foreground mb-4">{a.logoCaption}</div>
          <div className="flex flex-wrap gap-3">
            {a.logos.map((l, i) => (
              <div key={i} className="border border-border px-4 py-3 font-mono text-xs text-muted-foreground" data-testid={`assoc-logo-${i}`}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────  FRANCHISE CALLOUT (retail)  ─────────────
function FranchiseCallout({ industry }) {
  const f = industry.franchise;
  if (!f) return null;
  const accent = industry.color;
  return (
    <section data-testid="industry-franchise" className="py-24 bg-ink text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">{f.headline}</h2>
        <p className="text-lg text-white/80 mt-6 max-w-3xl leading-relaxed">{f.body}</p>
        <ul className="mt-8 space-y-3 max-w-3xl">
          {f.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
              <CheckCircle size={20} weight="fill" className={accent.accentText + " shrink-0 mt-0.5"} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <p className={`${accent.accentText} font-mono text-sm mt-8`}>{f.pricing}</p>
        <Link to="/enterprise">
          <Button size="lg" className={`btn-sharp mt-6 ${accent.accent} text-ink uppercase tracking-widest font-bold`} data-testid="franchise-cta">
            {f.cta} <ArrowRight className="ml-2" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

// ──────────────────────────────  PRICING  ────────────────────────────────
function Pricing({ industry }) {
  const p = industry.pricing;
  return (
    <section data-testid="industry-pricing" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter max-w-3xl">{p.headline}</h2>
        {p.tiers && p.tiers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {p.tiers.map((t, i) => (
              <div key={i} className="border border-border p-7" data-testid={`pricing-tier-${i}`}>
                <div className="label-eyebrow">{t.name}</div>
                <div className="font-display text-3xl font-black tracking-tight mt-3">{t.price}</div>
              </div>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-8 max-w-2xl leading-relaxed">{p.footnote}</p>
        {p.roi && <p className="text-base font-mono text-ink mt-6 max-w-2xl">{p.roi}</p>}
        <Link to="/register">
          <Button size="lg" className="btn-sharp bg-ink text-white hover:bg-authority uppercase tracking-widest font-bold mt-8" data-testid="pricing-cta">
            {p.cta} <ArrowRight className="ml-2" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

// ──────────────────────────────  TESTIMONIALS  ───────────────────────────
function Testimonials({ industry }) {
  if (!industry.testimonials) return null;
  return (
    <section data-testid="industry-testimonials" className="py-24 bg-muted/40">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {industry.testimonials.map((t, i) => (
            <div key={i} className="bg-background border border-border p-7" data-testid={`testimonial-${i}`}>
              <Quotes size={32} weight="fill" className="text-ink/20" />
              <p className="text-base mt-4 leading-relaxed">"{t.quote}"</p>
              <div className="label-eyebrow text-muted-foreground mt-6">— {t.who}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────  FINAL CTA  ──────────────────────────────
function FinalCta({ industry }) {
  const f = industry.finalCta;
  const c = industry.color;
  return (
    <section data-testid="industry-final-cta" className={`py-24 bg-gradient-to-br ${c.from} ${c.to} text-white`}>
      <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
        <h2 className="font-display text-4xl lg:text-6xl font-black tracking-tighter">{f.headline}</h2>
        <p className="text-lg text-white/80 mt-6 leading-relaxed">{f.body}</p>
        <Link to="/register">
          <Button size="lg" className={`btn-sharp ${c.accent} text-ink hover:opacity-90 uppercase tracking-widest font-bold mt-8 h-14 px-8 text-base`} data-testid="final-cta">
            {f.cta} <ArrowRight className="ml-2" />
          </Button>
        </Link>
        <p className="text-xs font-mono text-white/60 mt-6 uppercase tracking-widest">{f.subtext}</p>
      </div>
    </section>
  );
}

// ──────────────────────────────  PUBLIC API  ─────────────────────────────
export default function IndustryPage({ industry }) {
  return (
    <>
      <MarketingNav />
      <main data-testid={`industry-page-${industry.slug}`}>
        <Hero industry={industry} />
        <Fear industry={industry} />
        <Features industry={industry} />
        <Types industry={industry} />
        {industry.obligations && (
          <ColumnsBlock headline={industry.obligations.headline} cols={industry.obligations.cols} testId="industry-obligations" />
        )}
        <Chain industry={industry} />
        {industry.framework && (
          <ColumnsBlock headline={industry.framework.headline} cols={industry.framework.cols} testId="industry-framework" />
        )}
        <Docs industry={industry} />
        <Association industry={industry} />
        <FranchiseCallout industry={industry} />
        <Pricing industry={industry} />
        <Testimonials industry={industry} />
        <FinalCta industry={industry} />
      </main>
      <MarketingFooter />
    </>
  );
}

export { Icon };
