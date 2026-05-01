import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { CheckCircle, X, ArrowRight, Star, ShieldCheck, CaretDown } from "@phosphor-icons/react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TIER_SLUG = {
  "Sole Trader-monthly": "sole_trader_monthly",
  "Small Business-monthly": "small_business_monthly",
  "Growing Business-monthly": "growing_business_monthly",
  "Enterprise-monthly": "enterprise_monthly",
  "Sole Trader-annual": "sole_trader_annual",
  "Small Business-annual": "small_business_annual",
  "Growing Business-annual": "growing_business_annual",
  "Enterprise-annual": "enterprise_annual",
};

const TIERS = {
  monthly: [
    {
      name: "Sole Trader", price: "249", period: "/mo", users: "1 user",
      desc: "Solo operators who need WHS sorted without the paperwork.",
      cta: "Start free trial",
      features: [
        "Unlimited AI SWMS generation",
        "Incident and near-miss register",
        "Up to 10 worker profiles",
        "Licence and credential tracking with expiry alerts",
        "Basic compliance dashboard",
        "Audit preparation report (PDF export)",
        "Mobile app access",
        "Email support",
        "14-day free trial",
      ],
    },
    {
      name: "Small Business", price: "499", period: "/mo", users: "up to 5 users",
      desc: "Growing trade businesses managing a team and engaging subcontractors.",
      cta: "Start free trial",
      features: [
        "Everything in Sole Trader",
        "Contractor compliance document capture & verification",
        "AI incident pattern detection",
        "Site management (up to 5 sites)",
        "TradeInduct QR site inductions — included (worth A$129/mo)",
        "Toolbox Talks module",
        "Plant and Equipment register",
        "Priority email and chat support",
      ],
    },
    {
      name: "Growing Business", price: "799", period: "/mo", users: "up to 20 users",
      highlight: true, badge: "MOST POPULAR",
      desc: "Established trade businesses with multiple sites, growing teams, and serious compliance obligations.",
      cta: "Start free trial",
      features: [
        "Everything in Small Business",
        "Unlimited sites",
        "TradeCheck contractor credentials — included (worth A$149/mo)",
        "SafeBase Academy (10 workers) — included (worth A$199/mo)",
        "Risk register",
        "Hazardous substances and SDS register",
        "Advanced compliance analytics and benchmarking",
        "Legislative update alerts for your state and trade",
        "White-label access for consultants",
        "API export capability",
        "Phone support",
        "Dedicated onboarding session",
      ],
    },
    {
      name: "Enterprise", price: "1,299", period: "/mo", users: "up to 50 users",
      enterprise: true, badge: "FOR LARGER OPERATIONS",
      desc: "Multi-site businesses with 20–50 workers who need enterprise-grade compliance, dedicated support, and the complete SafeBase ecosystem.",
      cta: "Book a demo",
      secondaryCta: "Start free trial",
      features: [
        "Everything in Growing Business",
        "SafeBase Academy (30 workers) — included (worth A$299/mo)",
        "Dedicated Account Manager",
        "Quarterly Business Reviews (60 min)",
        "Priority phone support · 4-hour SLA",
        "Structured 4-session onboarding program",
        "Emergency incident support via your account manager",
        "Advanced AI predictive risk modelling",
        "Cross-site incident pattern detection",
        "Custom compliance frameworks",
        "Custom report builder + scheduled delivery",
        "Single Sign-On (SSO) · Full API · Webhooks",
        "Enhanced immutable audit logging",
        "Configurable data retention & dedicated tenant",
      ],
    },
  ],
  annual: [
    {
      name: "Sole Trader", price: "2,490", period: "/yr", monthlyEq: "A$207.50/month",
      users: "1 user", desc: "Save A$498 vs monthly.", cta: "Start free trial",
      features: ["Everything in monthly Sole Trader", "2 months free", "Priority trial onboarding"],
    },
    {
      name: "Small Business", price: "4,990", period: "/yr", monthlyEq: "A$415.83/month",
      users: "up to 5 users", desc: "Save A$998 vs monthly.", cta: "Start free trial",
      features: ["Everything in monthly Small Business", "2 months free", "Assisted setup discount"],
    },
    {
      name: "Growing Business", price: "7,990", period: "/yr", monthlyEq: "A$665.83/month",
      users: "up to 20 users", highlight: true, badge: "MOST POPULAR",
      desc: "Save A$1,598 vs monthly.", cta: "Start free trial",
      features: ["Everything in monthly Growing Business", "2 months free", "Complimentary dedicated onboarding"],
    },
    {
      name: "Enterprise", price: "12,990", period: "/yr", monthlyEq: "A$1,082.50/month",
      users: "up to 50 users", enterprise: true, badge: "FOR LARGER OPERATIONS",
      desc: "Save A$2,598 vs monthly.", cta: "Book a demo", secondaryCta: "Start free trial",
      features: ["Everything in monthly Enterprise", "2 months free", "Complimentary 4-session onboarding (worth A$4,500)", "Dedicated Account Manager"],
    },
  ],
};

