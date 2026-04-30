import { useEffect, useState } from "react";
import api from "@/lib/api";

// Shared hook: fetches current subscription tier + trial countdown once.
// Returns { tier, isEnterprise, onTrial, trialDaysLeft, trialExpired,
// readOnly, trialEndsAt, loading, refresh }.
// Defaults to a permissive trial state on any failure so upsell logic still
// fires and read-only doesn't accidentally lock users out.
export default function useTier() {
  const [state, setState] = useState({
    tier: null,
    onTrial: true,
    trialDaysLeft: 14,
    trialExpired: false,
    readOnly: false,
    trialEndsAt: null,
    loading: true,
  });

  const load = () => {
    api
      .get("/billing/my-subscription")
      .then((r) => {
        setState({
          tier: r.data?.tier || null,
          onTrial: !!r.data?.on_trial,
          trialDaysLeft: r.data?.trial_days_left ?? null,
          trialExpired: !!r.data?.trial_expired,
          readOnly: !!r.data?.read_only,
          trialEndsAt: r.data?.trial_ends_at || null,
          loading: false,
        });
      })
      .catch(() => {
        setState((s) => ({ ...s, loading: false }));
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  return {
    tier: state.tier,
    isEnterprise: state.tier === "enterprise",
    onTrial: state.onTrial,
    trialDaysLeft: state.trialDaysLeft,
    trialExpired: state.trialExpired,
    readOnly: state.readOnly,
    trialEndsAt: state.trialEndsAt,
    loading: state.loading,
    refresh: load,
  };
}
