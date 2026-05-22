import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Cube, CheckCircle, XCircle, Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Rule({ ok, label }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${ok ? "text-success" : "text-muted-foreground"}`}>
      {ok ? <CheckCircle weight="fill" size={14} /> : <XCircle weight="regular" size={14} />}
      <span>{label}</span>
    </li>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [phase, setPhase] = useState("verifying"); // verifying | form | success | expired
  const [emailHint, setEmailHint] = useState("");
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setPhase("expired"); return; }
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        if (!alive) return;
        if (r.data?.valid) {
          setEmailHint(r.data.email_hint || "");
          setPhase("form");
        } else {
          setPhase("expired");
        }
      } catch {
        if (alive) setPhase("expired");
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const rules = useMemo(() => ({
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
  }), [pw]);
  const allRulesOk = rules.length && rules.upper && rules.lower && rules.number;
  const matches = pw && confirmPw && pw === confirmPw;
  const canSubmit = allRulesOk && matches && !submitting;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, new_password: pw });
      setPhase("success");
      setTimeout(() => navigate("/login"), 5000);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400) {
        setPhase("expired");
      } else {
        setError(err?.response?.data?.detail || "We couldn't reset your password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex bg-ink relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-10" />
        <div className="relative z-10 p-12 flex flex-col justify-between text-white">
          <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-warning flex items-center justify-center"><Cube weight="fill" className="text-ink" size={20} /></div><span className="font-display font-black tracking-tight">SAFEBASE</span></Link>
          <div>
            <div className="label-eyebrow text-warning mb-4">/ Set new password</div>
            <h1 className="font-display text-5xl font-black leading-[0.95] mb-4">
              Pick a<br /><span className="bg-warning text-ink px-2">strong one.</span><br />Then we're back.
            </h1>
            <p className="text-white/75 max-w-md mt-8 text-base leading-relaxed">
              Choose a password with at least 8 characters, one uppercase letter, one lowercase letter and one number.
            </p>
          </div>
          <div className="font-mono text-xs text-white/40">Australian data. AWS Sydney. Privacy Act compliant.</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 bg-ink flex items-center justify-center"><Cube weight="fill" className="text-warning" size={20} /></div><span className="font-display font-black">SAFEBASE</span></Link>
          </div>

          {phase === "verifying" && (
            <div data-testid="reset-verifying" className="text-sm text-muted-foreground">Verifying reset link…</div>
          )}

          {phase === "expired" && (
            <div data-testid="reset-expired">
              <div className="w-12 h-12 bg-destructive/10 flex items-center justify-center border border-destructive mb-6">
                <WarningCircle size={22} weight="duotone" className="text-destructive" />
              </div>
              <div className="label-eyebrow mb-3">/ Link no longer valid</div>
              <h2 className="font-display text-4xl font-black tracking-tighter mb-3">This Link Has Expired</h2>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                This password reset link is no longer valid. Reset links expire after one hour or can only be used once. Request a new one to continue.
              </p>
              <Link to="/forgot-password">
                <Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="request-new-link-btn">
                  Request a new link
                </Button>
              </Link>
              <div className="mt-6">
                <Link to="/login" className="text-sm font-mono uppercase tracking-widest underline">Back to log in</Link>
              </div>
            </div>
          )}

          {phase === "form" && (
            <>
              <div className="label-eyebrow mb-3">/ Set new password</div>
              <h2 className="font-display text-4xl font-black tracking-tighter mb-2">Choose a New Password</h2>
              {emailHint && (
                <p className="text-sm text-muted-foreground mb-8" data-testid="reset-email-hint">
                  Resetting password for <span className="font-mono text-ink">{emailHint}</span>
                </p>
              )}

              <form onSubmit={onSubmit} className="space-y-4" data-testid="reset-password-form">
                <div>
                  <Label htmlFor="new-pw" className="label-eyebrow">New password</Label>
                  <div className="relative">
                    <Input
                      id="new-pw"
                      type={showPw ? "text" : "password"}
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      required
                      autoFocus
                      className="mt-2 h-12 rounded-none border-ink pr-12"
                      data-testid="reset-new-password-input"
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 text-muted-foreground" tabIndex={-1} data-testid="reset-toggle-pw">
                      {showPw ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-pw" className="label-eyebrow">Confirm new password</Label>
                  <Input
                    id="confirm-pw"
                    type={showPw ? "text" : "password"}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    required
                    className="mt-2 h-12 rounded-none border-ink"
                    data-testid="reset-confirm-password-input"
                  />
                  {confirmPw && !matches && (
                    <p className="text-xs text-destructive mt-1" data-testid="reset-mismatch">Passwords do not match.</p>
                  )}
                </div>

                <ul className="space-y-1 border border-border bg-muted/50 p-3" data-testid="reset-rules">
                  <Rule ok={rules.length} label="At least 8 characters" />
                  <Rule ok={rules.upper} label="One uppercase letter" />
                  <Rule ok={rules.lower} label="One lowercase letter" />
                  <Rule ok={rules.number} label="One number" />
                </ul>

                {error && (
                  <div className="text-sm text-destructive border border-destructive bg-destructive/5 p-3" data-testid="reset-error">{error}</div>
                )}

                <Button type="submit" disabled={!canSubmit} className="w-full btn-sharp h-12 bg-ink text-white hover:bg-authority disabled:opacity-40" data-testid="reset-submit-btn">
                  {submitting ? "Resetting…" : "Reset password"}
                </Button>
              </form>
            </>
          )}

          {phase === "success" && (
            <div data-testid="reset-success">
              <div className="w-12 h-12 bg-success/10 flex items-center justify-center border border-success mb-6">
                <CheckCircle size={22} weight="duotone" className="text-success" />
              </div>
              <div className="label-eyebrow mb-3">/ Done</div>
              <h2 className="font-display text-4xl font-black tracking-tighter mb-3">Password Reset Successfully</h2>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                Your password has been updated. You can now log in with your new password. We'll redirect you in 5 seconds.
              </p>
              <Link to="/login">
                <Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="go-to-login-btn">
                  Go to log in
                </Button>
              </Link>
            </div>
          )}

          <div className="mt-8 text-xs font-mono text-muted-foreground">Australian data. AWS Sydney. Privacy Act compliant.</div>
        </div>
      </div>
    </div>
  );
}
