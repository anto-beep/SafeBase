# SafeBase — PRD (formerly SafeTradie · rebranded iter25)

## Original problem
WHS compliance SaaS — originally for Australian trade businesses (SafeTradie), now positioned as a **multi-industry** platform (SafeBase) covering Trades & Construction, Hospitality, Transport & Logistics, Healthcare & Aged Care, and Retail.

Core (SWMS, Incidents, People/Licences, Intelligence) + ecosystem (TradeInduct, TradeCheck, Academy, Consulting). Pricing A$249 / 499 / 799 / 1,299 per month + GST.

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

### Iteration 21 — Document Library Hub · Phase 2 (Feb 2026)
- **Schema-registry pattern** via `/app/backend/docs_module.py` — each doc type registers `{id, category, label, fields[], ai_prompt, counter_prefix, pdf renderer}`. Generic `/api/docs/*` CRUD surface dispatches by `doc_type`. Adding new types = 1 renderer + 1 `register_doc_type()`.
- **8 doc types shipped**: JSA · Risk Assessment · SSSP · Emergency Plan · Hazardous Chemicals Register · Site Induction Checklist · Confined Space Entry Permit · Toolbox Talk Record. Counter prefixes: JSA / RA / SSSP / EP / HCR / IND / CSP / TBT.
- **WeasyPrint PDF** per type with consistent A4 header, legal notice, ref-id, and `%PDF-` output ≥5 KB. Soft-archive then hard-delete 2-step flow; 5-year retention stamp.
- **Frontend**: `DocumentLibraryHub.jsx` (hub at `/dashboard/document-library`, 6 category tiles + 8 type cards), `DocumentListPage.jsx` (per-type list with search + PDF row action), `DocumentForm.jsx` (dynamic form from spec.fields — supports text, textarea, state, date, datetime, number, chips, jsa_steps, risk_items, checklist, chemicals, contacts, equipment, attendees, atmosphere, emergency_procs).
- 100% backend (43/43 pytest) + 100% frontend (12/12 Playwright steps) — iteration_21.json.

### Iteration 22 — Document Library Phase 3 (curated subset, 8 more types) (Feb 2026)
- **+8 NEW doc types** via same registry — total library now **16 types across 6 categories**:
  - Safety: **WHS Management Plan** (WMP — Reg 309), **Asbestos Register** (ASB — Reg 425), **Hot Work Permit** (HWP), **Excavation Permit** (EXP — Reg 304), **Fall Protection Plan** (FPP — Reg 78)
  - Trade: **CCEW** NSW electrical certificate (CCEW — AS/NZS 3000), **Plumbing NOW/COC** (PLB — AS/NZS 3500)
  - Plant: **Lift Plan** (LIFT — AS 2550)
- Frontend `DocumentForm` gains 4 new table field widgets: `responsibilities` (role/responsibility), `asbestos_items` (7-col ACM register), `test_results` (test/result), `plumbing_items` (item/standard/result).
- All 8 new PDFs render 17–22 KB with `%PDF-` magic and pass 34/34 new pytest cases; 43/43 Phase-2 regression remains green after count assertion update. Frontend 12/12 live-driven steps pass including `lift_plan` end-to-end create + PDF download — iteration_22.json.

### Iteration 23 — Document Library Phase 3 Part 2 (remaining 15 types — full library complete) (Feb 2026)
- **+15 NEW doc types** added — Document Library now **31 types total across 6 categories** (20 safety · 1 worker · 7 trade · 3 plant):
  - Trade: **Gas Compliance Certificate** (GAS — AS/NZS 5601), **Pressure Test Record** (PT — AS 4041), **Backflow Test Report** (BFT — AS/NZS 2845.3), **Welding Procedure Specification** (WPS — AS/NZS 3834), **Electrical Test & Tag Register** (TT — AS/NZS 3760)
  - Plant: **Plant/Equipment Pre-Start Check** (PPS — Reg 213), **Scaffold Handover Certificate** (SCF — AS/NZS 4576)
  - Safety: **Traffic Management Plan** (TMP — AS 1742.3), **Working at Heights Permit** (WAH — Reg 78), **Lock-Out / Tag-Out Permit** (LOTO — AS/NZS 4024), **Manual Handling RA** (MHR — Reg 60), **Noise Assessment** (NOISE — AS/NZS 1269), **Silica / Dust Control Plan** (SIL — Reg 49-50), **Fire Safety Plan** (FSP — AS 3745), **Environmental Management Plan** (EMP — ISO 14001)
