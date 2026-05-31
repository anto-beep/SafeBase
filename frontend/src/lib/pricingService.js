/**
 * Pricing catalogue overlay loader.
 *
 * The backend at `GET /api/pricing/catalogue` (see
 * `/app/backend/routes/iter39_aux.py`) is the canonical source of truth for
 * pricing, plan names, user limits, features, ROI copy, addons and risk
 * anchors. The web app ships a bundled bootstrap copy in
 * `/app/frontend/src/data/pricing.config.js` so first paint is instant and
 * works offline / pre-auth, then this loader fetches the live catalogue and
 * mutates the same exported objects in place. Components that subscribe to
 * the `pricing:updated` event re-render with the fresh values.
 *
 * Result: any edit to `PRICING` on the backend automatically reflects on
 * both web and mobile on the next page load, without a redeploy.
 */
import axios from "axios";
import { INDUSTRY_PRICING, INDUSTRY_LIST, INDUSTRY_ENTRY_PRICES, ADDON_PRICING } from "@/data/pricing.config";

const PRICING_UPDATED_EVENT = "pricing:updated";

let _loaded = false;
let _loadPromise = null;

function buildBundledShape(slug, backend) {
  // Map the backend's flat-list shape to the existing frontend shape so the
  // rest of the app doesn't need to know we're being live-updated.
  const annual = (backend.annual || []).map((n) => n.toLocaleString("en-AU"));
  const monthly = (backend.monthly || []).map((n) => n.toLocaleString("en-AU"));
  return {
    label: backend.label,
    accent: backend.accent,
    plan_names: backend.plan_names,
    user_limits: backend.user_limits,
    prices: {
      monthly,
      annual,
      annual_equivalent_monthly: backend.annual_equivalent_monthly,
      annual_saving: (backend.annual_saving || []).map((n) => n.toLocaleString("en-AU")),
    },
    slugs: {
      monthly: backend.slugs_monthly,
      annual: backend.slugs_annual,
    },
    roi: {
      headline: backend.roi_headline,
      body: backend.roi_body,
    },
    value_callout: backend.value_callout,
    features: backend.features,
  };
}

export function loadPricingCatalogue({ force = false } = {}) {
  if (_loaded && !force) return Promise.resolve(INDUSTRY_PRICING);
  if (_loadPromise && !force) return _loadPromise;

  const base = process.env.REACT_APP_BACKEND_URL;
  _loadPromise = axios
    .get(`${base}/api/pricing/catalogue`, { timeout: 8000 })
    .then((res) => {
      const cat = res.data || {};
      const plans = cat.plans || {};
      Object.keys(plans).forEach((slug) => {
        const shaped = buildBundledShape(slug, plans[slug]);
        if (INDUSTRY_PRICING[slug]) {
          Object.assign(INDUSTRY_PRICING[slug], shaped);
        } else {
          INDUSTRY_PRICING[slug] = shaped;
        }
      });
      if (Array.isArray(cat.industries) && cat.industries.length) {
        INDUSTRY_LIST.length = 0;
        cat.industries.forEach((i) => INDUSTRY_LIST.push(i));
      }
      if (Array.isArray(cat.entry_prices)) {
        INDUSTRY_ENTRY_PRICES.length = 0;
        cat.entry_prices.forEach((row) => INDUSTRY_ENTRY_PRICES.push(row));
      }
      if (cat.addons && typeof cat.addons === "object") {
        Object.assign(ADDON_PRICING, cat.addons);
      }
      _loaded = true;
      try {
        window.dispatchEvent(new CustomEvent(PRICING_UPDATED_EVENT, { detail: cat }));
      } catch (e) { /* SSR / non-browser */ }
      return INDUSTRY_PRICING;
    })
    .catch(() => {
      // Fail soft — bundled fallback is already in place.
      _loaded = true;
      return INDUSTRY_PRICING;
    });
  return _loadPromise;
}

/** React hook: returns a counter that bumps every time the catalogue is
 *  refreshed. Use it in component deps to force re-render. */
export function usePricingTick() {
  const { useEffect, useState } = require("react");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    loadPricingCatalogue();
    const onUpdate = () => setTick((t) => t + 1);
    window.addEventListener(PRICING_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(PRICING_UPDATED_EVENT, onUpdate);
  }, []);
  return tick;
}
