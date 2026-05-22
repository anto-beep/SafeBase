/**
 * AdminAuthContext — manages the internal admin session in React.
 * Completely separate from the customer AuthContext.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import adminApi, { clearAdminToken, getAdminToken, setAdminToken } from "./adminApi";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getAdminToken()) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      const r = await adminApi.get("/internal-admin/me");
      setAdmin(r.data.admin);
    } catch {
      clearAdminToken();
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const loginPassword = async (email, password) => {
    const r = await adminApi.post("/internal-admin/login", { email, password });
    if (r.data.requires_2fa) {
      return { requires_2fa: true, challenge_token: r.data.challenge_token, admin: r.data.admin };
    }
    setAdminToken(r.data.token);
    setAdmin(r.data.admin);
    return { requires_2fa: false, must_enroll_2fa: r.data.must_enroll_2fa, admin: r.data.admin };
  };

  const verify2fa = async (challenge_token, code) => {
    const r = await adminApi.post("/internal-admin/verify-2fa", { challenge_token, code });
    setAdminToken(r.data.token);
    setAdmin(r.data.admin);
    return r.data.admin;
  };

  const logout = async () => {
    try { await adminApi.post("/internal-admin/logout"); } catch {}
    clearAdminToken();
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, loginPassword, verify2fa, logout, refresh }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
