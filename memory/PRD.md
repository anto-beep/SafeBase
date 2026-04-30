# SafeTradie — PRD

## Original problem
WHS compliance SaaS for Australian trade businesses. Core (SWMS, Incidents, People/Licences, Intelligence) + ecosystem (TradeInduct, TradeCheck, Academy, Consulting). Pricing A$150/250/400/mo.

## Users
Business owner (primary) · Safety manager · Supervisor · Worker · WHS consultant · Franchisor

---

## Implemented

### Iterations 1-3 — Foundation + Marketing (Dec 2025)
- JWT + Emergent Google auth · Workers/Licences/Incidents/Documents CRUD · SWMS AI gen (Claude Sonnet 4.5) · Compliance score
- 15 public marketing routes + Pricing + MarketingNav

### Iteration 4 — Batch (a) Onboarding (Feb 2026)
- OnboardingWizard (6 steps) · Settings (6 tabs) · Notifications Centre · enhanced Register

### Iteration 5 — Batch (b) Core Safety Modules (Feb 2026)
- Generic `/api/safety/{module}` + 6 modules (Toolbox Talks, Plant, Substances, Inspections, Risks, First Aid/PPE)

### Iteration 6 — Batch (c) Reports + Workflows (Feb 2026)
- 10 live-computed reports · 5 stepped workflows (W1-W5)

### Iteration 7 — Batch (d) Ecosystem + AI Insights (Feb 2026)
- AI report insights (cached 24h, graceful fallback) · TradeInduct · TradeCheck · Academy LMS · Partner Portal · Mobile Worker PWA

### Iteration 8 — Batch (e) Marketing SEO (Feb 2026)
- Blog (20 articles) · Templates Library · Competitor Comparison · 8 State Guides · Fine Calculator · Integrations · Social-proof badges

### Iteration 9 — Backlog (P1/P2) (Feb 2026)
- **Stripe Checkout billing** · **PWA enhancement** · **Outbound Webhooks** (11 events, fire-and-forget deliveries)

### Iteration 10 — Native Automations (Feb 2026)
- `/api/automations/*` with 6 pre-built recipes (Slack on critical incident, Resend worker welcome, Slack licence expiry, Sheets via Zapier, Resend licence reminder, Slack incident closed)
- 3 action types: `slack` (formatted message), `resend_email` (HTML template, per-account API key), `webhook_url` (generic POST)
- Test-endpoint returns success/error without throwing; severity gate for Slack alerts
- Frontend `/dashboard/automations`: recipe gallery with one-click enable dialogs (action-aware config fields) + My Automations list with toggle/test/delete
- Events fire through both webhook subscriptions AND matching automations (both async, non-blocking)

### Iteration 11 — Automation Analytics Dashboard (Feb 2026)
- `/api/automations/analytics/summary` — 30-day daily counts, success_rate, top_rules, slowest endpoint (avg duration_ms)
- `/api/automations/test-all` — parallel batch test of every enabled automation
- Frontend: 4 KPI cards + 30-bar stacked chart (success/fail) + "Test all enabled" button
- Execution layer now records `duration_ms` on every run for latency analytics

### Iteration 12 — Enterprise Pricing Tier (Feb 2026)
- **4-tier pricing** launched: Sole Trader A$249 · Small Business A$499 · Growing Business A$799 · **Enterprise A$1,299** /mo + GST (annual = 2 months free)
- `/api/billing/tiers` returns 8 slugs (4 tiers × monthly/annual); `/api/enterprise/demo-request` public endpoint for demo captures
- Dedicated `/enterprise` marketing landing page
- **4 in-app Enterprise upsell triggers** (shared `<EnterpriseUpsellModal>` + `useTier()` hook):
  1. Workers: 21st worker add click → users-variant modal
  2. Settings: new **API** tab → api-variant modal for non-enterprise users
  3. Reports: 6th report in calendar month (localStorage counter) → reports-variant modal
  4. Dashboard: unique incident sites > 5 → sites-variant upsell banner
- All prices across /pricing, /enterprise, /compare, /fine-calculator, /dashboard plan banner, Billing panel show "+ GST" strictly

---

## Backend endpoints (current summary)
- Auth, Core CRUD (workers/licences/incidents/documents), Compliance
- Settings, Notifications, Onboarding
- **Safety (b)**: /api/safety/*
- **Reports (c)**: /api/reports/*, /api/reports/{type}/insights (AI)
- **Workflows (c)**: /api/workflows/*
- **Batch (d)**: /api/tradeinduct/*, /api/tradecheck/*, /api/academy/*, /api/partner/*, /api/worker/*
- **Iter 9**: /api/billing/{tiers,checkout,status,my-subscription}, /api/webhook/stripe (inbound), /api/webhooks/{events,subscriptions,deliveries,test}

## Frontend routes
- Public: /, /ecosystem, /services/*, /products/*, /consulting, /pricing, /partners, /franchises, /resources, /about, /tradecheck, /induct/:code, /blog(+/:slug), /templates, /compare, /guides(+/:state), /tools/fine-calculator, /integrations
- Auth/Protected: /login, /register, /auth/callback, /worker (PWA), /dashboard/* (20+ routes including /dashboard/webhooks)

---

## Backlog (Deferred)

### P1 (deferred — no user-facing value; high refactor risk)
- Split `server.py` (~2150 lines) into /app/backend/routes/{auth,safety,reports,workflows,tradeinduct,tradecheck,academy,partner,worker,billing,webhooks}.py
- Typed Pydantic models per module (replace `body: dict`)

### P2 (out-of-scope for this env)
- React Native / Capacitor wrapper — Emergent preview env can't build mobile binaries. The existing PWA at `/worker` is installable on iOS/Android and covers ~95% of native UX.

### Potential future
- Stripe true recurring subscriptions (current implementation uses one-time upfront payment per period; requires Stripe Price IDs)
- Background worker queue (e.g. Arq/Celery) for webhook delivery retries with exponential backoff
- Native mobile apps via Expo EAS Build (user would need to clone repo locally)
- Stripe Customer Portal for self-serve cancellation
- Multi-language (worker PWA translations)
- Advanced analytics dashboards

---

## Known environmental constraints
- EMERGENT_LLM_KEY budget may deplete — SWMS + AI insights have graceful fallback
- STRIPE_API_KEY=sk_test_emergent (test mode — real payments not processed)
- K8s ingress 60s timeout → backend AI timeout 50s
- Supervisor-managed frontend on 3000 / backend on 8001 — no mobile build chain
