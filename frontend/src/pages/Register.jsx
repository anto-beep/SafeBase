import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HardHat, ChefHat, Truck, HeartStraight, ShoppingBag, Cube,
  ArrowRight, ArrowLeft, CheckCircle, GoogleLogo, Quotes,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { ROLES_BY_INDUSTRY, findRole } from "@/data/roles.config";

const INDUSTRY_TILES = [
  {
    slug: "trades",
    name: "Trades and Construction",
    blurb: "Electricians, plumbers, builders, roofers, concreters, carpenters and all construction trades",
    icon: HardHat,
    bg: "bg-[#0A1F44]",
    accent: "ring-[#0DC4B5]",
  },
  {
    slug: "hospitality",
    name: "Hospitality",
    blurb: "Restaurants, cafes, bars, hotels, catering, events and food service businesses",
    icon: ChefHat,
    bg: "bg-[#5B2A0A]",
    accent: "ring-[#F59E0B]",
  },
  {
    slug: "transport",
    name: "Transport and Logistics",
    blurb: "Truck operators, couriers, freight managers, warehousing and supply chain businesses",
    icon: Truck,
    bg: "bg-[#0E3B3B]",
    accent: "ring-[#0DC4B5]",
  },
  {
    slug: "healthcare",
    name: "Healthcare and Aged Care",
    blurb: "Allied health, aged care, disability support, medical centres and community health",
    icon: HeartStraight,
    bg: "bg-[#1E3A8A]",
    accent: "ring-[#60A5FA]",
  },
  {
    slug: "retail",
    name: "Retail",
    blurb: "Retail stores, shopping centres, franchise retail and multi-site retail operations",
    icon: ShoppingBag,
    bg: "bg-[#4C1D95]",
    accent: "ring-[#A855F7]",
  },
];

