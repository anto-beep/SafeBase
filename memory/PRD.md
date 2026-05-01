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

### Iteration 16 — Auto-derived Risk Register entry from closed Incident (Feb 2026)
- **AutoRiskPrompt** card on `IncidentDetail.jsx` (Summary + Close-out tabs, only for `stage === 'closed'` and `!linked_risk_id`): "Create a Risk Register entry from this incident?" with **Generate AI draft** and **Not needed** CTAs. Dismissal persists via localStorage key `risk_prompt_dismissed_{incident_id}`.
- Clicking Generate calls `POST /api/incident-workflow/{id}/ai/suggest-risk-draft` → Claude Sonnet 4.5 drafts title + primary_hazard + hazard_description + description (root cause framed as a risk) + inherent/residual L×C + review_frequency + suggested_controls[{name, hierarchy_level, description, effectiveness}]. Fallback:true returned on LLM failure.
- Review modal lets Safety Manager edit every field; L×C score pills recompute live. Save calls `POST /api/incident-workflow/{id}/accept-risk-draft` → creates a real `RISK-###` record, links `incident.linked_risk_id`, emits `risk_from_incident` notification, includes both `incident_id` and reference (e.g. `INC-2026-0001`) in `linked_incident_ids`.
- Post-save the banner is replaced by a green **Risk Register entry linked** card with Open-risk CTA.
- Tested 9/9 pytest + full FE Playwright smoke (iteration_16.json) — no issues.

### Iteration 17 — Reverse loop: Risk Review → Toolbox Talk + SWMS Revision (Feb 2026)
- **RemediationPrompt** card on Risk Review form (between sections 3 and 4) — visible when `control_reviews` has rows with `effectiveness in {not, partial}` OR `still_in_place in {no, partial}` OR `recommended_change in {improve, replace, remove, supplement}`, and no remediation already linked.
- Copy: "N control(s) flagged — close the loop with a Toolbox Talk & SWMS revision?" · lists failing controls.
- `POST /api/risk-reviews/{id}/ai/draft-remediation` → Claude Sonnet 4.5 drafts a **Toolbox Talk** (topic, objective, 5-7 key_points, 3 worker_questions, sign_off_prompt) AND a **SWMS Revision Task** (title, summary, 4-7 concrete changes, priority). Fallback skeleton on LLM failure; `no_failing:true` returned when review has no failing rows.
- Modal with two tabs (Toolbox Talk / SWMS Revision), every field editable, three CTAs: Create Toolbox Talk only · Create SWMS Revision only · Create both.
- `POST /api/risk-reviews/{id}/accept-remediation` → (1) inserts `safety_toolbox_talks` doc (default scheduled_at = +7d, source='risk_review_remediation', linked_review_id, linked_risk_id), (2) inserts `swms_revision_tasks` doc (new collection; default due_date = +14d, status='open'), (3) writes `review.remediation = {drafted_at, accepted_at, toolbox_talk_id, toolbox_talk_topic, swms_revision_id, swms_revision_title}`, (4) appends `remediation_created` audit entry on the risk, (5) emits `risk_remediation_created` in-app notification. Returns 400 if neither body present.
- **SWMS Revisions page** `/dashboard/swms-revisions` — 4 KPI cards (Total/Open/High priority/Completed), sortable table with HIGH/MEDIUM/LOW chips, expandable change list, status select (open/in_progress/completed/cancelled), Done button that sets `completed_at`. `GET/PATCH /api/swms-revisions` endpoints.
- Sidebar nav: "SWMS Revisions" added under Safety between Risk Register and First Aid & PPE.
- Backend: `risk_module.py` now ~1200 lines — tested 14/14 pytest pass + FE smoke (iteration_17.json).

