# Mobile App Patch — Plans screen: missing first tier (showing 3 of 4 plans)

## Problem
User reports the mobile Plans screen renders only **3 cards** (Small Team, Growing Business, Enterprise). The first tier — **Solo Tradie** for trades, **Single Store** for retail, **Single Venue** for hospitality, **Owner-Operator** for transport, **Solo Practice** for healthcare — is missing.

## Root cause (most likely)
The mobile code is iterating over `features` keys `"1".."4"` from the catalogue payload but using the wrong indexer somewhere. The catalogue returns 4-element arrays at `plans[slug].plan_names`, `plans[slug].user_limits`, `plans[slug].monthly`, `plans[slug].annual`, `plans[slug].annual_equivalent_monthly`, `plans[slug].annual_saving` — **always 0-indexed length 4**. The `features` object is keyed by **1-based strings**: `features["1"]`, `features["2"]`, `features["3"]`, `features["4"]`.

Likely bug patterns:
1. Looping `for (let i = 1; i <= 4; i++)` and reading `plan_names[i]` → that skips index 0 (Solo Tradie) and reads undefined at index 4.
2. Using `Object.keys(features)` and dropping the first key, OR mapping the features object directly to render cards instead of mapping the `plan_names` array.
3. Filtering out tier 1 because some condition (e.g. `if (price > 0)` or `if (annual_saving > 0)`) accidentally excludes the entry-tier card.

## Fix prompt to paste into the mobile coding agent

> **Task: Fix Plans screen — 4 plan cards must render, not 3.**
>
> The catalogue payload at `GET {BACKEND_URL}/api/pricing/catalogue` returns 4 plans per industry. The arrays `plan_names`, `user_limits`, `monthly`, `annual`, `annual_equivalent_monthly`, `annual_saving` are **always length 4, 0-indexed**. The `features` object is **1-indexed strings** ("1", "2", "3", "4"). Render the plan cards by iterating the array, not the features object.
>
> Replace the plan card loop with this exact pattern (RN/Flutter-agnostic pseudocode):
>
> ```js
> // industry = currently selected slug e.g. "trades"
> const cfg = catalogue.plans[industry];
> const tierCount = cfg.plan_names.length; // ALWAYS 4
>
> for (let i = 0; i < tierCount; i++) {
>   const card = {
>     name: cfg.plan_names[i],         // e.g. "Solo Tradie" at i=0
>     userLimit: cfg.user_limits[i],
>     priceMonthly: cfg.monthly[i],
>     priceAnnual: cfg.annual[i],
>     equivMonthly: cfg.annual_equivalent_monthly?.[i],
>     saving: cfg.annual_saving?.[i],
>     features: cfg.features[String(i + 1)] || [],   // <-- +1 because features keys are "1".."4"
>     isMostPopular: i === 2,                         // tier 3 = "MOST POPULAR"
>   };
>   render(card);
> }
> ```
>
> ### Acceptance criteria
>
> - [ ] Switching to **Trades** renders 4 cards: **Solo Tradie · Small Team · Growing Business · Enterprise** with prices A$799 / A$1,599 / A$2,499 / A$3,999 monthly.
> - [ ] Switching to **Retail** renders 4 cards starting with **Single Store** (A$999/mo).
> - [ ] Switching to **Hospitality** renders 4 cards starting with **Single Venue** (A$1,499/mo).
> - [ ] Switching to **Transport** renders 4 cards starting with **Owner-Operator** (A$1,499/mo).
> - [ ] Switching to **Healthcare** renders 4 cards starting with **Solo Practice** (A$2,499/mo).
> - [ ] The 3rd card (index 2) shows the "MOST POPULAR" pill.
> - [ ] The 4th card (index 3) shows the "Enterprise" tier with its features list (uses `features["4"]`).
> - [ ] All four cards expose a "Start Free Trial" CTA that hands `{industry, tier_index}` to the sign-up wizard (mobile prompt #1).
>
> Also verify the Plan Right-sizer result screen pulls features via `cfg.features[String(recommended_tier_index + 1)]` — same +1 offset.

## Sanity checks before shipping the mobile fix

Run these against `{BACKEND_URL}` to confirm the catalogue is healthy:

```bash
# Should list ALL 4 plan names for trades
curl -s "{BACKEND_URL}/api/pricing/catalogue" \
  | jq '.plans.trades.plan_names'
# Expected: ["Solo Tradie","Small Team","Growing Business","Enterprise"]

# Should return tier_index = 0 = Solo Tradie
curl -s "{BACKEND_URL}/api/plan-rightsizer/recommend?industry=trades&team=1&locations=1" \
  | jq '.plan_name, .recommended_tier_index'
# Expected: "Solo Tradie", 0
```
