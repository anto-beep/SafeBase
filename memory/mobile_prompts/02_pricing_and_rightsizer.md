# Mobile App Prompt — Plans + Plan Right-sizer (live from backend)

Copy this prompt into your mobile coding agent. It produces a Pricing screen and a Plan Right-sizer wizard that exactly mirror the SafeBase web app — with **the backend as the single source of truth** so any future price/plan/feature edit on the server reflects on the mobile app on next launch without a redeploy.

---

## PROMPT

> **Task: Build a Plans screen + Plan Right-sizer wizard in the SafeBase mobile app, fed live from the backend.**
>
> The web app at safebase.com.au/pricing and safebase.com.au/plan-rightsizer is the visual reference. The mobile experience must show the same per-industry plan names, prices, user limits, features, ROI copy, value callouts, and right-sizer recommendation logic. **Do NOT bundle pricing values in the mobile binary.** Fetch them at app launch from the API endpoints below — that way any backend pricing edit reaches the mobile app instantly.
>
> ### 1. API contract
>
> **`GET {BACKEND_URL}/api/pricing/catalogue`** — public, no auth. Call this once at app launch and cache in memory (and AsyncStorage / SharedPreferences for offline). Refresh on every cold start.
>
> Response shape:
>
> ```json
> {
>   "version": "iter67",
>   "currency": "AUD",
>   "tax_note": "All prices ex-GST",
>   "trial_days": 14,
>   "industries": ["trades", "hospitality", "transport", "healthcare", "retail"],
>   "entry_prices": [
>     { "slug": "trades", "label": "Trades and Construction", "annual": "7,990", "monthly": "799", "note": "6.9% of one WorkSafe prosecution." },
>     ...
>   ],
>   "addons": {
>     "safeinduct": 299, "safecheck": 349, "academy_10": 499, "academy_30": 799,
>     "academy_60": 1099, "white_label_partner": 2999,
>     "consulting_retainer_min": 2500, "consulting_retainer_max": 4500
>   },
>   "risk_anchors": {
>     "trades": "Average WorkSafe prosecution: A$116,979 ...",
>     "hospitality": "...", "transport": "...", "healthcare": "...", "retail": "..."
>   },
>   "plans": {
>     "trades": {
>       "label": "Trades and Construction",
>       "accent": "#FFCC00",
>       "plan_names": ["Solo Tradie", "Small Team", "Growing Business", "Enterprise"],
>       "user_limits": ["1 user", "Up to 5 users", "Up to 20 users", "Up to 50 users"],
>       "annual":  [7990, 15990, 24990, 39990],
>       "monthly": [799, 1599, 2499, 3999],
>       "annual_equivalent_monthly": ["665.83", "1,332.50", "2,082.50", "3,332.50"],
>       "annual_saving": [1598, 3198, 4998, 7998],
>       "slugs_monthly": ["sole_trader_monthly", ...],
>       "slugs_annual":  ["sole_trader_annual", ...],
>       "roi_headline": "A$7,990/year + GST. 6.9% of one WorkSafe prosecution.",
>       "roi_body": "<long-form ROI copy>",
>       "value_callout": "Growing Business includes A$1,147/month of add-on value ...",
>       "features": {
>         "1": ["...", "...", ...],
>         "2": ["Everything in tier 1", "...", ...],
>         "3": [...],
>         "4": [...]
>       }
>     },
>     "hospitality": { ...same shape... },
>     "transport":   { ...same shape... },
>     "healthcare":  { ...same shape... },
>     "retail":      { ...same shape... }
>   }
> }
> ```
>
> **`GET {BACKEND_URL}/api/plan-rightsizer/recommend?industry={slug}&team={n}&locations={n}`** — public, no auth. Returns the recommended tier for the user's inputs:
>
> ```json
> {
>   "industry": "trades",
>   "industry_label": "Trades and Construction",
>   "team": 8,
>   "locations": 2,
>   "recommended_tier_index": 2,
>   "plan_name": "Growing Business",
>   "user_limit": "Up to 20 users",
>   "annual_aud_ex_gst": 24990,
>   "monthly_aud_ex_gst": 2499,
>   "annual_saving_aud": 4998,
>   "risk_anchor": "Average WorkSafe prosecution: A$116,979 ...",
>   "cta_register_url": "/register?industry=trades&tier=2&team=8&locations=2",
>   "cta_trial_days": 14,
>   "generated_at": "2026-05-30T11:30:00Z"
> }
> ```
>
> The mobile app must **always call this endpoint** for the recommendation — never re-implement the tier-picking logic locally. That keeps recommendation parity with the web.
>
> ### 2. Screen 1 — Plans (Pricing)
>
> Route: `/plans` or a tab in the bottom nav.
>
> Layout:
> 1. **Industry switcher** at the top — horizontal scrollable pill bar with 5 tiles (Trades, Hospitality, Transport, Healthcare, Retail). Tile uses `plans[slug].accent` colour as its active background. Default selection: industry from the user's profile if logged in, otherwise `trades`.
> 2. **Cycle toggle** — Monthly / Annual segmented control. Default to Monthly (web behaviour).
> 3. **4 plan cards** in a vertical list (mobile is narrow). Each card shows:
>    - `plan_names[i]` as title (e.g. "Growing Business")
>    - `user_limits[i]` directly under (small, muted)
>    - Big price: `A$<monthly[i] or annual[i]>` with `/mo + GST` or `/yr + GST` suffix
>    - In annual mode also show: `Equivalent to A$<annual_equivalent_monthly[i]>/month` + a green badge `Save A$<annual_saving[i]>/yr`
>    - `features[i]` rendered as a bulleted check list (use a tick icon)
>    - Primary CTA "Start Free Trial" → opens the Sign-up wizard (see mobile prompt 01) pre-selecting this industry
>    - Mark the 3rd tier (index 2) as the **"MOST POPULAR"** card with a small pill badge at the top
> 4. **ROI band** below the cards — render `plans[slug].roi_headline` as a large headline and `plans[slug].roi_body` as body copy in a tinted background panel.
> 5. **Value-callout strip** — render `plans[slug].value_callout` in a smaller tinted card under the ROI band.
> 6. **Add-on chips** at the bottom: render the `addons` map as a horizontal scroll list of `<name> · A$<price>/mo` chips.
>
> All values, labels, and copy come **straight from the catalogue payload** — never hardcode strings.
>
> ### 3. Screen 2 — Plan Right-sizer (wizard)
>
> Route: `/plan-rightsizer` or a "Find my plan" entry point from the marketing screen.
>
> Three-step wizard. State lives in component memory; persist to AsyncStorage so backgrounding doesn't lose progress.
>
> **Step 1 — Industry**: 5 large tap tiles (same 5 industries). Use `plans[slug].accent` as a left-edge colour swatch. Tile shows `plans[slug].label` + the matching `industries[i].blurb` (you can reuse the web's blurbs verbatim: "Builders, trades, construction companies.", "Single store, chain, franchise retail.", "Restaurants, cafes, bars, hotels, catering.", "Truck operators, couriers, freight, warehousing and 3PL.", "Allied health, aged care, NDIS, medical centres.").
>
> **Step 2 — Team size**: numeric input + slider (1–100). Label: "How many users will need access?". Show stepped suggestions: 1, 5, 10, 25, 50.
>
> **Step 3 — Locations**: numeric input + slider (1–50). Label: "How many sites / venues / stores / clinics do you operate?". Show stepped suggestions: 1, 2, 5, 10, 25.
>
> **Result screen**: as soon as Step 3 completes (or via a "See my plan" button), call
>
> ```http
> GET {BACKEND_URL}/api/plan-rightsizer/recommend?industry={slug}&team={n}&locations={n}
> ```
>
> and render:
> - Big headline: `Your right-size plan is <plan_name>.`
> - Annual price card with `A$<annual_aud_ex_gst>/yr + GST`, `Equivalent to A$<annual_aud_ex_gst/12>/month`, `Save A$<annual_saving_aud>` badge
> - Risk anchor block: `risk_anchor` text
> - Plan features list: fetch from `/api/pricing/catalogue` (already cached) and render `plans[industry].features[String(recommended_tier_index + 1)]` items (note the +1 because features keys are "1".."4" while `recommended_tier_index` is 0..3)
> - Two CTAs: **"Start Free Trial"** (deep-links to the sign-up wizard with the industry pre-selected, see mobile prompt 01) and **"See all plans"** (jumps to the Plans screen with the industry pre-selected)
> - Subtle "Change my answers" link to restart the wizard
>
> ### 4. Refresh behaviour
>
> - On every cold start, call `GET /api/pricing/catalogue` and cache result in AsyncStorage with a 24h TTL.
> - If the network fails, use the last cached payload.
> - On warm start with stale cache (older than 24h), fetch in the background and merge — never block the UI on the network.
> - Show a tiny pull-to-refresh on the Plans screen that re-fetches the catalogue.
>
> ### 5. Acceptance criteria
>
> - [ ] Plans screen for Trades shows: Solo Tradie / Small Team / Growing Business / Enterprise with prices 799 / 1,599 / 2,499 / 3,999 per month (or 7,990 / 15,990 / 24,990 / 39,990 per year).
> - [ ] Plans screen for Healthcare shows: Solo Practice / Small Practice / Multi-Site / Enterprise with the healthcare prices.
> - [ ] Switching industries swaps the accent colour and all copy.
> - [ ] Annual toggle shows `Equivalent to A$X/month` + `Save A$Y` badge.
> - [ ] Plan Right-sizer for `team=8, locations=2, industry=trades` returns Growing Business (tier index 2).
> - [ ] Plan Right-sizer for `team=4, locations=1, industry=hospitality` returns Single Venue (tier index 0).
> - [ ] Editing `PRICING` in the backend `/app/backend/routes/iter39_aux.py` reflects in the mobile app on next cold start, with **no mobile build required**.
>
> ### 6. Implementation notes
>
> - Keep an API client (axios for RN, Dio for Flutter) with `{BACKEND_URL}` from `.env` or `app.config.ts`.
> - Format AUD currency with `Intl.NumberFormat('en-AU')` (RN) or `NumberFormat.currency(locale: 'en_AU', symbol: 'A\$')` (Flutter).
> - Industry colours (accent) come from the catalogue payload — don't hardcode hex in the mobile codebase.
> - The web app at `/app/frontend/src/pages/Pricing.jsx` and `/app/frontend/src/pages/PlanRightsizer.jsx` is the design reference. Match the spacing, type hierarchy, and CTA placement.
>
> Ship it.

---

**Notes for you (Sandra/main agent):**

- The backend endpoint is `GET /api/pricing/catalogue` — see `/app/backend/routes/iter39_aux.py` for the canonical `PRICING` dict.
- The web app loads the same catalogue via `/app/frontend/src/lib/pricingService.js` at app boot and overlays the bundled bootstrap defaults. So **a single backend edit propagates to both clients**.
- The mobile app should NOT bundle pricing — pure fetch-and-cache.
