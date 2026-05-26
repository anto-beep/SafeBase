import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const loginEmail = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("st_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const registerEmail = async (payload) => {
    const r = await api.post("/auth/register", payload);
    localStorage.setItem("st_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("st_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      // Iter58 — single canonical "is the user signed in?" boolean. Use
      // `isAuthenticated` (or the convenience hook in /hooks/useIsAuthenticated.js)
      // instead of reading `token` or `user` truthiness directly so that this
      // contract stays identical across web and mobile.
      isAuthenticated: !!user,
      loginEmail, registerEmail, logout, setUser, checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
