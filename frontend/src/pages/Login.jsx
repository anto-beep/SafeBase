import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HardHat, GoogleLogo } from "@phosphor-icons/react";
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
            <div className="w-8 h-8 bg-warning flex items-center justify-center"><HardHat weight="fill" className="text-ink" size={20} /></div>
            <span className="font-display font-black tracking-tight">SAFETRADIE</span>
          </Link>
          <div>
            <div className="label-eyebrow text-warning mb-4">/ COMPLIANCE INFRASTRUCTURE</div>
            <h1 className="font-display text-5xl font-black leading-[0.95] mb-4">Welcome back<br />to your safety<br /><span className="bg-warning text-ink px-2">command centre.</span></h1>
            <p className="text-white/70 max-w-md mt-8">Every SWMS. Every licence. Every incident. One source of truth for your trade business.</p>
          </div>
          <div className="font-mono text-xs text-white/40">v1.0 · ISO-aligned · AS/NZS 4801</div>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-ink flex items-center justify-center"><HardHat weight="fill" className="text-warning" size={20} /></div><span className="font-display font-black">SAFETRADIE</span></Link>
          </div>
          <div className="label-eyebrow mb-3">/ Sign in</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-8">Log in.</h2>

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
            </div>
            <Button type="submit" disabled={loading} className="w-full btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="login-submit-btn">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 text-sm">
            No account? <Link to="/register" className="font-bold underline" data-testid="link-to-register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
