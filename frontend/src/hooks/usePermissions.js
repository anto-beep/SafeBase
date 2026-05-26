/**
 * SafeBase — server-driven role × feature permission gate (Iter58).
 *
 * Why this exists
 * ────────────────
 * Backend is the single source of truth for what a role can do (see
 * `/app/backend/permissions_matrix.py` and `GET /api/auth/permissions`).
 * This hook fetches the matrix once per session and exposes a tiny
 * `has(feature, action)` helper so UI gating code reads naturally:
 *
 *   const { has, isLoaded } = usePermissions();
 *   if (has("incidents", "delete")) <DeleteButton />
 *
 * The same hook ships in the React Native client so feature gating works
 * identically across web + mobile. Backend changes propagate to both clients
 * without any code change — that's the whole point.
 */
import { useEffect, useState } from "react";
import api from "@/lib/api";
import useIsAuthenticated from "@/hooks/useIsAuthenticated";

const _cache = { role: null, perms: null, loadedAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export default function usePermissions() {
  const isAuthenticated = useIsAuthenticated();
  const [state, setState] = useState(() => ({
    role: _cache.role,
    perms: _cache.perms,
    isLoaded: !!_cache.perms && Date.now() - _cache.loadedAt < CACHE_TTL_MS,
  }));

  useEffect(() => {
    if (!isAuthenticated) {
      setState({ role: null, perms: null, isLoaded: true });
      return;
    }
    if (_cache.perms && Date.now() - _cache.loadedAt < CACHE_TTL_MS) {
      setState({ role: _cache.role, perms: _cache.perms, isLoaded: true });
      return;
    }
    let cancelled = false;
    api.get("/auth/permissions")
      .then((r) => {
        if (cancelled) return;
        _cache.role = r.data.role;
        _cache.perms = r.data.permissions;
        _cache.loadedAt = Date.now();
        setState({ role: r.data.role, perms: r.data.permissions, isLoaded: true });
      })
      .catch(() => {
        if (!cancelled) setState({ role: null, perms: null, isLoaded: true });
      });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return {
    role: state.role,
    isLoaded: state.isLoaded,
    has(feature, action = "read") {
      if (!state.perms) return false;
      const cap = state.perms[feature];
      if (!cap) return false;
      return !!cap[action];
    },
  };
}