### Iteration 18 — Competency Matrix: Toolbox attendance → Workers (Feb 2026)
- **Third side of the safety triangle complete**: Incident→Risk (iter16) · Risk Review→Toolbox+SWMS (iter17) · **Toolbox→Competency Matrix (iter18)**.
- **Conduct flow** on `/dashboard/toolbox-talks`: each scheduled row gets a **Conduct** button → modal with multi-select attendees (checkbox grid, Select-all toggle), optional notes, sign-off name. Submit calls `POST /api/toolbox-talks/{id}/conduct` → UPSERTs one `worker_competencies` doc per attendee (keyed by user+worker+topic, latest-wins), stamps the toolbox with `status='conducted'` + attendees_list, appends `toolbox_conducted` audit entry on any linked risk, emits in-app notification.
- **Competency ledger**: each stamp records topic, hazard_category (derived from topic via `TOPIC_TO_HAZARD` lookup), attended_at, expires_at (+365d default, overridable via `validity_days`), source_toolbox_talk_id, linked_risk_id, linked_review_id.
- **Competency Matrix page** `/dashboard/competency-matrix`: sticky-left worker column × topic columns, colour-coded cells (green ✓ current / amber ! expiring ≤30d / red ✗ expired / bordered X missing), 4 stat cards (workers / topics / overall coverage % / expiring ≤30d), search + trade/role filters, CSV export.
- **Dashboard widget** `competency-widget` on `/dashboard` Overview — red-themed card headed "UNBRIEFED WORKERS × ACTIVE HAZARDS", renders only when `/api/competency/dashboard` returns `active_hazards.length > 0`. Ranks hazards by score (high-priority open SWMS rev = +3, medium = +2, low = +1, plus +1 per failing control in recent reviews). Each card shows hazard, coverage %, unbriefed/total, source count, and a Schedule-toolbox CTA.
- **Navigation**: "Competency Matrix" added to main sidebar NAV between Workers and Licences.
- Backend: new `/app/backend/competency_module.py` (~372 lines, factory pattern). 4 endpoints: `/toolbox-talks/{id}/conduct`, `/workers/competencies`, `/workers/competencies/matrix`, `/workers/unbriefed?topic=X`, `/competency/dashboard`. Tested 18/18 pytest + iter17 regression 11/11 + full FE smoke (iteration_18.json).

### Iteration 19 — 14-day Free Trial + Apps & Add-ons discoverability (Feb 2026)
- **14-day free trial system** baked into auth: every new user (email+password OR Google) is stamped with `trial_started_at`, `trial_ends_at = +14d`, `subscription_status='trial'`. Legacy users without trial fields get them backfilled lazily on first `/api/billing/my-subscription` call (uses `created_at` as start).
- `/api/billing/my-subscription` now returns `on_trial`, `trial_days_left` (ceiling), `trial_expired`, `read_only`, `trial_started_at`, `trial_ends_at`, `trial_reminder_sent_at`. Active subscribers get `on_trial=false, read_only=false, trial_days_left=null`.
- **Day-10 reminder** (lazy, idempotent): when `trial_days_left ≤ 4`, the next `my-subscription` call attempts a Resend email + always inserts a `trial_ending_soon` in-app notification (MOCKED when `RESEND_API_KEY` env is unset — `delivered_via='in_app_only'`). `trial_reminder_sent_at` stamps prevent re-sending.
- **`trial_gate` middleware** at FastAPI app level blocks POST/PATCH/PUT/DELETE writes with **402 + {trial_expired:true}** when the trial expired and no active subscription exists. GETs always pass through (read-only mode preserved). Allowlist: `/api/auth/`, `/api/billing/`, `/api/webhook/stripe`, `/api/notifications`.
- **Frontend**:
  - `useTier()` hook extended with `onTrial`, `trialDaysLeft`, `trialExpired`, `readOnly`, `trialEndsAt`, `refresh`.
  - **Dashboard active-trial banner** (`trial-active-banner`): black bar with yellow "FREE TRIAL · N DAYS LEFT" eyebrow, headline, module list, Choose-plan CTA, dismissable (`localStorage.trial_banner_dismissed_v1`).
  - **Dashboard expired-trial banner** (`trial-expired-banner`): red bar, "READ-ONLY MODE — TRIAL ENDED", non-dismissable, prominent Choose-plan CTA. Hidden for active subscribers.
  - **Dashboard "Apps & Add-ons" card grid** (`apps-addons-section`): 4 cards (TradeInduct/TradeCheck/Academy/Mobile Worker) with icons, blurbs, "ALL UNLOCKED IN TRIAL" yellow chip when on trial.
  - **Sidebar reorg**: `ECOSYSTEM` renamed to **APPS & ADD-ONS** (yellow eyebrow), section moved from bottom to right under Settings (top half of sidebar). All 7 nav items unchanged: TradeInduct, TradeCheck, Academy, Partner Portal, Partner · Branding, Automations, Webhooks, Mobile Worker.
  - `api.js` 402 interceptor surfaces a sonner toast on trial-expired writes.