const ADDONS = [
  { name: "TradeInduct", price: "A$129/mo + GST", standalone: true, sole: "Add-on", small: "Included", growing: "Included", ent: "Included", body: "QR-code site inductions. Subbies scan, complete, auto-logged." },
  { name: "TradeCheck", price: "A$149/mo + GST", standalone: true, sole: "Add-on", small: "Add-on", growing: "Included", ent: "Included", body: "Portable compliance credentials for subcontractors." },
  { name: "SafeBase Academy (10)", price: "A$199/mo + GST", standalone: true, sole: "Add-on", small: "Add-on", growing: "Included", ent: "Included (30)", body: "AI-adaptive safety microlearning. Tiers: 10 / 30 / 60 workers." },
  { name: "SafeBase Academy (11–30)", price: "A$299/mo + GST", standalone: true, sole: "—", small: "—", growing: "Upgrade", ent: "Included", body: "Expands Academy to 30 workers." },
  { name: "SafeBase Academy (31–60)", price: "A$449/mo + GST", standalone: true, sole: "—", small: "—", growing: "Upgrade", ent: "Upgrade", body: "Expands Academy to 60 workers." },
  { name: "WHS Consulting Retainer", price: "A$999–A$1,500/mo + GST", standalone: true, sole: "Add-on", small: "Add-on", growing: "Add-on", ent: "Add-on", body: "Qualified advisor working inside your SafeBase data." },
  { name: "White-Label Partner Program", price: "A$1,299/mo + GST", standalone: true, sole: "—", small: "—", growing: "Add-on", ent: "Add-on", body: "Co-branded instance + multi-client console for consultants." },
];

const SERVICES = [
  { name: "Assisted Setup", price: "A$1,200 + GST", body: "2-hour session with a specialist. Ideal for small crews." },
  { name: "Full Setup Service", price: "A$4,500 + GST", body: "End-to-end configuration, SWMS library build, compliance framework." },
  { name: "WHS System Setup", price: "A$3,500–A$6,500 + GST", body: "Comprehensive WHS system customised to your operation." },
  { name: "Incident Investigation", price: "A$1,500–A$3,000 + GST", body: "Qualified investigator, root-cause, regulator liaison." },
  { name: "WorkSafe Audit Preparation", price: "A$2,000–A$4,500 + GST", body: "Full compliance review + mock audit + evidence pack." },
  { name: "Franchise Network Setup", price: "from A$12,500 + GST", body: "Multi-site franchisor rollout with brand-aligned WHS systems." },
  { name: "Custom Training Module", price: "A$1,000–A$2,500 + GST each", body: "Build bespoke training aligned to your trade or principal contractor." },
];

const FAQ = [
  { q: "Is there a free trial?", a: "Yes — 14 days full access, no credit card required. All prices exclude GST." },
  { q: "Is the Enterprise trial a full 14-day trial?", a: "Yes — full access to all Enterprise features for 14 days. We recommend starting with a 30-minute discovery call so your onboarding is configured correctly before your trial begins." },
  { q: "Can I have more than 50 users on Enterprise?", a: "Yes — additional users are A$19/month + GST each. For teams over 75 users, contact us for a custom Enterprise+ quote." },
  { q: "What does a Dedicated Account Manager actually do?", a: "Your Account Manager is a named SafeBase specialist who knows your business. They are your first call for complex compliance questions, guide your quarterly reviews, and are available during notifiable incidents for real-time support. Not a help desk — a relationship." },
  { q: "What is covered in the 4-session onboarding?", a: "Session 1 — platform configuration. Session 2 — team training. Session 3 — SWMS library build. Session 4 — live run-through and sign-off. Delivered over your first 30 days." },
  { q: "Can I switch from Growing Business to Enterprise?", a: "Yes — upgrade any time. Your data carries over instantly. Your Account Manager is assigned within 24 hours of upgrading." },
  { q: "Is my data stored in Australia?", a: "Yes — all data hosted in AWS Sydney region." },
  { q: "Can I change plans anytime?", a: "Yes — upgrade or downgrade at any time. Billing is prorated." },
  { q: "Do workers need their own login?", a: "Workers use the mobile app for incident reporting, inductions and training. Only administrators need named user seats." },
  { q: "Does it cover all Australian states and territories?", a: "Yes — built for all WHS jurisdictions including Victoria's OHS Act 2004." },
];

