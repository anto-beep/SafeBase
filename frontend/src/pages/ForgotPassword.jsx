import { useState } from "react";
import { Link } from "react-router-dom";
import { Cube, ArrowLeft, EnvelopeSimple, CheckCircle } from "@phosphor-icons/react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await api.post("/auth/forgot-password", { email });
      if (r.data?.dev_reset_url) setDevUrl(r.data.dev_reset_url);
      setSent(true);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        setError("Too many reset requests. Please wait an hour before trying again.");
      } else {
        setError(err?.response?.data?.detail || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
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
            <div className="label-eyebrow text-warning mb-4">/ Password recovery</div>
            <h1 className="font-display text-5xl font-black leading-[0.95] mb-4">
              Forgot it?<br /><span className="bg-warning text-ink px-2">No drama.</span><br />Quick reset.
            </h1>
            <p className="text-white/75 max-w-md mt-8 text-base leading-relaxed">
              Enter your email and we'll send you a secure link to set a new password. The link is valid for one hour.
            </p>
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

          {!sent ? (
            <>
              <div className="label-eyebrow mb-3">/ Reset password</div>
              <h2 className="font-display text-4xl font-black tracking-tighter mb-2">Reset Your Password</h2>
              <p className="text-sm text-muted-foreground mb-8">
                Enter the email address linked to your SafeBase account and we'll send you a reset link.
              </p>

              <form onSubmit={onSubmit} className="space-y-4" data-testid="forgot-password-form">
                <div>
                  <Label htmlFor="email" className="label-eyebrow">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 h-12 rounded-none border-ink"
                    data-testid="forgot-email-input"
                  />
                </div>
                {error && (
                  <div className="text-sm text-destructive border border-destructive bg-destructive/5 p-3" data-testid="forgot-error">{error}</div>
                )}
                <Button type="submit" disabled={loading} className="w-full btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="forgot-submit-btn">
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            </>
          ) : (
            <div data-testid="forgot-sent-confirmation">
              <div className="w-12 h-12 bg-success/10 flex items-center justify-center border border-success mb-6">
                <EnvelopeSimple size={22} weight="duotone" className="text-success" />
              </div>
              <div className="label-eyebrow mb-3">/ Check your email</div>
              <h2 className="font-display text-4xl font-black tracking-tighter mb-3">Check Your Email</h2>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                If an account exists with that email address, we've sent a password reset link. The link expires in <strong>1 hour</strong>. If you don't see it, check your spam folder.
              </p>
              {devUrl && (
                <div className="mb-6 border border-warning bg-warning/10 p-4" data-testid="dev-reset-url">
                  <div className="label-eyebrow text-ink mb-2 flex items-center gap-2">
                    <CheckCircle size={14} weight="fill" /> Dev mode — reset link
                  </div>
                  <Link to={devUrl.split("/reset-password")[1] ? "/reset-password" + devUrl.split("/reset-password")[1] : "/"} className="text-xs font-mono break-all underline" data-testid="dev-reset-url-link">
                    {devUrl}
                  </Link>
                </div>
              )}
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-widest underline" data-testid="back-to-login">
                <ArrowLeft size={14} /> Back to log in
              </Link>
            </div>
          )}

          {!sent && (
            <div className="mt-8 space-y-3 text-sm">
              <div>
                <Link to="/login" className="inline-flex items-center gap-2 font-mono uppercase tracking-widest underline" data-testid="link-back-to-login">
                  <ArrowLeft size={14} /> Back to log in
                </Link>
              </div>
              <div className="text-muted-foreground">
                Need an account? <Link to="/register" className="font-bold underline" data-testid="link-to-register">Start free trial</Link>
              </div>
            </div>
          )}

          <div className="mt-8 text-xs font-mono text-muted-foreground">Australian data. AWS Sydney. Privacy Act compliant.</div>
        </div>
      </div>
    </div>
  );
}
