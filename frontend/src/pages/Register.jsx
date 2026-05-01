import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardHat, GoogleLogo, CheckCircle, Quotes } from "@phosphor-icons/react";
import { toast } from "sonner";

const TRADES = ["Electrician", "Plumber", "Builder", "Carpenter", "Roofer", "Gasfitter", "Other"];
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];
const WORKER_BANDS = ["Just me", "2-5", "6-10", "11-20", "20+"];
const INDUSTRIES = [
  { slug: "trades", label: "Trades and Construction" },
  { slug: "hospitality", label: "Hospitality" },
  { slug: "transport", label: "Transport and Logistics" },
  { slug: "healthcare", label: "Healthcare and Aged Care" },
  { slug: "retail", label: "Retail" },
];

export default function Register() {
  const { registerEmail } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", password: "", company_name: "",
    industry: "trades",
    trade_type: "Electrician", primary_state: "NSW", worker_count_band: "Just me",
    phone: "", role: "owner", agree: false, marketing: true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.agree) { toast.error("Please accept the Terms of Service"); return; }
    setLoading(true);
    try {
      await registerEmail({
        name: form.name,
        email: form.email,
        password: form.password,
        company_name: form.company_name,
        role: form.role,
        industry: form.industry,
      });
      toast.success("Account created — let's get you set up");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12">
      <div className="lg:col-span-7 p-6 md:p-12 flex items-center">
        <div className="w-full max-w-2xl mx-auto">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="brand-back">
            <div className="w-8 h-8 bg-ink flex items-center justify-center"><HardHat weight="fill" className="text-warning" size={20} /></div>
            <span className="font-display font-black">SAFEBASE</span>
          </Link>
          <div className="label-eyebrow mb-3">/ Create account</div>
          <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mb-2">Start free.<br />14-day trial.</h2>
          <p className="text-muted-foreground mb-6">No credit card. Cancel anytime.</p>

          <Button onClick={googleLogin} variant="outline" className="w-full btn-sharp h-12 border-ink mb-4" data-testid="google-register-btn">
            <GoogleLogo weight="bold" className="mr-2" /> Sign up with Google
          </Button>
          <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-border" /><span className="label-eyebrow">or</span><div className="flex-1 h-px bg-border" /></div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="register-form">
            <div className="md:col-span-2">
              <Label className="label-eyebrow">Your industry</Label>
              <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                <SelectTrigger className="mt-2 h-12 rounded-none border-ink" data-testid="reg-industry"><SelectValue /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i.slug} value={i.slug} data-testid={`reg-industry-${i.slug}`}>{i.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">SafeBase tailors your library, documents, and compliance obligations to this choice. You can change it later in Settings.</p>
            </div>
            <div><Label className="label-eyebrow">First name</Label><Input data-testid="reg-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>
            <div><Label className="label-eyebrow">Business name</Label><Input data-testid="reg-company" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>
            <div><Label className="label-eyebrow">Email</Label><Input data-testid="reg-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>
            <div><Label className="label-eyebrow">Mobile</Label><Input data-testid="reg-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-2 h-12 rounded-none border-ink" placeholder="For SMS alerts" /></div>
            <div>
              <Label className="label-eyebrow">Trade</Label>
              <Select value={form.trade_type} onValueChange={(v) => setForm({ ...form, trade_type: v })}>
                <SelectTrigger className="mt-2 h-12 rounded-none border-ink" data-testid="reg-trade"><SelectValue /></SelectTrigger>
                <SelectContent>{TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="label-eyebrow">State</Label>
              <Select value={form.primary_state} onValueChange={(v) => setForm({ ...form, primary_state: v })}>
                <SelectTrigger className="mt-2 h-12 rounded-none border-ink" data-testid="reg-state"><SelectValue /></SelectTrigger>
                <SelectContent>{STATES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="label-eyebrow">Workers</Label>
              <Select value={form.worker_count_band} onValueChange={(v) => setForm({ ...form, worker_count_band: v })}>
                <SelectTrigger className="mt-2 h-12 rounded-none border-ink" data-testid="reg-workers"><SelectValue /></SelectTrigger>
                <SelectContent>{WORKER_BANDS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="label-eyebrow">I am</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-2 h-12 rounded-none border-ink" data-testid="reg-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Business owner</SelectItem>
                  <SelectItem value="worker">Worker / Crew</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label className="label-eyebrow">Password</Label><Input data-testid="reg-password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>

            <label className="md:col-span-2 flex items-start gap-2 text-sm mt-2">
              <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} className="mt-1" data-testid="reg-agree" required />
              <span>I agree to the <a href="/terms" className="underline">Terms of Service</a> and <a href="/privacy" className="underline">Privacy Policy</a></span>
            </label>
            <label className="md:col-span-2 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.marketing} onChange={(e) => setForm({ ...form, marketing: e.target.checked })} className="mt-1" />
              <span>Send me WHS compliance tips (unsubscribe anytime)</span>
            </label>
            <Button type="submit" disabled={loading} className="md:col-span-2 btn-sharp h-14 bg-ink text-white hover:bg-authority mt-2 text-base" data-testid="register-submit-btn">
              {loading ? "Creating account…" : "Start my free 14-day trial"}
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