export default function Register() {
  const { registerEmail } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);  // 1=industry, 2=role, 3=details
  const [industry, setIndustry] = useState(null);
  const [role, setRole] = useState(null); // {id, label, variant, permission_role}
  const [searchParams] = useSearchParams();
  const [rightsizerHint, setRightsizerHint] = useState(null);

  // Hydrate from query params (?industry=healthcare&tier=2&team=15&locations=3)
  // or from localStorage saved by the Plan Right-sizer wizard.
  useEffect(() => {
    const qpIndustry = searchParams.get("industry");
    const qpTier = searchParams.get("tier");
    const qpTeam = searchParams.get("team");
    const qpLoc = searchParams.get("locations");
    if (qpIndustry && ["trades", "hospitality", "transport", "healthcare", "retail"].includes(qpIndustry)) {
      setIndustry(qpIndustry);
      setStep(2); // Skip industry-pick step
      setRightsizerHint({
        industry: qpIndustry,
        tier: qpTier,
        team: qpTeam,
        locations: qpLoc,
        source: "query",
      });
      return;
    }
    // Fallback: localStorage set by Plan Right-sizer wizard
    try {
      const raw = localStorage.getItem("safebase_rightsizer");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.industry && Date.now() - (saved.savedAt || 0) < 7 * 24 * 3600 * 1000) {
          setIndustry(saved.industry);
          setStep(2);
          setRightsizerHint({ ...saved, source: "localstorage" });
        }
      }
    } catch (e) { /* ignore */ }
  }, [searchParams]);
  const [form, setForm] = useState({
    name: "", email: "", password: "", company_name: "",
    agree: false, marketing: true,
  });
  const [loading, setLoading] = useState(false);

  const googleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.agree) { toast.error("Please accept the Terms of Service"); return; }
    if (!industry || !role) { toast.error("Please pick your industry and role"); return; }
    setLoading(true);
    try {
      await registerEmail({
        name: form.name,
        email: form.email,
        password: form.password,
        company_name: form.company_name,
        role: role.permission_role,
        industry,
        role_title: role.id,
        role_variant: role.variant,
      });
      toast.success(`Welcome aboard. Setting up your ${industry} workspace.`);
      // Convert Plan Right-sizer answers into a one-time dashboard hint the
      // Dashboard.jsx reads on first login.
      if (rightsizerHint) {
        try {
          localStorage.setItem("safebase_onboarding_hint", JSON.stringify({
            ...rightsizerHint,
            consumed: false,
            createdAt: Date.now(),
          }));
        } catch (e) { /* ignore */ }
      }
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------- STEP 1 — INDUSTRY TILES ----------
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white" data-testid="signup-step-industry">
        <div className="max-w-7xl mx-auto px-6 py-10 md:py-16">
          <Link to="/" className="inline-flex items-center gap-2 mb-12 hover:text-warning" data-testid="signup-brand-back">
            <div className="w-8 h-8 bg-warning flex items-center justify-center"><Cube weight="fill" className="text-ink" size={20} /></div>
            <span className="font-display font-black tracking-tight">SAFEBASE</span>
          </Link>
          <div className="label-eyebrow text-warning">/ Step 1 of 3 · Choose your industry</div>
          <h1 className="font-display text-4xl md:text-6xl font-black tracking-tighter mt-3 max-w-3xl">Start Your Free 14-Day Trial</h1>
          <p className="text-white/70 mt-4 max-w-2xl text-base md:text-lg">
            Select your industry. SafeBase configures itself completely — features, documents, terminology, and compliance requirements all adapt. No credit card required.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {INDUSTRY_TILES.map((t) => {
              const selected = industry === t.slug;
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => setIndustry(t.slug)}
                  data-testid={`signup-industry-tile-${t.slug}`}
                  className={`text-left p-7 ${t.bg} ring-2 transition-all duration-150 ${selected ? `${t.accent} scale-[1.02]` : "ring-white/5 hover:ring-white/30"}`}
                >
                  <t.icon weight="fill" size={42} className="text-white/90" />
                  <div className="font-display font-black text-xl mt-5 tracking-tight uppercase">{t.name}</div>
                  <p className="text-white/70 text-sm mt-2">{t.blurb}</p>
                  {selected && (
                    <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-warning">
                      <CheckCircle weight="fill" size={14} /> SELECTED
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-10 flex items-center justify-between flex-wrap gap-3">
            <Link to="/login" className="text-sm text-white/60 hover:text-white" data-testid="signup-link-login">
              Already have an account? Log in →
            </Link>
            <Button
              onClick={() => industry && setStep(2)}
              disabled={!industry}
              className="btn-sharp h-12 bg-warning text-ink hover:bg-yellow-300 disabled:bg-white/20 disabled:text-white/40 px-7"
              data-testid="signup-industry-continue"
            >
              Continue <ArrowRight className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- STEP 2 — ROLE TILES ----------
  if (step === 2) {
    const roles = ROLES_BY_INDUSTRY[industry] || [];
    const tile = INDUSTRY_TILES.find((t) => t.slug === industry);
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white" data-testid="signup-step-role">
        <div className="max-w-7xl mx-auto px-6 py-10 md:py-16">
          <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 mb-10 text-white/60 hover:text-white text-sm" data-testid="signup-role-back">
            <ArrowLeft size={16} /> Back to industry
          </button>
          <div className="label-eyebrow text-warning">/ Step 2 of 3 · Choose your role · {tile?.name}</div>
          <h1 className="font-display text-4xl md:text-6xl font-black tracking-tighter mt-3 max-w-3xl">What is your role?</h1>
          <p className="text-white/70 mt-4 max-w-2xl text-base md:text-lg">
            Your role determines your dashboard view and what you see first when you log in.
          </p>
          {rightsizerHint && (
            <div className="mt-6 max-w-2xl border-l-4 border-warning bg-warning/10 px-4 py-3 text-sm" data-testid="signup-rightsizer-hint">
              <div className="font-bold text-warning">We've pre-selected {tile?.name} for you.</div>
              <div className="text-white/70 mt-1">Based on your Plan Right-sizer answers{rightsizerHint.team ? ` (${rightsizerHint.team} users` : ""}{rightsizerHint.locations ? `, ${rightsizerHint.locations} locations)` : rightsizerHint.team ? ")" : ""}. You can change industry from the back button above.</div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-8">
            {roles.map((r) => {
              const selected = role?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r)}
                  data-testid={`signup-role-tile-${r.id}`}
                  className={`text-left p-4 bg-white/5 ring-2 transition-all duration-150 ${selected ? `ring-warning scale-[1.02] bg-warning/10` : "ring-white/10 hover:ring-white/40"}`}
                >
                  <div className="font-display font-black text-base tracking-tight">{r.label}</div>
                  <div className="label-eyebrow text-white/50 mt-2 text-[10px]">
                    {r.variant === "owner" && "Full management view"}
                    {r.variant === "safety_lead" && "Compliance lead view"}
                    {r.variant === "supervisor" && "Team supervisor view"}
                    {r.variant === "worker" && "Mobile-first worker view"}
                  </div>
                </button>
              );
            })}
          </div>

          {role && (
            <div className="mt-8 bg-warning/10 border-l-4 border-warning p-5 max-w-2xl" data-testid="signup-role-confirm">
              <div className="label-eyebrow text-warning">CONFIRMED</div>
              <p className="text-white mt-1 text-base">
                You are a <strong>{role.label}</strong> in a <strong>{tile?.name}</strong> business. Your SafeBase dashboard is ready.
              </p>
            </div>
          )}

          <div className="mt-10 flex items-center justify-end">
            <Button
              onClick={() => role && setStep(3)}
              disabled={!role}
              className="btn-sharp h-12 bg-warning text-ink hover:bg-yellow-300 disabled:bg-white/20 disabled:text-white/40 px-7"
              data-testid="signup-role-continue"
            >
              Continue <ArrowRight className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- STEP 3 — DETAILS ----------
  const tile = INDUSTRY_TILES.find((t) => t.slug === industry);
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12" data-testid="signup-step-details">
      <div className="lg:col-span-7 p-6 md:p-12 flex items-center bg-white">
        <div className="w-full max-w-xl mx-auto">
          <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-ink mb-6" data-testid="signup-details-back">
            <ArrowLeft size={16} /> Back to role
          </button>
          <div className="label-eyebrow mb-3">/ Step 3 of 3 · Create your account</div>
          <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mb-2">Almost there.<br />14-day free trial.</h2>
          <p className="text-muted-foreground mb-6">No credit card. Cancel anytime.</p>

          <div className="bg-muted border-l-4 border-ink p-4 mb-6" data-testid="signup-details-summary">
            <div className="label-eyebrow">Your selection</div>
            <div className="mt-1.5 text-sm">
              <strong>{tile?.name}</strong> · {role?.label}
            </div>
          </div>

          <Button onClick={googleLogin} variant="outline" className="w-full btn-sharp h-12 border-ink mb-4" data-testid="google-register-btn">
            <GoogleLogo weight="bold" className="mr-2" /> Sign up with Google
          </Button>
          <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-border" /><span className="label-eyebrow">or</span><div className="flex-1 h-px bg-border" /></div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="register-form">
            <div className="md:col-span-1">
              <Label className="label-eyebrow">First name</Label>
              <Input data-testid="reg-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 h-12 rounded-none border-ink" />
            </div>
            <div className="md:col-span-1">
              <Label className="label-eyebrow">Business name</Label>
              <Input data-testid="reg-company" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-2 h-12 rounded-none border-ink" />
            </div>
            <div className="md:col-span-2">
              <Label className="label-eyebrow">Email</Label>
              <Input data-testid="reg-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 h-12 rounded-none border-ink" />
            </div>
            <div className="md:col-span-2">
              <Label className="label-eyebrow">Password</Label>
              <Input data-testid="reg-password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-2 h-12 rounded-none border-ink" />
            </div>

            <label className="md:col-span-2 flex items-start gap-2 text-sm mt-2">
              <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} className="mt-1" data-testid="reg-agree" required />
              <span>I agree to the <a href="/terms" className="underline">Terms of Service</a> and <a href="/privacy" className="underline">Privacy Policy</a></span>
            </label>
            <label className="md:col-span-2 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.marketing} onChange={(e) => setForm({ ...form, marketing: e.target.checked })} className="mt-1" />
              <span>Send me WHS compliance tips (unsubscribe anytime)</span>
            </label>
            <Button type="submit" disabled={loading} className="md:col-span-2 btn-sharp h-14 bg-ink text-white hover:bg-authority mt-2 text-base" data-testid="register-submit-btn">
              {loading ? "Creating account…" : "Go to my dashboard"}
            </Button>
          </form>
          <div className="mt-6 text-sm">Have an account? <Link to="/login" className="font-bold underline" data-testid="link-to-login">Log in</Link></div>
        </div>
      </div>

      {/* TRUST COLUMN */}
      <div className="lg:col-span-5 bg-ink text-white p-8 md:p-12 flex flex-col justify-center order-first lg:order-last">
        <div className="label-eyebrow text-warning mb-3">/ TRUST SIGNALS</div>
        <h3 className="font-display text-3xl lg:text-4xl font-black tracking-tighter">Compliance<br />for every<br />Australian business.</h3>
        <ul className="mt-8 space-y-3 text-white/80 text-sm">
          <li className="flex gap-2"><CheckCircle weight="fill" className="text-warning shrink-0" /> 14-day full access trial</li>
          <li className="flex gap-2"><CheckCircle weight="fill" className="text-warning shrink-0" /> No credit card required</li>
          <li className="flex gap-2"><CheckCircle weight="fill" className="text-warning shrink-0" /> Data hosted in AWS Sydney</li>
          <li className="flex gap-2"><CheckCircle weight="fill" className="text-warning shrink-0" /> Cancel anytime</li>
          <li className="flex gap-2"><CheckCircle weight="fill" className="text-warning shrink-0" /> 30-day money-back guarantee after trial</li>
        </ul>
        <div className="mt-10 space-y-6">
          {[
            { q: "Saved me 4 hours a week on SWMS alone", n: "Electrician, Melbourne", ind: "Trades" },
            { q: "Temperature logs that actually get done — council-ready", n: "Cafe owner, Brisbane", ind: "Hospitality" },
            { q: "Every AHPRA registration tracked. Zero lapses.", n: "Practice manager, Sydney", ind: "Healthcare" },
          ].map((t) => (
            <div key={t.n} className="border-l-4 border-warning pl-4">
              <Quotes size={18} weight="duotone" className="text-warning" />
              <div className="font-mono text-sm mt-1">"{t.q}"</div>
              <div className="label-eyebrow mt-2 text-white/60">— {t.n} <span className="text-warning">· {t.ind}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
