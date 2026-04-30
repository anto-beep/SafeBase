import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { CheckCircle, X, ArrowRight, Star, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TIER_SLUG = {
  "Sole Trader-monthly": "sole_trader_monthly",
  "Small Business-monthly": "small_business_monthly",
  "Growing Business-monthly": "growing_business_monthly",
  "Sole Trader-annual": "sole_trader_annual",
  "Small Business-annual": "small_business_annual",
  "Growing Business-annual": "growing_business_annual",
};

const TIERS = {
  monthly: [
    { name: "Sole Trader", price: "150", period: "/mo", users: "1 user", desc: "For owner-operators getting compliant.", cta: "Start free trial",
      features: ["Unlimited SWMS generation", "Incident register", "Up to 10 worker profiles", "Licence & credential tracking", "Expiry alerts", "Audit preparation report (PDF)", "Mobile app (iOS & Android)", "Email support"] },
    { name: "Small Business", price: "250", period: "/mo", users: "up to 5 users", highlight: true, desc: "For SMEs scaling 2–5 users.", cta: "Start free trial",
      features: ["Everything in Sole Trader", "Contractor compliance document capture", "AI pattern detection across incidents", "Site management (up to 5 sites)", "TradeInduct QR inductions (worth A$59/mo)", "Priority email & chat support"] },
    { name: "Growing Business", price: "400", period: "/mo", users: "up to 20 users", desc: "For multi-site and larger teams.", cta: "Start free trial",
      features: ["Everything in Small Business", "Unlimited sites", "White-label access for consultants", "Advanced analytics & benchmarking", "TradeCheck (worth A$59/mo)", "SafeTradie Academy (worth A$89/mo)", "Legislative update alerts", "Phone support + dedicated onboarding"] },
  ],
  annual: [
    { name: "Sole Trader", price: "1,500", period: "/yr", users: "1 user", desc: "Save A$300 vs monthly.", cta: "Start free trial",
      features: ["Everything in monthly Sole Trader", "2 months free", "Priority trial onboarding"] },
    { name: "Small Business", price: "2,500", period: "/yr", users: "up to 5 users", highlight: true, desc: "Save A$500 vs monthly.", cta: "Start free trial",
      features: ["Everything in monthly Small Business", "2 months free", "Assisted setup discount (A$500 off)"] },
    { name: "Growing Business", price: "4,000", period: "/yr", users: "up to 20 users", desc: "Save A$800 vs monthly.", cta: "Start free trial",
      features: ["Everything in monthly Growing Business", "2 months free", "Complimentary dedicated onboarding"] },
  ],
};

const ADDONS = [
  { name: "TradeInduct", price: "A$59/mo", included: "Small Business+", body: "QR-code site inductions. Subbies scan, complete, auto-logged." },
  { name: "TradeCheck", price: "A$59/mo", included: "Growing Business+", body: "Portable compliance credentials for subcontractors." },
  { name: "SafeTradie Academy", price: "A$89/mo", included: "Growing Business+", body: "AI-adaptive safety microlearning (up to 10 workers). Scales from there." },
  { name: "WHS Consulting Retainer", price: "from A$600/mo", included: "Add to any plan", body: "Qualified advisor working inside your SafeTradie data." },
  { name: "White-label Partner Program", price: "A$699/mo", included: "Growing Business+", body: "Co-branded instance + multi-client console for consultants." },
];

const IMPL = [
  { name: "DIY Setup", price: "Free", body: "Guided onboarding wizard, video tutorials, knowledge base." },
  { name: "Assisted Setup", price: "A$750", body: "2-hour session with an onboarding specialist. Best for small crews." },
  { name: "Full Setup Service", price: "A$2,500", body: "Complete WHS system configuration, SWMS library, compliance framework." },
];

const CONSULTING = [
  { name: "WHS System Setup", price: "A$2,000 – 4,000", body: "End-to-end configuration + initial SWMS library creation." },
  { name: "Monthly Compliance Retainer", price: "A$600 – 900/mo", body: "Monthly review, risk flagging, written summary, one on-call question." },
  { name: "Incident Investigation", price: "A$750 – 2,000", body: "Qualified investigator, root-cause, regulator liaison." },
  { name: "WorkSafe Audit Preparation", price: "A$1,200 – 2,500", body: "Full compliance review + mock audit + evidence pack." },
];

const FAQ = [
  { q: "Is there a free trial?", a: "Yes — 14 days full access, no credit card required." },
  { q: "Can I change plans anytime?", a: "Yes — upgrade or downgrade at any time. Billing is prorated." },
  { q: "Is my data stored in Australia?", a: "Yes — all data hosted in AWS Sydney region." },
  { q: "Do workers need their own login?", a: "Workers use the mobile app for incident reporting, inductions and training. Only administrators need named user seats." },
  { q: "What happens when WorkSafe visits?", a: "Export your complete audit pack as a PDF in under 2 minutes." },
  { q: "Does it cover all Australian states and territories?", a: "Yes — built for all WHS jurisdictions including Victoria's OHS Act 2004." },
  { q: "Can I use it to manage subcontractors?", a: "Yes — TradeCheck and TradeInduct handle subcontractor compliance and site inductions." },
  { q: "What if I need help beyond the software?", a: "Our WHS Consulting services provide qualified human expert support from A$600/month." },
];

export default function Pricing() {
  const { user } = useAuth();
  const [cycle, setCycle] = useState("monthly");
  const [stats, setStats] = useState({ verified_count: 0, trade_count: 0, state_count: 0 });
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const tiers = TIERS[cycle];

  useEffect(() => {
    axios.get(`${API_URL}/api/tradecheck/stats`).then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const startCheckout = async (tierName) => {
    if (!user) return; // fallback link handles unauthenticated
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
          <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter">Simple pricing.<br />No per-user fees.<br />No surprises.</h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">Every plan includes the core SafeTradie platform. Add products as your business grows.</p>

          {/* Social proof badges */}
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

      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {tiers.map((t) => (
              <div key={t.name} className={`p-8 ${t.highlight ? "bg-ink text-white" : "bg-background"} relative`} data-testid={`pricing-tier-${t.name.toLowerCase().replace(/\s+/g, '-')}`}>
                {t.highlight && <div className="absolute -top-3 left-8 px-2 py-1 bg-warning text-ink label-eyebrow border-2 border-ink flex items-center gap-1"><Star weight="fill" size={12} />MOST POPULAR</div>}
                <div className="font-display font-bold text-2xl">{t.name}</div>
                <div className={`mt-1 text-sm ${t.highlight ? "text-white/60" : "text-muted-foreground"}`}>{t.users}</div>
                <div className={`mt-1 text-xs ${t.highlight ? "text-white/50" : "text-muted-foreground"}`}>{t.desc}</div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-xl">A$</span><span className="font-display font-black text-6xl">{t.price}</span>
                  <span className={t.highlight ? "text-white/60" : "text-muted-foreground"}>{t.period}</span>
                </div>
                <Link to="/register" className={`block mt-6 ${user ? "hidden" : ""}`}>
                  <Button className={`w-full btn-sharp h-12 ${t.highlight ? "bg-warning text-ink hover:bg-white" : "bg-ink text-white hover:bg-authority"}`} data-testid={`pricing-cta-${t.name.toLowerCase().replace(/\s+/g, '-')}`}>
                    {t.cta} <ArrowRight className="ml-2" />
                  </Button>
                </Link>
                {user && (
                  <Button
                    onClick={() => startCheckout(t.name)}
                    disabled={checkoutLoading === TIER_SLUG[`${t.name}-${cycle}`]}
                    className={`w-full btn-sharp h-12 mt-6 ${t.highlight ? "bg-warning text-ink hover:bg-white" : "bg-ink text-white hover:bg-authority"}`}
                    data-testid={`pricing-upgrade-${t.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {checkoutLoading === TIER_SLUG[`${t.name}-${cycle}`] ? "Redirecting…" : (<>Subscribe <ArrowRight className="ml-2" /></>)}
                  </Button>
                )}
                <ul className="mt-6 space-y-2 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2"><CheckCircle weight="fill" className={`shrink-0 ${t.highlight ? "text-warning" : "text-ink"}`} />{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-warning border-2 border-ink p-4 text-center font-bold">
            Growing Business includes A$207/month of add-ons at no extra cost — A$2,484 annual savings vs purchasing separately.
          </div>
        </div>
      </section>

      {/* ADDONS */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Add-on products</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Add what you need, when you need it.</h2>
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink text-white">
                <tr>
                  <th className="text-left px-4 py-4 label-eyebrow text-warning">Product</th>
                  <th className="text-left px-4 py-4 label-eyebrow text-warning">Standalone Price</th>
                  <th className="text-left px-4 py-4 label-eyebrow text-warning">Included In</th>
                  <th className="text-left px-4 py-4 label-eyebrow text-warning">What it does</th>
                </tr>
              </thead>
              <tbody>
                {ADDONS.map((a) => (
                  <tr key={a.name} className="border-t border-border">
                    <td className="px-4 py-4 font-display font-bold">{a.name}</td>
                    <td className="px-4 py-4 font-mono">{a.price}</td>
                    <td className="px-4 py-4"><span className="bg-warning text-ink px-2 py-0.5 text-[11px] font-bold">{a.included}</span></td>
                    <td className="px-4 py-4 text-muted-foreground">{a.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* IMPL */}
      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Implementation</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Three ways to launch.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {IMPL.map((a) => (
              <div key={a.name} className="bg-background p-8">
                <div className="font-display font-bold text-xl">{a.name}</div>
                <div className="font-mono text-warning bg-ink px-2 py-1 inline-block text-xs mt-2">{a.price}</div>
                <div className="text-sm text-muted-foreground mt-3">{a.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONSULTING */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ WHS Consulting services</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Human experts. Working inside your data.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
            {CONSULTING.map((c) => (
              <div key={c.name} className="bg-background p-6">
                <div className="font-display font-bold text-lg">{c.name}</div>
                <div className="font-mono text-warning bg-ink px-2 py-1 inline-block text-xs mt-2">{c.price}</div>
                <div className="text-sm text-muted-foreground mt-3">{c.body}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/consulting"><Button variant="outline" className="btn-sharp border-ink h-12 px-6" data-testid="cta-consulting">Explore consulting services <ArrowRight className="ml-2" /></Button></Link>
          </div>
        </div>
      </section>

      {/* GUARANTEE */}
      <section className="border-b border-ink bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <div className="label-eyebrow text-warning mb-3">/ 30-day money-back guarantee</div>
            <h2 className="font-display text-3xl lg:text-5xl font-black tracking-tighter">If SafeTradie doesn't save you at least 3 hours of admin per week in your first month, we'll refund you in full. No questions asked.</h2>
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