- 15 more table-field widgets in `DocumentForm.jsx` (backflow_tests, tmp_signage, loto_points, mh_factors/controls, noise_measurements, silica_tasks, rpe_items, test_tag_items, fire_detection, fire_equipment, emp_aspects, waste_streams, emp_compliance).
- **135/135 backend pytest PASS** across iter21+22+23; **100% critical frontend flows** (31-card hub render + welding_procedure end-to-end + spot-check of 5 new widgets) — iteration_23.json.
- Minor UX fix: DocumentForm now replaces `/new` URL with `/{doc_id}` after first save so refresh/back retains state.

### Iteration 25 — SafeBase Rebrand + Multi-Industry Marketing Pages (Feb 2026)
- **Rebrand: SafeTradie → SafeBase** across user-facing strings only — wordmarks (marketing nav, dashboard sidebar, login/register), HTML title, meta description, og:title, manifest, footer copyright. Internal identifiers (env vars, DB names, demo email `owner@safetradie.demo`, MongoDB collection names) preserved to avoid breaking auth/data.
- **Multi-industry config** (`/app/frontend/src/data/industries.config.js`) — single source of truth for 5 industries. Shared `IndustryPage` template renders all sections from config.
- **Five industry pages + overview hub + homepage rebuilt** — all per spec, 5-tab homepage switcher, industry-coloured gradients.
- **Marketing nav restructured**: Home | Industries ▼ | Features ▼ | Pricing | Resources ▼ | Contact | Log in | Start Free Trial.
- **100% frontend tests** (iteration_25.json). Backend untouched.

### Iteration 26 — Industry-specific live signal on homepage (Feb 2026)
- Added `signal: {pulse, featured}` to each of the 5 industries in `industries.config.js` so the homepage preview block surfaces a per-industry momentum/social-proof row + spotlight.
- Pulsing green `• LIVE` badge on each direct industry page hero.

### Iteration 28 — server.py refactor complete + in-app industry adaptations (Feb 2026)
- **`server.py` 2714 → 2036 lines** — `/billing/*` + `/enterprise/demo-request` + `/webhook/stripe` extracted to `/app/backend/routes/billing.py` via `register_billing_routes(api_router, db=…, User=…, get_current_user=…, logger=…, stripe_api_key=…, resend_api_key=…, trial_length_days=14, trial_reminder_day=10)`. Factory also owns the three trial helpers (`_ensure_trial_fields`, `_compute_trial`, `_maybe_send_trial_reminder`). `/automations/*` (9 routes incl. `recipes`, CRUD, `test`, `runs`, `analytics/summary`, `test-all`) extracted to `/app/backend/routes/automations.py` via `register_automations_routes(…, webhook_events=WEBHOOK_EVENTS)`, which returns `run_automations_for_event` so `server.py`'s `trigger_webhook_event` can still fan-out alongside outbound webhook deliveries.
- **Industry-aware Dashboard** — new `/app/frontend/src/hooks/useIndustry.js` returns `{slug, term, meta}` derived from `user.industry`. Terminology map covers greeting, `site_singular/plural`, `worker_singular/plural`, `primary_doc_label`, `primary_doc_cta_label`, `primary_doc_cta_blurb`, `primary_doc_route`, and a 2–3-card `starter_actions` array per industry.
- **Settings → Business tab** — new Industry card (`settings-industry-card`) with `settings-industry-select` Select at top. Changing value fires `PATCH /api/auth/me/industry`, updates `AuthContext` in-memory, and the dashboard re-tunes on next navigation.