- Tested 8/8 backend + 18/18 iter18 regression + frontend e2e (active banner show/dismiss/persist, expired banner, apps grid, sidebar nav, route navigation, 402 on write) — zero issues (iteration_19.json).

### Iteration 20 — Complete SWMS Generator Phase 1 (Feb 2026)
- **7-step wizard** (`/dashboard/swms/new`): Business & Job → Trade & Activity → HRCW Categories → Tasks/Hazards/Controls → Compliance & Review → Equipment/PPE/Training → Generate & Sign. Left: stepped form · Right: **live preview pane** mirroring the PDF layout. Always-visible **Legal Notice** banner at top.
- **Reference data**: 21 trades, 20 HRCW categories (all Safe Work Australia codes), 8 state regulators, 19 standard PPE items (with AS/NZS refs), 18 standard training/licences, 6-level hierarchy of controls with colour codes.
- **AI endpoints** (Claude Sonnet 4.5):
  - `POST /api/swms/ai/suggest-hrcw` auto-ticks HRCW from trade+activity (deterministic lookup, no LLM cost).
  - `POST /api/swms/ai/suggest-rows` drafts 4-7 task rows with hazards + top-down hierarchy controls. Safe fallback rows returned when LLM times out (expected occasionally given K8s 60s ingress vs Claude ~55s latency — structure always valid).
- **CRUD + workflow**: `POST/GET/PATCH/DELETE /api/swms`, per-user+year reference counter `SWMS-YYYY-####`, version bumping + revisions[] on material changes when non-draft, audit_log on every mutation, soft-archive on first delete (5y retention default, 2y from incident date when `locked_by_incident`), `POST /api/swms/{id}/duplicate`, `POST /api/swms/{id}/status` for transitions (draft → awaiting_signatures → signed → in_use → reviewed → archived), `POST /api/swms/{id}/link-incident` to notifiable-incident-lock.
- **Worker sign-off** — three paths:
  - In-person: `POST /api/swms/{id}/sign` with signature text, stamps worker + status auto-progresses to `signed` when all workers stamped.
  - **SMS/secure-link** (MOCKED delivery): `POST /api/swms/{id}/send-sign-links` creates per-worker tokens in `swms_sign_tokens` (7-day expiry) + logs in-app notification `swms_sign_links_sent`.
  - Public sign page `/swms/sign/{token}` (no auth) renders trimmed SWMS view + signature input → `POST /api/public/swms/sign/{token}` marks token used + stamps worker. Path `/api/public/` added to trial_gate allowlist.
- **PDF** (`GET /api/swms/{id}/pdf`): WeasyPrint renders full Safe Work Australia template — cover, legal notice, business table, 20-item HRCW grid, 3-column tasks/hazards/controls with hierarchy-colour pills, PPE + training checklists, emergency procedures with state regulator, worker sign-on table (digital signatures embedded), revision history, footer disclaimer on every page. Attachment download. ~32KB typical.
- **SWMS Library** `/dashboard/swms`: register with 4 stat cards, filters (search/status/trade), row actions (View/PDF/Duplicate/Send-SMS/Archive), incident-locked icon, review-due banner. Replaces the old Documents page for SWMS; legacy `/api/documents` kept for backward compat.
- **Navigation**: "SWMS Library" added to sidebar main NAV under Overview, above Documents.
- Legal disclaimers baked into every generated PDF + all forms.
- Owner seed backfilled with `company_name="SafeTradie Demo Co"`; generator prefill falls back to user's name when company is null.
- Tested 19/19 backend + 8/8 iter19 regression + full Playwright wizard walkthrough — zero critical issues (iteration_20.json). One minor UX miss fixed post-test (company auto-fill).

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
