import { useEffect, useState } from "react";
import api from "@/lib/api";

// Tiny shared hook: fetches current subscription tier once. Returns { tier, isEnterprise, loading }.
// Defaults to "sole_trader" on any failure so upsell logic stays permissive (doesn't hide upsells).
export default function useTier() {
  const [state, setState] = useState({ tier: null, loading: true });
  useEffect(() => {
    let cancelled = false;
    api
      .get("/billing/my-subscription")
      .then((r) => { if (!cancelled) setState({ tier: r.data?.tier || "sole_trader", loading: false }); })
      .catch(() => { if (!cancelled) setState({ tier: "sole_trader", loading: false }); });
    return () => { cancelled = true; };
  }, []);
  return {
    tier: state.tier,
    isEnterprise: state.tier === "enterprise",
    loading: state.loading,
  };
}
