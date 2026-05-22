import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cube, GoogleLogo } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Login() {
  const { loginEmail } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginEmail(email, password);
      toast.success("Logged in");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex bg-ink relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-10" />
        <div className="relative z-10 p-12 flex flex-col justify-between text-white">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-back">
            <div className="w-8 h-8 bg-warning flex items-center justify-center"><Cube weight="fill" className="text-ink" size={20} /></div>
            <span className="font-display font-black tracking-tight">SAFEBASE</span>
          </Link>
          <div>
            <div className="label-eyebrow text-warning mb-4">/ COMPLIANCE INFRASTRUCTURE</div>
            <h1 className="font-display text-5xl font-black leading-[0.95] mb-4">Welcome Back.<br /><span className="bg-warning text-ink px-2">Your Industry.</span><br />Your Compliance.</h1>
            <ul className="text-white/75 max-w-md mt-8 space-y-3 text-base" data-testid="login-taglines">
              <li>WHS compliance for every industry.</li>
              <li>From the kitchen to the clinic. From the depot to the store.</li>
              <li>Your industry. Your compliance. Your platform.</li>
              <li>AI-powered. Australian-built. Every industry.</li>
            </ul>
            <div className="text-xs font-mono text-white/50 mt-8 uppercase tracking-widest">Trades — Hospitality — Transport — Healthcare — Retail</div>
          </div>
          <div className="font-mono text-xs text-white/40">Australian data. AWS Sydney. Privacy Act compliant.</div>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-ink flex items-center justify-center"><Cube weight="fill" className="text-warning" size={20} /></div><span className="font-display font-black">SAFEBASE</span></Link>
          </div>
          <div className="label-eyebrow mb-3">/ Sign in</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-2">Welcome Back.</h2>
          <p className="text-sm text-muted-foreground mb-8">Log in to your SafeBase account.</p>

          <Button onClick={googleLogin} variant="outline" className="w-full btn-sharp h-12 border-ink mb-4" data-testid="google-login-btn">
            <GoogleLogo weight="bold" className="mr-2" /> Continue with Google
          </Button>
          <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-border" /><span className="label-eyebrow">or</span><div className="flex-1 h-px bg-border" /></div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="label-eyebrow">Email</Label>
              <Input id="email" data-testid="login-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 h-12 rounded-none border-ink" />
            </div>
            <div>
              <Label htmlFor="password" className="label-eyebrow">Password</Label>
              <Input id="password" data-testid="login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-2 h-12 rounded-none border-ink" />
              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-xs text-ink hover:underline font-mono uppercase tracking-widest" data-testid="forgot-password-link">
                  Forgot your password?
                </Link>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="login-submit-btn">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 text-sm">
            New to SafeBase? <Link to="/register" className="font-bold underline" data-testid="link-to-register">Start your free trial</Link>
          </div>
          <div className="mt-6 text-xs font-mono text-muted-foreground">Australian data. AWS Sydney. Privacy Act compliant.</div>
        </div>
      </div>
    </div>
  );
}
