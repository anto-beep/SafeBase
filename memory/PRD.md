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

### Iteration 13 — Nav consolidation + ROI calc + White-label Partner Branding (Feb 2026)
- Marketing nav: all labels UPPERCASE; Compare & Blog consolidated under RESOURCES dropdown
- `/tools/fine-calculator` now includes a 4-plan comparison grid with Enterprise card
- `/enterprise` **ROI calculator** (users × hours × A$120/hr vs A$1,299/mo) — live sliders, monthly net gain, 12-month net, multiple-of-investment, CTA to /enterprise#demo
- **White-label Partner Branding** (`/dashboard/partner/branding`): 5-tab config (Identity, Colours, Custom Domain, Messages, Email) + Desktop/Mobile/Email live preview
- Backend: `GET/PUT /api/partner/branding` (Level-1 server-side gating), `POST /api/partner/branding/verify-dns` (MVP stub), `POST /api/partner/branding/test-email` (dry-run)
- Assets stored as base64 data URLs (≤500 KB); `partnership_level` default 1 gates custom domain + "Powered by" hide

### Iteration 14 — Risk Register + Library + AI Integration (Feb 2026)
- **Library module**: 4 flat libraries (Process/Activity/Task/Control) with trade-specific seed data (21 processes · 26 activities · 29 controls), CRUD, filters, archive, "AI Suggest Controls" on Control Library
- **Risk Register** (`/dashboard/risk-register`): 2-tab page (Register / Reviews) with stats, AI intelligence banner, filter bar, 5×5 inherent/residual heat-map, CSV export
- **Risk Form**: 8-section stepped add/edit with auto-scored L×C matrix, controls-hierarchy pyramid, AI suggest risks + controls, residual-risk warnings, review schedule with triggers
- **Risk Detail**: 5 tabs (Overview, Controls, Linked Records w/ AI summary, Review History, Audit Log) + cross-module quick actions (SWMS / Toolbox / Inspection / Training)
- **Risk Reviews**: 6-section initiate form with evidence summary (AI), control-by-control effectiveness assessment, re-evaluation with risk-increased banner, approval workflow (Submit → Approve/Request Changes/Reject); on approve writes residual back to risk + recomputes next_review_date
- **AI via Claude Sonnet 4.5** (Emergent LLM key) with JSON fallback: `/api/risks/ai/suggest`, `/api/risks/ai/suggest-controls`, `/api/risks/ai/from-incident`, `/api/risks/ai/intelligence`, `/api/risk-reviews/ai/evidence`, `/api/risk-reviews/ai/review-summary`
- Navigation: Risk Register under Safety; new **Library** sidebar section with 4 sub-items
- Backend: `/app/backend/risk_module.py` (factory pattern, mounted into existing `api_router`) — tested 21/21 pytest pass

### Iteration 15 — Incident Reporting & Management Workflow (Feb 2026)
- **5-stage lifecycle** (Reported → Triage → Investigation → Actions → Closed) with per-user+year auto-increment reference `INC-YYYY-####` and audit log per change
- **Visual Lifecycle Tracker**: 5-node pipeline with pulsing current stage, days-elapsed markers, overdue flag (SLAs: 24h / 48h / 7d / 30d)
- **Submission Wizard** (`/dashboard/incidents/new`): 6 steps, 4-tile involved-type selector, **interactive front/back SVG body map** with 29 hotspots, injury-nature + treatment chips, state-aware where/when, review summary
- **Incident Detail** (`/dashboard/incidents/{id}`): 9 tabs (Summary/Submission/Triage/Investigation/Actions/Close-out/Linked/Communications/Audit) with inline stage forms
- **Triage form**: manager account, full notifiability decision tree (death → serious-injury checklist → dangerous-occurrence checklist), state-specific regulator phone numbers + Call Now deep-link, severity 1-6, workers comp, sign-off
- **Investigation form**: detailed account + 6 contributing-factor categories (Human/Environment/Equipment/Supervision/Training/System) with Yes/No/Unknown + detail, **AI root cause** via Claude Sonnet
- **Actions form**: repeating short-term + long-term rows with type dropdown, priority, due date, "create as formal corrective action" flag, Risk Register link (create/link existing/skip), internal comments + worker communication
- **Close-out form**: 4-section checklist (Regulatory/Investigation/Actions/Documentation), AI lessons-learned suggest, sign-off with secondary for Severity 4+, record locked on close
- **Notifications**: in-app logged for `incident_reported`, `incident_urgent` (keyword-triggered: death/electric shock/fall from height/hospital/unconscious/amputation), `incident_triaged`, `incident_closed`, `incident_reopened` (iter15.1)
- **AI endpoints**: `/api/incident-workflow/ai/categorise`, `/api/incident-workflow/ai/root-cause`, `/api/incident-workflow/ai/summary`, `/api/incident-workflow/ai/lessons-learned` — all with fallback:true on LLM failure
- **Incident Register**: 8-card stats dashboard (Total YTD · Notifiable · Lost Time · Medical Treatment · Near Miss · First Aid · Avg close days · Open >30d), filter bar, mini 5-dot stage bar per row, days-open SLA colouring
- Backend: `/app/backend/incident_workflow.py` (~620 lines, factory pattern) — tested 27/27 pytest pass · Legacy incident module preserved at `/dashboard/incidents/legacy`

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
