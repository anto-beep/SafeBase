import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardHat, GoogleLogo } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Register() {
  const { registerEmail } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", company_name: "", role: "owner" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerEmail(form);
      toast.success("Account created");
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

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target?.value ?? e });

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex bg-warning relative overflow-hidden order-2">
        <div className="absolute inset-0 ribbon-stripe opacity-10" />
        <div className="relative z-10 p-12 flex flex-col justify-between text-ink">
          <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-ink flex items-center justify-center"><HardHat weight="fill" className="text-warning" size={20} /></div><span className="font-display font-black tracking-tight">SAFETRADIE</span></Link>
          <div>
            <div className="label-eyebrow mb-4">/ START FREE TRIAL</div>
            <h1 className="font-display text-5xl font-black leading-[0.95]">Generate your<br />first SWMS<br />in 90 seconds.</h1>
            <ul className="mt-8 space-y-2 text-sm">
              <li>✓ 14-day free trial · no credit card</li>
              <li>✓ Plans from A$150/month</li>
              <li>✓ 30-day money-back guarantee</li>
              <li>✓ Australian WHS aligned</li>
            </ul>
          </div>
          <div className="font-mono text-xs">Trusted by 1,200+ Australian trade crews</div>
        </div>
      </div>
      <div className="flex items-center justify-center p-8 order-1">
        <div className="w-full max-w-md">
          <div className="label-eyebrow mb-3">/ Create account</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-8">Start free.</h2>
          <Button onClick={googleLogin} variant="outline" className="w-full btn-sharp h-12 border-ink mb-4" data-testid="google-register-btn"><GoogleLogo weight="bold" className="mr-2" /> Sign up with Google</Button>
          <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-border" /><span className="label-eyebrow">or</span><div className="flex-1 h-px bg-border" /></div>
          <form onSubmit={handleSubmit} className="space-y-3" data-testid="register-form">
            <div>
              <Label className="label-eyebrow">Full name</Label>
              <Input data-testid="reg-name" value={form.name} onChange={onChange("name")} required className="mt-2 h-12 rounded-none border-ink" />
            </div>
            <div>
              <Label className="label-eyebrow">Company name</Label>
              <Input data-testid="reg-company" value={form.company_name} onChange={onChange("company_name")} className="mt-2 h-12 rounded-none border-ink" />
            </div>
            <div>
              <Label className="label-eyebrow">Email</Label>
              <Input data-testid="reg-email" type="email" value={form.email} onChange={onChange("email")} required className="mt-2 h-12 rounded-none border-ink" />
            </div>
            <div>
              <Label className="label-eyebrow">Password</Label>
              <Input data-testid="reg-password" type="password" value={form.password} onChange={onChange("password")} required minLength={6} className="mt-2 h-12 rounded-none border-ink" />
            </div>
            <div>
              <Label className="label-eyebrow">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-2 h-12 rounded-none border-ink" data-testid="reg-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Trade business owner</SelectItem>
                  <SelectItem value="worker">Worker / Crew</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading} className="w-full btn-sharp h-12 bg-ink text-white hover:bg-authority mt-2" data-testid="register-submit-btn">{loading ? "Creating..." : "Create account"}</Button>
          </form>
          <div className="mt-6 text-sm">Have an account? <Link to="/login" className="font-bold underline" data-testid="link-to-login">Log in</Link></div>
        </div>
      </div>
    </div>
  );
}
