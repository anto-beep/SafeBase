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
- **Dashboard router** — `Dashboard.jsx` now branches on `user.role_variant`: `worker` → `WorkerDashboard.jsx` (mobile-first; industry-specific quick action), `safety_lead` → `SafetyLeadDashboard.jsx` (compliance score ring dominant), `supervisor` → `SupervisorDashboard.jsx` (today's roster + tasks), default `owner` → existing rich `OwnerDashboard`.
- **Settings** → Business tab gains a second card `settings-role-card` with `settings-role-select` listing the 12 roles for the user's current industry.
- **OnboardingWizard** is now industry-aware via `INDUSTRY_CONTEXT` lookup + `CRED_TYPES_BY_INDUSTRY`. Trade-type dropdown adapts (Restaurant/Cafe/Bar for hospitality; HC/HR/MC for transport; etc.); copy adapts.

### Iteration 30 — Batch B: Five visually-distinct industry dashboards (Feb 2026)
- **HospitalityOwnerDashboard.jsx** (cream `#FDF8F2` + amber `#E87722` + burgundy `#7C1D3F`) — full-width Food Safety Status Bar at top with 5 equipment cards, dual horizontal score bars, staff certifications grid, Council Inspection burgundy card with checklist + Generate inspection pack CTA, today's cleaning, AI alerts.
- **TransportOwnerDashboard.jsx** (charcoal `#1C2526` + teal `#0DC4B5` + safety orange `#FF6B35`) — dark command-centre theme. Horizontal-scrolling Fleet Status Strip with vehicle cards. Three-column below: drivers compliance + dual mini-gauges (WHS / CoR) + 6-element CoR matrix + AI alerts.
- **HealthcareOwnerDashboard.jsx** (clinical white `#F4F8FB` + teal `#2196A6` + soft green `#4CAF8F`) — credential status panel dominant (4-column AHPRA/Screen/Vacc/First Aid table), 8-pill ACQSC Quality Standards grid, three horizontal score bars, AI alerts, WHS/Clinical tabs, full-width upcoming renewals at bottom.
- **RetailOwnerDashboard.jsx** (purple `#5B2D8E` + magenta `#E91E8C` + tint `#F9F5FF`) — energetic. Top band 3 large status tiles (Lone Worker / Inductions / Incidents Today), Workplace Safety Score with 4 sub-bars, today's roster + Quick Induct all bulk action, open hazards, 4 quick-action tiles, credentials expiring.
- **Trades dashboard preserved unchanged**.
- **Industry-aware sidebar** — `DashboardLayout.jsx` reads `user.industry` and applies `NAV_LABELS_BY_INDUSTRY` (SWMS Library → Food Safety / Fleet & CoR / Care Quality / Inductions; Workers → Team Members / Drivers & Operators / Staff & Clinicians) + `APPS_NAV_BY_INDUSTRY` aliases (TradeInduct → VenueInduct/FleetInduct/ClinicInduct/StoreInduct) + `industryAccent` 4px left-border on active items.

### Iteration 37 — Complete Pricing Update + Frontend Overhaul (Feb 2026)
- **Master pricing refresh across all 5 industries** (`/app/frontend/src/data/pricing.config.js` + `/app/backend/routes/billing.py` now has 40 Stripe tier slugs):
  - **Trades**: Solo Tradie A$399/mo (A$3,990/yr), Small Team A$799, Growing Business A$1,299, Enterprise A$2,199.
  - **Retail** (now independent, 8 new slugs): Single Store A$549 → A$5,490/yr, Small Chain A$1,099 → A$10,990, Multi-Store A$1,699 → A$16,990, Enterprise A$2,799 → A$27,990.
  - **Hospitality**: Single Venue A$799 → A$7,990, Small Group A$1,499 → A$14,990, Multi-Venue A$2,299 → A$22,990, Enterprise A$3,799 → A$37,990.
  - **Transport**: Owner-Operator A$999 → A$9,990, Small Fleet A$1,799 → A$17,990, Growing Fleet A$2,799 → A$27,990, Enterprise A$4,499 → A$44,990.
  - **Healthcare**: Solo A$1,499 → A$14,990, Small A$2,799 → A$27,990, Multi-Site A$4,499 → A$44,990, Enterprise **A$13,999/mo → A$139,990/yr**.
- **Annual is default everywhere**. Every price card renders primary annual + secondary monthly + "Equivalent to A$X.XX/month when billed annually" + "Save A$X + GST annually" chip. All prices show `+ GST` suffix.
- **Frontend overhaul — multi-industry framing**:
  - Homepage: new hero "Every Industry. Every Obligation. One Platform.", 5-card industry pricing strip using `INDUSTRY_ENTRY_PRICES`, 3 non-trades testimonials (Hospitality / Healthcare / Transport), industry-neutral pain cards.
  - Pricing page: default cycle = annual, Healthcare Enterprise A$139,990 + user-limit chips, 30-day money-back guarantee banner.
  - About: rewritten founding story (994,178 businesses, five industries), HardHat→Cube icon.
  - Login: "Your Industry. Your Compliance." copy, 5-industry text list, HardHat→Cube.
  - Register: "Start Your Free 14-Day Trial" headline, Cube brand icon.
  - Enterprise: dual-tier headline (Trades A$2,199/mo + Healthcare A$13,999/mo), ROI card uses A$2,199 baseline, features reference SafeInduct/SafeCheck.
  - Ecosystem: products renamed SafeInduct (A$199/mo) / SafeCheck (A$249/mo) / Academy (A$349/mo up to 10), data flow diagram updated.
  - Partners: revenue calc rewritten (10×A$1,499 clients → A$2,248.50/mo commission; Healthcare Enterprise → A$2,099.85/mo per client callout).
  - Franchises: per-location tiers A$169 / A$149 / A$119, network setup from A$20,000.
  - BillingPanel: `TIER_LABEL` expanded to all 20 tiers, `priceMap` complete for all 20 incl. Healthcare Enterprise A$139,990/yr.
  - Dashboard + Settings: upsell copy updated to new prices.
  - SafeInduct, SafeCheck, Academy product pages: headlines/prices/copy updated to multi-industry framing.
  - Landing.jsx + Blog.jsx + TradecheckMarketplace.jsx: tradie language removed.
  - Footer tagline: "SafeBase. WHS and Compliance Management for Every Australian Industry. AI-Powered. Australian-Built. Australian-Hosted."
- **Backend test fixture updated** (`test_iter12_enterprise.py`) to reflect new expected prices.
- **Testing agent verdict**: 13/13 backend pytest + full frontend verification PASS (`/app/test_reports/iteration_37.json`). `retest_needed: False`. All 40 tier prices verified correct; Stripe checkout succeeds for new slugs including `retail_enterprise_annual`.
- **Trades functionality unchanged** — all 20 trades slugs preserved (sole_trader_*, small_business_*, growing_business_*, enterprise_*). Full regression intact.

### Iteration 36 — Cross-Industry Compliance Inbox + Integration Webhooks + Content Expansion (Feb 2026)
- **Cross-industry Compliance Inbox** (`/app/backend/routes/compliance_inbox.py`): aggregates 10 item sources from every industry into a single prioritised list — SIRS (P1 24h / P2 30d), NDIS reportable (24h / 5d), AHPRA expiring/expired, NHVR Notifiable Occurrences (24h regulatory), fatigue breaches (7d), lone-worker overdue (auto-escalate threshold), temperature breaches (24h), HACCP CCP breaches (7d), FSS + Liquor cert expiring (30d), long-open incidents (>7d). Severity classified as `critical` (overdue/≤4h regulatory), `high` (≤24h), `medium` (≤30d), `info`.
  - `GET /api/compliance-inbox?severity=&industry=&limit=` — full list with counts_by_severity
  - `GET /api/compliance-inbox/summary` — widget-friendly top_3 + counts
- **Dashboard widget** (`/app/frontend/src/components/ComplianceInboxWidget.jsx`): mounted above Apps & Add-ons on every Dashboard. 60s auto-poll, red-banner if any `critical` items, severity chips, industry-accented left border per row, deep-links to the owning industry module.
- **Full Compliance Inbox page** (`/dashboard/compliance-inbox`): 4 stat tiles, severity + industry Select filters, scrollable list with kind chip (NHVR/NDIS/SIRS/AHPRA/…) + industry chip + deadline countdown ("in 3h", "2d overdue"). Sidebar nav item added as item #2 under Overview.
- **Integration webhook stubs** (`/app/backend/routes/integrations.py`):
  - `POST /api/integrations/iot/temperature` — IoT sensor webhook → temperature_logs row with FSANZ Std 3.2.2 auto-range check (same logic as the manual endpoint)
  - `POST /api/integrations/ewd/fatigue` — EWD provider webhook → fatigue_logs with auto-breach detection, `source='ewd'`
  - `POST /api/integrations/ahpra/poll` — owner-only manual refresh stamping `last_checked_at` on all registrations
  - `POST /api/integrations/ahpra/webhook` — upsert on `registration_number` for status/conditions changes
  - Auth via `x-safebase-integration-token` header (per-account tokens) or `x-safebase-account` (test mode).
- **Content expansion**:
  - **AI docs extra**: added `peal_anaphylaxis_plan` (hospitality), `nhvas_audit_pack` + `nhvr_notifiable_occurrence` (transport), `sirs_investigation_report` (healthcare). Registry now has ≈35 industry-specific AI doc types across 4 industries.
  - **Academy catalogue**: extended microlearning lists — hospitality +3 (PEAL, council inspection, allergen death-response drill), transport +3 (NHVR notifiable, mass, DG segregation), healthcare +3 (SIRS P1, restrictive practices, clinical docs), retail +2 (armed-robbery drill, 60s de-escalation).
- **Backend tests**: 21/21 new pytest + trades regression + frontend smoke all PASS (iteration_36.json). `retest_needed: False`. Cross-account isolation verified (no inbox leakage). NHVR occurrence created 25h ago correctly surfaces as `critical`.
- **Trades dashboard preserved unchanged** — new widget appears on Trades dashboard too (aggregates long-open trades incidents), but no Trades-specific UI changed.

### Iteration 35 — Industry-Specific Mega-Batch: Full Backend Modules for Hospitality / Transport / Healthcare / Retail (Feb 2026)
- **Four dedicated route modules added at `/app/backend/routes/`** (all 403-gated via `require_feature()` — trades user hits any of them returns `{error:"feature_not_available", code, industry, role_variant}`):
  - **`hospitality.py`** — Temperature logs with automated FSANZ Std 3.2.2 range check (fridge/coolroom ≤5°C, freezer ≤-15°C, hot holding ≥60°C + breach stats 30d), Food Safety Supervisor register, HACCP CCP log, Allergen register, Cleaning schedule (w/ complete endpoint), Supplier register, RSA/Liquor register, Council inspection pack generator (manifest of all evidence counts).
  - **`transport.py`** — Fleet vehicles (rego/GVM/service), Pre-trip inspections (auto-derived fit_to_drive from checklist), Fatigue logs with automated HVNL Std-Hours breach detection (work >12h/day, rest <7h), Fitness-for-duty (auto-computed fit status), Load restraint, Mass management (GML/CML/HML/PBS scheme overweight check), CoR executive due-diligence log (consigner/packer/loader/driver/scheduler/operator/executive), NHVR Notifiable Occurrence with auto-set `notify_nhvr_by = occurred_at + 24h`.
  - **`healthcare.py`** — AHPRA register with 30d-expiry endpoint + days-to-expiry flags, Worker screening (NDIS/aged-care/WWCC), SIRS incidents with auto priority classification (P1 high-harm → 24h deadline, P2 → 30d), SIRS submit endpoint, NDIS reportable (serious cat = 24h, else 5d), ACQSC 8-Standards evidence with per-standard coverage counts, Care minutes log (RN/direct/allied).
  - **`retail.py`** — Lone worker check-in/escalate/active-monitor (auto-computed `_overdue_min` + `_should_escalate` when >30min overdue), Quick Induct 3-min shift-blocker (6 mandatory questions, 90d validity, per-casual status endpoint, missing-answer detection), Customer incident log (injury/aggression/slip/theft/medical), Roster eligibility endpoint (blocks rostering if no valid Quick Induct OR expired licences).
- **Four visually-distinct industry pages** at `/app/frontend/src/pages/{hospitality,transport,healthcare,retail}/`:
  - `/dashboard/food-safety` (hospitality · cream+teal+burgundy · 7 tabs)
  - `/dashboard/cor` (transport · charcoal+teal+orange dark command-centre · 8 tabs)
  - `/dashboard/care-quality` (healthcare · clinical white+teal+green · 6 tabs)
  - `/dashboard/inductions` (retail · purple+magenta+tint · 3 tabs, Lone Worker panel auto-refreshes every 30s)
- **Shared `_shared/IndustryListTab.jsx`** component keeps forms DRY across all 4 industries — supports text/select/date/datetime/number/textarea fields, column renderers, transform-submit hook for type-coercion.
- **Feature-gated and account-isolated** — every endpoint uses `Depends(require_feature(code))`, `stamp_account_fn(doc, user)`, and `log_audit_fn(...)` so cross-industry + cross-account leakage is impossible by design.
- **Testing agent verdict**: `retest_needed: False` — 34/34 new pytest cases pass (auto-breach logic, 24h deadlines, 403 hard-blocks across 8 endpoints × 4 industries, trades regression intact). All 4 frontend pages render with full tab sets. Test report at `/app/test_reports/iteration_34.json`.
- **Trades preserved unchanged** — all existing SWMS / incidents / documents / risk register / competency matrix flows verified green post-mega-batch.

### Iteration 34 — All next-action items in one go (Phases 2 + 3 + 4) (Feb 2026)

### Iteration 33 — Multi-industry expansion batch (Parts 1, 2, 4, 5, 6, 8 + ticker + hospitality colour) (Feb 2026) — `/app/frontend/src/pages/IndustryProductPage.jsx` is a single config-driven template that consumes `industry-pages.config.js`. All 5 industry pages (`/industries/trades|hospitality|transport|healthcare|retail`) now render: 1) Hero with stats, 2) Problem cards, 3) Features grid by category, 4) AI documents list, 5) Academy modules, 6) Add-ons, 7) Dashboard preview, 8) Compliance obligations table, 9) Pricing anchor, 10) Resources preview, 11) Testimonials (3 per industry), 12) Final CTA.
- **Phase 2 P1: Role-variant dashboards (Part 3)** — `/app/frontend/src/pages/dashboards/RoleVariantDashboard.jsx` provides Food Safety Supervisor / Dispatcher / Healthcare Manager dashboards, each with industry-accent dominant widget + sub-pillar score breakdown + role-specific urgent actions. `Dashboard.jsx` routes by (industry × role_variant × role_title).
- **Phase 3 P1: 35+ AI doc types (Part 2 expansion)** — `/app/backend/ai_docs_extra.py` extends AI_DOC_REGISTRY with 28 additional doc types via a `_generic_prompt(brief, sections)` factory. Hospitality now has 8 doc types (was 1): Food Safety Program, HACCP Plan, Allergen Mgmt, Temperature Monitoring, Cleaning & Sanitation, Food Safety Incident Response, RSA & Liquor Policy, Staff Induction. Transport has 8: CoR Plan, Fatigue Policy, Driver FFD, Pre-Trip Inspection, Load Restraint Plan, Drug & Alcohol, Vehicle Maintenance, Transport SMS. Healthcare has 8: Manual Handling RA, SWP Hoist, SWP Aggressive Behaviour, Infection Control, ACQSC Evidence, NDIS Evidence, Worker Screening, Psychosocial RA. Retail has 8: Working Alone RA, Spill Response, Customer Aggression, Manual Handling, Emergency Plan, Full Induction, Quick Induct, Lone Worker Procedure. Total **32 AI doc types** across 4 industries.
- **Phase 3 P1: Resources hub equal-depth content (Part 9)** — `/app/frontend/src/data/resources.config.js` defines 6 articles + 5 templates + 4 regulators + 3 calculators per industry (× 5 industries = 90 content items). `/app/frontend/src/pages/IndustryResourcesPage.jsx` renders them at `/resources/:industry`.
- **Phase 4 P2: Real Academy quiz + cert PDF** — `/app/backend/academy_module.py` adds `QUIZZES` dict with real 5-question multiple-choice quizzes for 8 high-value modules (SWMS, Heights, Food Handler, RSA, CoR, Fatigue, Manual Handling Healthcare, Infection Control, Lone Worker) + a generic 3-question fallback for everything else. New endpoints: `GET /api/academy/{slug}/quiz` (answers stripped), `POST /api/academy/{slug}/submit-quiz` (scores + creates completion + cert if ≥80%), `GET /api/academy/cert/{cert_id}.pdf` (renders A4 PDF certificate via `reportlab` with worker name + module title + score + cert ID). Frontend `Academy.jsx` mounts a quiz modal with multiple-choice radios, shows result screen with download cert button.
- **`reportlab==4.5.0`** added to `requirements.txt`.
- **Backend tests**: `test_iter34_expansion.py` (8 tests — AI doc count per industry, quiz scoring, cert PDF download, leak prevention) — all pass. **87/88 total tests pass** (1 skip = unrelated iter33 worker-seed gap).
- Testing agent verdict: `retest_needed: False`. Frontend verified on real DOM: all 5 industry pages × 12 sections = 60/60, all 5 resources × 18 items = 90/90, hospitality dashboard zero `#E87722` remaining.


- **Part 1 — Data isolation architecture** (`/app/backend/data_isolation.py`): `account_id_for(user)`, `visibility_filter(user, collection)` (worker-tier sees-own only for incidents/licences/temp logs), `assert_account(record, user)` 403-on-mismatch, `stamp_account(doc, user)` auto-tags account_id+industry+created_by+created_at, `log_audit()` append-only audit trail. New `GET /api/audit-log` (owner-only). Wired into `/workers` and `/incidents` (most sensitive) with backwards-compat for legacy user_id-only records. User model now carries `account_id`.
- **Part 2 — AI document generator** (`/app/backend/ai_docs_module.py`): industry × doc_type registry + Claude Sonnet 4.5 prompts. Initial doc types: HACCP Plan (hospitality), CoR Management Plan (transport), Manual Handling RA Clinical (healthcare), Working Alone RA (retail). `GET /api/ai-docs/types` industry-filtered, `POST /api/ai-docs/{industry}/{doc_type}/generate` with cross-industry 403. Each doc gets unique reference (HACCP-2026-0001), saved to `compliance_docs`, audit-logged.
- **Part 4 — Add-on marketplace** (`/app/backend/addons_module.py`): 23 add-ons across 5 industries — SafeInduct/SafeCheck/Academy variants per industry, plus industry-uniques (Temperature Sensors, EWD Integration, NHVAS Pack, CoR Audit Pack, ACQSC Pack, NDIS Pack, AHPRA Monitoring, Franchise Network) + universal (WHS Consulting, White-Label Partner). `GET /api/addons/available` filters by industry, `POST /api/addons/{slug}/activate|deactivate` owner-only with industry validation.
- **Part 5 — Academy industry catalogue** (`/app/backend/academy_module.py`): `CATALOGUE` with microlearning + full courses for all 5 industries (17 trades micro + 5 trades courses, 16 hospitality micro + 4 courses, 14 transport micro + 4 courses, 14 healthcare micro + 5 courses, 13 retail micro + 3 courses). `GET /api/academy/catalogue?industry=` returns industry-filtered list. `POST /api/academy/{slug}/complete` writes to `academy_completions` linked to worker.
- **Part 6 — Marketing nav restructure**: dropped Features link, added Resources dropdown (5 industry resource sections + Templates + Ask SafeBase AI), added Compare top-nav link, added "Book a Demo" secondary CTA.
- **Part 8 — Compare page rebuild** (`/app/frontend/src/pages/Compare.jsx`): 6 tabs (All / Trades / Hospitality / Transport / Healthcare / Retail) with industry-specific competitor comparisons. Each tab shows 3 comparison blocks with feature ✓/✗/◐ tables.
- **Part 10 — Page redirects**: `/safetradie` → `/`, `/features` → `/industries`, plus `/addon/safeinduct|safecheck|academy` redirects.
- **Today's Activity ticker** (`/app/frontend/src/components/ActivityTicker.jsx`): live counters strip above dashboard content polls `/api/public/safebase-activity/today` every 60s.
- **Hospitality colour refresh**: bulk-replaced `#E87722` (orange) → `#0F4C5C` (deep teal) and `#FDF8F2` (cream) → `#F1ECE0` (softer cream) across all source files per user feedback "less busy, no orange, darker colours".
- **New dashboard pages**: `/dashboard/ai-docs`, `/dashboard/academy-app`, `/dashboard/addons`. Three new sidebar nav items.
- **Backend tests**: `test_iter33_multi_industry_batch.py` (11 tests) + `test_iter33_extras.py` (12 tests by testing agent) — **23/23 iter33 + 43/43 regression = 66/66 pass**. Testing agent: `retest_needed: False`.
- **Trades dashboard preserved unchanged**.

### Iteration 32 — Strict permission gate + Multi-industry switcher + SafeCheck/SafeInduct industry adaptations (Feb 2026) (`/app/backend/data_isolation.py`): `account_id_for(user)`, `visibility_filter(user, collection)` (worker-tier sees-own only for incidents/licences/temp logs), `assert_account(record, user)` 403-on-mismatch, `stamp_account(doc, user)` auto-tags account_id+industry+created_by+created_at, `log_audit()` append-only audit trail. New `GET /api/audit-log` (owner-only). Wired into `/workers` and `/incidents` (most sensitive) with backwards-compat for legacy user_id-only records. User model now carries `account_id`.
- **Part 2 — AI document generator** (`/app/backend/ai_docs_module.py`): industry × doc_type registry + Claude Sonnet 4.5 prompts. Initial doc types: HACCP Plan (hospitality), CoR Management Plan (transport), Manual Handling RA Clinical (healthcare), Working Alone RA (retail). `GET /api/ai-docs/types` industry-filtered, `POST /api/ai-docs/{industry}/{doc_type}/generate` with cross-industry 403. Each doc gets unique reference (HACCP-2026-0001), saved to `compliance_docs`, audit-logged.
- **Part 4 — Add-on marketplace** (`/app/backend/addons_module.py`): 23 add-ons across 5 industries — SafeInduct/SafeCheck/Academy variants per industry, plus industry-uniques (Temperature Sensors, EWD Integration, NHVAS Pack, CoR Audit Pack, ACQSC Pack, NDIS Pack, AHPRA Monitoring, Franchise Network) + universal (WHS Consulting, White-Label Partner). `GET /api/addons/available` filters by industry, `POST /api/addons/{slug}/activate|deactivate` owner-only with industry validation.
- **Part 5 — Academy industry catalogue** (`/app/backend/academy_module.py`): `CATALOGUE` with microlearning + full courses for all 5 industries (17 trades micro + 5 trades courses, 16 hospitality micro + 4 courses, 14 transport micro + 4 courses, 14 healthcare micro + 5 courses, 13 retail micro + 3 courses). `GET /api/academy/catalogue?industry=` returns industry-filtered list. `POST /api/academy/{slug}/complete` writes to `academy_completions` linked to worker.
- **Part 6 — Marketing nav restructure**: dropped Features link, added Resources dropdown (5 industry resource sections + Templates + Ask SafeBase AI), added Compare top-nav link, added "Book a Demo" secondary CTA. Industries dropdown unchanged. Frontend `/app/frontend/src/components/marketing/Layout.jsx`.
- **Part 8 — Compare page rebuild** (`/app/frontend/src/pages/Compare.jsx`): 6 tabs (All / Trades / Hospitality / Transport / Healthcare / Retail) with industry-specific competitor comparisons (FoodDocs / SafetyCulture / HazardCo / Ideagen / WHS Monitor / paper-spreadsheets). Each tab shows 3 comparison blocks with feature ✓/✗/◐ tables.
- **Part 10 — Page redirects**: `/safetradie` → `/`, `/features` → `/industries`, `/products/safeinduct` → `/products/tradeinduct` (legacy), `/addon/safeinduct|safecheck|academy` redirects.
- **Today's Activity ticker** (`/app/frontend/src/components/ActivityTicker.jsx`): live counters strip above dashboard content. Polls `/api/public/safebase-activity/today` every 60s. Shows SWMS generated, incidents logged, inductions completed, docs generated, toolbox talks, new businesses this week.
- **Hospitality colour refresh**: bulk-replaced `#E87722` (orange) → `#0F4C5C` (deep teal) and `#FDF8F2` (cream) → `#F1ECE0` (softer cream) across all jsx/js/css. Hospitality dashboard now uses cream + burgundy + deep teal palette per user feedback ("less busy, no orange, darker colours").
- **New dashboard pages**: `/dashboard/ai-docs`, `/dashboard/academy-app`, `/dashboard/addons`. Three new sidebar nav items.
- **Backend tests**: `test_iter33_multi_industry_batch.py` (11 tests) + `test_iter33_extras.py` (12 tests by testing agent) — 23/23 iter33 + 43/43 regression = **66/66 pass**. Testing agent: `retest_needed: False`.
- **Trades dashboard preserved unchanged**: 5 SWMS, 12 incidents, 1 inductions, 92 docs counters live in ticker; Trades sidebar identical to before; SWMS generator + library untouched.


- **`/app/backend/permissions.py`** — `make_require_feature(get_current_user, db)` factory wrapping `features_registry.compute_features()`. Returns a `require_feature(code) -> dependency` builder; raises 403 with `{error, code, label, industry, role_variant, message}` on mismatch. `compute_user_session()` returns `{industry, role_variant, plan, enabled_features[], navigation[]}`.
- **New endpoints**: `GET /api/features/me`, `GET /api/auth/me/industries`, `PUT /api/auth/me/industries` (active_industries roster). PATCH `/api/auth/me/industry` now auto-appends to `active_industries`. `/auth/me` and `/auth/login` now embed `enabled_features`, `active_industries`, `primary_industry`.
- **403 hard-blocks applied**: `swms_module.register_swms_routes` accepts `feature_gate=` kwarg; all 13 non-public routes now use the gate. `docs_module.create_doc` 403s when `spec.industries` doesn't match the user's industry. Verified curl: healthcare user POST /api/swms → 403; healthcare user POST /api/docs/haccp_plan → 403; trades user GET/POST /api/swms → 200.
- **SafeInduct industry-aware** — `INDUCTION_DEFAULT_QUESTIONS` × 5 industries (trades=White Card+SWMS, hospitality=RSA+Food Safety Supervisor+allergen, transport=HR licence+Fatigue Mgmt+CoR, healthcare=AHPRA+NDIS+manual handling+infection control, retail=induction+lone-worker+armed-robbery). `GET /api/tradeinduct/default-questions` exposes the bank; `POST /api/tradeinduct/programs` auto-applies the user's industry default. Frontend `Tradeinduct.jsx` previews the default questions inside the create modal.
- **SafeCheck industry-aware** — `SAFECHECK_REQUIRED_CREDENTIALS` × 5 industries with required/recommended flags. `GET /api/tradecheck/required-credentials` and `POST /api/tradecheck/validate-listing` (returns coverage_pct + missing_required). Frontend `TradecheckMy.jsx` adds a credential checklist panel below the listing form (`safecheck-credentials-panel`).
- **Frontend feature flag plumbing**: `/app/frontend/src/hooks/useFeatureFlags.js` fetches `/api/features/me`, exposes `has(code)` + `hasAny([])` + auto-refresh on user change. `DashboardLayout.jsx` filters `NAV` and `SAFETY_NAV` items by `feature` code; trades-only nav (SWMS Library, SWMS Revisions, Toolbox Talks, Plant, Substances) hides for non-trades. Industry-specific primary modules added: Food Safety, Chain of Responsibility, Care Quality, Inductions — only the matching one surfaces per industry.
- **Industry switcher** (`/app/frontend/src/components/IndustrySwitcher.jsx`) mounted in dashboard sidebar header. Shows `🍽️ Hospitality` style chip; opens dropdown with active industries (✓ on current) + "Add another industry" for owners/managers/safety_leads. Switching writes via PATCH and reloads `/dashboard` to re-fetch flags + scoring + nav.
- **Backend tests** — `tests/test_iter32_permission_gate.py` (7 tests) + `tests/test_iter32_extras.py` (11 tests, by testing agent) — 18/18 pass. Full regression (iter28+iter29+iter30+iter32) = 48/48 pass.
- **Trades dashboard preserved** — verified via screenshot + curl that owner@safetradie.demo (trades) still has full SWMS access, full sidebar, untouched Owner dashboard.

### Iteration 31 — Batch C+D: Industry pricing + Resources hub + AI assistant + compliance + previews (Feb 2026)
- **Industry-specific pricing page** (`/pricing`) — `/app/frontend/src/data/pricing.config.js` exports per-industry plan names, prices, ROI copy, value callouts, feature lists. Tabs at top of `/pricing` switch industry; URL param `?industry=hospitality` deep-link supported. **Backend** — `routes/billing.py` `BILLING_TIERS` extended from 8 to **32 tier slugs** (8 trades+retail shared + 8 hospitality + 8 transport + 8 healthcare). Hospitality $299/579/899/1499. Transport $349/649/999/1699. Healthcare $399/749/1199/1999. Trades+Retail $249/499/799/1299. All annual-equivalent labels show the per-month break-down.
- **Resources hub** (`/resources`) — public 5-tab hub. Per-industry: 8 article stubs (40 total), 5 free template names, 5 regulator phone contacts, "Ask SafeBase" AI compliance assistant. New `/app/backend/routes/resources.py` `register_resources_routes()` factory mounts `/api/resources/articles`, `/articles/{slug}`, `/templates`, `/regulators/{industry}`, `/ai/ask`. Articles stubbed at registration time and Claude-generated on first read (400-500 words, cached on the doc, view-counted). Each industry has its own system prompt embedding regulator names, legislation references, and Australian spelling.
- **Article reader** (`/resources/:industry/:slug`) — first-read shows "Generating with Claude…" loader; subsequent reads instant. Markdown-style heading parsing, tracks view_count, ends with industry-tailored CTA to `/register?industry=X`.
- **Industry-aware compliance score** (Part 9) — `GET /api/compliance/score` now returns `industry`, `score_label`, and a 5-row `sub_scores` array with industry-specific keys + labels + weights (trades: Documents/Incidents/Training/Licences/Site Safety; hospitality: WHS Documents/Food Safety/Staff Certs/Incidents/Venue Safety; transport: WHS/Fatigue/Driver Credentials/Fleet/CoR; healthcare: WHS/Staff Credentials/Care Quality/Incidents/Worker Screening; retail: WHS/Inductions/Credentials/Incidents/Lone Worker).
- **Document Library industry tab switcher** (Part 7) — `DocumentLibraryHub.jsx` adds 5 industry tabs above the category tiles. Clicking a non-user industry sets `?industry=X` URL param + the page becomes "Browse mode" (yellow banner). Backend `/api/docs/types` accepts optional `?industry=X` query that overrides the user's profile industry for read-only previews. Quick-generate select disables in browse mode. Hospitality preview shows 34 doc types incl. HACCP plan etc.
- **🎯 Engagement: Industry dashboard preview on the homepage** — new `/app/frontend/src/components/marketing/IndustryDashboardPreview.jsx` is a tabbed mini-mockup section right before "How it works" on `HomeMultiIndustry.jsx`. Sticky tabs on the left, full-bleed dashboard mockup on the right, both swap colour palette + score sub-bars + AI alerts copy as the user clicks tabs. CTA "Try this dashboard live" → `/register?industry=X`. Uses real industry colour palettes.
- **Backend regression** — `/app/backend/tests/test_iter30_resources_pricing_compliance.py` (13 tests) covers all the above. Total 71/71 pass across iter9/19/27/28/29/30 + iter9 stale assertion fixed.
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