// Full feature matrix — for the comparison table
const FEATURE_MATRIX = [
  { category: "Users", rows: [
    { label: "Named users", sole: "1", small: "Up to 5", growing: "Up to 20", ent: "Up to 50 (+$19/user)" },
    { label: "Additional users", sole: "—", small: "—", growing: "—", ent: "A$19/mo + GST each" },
  ]},
  { category: "Core features", rows: [
    { label: "AI SWMS generation", sole: true, small: true, growing: true, ent: true },
    { label: "Incident register", sole: true, small: true, growing: true, ent: true },
    { label: "Licence tracking + expiry alerts", sole: true, small: true, growing: true, ent: true },
    { label: "Toolbox Talks module", sole: false, small: true, growing: true, ent: true },
    { label: "Plant & Equipment register", sole: false, small: true, growing: true, ent: true },
    { label: "Risk register", sole: false, small: false, growing: true, ent: true },
    { label: "Hazardous substances & SDS", sole: false, small: false, growing: true, ent: true },
    { label: "Unlimited sites", sole: false, small: "5 sites", growing: true, ent: true },
  ]},
  { category: "Add-on products included", rows: [
    { label: "TradeInduct", sole: false, small: true, growing: true, ent: true },
    { label: "TradeCheck", sole: false, small: false, growing: true, ent: true },
    { label: "SafeBase Academy (workers)", sole: false, small: false, growing: "10 workers", ent: "30 workers" },
    { label: "White-Label Partner access", sole: false, small: false, growing: true, ent: true },
  ]},
  { category: "AI & Intelligence", rows: [
    { label: "Compliance dashboard", sole: "Basic", small: true, growing: "Advanced", ent: "Advanced + predictive" },
    { label: "AI pattern detection", sole: false, small: true, growing: true, ent: true },
    { label: "Cross-site pattern detection", sole: false, small: false, growing: false, ent: true },
    { label: "Monthly executive AI summary", sole: false, small: false, growing: false, ent: true },
    { label: "Custom compliance frameworks", sole: false, small: false, growing: false, ent: true },
    { label: "Legislative update alerts", sole: false, small: false, growing: true, ent: "All states, impact-assessed" },
  ]},
  { category: "Reporting & Integration", rows: [
    { label: "PDF audit pack export", sole: true, small: true, growing: true, ent: true },
    { label: "Advanced analytics", sole: false, small: false, growing: true, ent: true },
    { label: "Custom report builder", sole: false, small: false, growing: false, ent: true },
    { label: "Scheduled report delivery", sole: false, small: false, growing: false, ent: true },
    { label: "API access", sole: false, small: false, growing: "Export only", ent: "Full + sandbox" },
    { label: "Webhook support", sole: false, small: false, growing: false, ent: true },
    { label: "SSO (Google / Microsoft 365)", sole: false, small: false, growing: false, ent: true },
  ]},
  { category: "Support & Success", rows: [
    { label: "Email support", sole: true, small: "Priority", growing: "Priority", ent: "Priority + phone SLA" },
    { label: "Phone support", sole: false, small: false, growing: true, ent: "4-hour SLA" },
    { label: "Dedicated onboarding", sole: false, small: false, growing: "1 session", ent: "4 sessions (30 days)" },
    { label: "Dedicated Account Manager", sole: false, small: false, growing: false, ent: true },
    { label: "Quarterly Business Reviews", sole: false, small: false, growing: false, ent: true },
    { label: "Emergency incident support", sole: false, small: false, growing: false, ent: true },
  ]},
  { category: "Security & Compliance", rows: [
    { label: "Australian-hosted data (Sydney)", sole: true, small: true, growing: true, ent: true },
    { label: "Configurable data retention", sole: false, small: false, growing: false, ent: true },
    { label: "Enhanced immutable audit log", sole: false, small: false, growing: false, ent: true },
    { label: "Dedicated logical tenant", sole: false, small: false, growing: false, ent: true },
    { label: "Annual security review summary", sole: false, small: false, growing: false, ent: true },
  ]},
  { category: "Value included (A$/month)", rows: [
    { label: "Add-on value bundled", sole: "A$0", small: "A$129", growing: "A$477", ent: "A$577" },
  ]},
];

