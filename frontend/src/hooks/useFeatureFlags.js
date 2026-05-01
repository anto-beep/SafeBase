import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/**
 * Single source of truth for the SPA's feature flag state.
 *
 * The backend's `/api/features/me` returns `{enabled_features[], navigation[],
 * industry, role_variant, plan}`. `enabled_features` is a flat array of feature
 * codes (e.g. `swms_generator`, `haccp_plans`) that pass the user's industry
 * + role + plan gate. Anything NOT in this set will 403 if requested
 * directly — the API is the source of truth, this hook is purely a UI hint.
 *
 * Auto-refreshes when the user object changes (industry switch, role change,
 * login/logout). Components also receive a `refresh()` to manually re-poll.
 */
export function useFeatureFlags() {
  const { user } = useAuth();
  const [data, setData] = useState({
    enabled_features: [],
    navigation: [],
    industry: null,
    role_variant: null,
    plan: null,
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const r = await api.get("/features/me");
      setData({ ...r.data, loading: false });
    } catch (err) {
      // 401 or transient — keep an empty flag set so gates fail closed.
      setData({
        enabled_features: [],
        navigation: [],
        industry: user?.industry || null,
        role_variant: user?.role_variant || null,
        plan: null,
        loading: false,
      });
    }
  }, [user?.industry, user?.role_variant]);

  useEffect(() => {
    if (!user) {
      setData((d) => ({ ...d, loading: false }));
      return;
    }
    refresh();
  }, [user?.user_id, user?.industry, user?.role_variant, refresh]);

  const has = useCallback(
    (code) => Array.isArray(data.enabled_features) && data.enabled_features.includes(code),
    [data.enabled_features],
  );

  const hasAny = useCallback(
    (codes = []) => codes.some((c) => has(c)),
    [has],
  );

  return { ...data, has, hasAny, refresh };
}

export default useFeatureFlags;
