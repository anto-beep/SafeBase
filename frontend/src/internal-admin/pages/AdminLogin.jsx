/**
 * Internal Admin Login — password → optional 2FA challenge → session.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../lib/AdminAuthContext";
import { ShieldCheck, Lock } from "@phosphor-icons/react";

export default function AdminLogin() {
  const { loginPassword, verify2fa } = useAdminAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState("password"); // password | 2fa
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [pendingAdmin, setPendingAdmin] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const formatError = (e) => {
    const d = e?.response?.data?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map(x => x?.msg || JSON.stringify(x)).join(" ");
    return e?.message || "Login failed";
  };

  const onPassword = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError("");
    try {
      const r = await loginPassword(email, password);
      if (r.requires_2fa) {
        setChallengeToken(r.challenge_token);
        setPendingAdmin(r.admin);
        setPhase("2fa");
      } else {
        navigate("/internal-admin");
      }
    } catch (e) { setError(formatError(e)); }
    finally { setSubmitting(false); }
  };

  const on2fa = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError("");
    try {
      await verify2fa(challengeToken, code);
      navigate("/internal-admin");
    } catch (e) { setError(formatError(e)); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-red-500 flex items-center justify-center font-display font-black text-xl">SB</div>
          <div>
            <div className="font-display font-black text-lg tracking-tight">SAFEBASE</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-red-400">Internal admin · Operations</div>
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900 p-8">
          {phase === "password" && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Lock size={18} weight="duotone" className="text-red-400" />
                <div className="label-eyebrow text-red-400">/ Sign in</div>
              </div>
              <h2 className="font-display text-2xl font-black tracking-tight mb-6">Restricted access</h2>
              <form onSubmit={onPassword} className="space-y-4" data-testid="admin-login-form">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Email</label>
                  <input
                    type="email" required autoFocus
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    data-testid="admin-login-email"
                    className="mt-1 w-full bg-slate-950 border border-slate-700 px-3 py-2 outline-none focus:border-red-400 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Password</label>
                  <input
                    type="password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    data-testid="admin-login-password"
                    className="mt-1 w-full bg-slate-950 border border-slate-700 px-3 py-2 outline-none focus:border-red-400 text-sm"
                  />
                </div>
                {error && (
                  <div className="text-xs text-red-400 border border-red-900 bg-red-950/40 p-2" data-testid="admin-login-error">{error}</div>
                )}
                <button
                  type="submit" disabled={submitting}
                  data-testid="admin-login-submit"
                  className="w-full bg-red-500 hover:bg-red-400 disabled:opacity-40 text-black font-display font-black uppercase tracking-widest py-3 text-sm transition-colors"
                >
                  {submitting ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </>
          )}

          {phase === "2fa" && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={18} weight="duotone" className="text-red-400" />
                <div className="label-eyebrow text-red-400">/ Two-factor auth</div>
              </div>
              <h2 className="font-display text-2xl font-black tracking-tight mb-2">Verification code</h2>
              <p className="text-xs text-slate-400 mb-6">Enter the 6-digit code from your authenticator app for {pendingAdmin?.email}.</p>
              <form onSubmit={on2fa} className="space-y-4" data-testid="admin-2fa-form">
                <input
                  type="text" required autoFocus inputMode="numeric" pattern="\d{6}"
                  maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  data-testid="admin-2fa-code"
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-3 outline-none focus:border-red-400 text-center font-mono text-2xl tracking-widest"
                  placeholder="000000"
                />
                {error && <div className="text-xs text-red-400 border border-red-900 bg-red-950/40 p-2" data-testid="admin-2fa-error">{error}</div>}
                <button
                  type="submit" disabled={submitting || code.length !== 6}
                  data-testid="admin-2fa-submit"
                  className="w-full bg-red-500 hover:bg-red-400 disabled:opacity-40 text-black font-display font-black uppercase tracking-widest py-3 text-sm"
                >
                  {submitting ? "Verifying…" : "Verify"}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-[10px] font-mono text-slate-500 text-center mt-6 uppercase tracking-widest">
          SafeBase Internal · All actions are logged
        </div>
      </div>
    </div>
  );
}