function Cell({ v, dark }) {
  if (v === true) return <CheckCircle weight="fill" className={`mx-auto ${dark ? "text-warning" : "text-emerald-600"}`} size={18} />;
  if (v === false) return <X className={`mx-auto ${dark ? "text-white/30" : "text-muted-foreground/50"}`} size={18} />;
  return <span className={`text-xs ${dark ? "text-white" : ""}`}>{v}</span>;
}

export default function Pricing() {
  const { user } = useAuth();
  const [cycle, setCycle] = useState("monthly");
  const [stats, setStats] = useState({ verified_count: 0, trade_count: 0, state_count: 0 });
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const tiers = TIERS[cycle];

  useEffect(() => {
    axios.get(`${API_URL}/api/tradecheck/stats`).then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const startCheckout = async (tierName) => {
    if (!user) return;
    const slug = TIER_SLUG[`${tierName}-${cycle}`];
    if (!slug) { toast.error("Unknown plan"); return; }
    setCheckoutLoading(slug);
    try {
      const r = await api.post("/billing/checkout", { tier_slug: slug, origin_url: window.location.origin });
      window.location.href = r.data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Checkout failed");
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 text-center">
          <div className="label-eyebrow mb-3">/ Pricing</div>
          <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter">Simple pricing.<br />No per-user fees on our first three plans.<br />No surprises on any.</h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">Start with what you need. Add products as your business grows. Upgrade when you are ready for more. <strong>All prices exclude GST.</strong></p>

          <div className="mt-8 flex flex-wrap gap-4 justify-center" data-testid="pricing-social-proof">
            <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2" data-testid="badge-verified">
              <ShieldCheck weight="fill" size={18} />
              <span className="label-eyebrow">{stats.verified_count >= 10 ? `${stats.verified_count} verified Australian tradies on TradeCheck` : "120+ verified Australian tradies on TradeCheck"}</span>
            </div>
            <div className="flex items-center gap-2 bg-ink text-warning px-4 py-2">
              <Star weight="fill" size={18} />
              <span className="label-eyebrow">4.9 ★ rating · 500+ reviews</span>
            </div>
            <div className="flex items-center gap-2 bg-warning text-ink px-4 py-2">
              <CheckCircle weight="fill" size={18} />
              <span className="label-eyebrow">Data hosted in Sydney · ISO-27001 aligned</span>
            </div>
          </div>

          <div className="mt-10 inline-flex border border-ink p-1 bg-background" data-testid="pricing-toggle">
            <button onClick={() => setCycle("monthly")} className={`px-5 py-2 label-eyebrow btn-sharp ${cycle === "monthly" ? "bg-ink text-white" : "text-ink"}`} data-testid="toggle-monthly">Monthly</button>
            <button onClick={() => setCycle("annual")} className={`px-5 py-2 label-eyebrow btn-sharp ${cycle === "annual" ? "bg-ink text-white" : "text-ink"}`} data-testid="toggle-annual">Annual · 2 months free</button>
          </div>
        </div>
      </section>

      {/* FOUR PLAN CARDS */}
      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-4 lg:px-12 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {tiers.map((t) => {
              const isEnt = t.enterprise;
              const isHigh = t.highlight;
              const cardCls = isEnt
                ? "bg-[#1B3A5C] text-white border-2 border-[#1B3A5C] shadow-2xl xl:scale-105 xl:relative xl:z-10"
                : isHigh
                  ? "bg-ink text-white border border-ink"
                  : "bg-background text-ink border border-border";
              return (
                <div key={t.name} className={`relative p-8 ${cardCls}`} data-testid={`pricing-tier-${t.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  {t.badge && (
                    <div className={`absolute -top-3 left-6 px-2 py-1 label-eyebrow border-2 border-ink flex items-center gap-1 ${isEnt ? "bg-warning text-ink" : "bg-warning text-ink"}`}>
                      {isHigh && <Star weight="fill" size={12} />}{t.badge}
                    </div>
                  )}
                  <div className="font-display font-bold text-2xl">{t.name}</div>
                  <div className={`mt-1 text-sm ${isEnt || isHigh ? "text-white/60" : "text-muted-foreground"}`}>{t.users}</div>
                  <div className={`mt-2 text-xs leading-snug ${isEnt || isHigh ? "text-white/70" : "text-muted-foreground"}`}>{t.desc}</div>
                  <div className="mt-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl">A$</span>
                      <span className="font-display font-black text-5xl">{t.price}</span>
                      <span className={isEnt || isHigh ? "text-white/60" : "text-muted-foreground"}>{t.period}</span>
                    </div>
                    <div className={`text-xs mt-1 ${isEnt || isHigh ? "text-white/50" : "text-muted-foreground"}`}>+ GST {t.monthlyEq && `· ${t.monthlyEq} + GST equivalent`}</div>
                  </div>

                  {/* CTAs */}
                  <div className="mt-6 space-y-2">
                    {isEnt ? (
                      <>
                        <Link to="/enterprise" className="block">
                          <Button className="w-full btn-sharp h-12 bg-white text-[#1B3A5C] hover:bg-warning" data-testid={`pricing-cta-${t.name.toLowerCase()}`}>
                            {t.cta} <ArrowRight className="ml-2" />
                          </Button>
                        </Link>
                        <Link to="/register" className="block">
                          <Button variant="outline" className="w-full btn-sharp h-11 bg-transparent text-white border-white hover:bg-white hover:text-[#1B3A5C]" data-testid={`pricing-cta2-${t.name.toLowerCase()}`}>
                            {t.secondaryCta}
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link to="/register" className={`block ${user ? "hidden" : ""}`}>
                          <Button className={`w-full btn-sharp h-12 ${isHigh ? "bg-warning text-ink hover:bg-white" : "bg-ink text-white hover:bg-authority"}`} data-testid={`pricing-cta-${t.name.toLowerCase().replace(/\s+/g, '-')}`}>
                            {t.cta} <ArrowRight className="ml-2" />
                          </Button>
                        </Link>
                        {user && (
                          <Button
                            onClick={() => startCheckout(t.name)}
                            disabled={checkoutLoading === TIER_SLUG[`${t.name}-${cycle}`]}
                            className={`w-full btn-sharp h-12 ${isHigh ? "bg-warning text-ink hover:bg-white" : "bg-ink text-white hover:bg-authority"}`}
                            data-testid={`pricing-upgrade-${t.name.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {checkoutLoading === TIER_SLUG[`${t.name}-${cycle}`] ? "Redirecting…" : (<>Subscribe <ArrowRight className="ml-2" /></>)}
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {isEnt && (
                    <div className="mt-3 text-[11px] text-white/60">Enterprise customers typically start with a 30-min discovery call.</div>
                  )}

                  <ul className="mt-6 space-y-2 text-sm">
                    {t.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <CheckCircle weight="fill" className={`shrink-0 mt-0.5 ${isEnt ? "text-warning" : isHigh ? "text-warning" : "text-ink"}`} size={16} />
                        <span className={isEnt || isHigh ? "" : ""}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-8 bg-warning border-2 border-ink p-5 text-center">
            <div className="font-bold">Growing Business includes <strong>A$477/mo</strong> of add-ons (A$5,724/yr saved). Enterprise includes <strong>A$577/mo</strong> of add-ons (A$6,924/yr saved) — before the dedicated Account Manager, quarterly reviews, and A$4,500 onboarding.</div>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            Need more than 50 users or a custom configuration? <Link to="/enterprise" className="underline font-bold">Contact us for Enterprise+</Link>.
          </div>
        </div>
      </section>

      {/* ADD-ONS TABLE */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Add-on products</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Add what you need, when you need it.</h2>
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-ink text-white">
                <tr>
                  <th className="text-left px-4 py-4 label-eyebrow text-warning">Product</th>
                  <th className="text-left px-4 py-4 label-eyebrow text-warning">Standalone</th>
                  <th className="text-center px-4 py-4 label-eyebrow text-warning">Sole Trader</th>
                  <th className="text-center px-4 py-4 label-eyebrow text-warning">Small</th>
                  <th className="text-center px-4 py-4 label-eyebrow text-warning">Growing</th>
                  <th className="text-center px-4 py-4 label-eyebrow text-warning">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {ADDONS.map((a) => (
                  <tr key={a.name} className="border-t border-border">
                    <td className="px-4 py-3 font-display font-bold">{a.name}<div className="text-xs text-muted-foreground font-normal">{a.body}</div></td>
                    <td className="px-4 py-3 font-mono text-xs">{a.price}</td>
                    <td className="px-4 py-3 text-center text-xs">{a.sole}</td>
                    <td className="px-4 py-3 text-center text-xs">{a.small}</td>
                    <td className="px-4 py-3 text-center text-xs">{a.growing}</td>
                    <td className="px-4 py-3 text-center text-xs bg-[#1B3A5C]/5 font-bold">{a.ent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Services</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Professional services.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
            {SERVICES.map((s) => (
              <div key={s.name} className="bg-background p-6">
                <div className="font-display font-bold text-lg">{s.name}</div>
                <div className="font-mono text-warning bg-ink px-2 py-1 inline-block text-xs mt-2">{s.price}</div>
                <div className="text-sm text-muted-foreground mt-3">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE COMPARISON MATRIX (collapsible on mobile) */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-12 py-24">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
            <div>
              <div className="label-eyebrow mb-2">/ Plan comparison</div>
              <h2 className="font-display text-4xl font-black tracking-tighter">Every feature, every plan.</h2>
            </div>
            <Button onClick={() => setShowMatrix((v) => !v)} variant="outline" className="btn-sharp border-ink md:hidden" data-testid="toggle-matrix">
              {showMatrix ? "Hide" : "Compare all features"} <CaretDown className={`ml-2 transition-transform ${showMatrix ? "rotate-180" : ""}`} />
            </Button>
          </div>
          <div className={`${showMatrix ? "block" : "hidden"} md:block`}>
            <div className="border-2 border-ink overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]" data-testid="feature-matrix">
                <thead className="bg-ink text-warning sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-3 label-eyebrow">Feature</th>
                    <th className="text-center px-3 py-3 label-eyebrow">Sole</th>
                    <th className="text-center px-3 py-3 label-eyebrow">Small</th>
                    <th className="text-center px-3 py-3 label-eyebrow">Growing</th>
                    <th className="text-center px-3 py-3 label-eyebrow bg-[#1B3A5C]">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_MATRIX.map((section) => (
                    <>
                      <tr key={`h-${section.category}`} className="bg-muted">
                        <td colSpan={5} className="px-3 py-2 label-eyebrow font-bold">{section.category}</td>
                      </tr>
                      {section.rows.map((r) => (
                        <tr key={`${section.category}-${r.label}`} className="border-t border-border">
                          <td className="px-3 py-2">{r.label}</td>
                          <td className="px-3 py-2 text-center"><Cell v={r.sole} /></td>
                          <td className="px-3 py-2 text-center"><Cell v={r.small} /></td>
                          <td className="px-3 py-2 text-center"><Cell v={r.growing} /></td>
                          <td className="px-3 py-2 text-center bg-[#1B3A5C]/10 font-bold"><Cell v={r.ent} /></td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* GUARANTEE */}
      <section className="border-b border-ink bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <div className="label-eyebrow text-warning mb-3">/ 30-day money-back guarantee</div>
            <h2 className="font-display text-3xl lg:text-5xl font-black tracking-tighter">If SafeBase doesn't save you at least 3 hours of admin per week in your first month, we'll refund you in full. No questions asked. From A$249/month + GST.</h2>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <Link to="/register"><Button className="btn-sharp h-14 px-8 bg-warning text-ink hover:bg-white" data-testid="pricing-final-cta">Start free trial <ArrowRight className="ml-2" /></Button></Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ FAQ</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Pricing questions.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            {FAQ.map((f, i) => (
              <div key={i} className="bg-background p-6">
                <div className="font-display font-bold text-lg">{f.q}</div>
                <div className="text-sm text-muted-foreground mt-2">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
