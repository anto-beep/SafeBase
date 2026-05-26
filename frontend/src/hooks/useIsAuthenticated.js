/**
 * SafeBase — single source of truth for "is the user signed in?" (Iter58).
 *
 * Why this exists
 * ────────────────
 * Earlier code repeatedly read `useAuth().token` (which doesn't exist on the
 * context — it's stored in localStorage) and silently treated every signed-in
 * user as anonymous. To stop that class of bug recurring AND to keep the API
 * identical between the web app and the upcoming React Native client, every
 * consumer should import this hook instead of reading auth state ad-hoc.
 *
 * Usage
 * ─────
 *   import useIsAuthenticated from "@/hooks/useIsAuthenticated";
 *
 *   const isAuthenticated = useIsAuthenticated();
 *   if (!isAuthenticated) return <LoginGate />;
 *
 * Or the richer variant when you also need `user` / `loading`:
 *
 *   import { useAuthState } from "@/hooks/useIsAuthenticated";
 *
 *   const { user, isAuthenticated, isLoading } = useAuthState();
 *
 * Mobile parity
 * ─────────────
 * The React Native client exposes the same shape from `@/hooks/useAuthState`
 * so cross-platform code (e.g. shared business-logic in /lib) works unchanged.
 */
import { useAuth } from "@/context/AuthContext";

/** Returns `true` when a customer is signed in via JWT. */
export default function useIsAuthenticated() {
  const { isAuthenticated } = useAuth();
  return !!isAuthenticated;
}

/** Richer hook — returns `{ user, isAuthenticated, isLoading }`. */
export function useAuthState() {
  const { user, loading, isAuthenticated } = useAuth();
  return {
    user: user || null,
    isAuthenticated: !!isAuthenticated,
    isLoading: !!loading,
  };
}