### Iteration 29 — Batch A: Multi-industry signup + role-based dashboard routing (Feb 2026)
- **3-step signup wizard** (`/app/frontend/src/pages/Register.jsx`) — full-screen Step 1 industry tile picker (5 large coloured tiles per Part 1 spec — navy/amber/teal/blue/purple); Step 2 industry-specific role tile picker (12 role tiles per industry) with confirmation block; Step 3 details (name + business + email + password + Google option).
- **Role configuration** — new `/app/frontend/src/data/roles.config.js` exports `ROLES_BY_INDUSTRY` (5 industries × 11–12 roles each = 60+ roles), each role mapped to a `variant` ∈ {owner, safety_lead, supervisor, worker} that drives dashboard routing.
- **Backend** — `auth.RegisterIn` accepts `role_title` + `role_variant` (`Literal["owner","safety_lead","supervisor","worker"]`); both persisted on user doc and surfaced via `/auth/me`. New `PATCH /api/auth/me/role` endpoint validates + updates both fields (rejects invalid variant with 400).
- **Dashboard router** — `Dashboard.jsx` now branches on `user.role_variant`: `worker` → `WorkerDashboard.jsx` (mobile-first; industry-specific quick action: Sign SWMS / Log Temperature / Submit Fitness for Duty / Log Clinical Event / Lone Worker Check-In), `safety_lead` → `SafetyLeadDashboard.jsx` (compliance score ring dominant + open incidents/serious/risks stats + daily focus), `supervisor` → `SupervisorDashboard.jsx` (today's roster + tasks + industry-specific team focus tile), default `owner` → existing rich `OwnerDashboard`.
- **Settings** → Business tab gains a second card `settings-role-card` with `settings-role-select` listing the 12 roles for the user's current industry. Changing role hits `PATCH /auth/me/role` and updates `AuthContext` in memory.
- **OnboardingWizard** is now industry-aware via a `INDUSTRY_CONTEXT` lookup (`primary_doc`, `trade_label`, `trade_options`, `focus`, `worker_role_default`, `worker_role_label`) + `CRED_TYPES_BY_INDUSTRY` for the credential picker on step 4. Step 1 trade-type dropdown now shows venue/operation/practice/format types per industry; copy adapts ("Add your first team member" / "Generate your first HACCP plan" / etc.).
- **Backend regression** — new `/app/backend/tests/test_iter29_role_variants.py` (5 tests). Total: **49/49 backend tests pass** across iter27/28/29 + iter9 billing + iter19 trial. Testing agent iter28 confirmed all 4 dashboard variants render correctly + 3-step signup flow + role-change-via-Settings round-trip.
  - Dashboard eyebrow now renders `/ Overview · {industryBadge} · {date}`.
  - Primary CTA button (`quick-generate-btn`) swaps between `Generate SWMS` / `Create HACCP plan` / `Generate CoR plan` / `Track AHPRA registrations` / `Quick-induct a casual`.
  - Stat cards `Active SWMS` → `HACCP & plans` / `Active trip plans` / `AHPRA & compliance` / `Inductions & logs`; `Workers` → `Crew` / `Team` / `Drivers` / `Team` / `Team`.
  - Sites upsell banner vocabulary adapts (Multi-venue / Multi-depot / Multi-clinic / Multi-store detected).
  - New **"Industry starter"** card (`industry-starter-{slug}`) sits between the competency widget and Apps & Add-ons — lists 2–3 shortcut links into the industry-gated doc types.
  - First quick-action card (`quick-action-primary`) mirrors the primary CTA; "Add worker" card reads "Add driver / clinician / team member".
  - Competency widget sub-copy swaps "on the tools" → "on your {worker_plural}".
- **Settings → Business tab** — new Industry card (`settings-industry-card`) with `settings-industry-select` Select at top. Changing value fires `PATCH /api/auth/me/industry`, updates `AuthContext` in-memory, and the dashboard re-tunes on next navigation.
- **Backend regression** — new `/app/backend/tests/test_iter28_routes_split.py` (12 tests covering billing tier list, my-subscription, enterprise demo, automations CRUD+analytics+test, worker-create fan-out, industry PATCH). 65/65 tests pass across iter28 + iter27 regression + iter10 + iter19 + iter9 (stale `test_tiers_public` updated 6→8 tiers). Testing agent iter27 confirmed live industry switch round-trips across all 5 verticals.

### Iteration 27 — 5 P1 items + live-signal backend + full rebrand polish (Feb 2026)
- **`by_status` breakdown** on `/api/docs/stats` (draft / in_use / issued / archived counts).
- **Industry field on user model** — captured at `/register`, persisted to `users.industry`, surfaced in `/auth/me` + `/auth/login` responses. New `PATCH /api/auth/me/industry` endpoint for in-app industry change.
- **`/api/industries`** public endpoint — returns the 5 industry registry entries (no auth).
- **`/api/public/industry-signal/{slug}`** live endpoint — aggregates real `users.industry` counts over last 7/30 days + total. Returns live copy once `(week+month) ≥ 10`; falls back to hard-coded signal copy below that threshold. Frontend homepage now fetches this live on tab switch — numbers become real as soon as 10+ users per industry sign up.
- **Industry signup picker** on `/register` — 5-option select as the FIRST field, clean explainer ("SafeBase tailors your library, documents, and compliance obligations to this choice"). Register page trust-panel rebranded from trades-only to cross-industry testimonials.
- **Industry-gated doc types (12 new)** — registry entries carry an `industries: [slug, ...]` filter; `/api/docs/types` now filters by caller's industry:
  - Hospitality (+3): **HACCP Plan** (HACCP · Std 3.2.1), **Temperature Monitoring Log** (TEMP · Std 3.2.2A), **Allergen Register** (ALG).
  - Transport (+3): **CoR Management Plan** (COR · HVNL), **Driver Fitness for Duty Declaration** (FFD · per-trip), **Load Restraint Record** (LRR · LRG 3rd Ed).
  - Healthcare (+3): **AHPRA Registration Register** (AHPRA), **Worker Screening Record** (WSR · Aged Care Act 2024 + NDIS), **Clinical / Adverse Event Report** (CE · ACSQHC SAC).
  - Retail (+3): **Casual Quick Induct Record** (QI · WHS Reg 39), **Lone Worker Check-In Log** (LW · WHS Reg 48), **Customer Incident Report** (CI).
  - Total library now **43 types** (31 universal + 12 industry-gated). Trades users see 31; hospitality/transport/healthcare/retail users see 34 each.
- **`server.py` refactor — webhooks extracted** — 7 webhook-subscription routes moved to `/app/backend/routes/webhooks.py` via `register_webhooks_routes(api_router, db=, get_current_user=, webhook_events=, deliver_webhook=)` factory. `server.py` no longer houses the webhook-subscription CRUD; `_deliver_webhook` + `_fire_event` stay (called from many other domains).
- **Full SafeTradie → SafeBase rebrand completed** — 36 additional frontend files cleaned up (Pricing, Academy, Ecosystem, Webhooks, Settings, OnboardingWizard, Compare, StateGuide, marketingData, blogPosts, SWMS pages, etc.) while preserving the test-credential email `owner@safetradie.demo` untouched. Backend service banner now returns `{"service":"SafeBase API"}`.
- **100% backend tests (20/20 pytest iter27 + 58/58 iter23 regression) + 100% frontend on tested flows** — iteration_26.json.

### Iteration 24 — P1 Refactor Batch & Polish (Feb 2026)
- **`docs_module.py` split**: 2203 → 236 lines (routes + CRUD only). Renderers moved to `docs_pdf.py` (31 functions + CSS helpers); registry + field specs moved to `docs_registry.py` (31 `register_doc_type()` calls + `DOC_TYPES` + `CATEGORIES`).
- **Generic `table` field type** in `DocumentForm.jsx` — replaces the 18+ duplicate table-type if/else chain with a single branch driven by `field.columns` (or a legacy `TABLE_COLS` lookup for back-compat). New doc types can now declare `{type:"table", columns:[{key,label}]}` directly in the registry with zero frontend code.
- **shadcn Calendar + Popover** replace native `<input type=date/datetime-local>` across DocumentForm (date + datetime branch → `DateField` component with Popover + time input).
- **`GET /api/docs/stats`** — single aggregation endpoint returning `{total, by_category, by_doc_type, recent[≤5]}` so the Hub no longer needs to fetch every doc to compute counts.
- **PATCH `/api/docs/{id}` version bump** — every successful PATCH increments `version` via `$inc` (compliance audit requirement).
- **Field-key allowlist** on both POST + PATCH — derived from `spec.fields` at registration time, silently strips unknown keys so typos like `lod_weight_kg` can no longer persist.
- **WeasyPrint timeout** — `write_pdf` wrapped in `asyncio.wait_for(timeout=30)`; returns 504 on timeout instead of hanging.
- **Auth routes extracted** to `/app/backend/routes/auth.py` via `register_auth_routes(api_router, db=..., User=..., get_current_user=..., hash_password=..., verify_password=..., make_jwt=..., trial_length_days=14)` factory. `server.py` now imports + calls this factory.
- **100% backend (12/12 new tests)**, **95% critical frontend** (hub 31 cards, Calendar popover, generic tables, create→save→PDF all pass) — iteration_24.json. One minor post-save URL regression identified + fixed (navigation now correctly targets `/dashboard/document-library/doc/{doc_id}`).

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

### P1 (next session)
- **Further docs_pdf / docs_registry split** — both still >700 lines. Group renderers + registrations per-category (`docs_pdf_safety.py`, `docs_pdf_trade.py`, `docs_pdf_plant.py`, `docs_pdf_worker.py`) for surgical edits later.
- **Per-type Pydantic models** — build `DocCreate_<type>` / `DocUpdate_<type>` BaseModels dynamically from `spec['fields']` at registration time so bad payloads 422 instead of silently-stripping (current allowlist is a weaker defence).
- **Deeper industry adaptations (phase 2)** — iter28 covered Dashboard + Settings; next surfaces: sidebar nav labels (`Workers` → `Drivers`), per-industry dashboard widget visibility (e.g. hospitality → temperature-alert widget; transport → fatigue-alert widget), per-industry notification templates, per-industry onboarding wizard copy.
- **Debug-log dropped keys** on POST/PATCH so silent-strip doesn't mask client-side typos.
- **Expose test-ids on new UI**: `doc-save-toast`, `doc-row-{doc_id}`, `date-popover-trigger-{field_key}`, `date-popover-day-{iso}` for deterministic QA automation.
- **`by_status` breakdown** on `/api/docs/stats` so hub can surface draft/in_use/issued/archived pill counts.
- **Safety-category sub-grouping in Hub**: 20 safety docs in one column scrolls — group into Permits / Plans / Assessments for ergonomics.
- **Drop empty categories (contractor, incident)** from `/api/docs/types` response OR annotate `count:0` so the hub can grey them out.

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
