# SafeBase — PRD (formerly SafeTradie · rebranded iter25)

## Original problem
WHS compliance SaaS — originally for Australian trade businesses (SafeTradie), now positioned as a **multi-industry** platform (SafeBase) covering Trades & Construction, Hospitality, Transport & Logistics, Healthcare & Aged Care, and Retail.

## Users
Business owner (primary) · Safety manager · Supervisor · Worker · WHS consultant · Franchisor

## Definitive Pricing (Iter41 — final, all + GST)

| Industry | Tier 1 | Tier 2 | Tier 3 | Enterprise |
|---|---|---|---|---|
| Trades | A$7,990 (1u) | A$15,990 (5u) | A$24,990 (20u) | A$39,990 (50u) |
| Retail | A$9,990 (5u) | A$19,990 (15u) | A$29,990 (30u) | A$49,990 (50u) |
| Hospitality | A$14,990 (3u) | A$29,990 (8u) | A$44,990 (20u) | A$69,990 (50u) |
| Transport | A$14,990 (3u) | A$27,990 (10u) | A$42,990 (25u) | A$69,990 (50u) |
| Healthcare | A$24,990 (5u) | A$49,990 (15u) | A$79,990 (30u) | A$179,990 (60u) |

Add-ons: SafeInduct A$299/mo · SafeCheck A$349/mo · Academy A$499/A$799/A$1,099 · White-Label Partner A$2,999/mo · Consulting A$2,500–A$4,500/mo.

Franchise per-location: A$229 (1-49) · A$199 (50-199) · A$169 (200+). Network setup from A$25,000.

---

## Implemented

### Iteration 66 — Risk Audit Pack PDF generator (May 30, 2026)

Added a one-click audit-defensible PDF export to the Risk Detail page that captures the full risk chain in a single artefact suitable for WorkSafe inspections.

**Backend**
- `GET /api/risks/{risk_id}/audit-pack` (in `risk_module.py`): builds a multi-page A4 PDF using reportlab Platypus. Sections rendered:
  1. **Provenance chain** — Process → Activity → Tasks → Hazard category → Sourced from Hazard Library (name) → Regulation reference → Date identified → Source
  2. **Hazard description** (+ risk description)
  3. **Risk rating** — Inherent (L × C = score, label) vs Residual side-by-side, plus residual_acceptable + conditions
  4. **Typical controls from regulation/COP** — re-resolved live from `routes.hazard_library.HAZARDS` so the PDF includes the industry-typical controls and consequences that the risk was sourced from
  5. **Implemented controls** — table with hierarchy, name, description, status, effectiveness, owner + due date
  6. **Additional actions / treatments** — table with description, assignee, due, priority, status (only when present)
  7. **Linked records** — Incidents + SWMS documents (only when present, on a new page)
  8. **Review history** — all `risk_reviews` for this risk_id with status/reasons/target completion/approver
  9. **Audit log** — last 25 field-level change entries with timestamp, user, field, old → new
- Returns `application/pdf` with `Content-Disposition: inline; filename="audit-pack-{risk_id}.pdf"` so it streams direct to the browser.
- Uses `_account_filter(current_user)` for tenant isolation; throws 404 if risk doesn't belong to the caller's account.

**Frontend**
- `pages/risk/RiskDetail.jsx`: added "Audit pack PDF" button (testid `download-audit-pack-btn`) to the action row, ahead of Edit/Initiate review/Archive. Uses axios `responseType: "blob"`, creates an object URL, triggers a programmatic download, then revokes the URL. Disabled + "Generating…" label while in flight, sonner toast on success/failure.

**Verified**: PDF generated for RISK-006 (sourced from Hazard Library asbestos disturbance) renders 2 pages, 5119 bytes, valid `%PDF-1.4` header + `%%EOF`. pypdf text extraction shows all sections populated correctly.

### Iteration 65 — Hazard → Risk one-click conversion + Source Badge + Sign-up reset + Mobile prompt (May 30, 2026)

Closed out the P0 task carried over from iter64 and shipped two follow-on enhancements requested by the user.

**1. Hazard → Risk one-click conversion** (carried over from iter64)
- **`HazardLibrary.jsx`** (`/dashboard/hazards` detail modal): added new "Add to Risk Register" primary button. Closes the modal and navigates to `/dashboard/risk-register/new` with `state: { hazard: detail }`.
- **`risk/RiskForm.jsx`**: new `useEffect` (runs when `editing` flips) reads `location.state.hazard` and prefills:
  - `title` ← hazard name
  - `primary_hazard` ← Hazard Library category → Risk Register HAZARD_CATEGORIES (Chemical → "Chemical / Hazardous Substance", Ergonomic/Physical → "Physical / Ergonomic", Operational → "Other", etc.)
  - `hazard_description` ← description + regulation + typical consequences (joined)
  - `source` ← "Hazard Report"
  - `controls[]` ← one Administrative control per `typical_controls` entry (status `planned`, effectiveness `medium`)
  - `hazard_source` ← `{ code, name, category, regulation }` (NEW — feeds the source badge below)
  - Calls `nav(".", { replace: true, state: {} })` to clear `location.state` so refresh doesn't re-prefill
  - Auto-scrolls to section 2 ("Hazard") and fires a success toast

**2. Source badge on Risk Register list rows**
- **`risk_module.py` `POST /risks`**: persists new field `hazard_source` (pass-through from body); PATCH already accepted it via `{**existing, **body}`.
- **`risk/RiskRegisterPage.jsx`**: under the risk title in the list table, render a small warning-coloured pill `⚠ FROM HAZARD LIBRARY · <name>` when `r.hazard_source?.name` is present. `title` attribute shows the regulation reference (e.g. "WHS Reg 425-434; Asbestos COP") on hover for audit defensibility. `data-testid="risk-source-badge-{risk_id}"`.

**3. "Start Free Trial" always lands on Step 1 (industry select)**
- **`pages/Register.jsx`**: removed the `setStep(2)` calls in both the query-param and localStorage hydration branches. Industry hint is still pre-selected (warm-start UX) but the user must explicitly confirm by clicking Continue. Applies to every "Start Free Trial" CTA across the marketing site (top nav x2, mobile drawer, HomeMultiIndustry hero+footer, Compare, Academy/TradeCheck/TradeInduct product pages, IndustryResourcesPage, PlanRightsizer result, SeoLandingPage recommendation card).

**4. Mobile sign-up prompt** (drop-in for the mobile coding agent)
- Wrote `/app/memory/mobile_prompts/01_signup_industry_roles.md` containing the full `ROLES_BY_INDUSTRY` constant (matches web 1:1), a 3-step wizard spec, the `/api/auth/register` contract, variant→screen routing rules, and acceptance criteria. User can copy-paste this into their mobile builder.

E2E verified with Playwright (login as `trades.demo@safebase.com.au` → Hazards → Asbestos → Add to Risk Register → fill inherent/residual → Save → badge visible as "FROM HAZARD LIBRARY · ASBESTOS DISTURBANCE" on the new RISK-006 row; `/register` w/ localStorage hint → Step 1 with Healthcare pre-selected; `/register?industry=transport&tier=2` → Step 1 with Transport pre-selected). All lint passes.

### Iteration 64 — 8-item ship + Phase 3 academy seed started (Feb 28, 2026)


### Iteration 64 — 8-item ship + Phase 3 academy seed started (Feb 28, 2026)

Eight cross-cutting product items shipped + Phase 3 academy content seed kicked off in background.
**Update (iter65)**: Academy seeder reached 7/88 modules then halted on Emergent LLM key budget exceeded ($21.45 / $21.36). Background process terminated; awaiting key top-up to resume.

**Ship items I–VIII** (all verified pass via testing_agent_v3_fork iter_59 — 17/17 backend, 8/8 frontend ship items, zero functional bugs):

I. **Worker role gets full web access** — confirmed no role gate on `/dashboard` routes.
II. **Desktop top-right bar** — `data-testid='desktop-top-bar'` with Settings + Notifications + user chip on lg+ viewports.
III. **Worker role dropdown** — `Workers.jsx` rewrite uses `ROLES_BY_INDUSTRY` (industry-aware) + "Custom…" escape hatch. Normalises `id` → `value` to fix React-key warning surfaced by testing agent.
IV. **`risk_owner_acknowledgement` → PeoplePicker** in RiskForm.
V. **AddressAutocomplete** component (`/app/frontend/src/components/AddressAutocomplete.jsx`) — Google Places JS API loader, AU-biased, graceful fallback to plain Input. Wired into the generic `SafetyModulePage` via new `type: 'address'` field type. `REACT_APP_GOOGLE_PLACES_API_KEY` is set.
VI. **Clickable register rows** — Risk Register reference + title now `<Link>` to `/dashboard/risk-register/{id}`. Same for Incident Register (`/dashboard/incidents/{id}`) and CAPA (when linked to a risk/incident).
VII. **"Incident Resolution" removed** from `WORKFLOW_NAV` in `DashboardLayout.jsx`. Route still resolves (no broken bookmarks).
VIII. **Hazard Library** — new `/api/hazard-library` (industry-locked, 403 on cross-industry; 12 trades hazards seeded plus 10 hospitality, 9 transport, 10 healthcare, 8 retail = 49 system hazards across all 5). New `/dashboard/hazards` register page with category groups, search, detail modal. Sidebar nav entry added between Risk Register and Risk Reviews.

**Phase 3 academy content seed** (background, in progress):
- `/app/backend/seed_academy_content.py` — generates `learning_objectives` (3-5), `sections` (4-6 with inline SVG diagrams), and `quiz_questions` (6-10) per module via Claude Sonnet 4.5.
- Persists to `academy_module_content` collection, idempotent on `(industry, slug)`.
- Currently 5/88 modules complete; will continue churning for ~3h more.
- Started in this iter. Safe to leave; resumable.

**Non-blocking design notes flagged by testing agent**:
- Sidebar has grown to 40+ items — grouping/collapsing would aid scannability (P2 future).
- A few shadcn DialogContent missing `aria-describedby` (a11y warning, non-blocking).

### Iteration 63 — "Mentioned me" inbox + Phase 2 doc library seed (Feb 28, 2026)

**Mentioned me inbox** (complete):
- `GET /api/me/inbox` — aggregates everything assigned to the calling user across CAPA, risks (owner + additional_actions), and incidents (corrective/preventive action assignees). Returns normalised rows: `{kind, id, title, status, priority, due_date, linked_entity_label, assigned_to, open_url}`. Worker_id-aware too (matches when the assignee is a worker tied to the caller).
- `GET /api/me/inbox/summary` — `{total, open, overdue, by_kind}` for sidebar badge / dashboard tile use.
- New page `/dashboard/inbox` (`MyInbox.jsx`): stats row, 6 filter pills (All / Overdue / CAPA / Risks I own / Risk actions / Incident actions), one-line rows with overdue highlighting + kind icon + direct Open link.
- Sidebar nav: "My Inbox" placed as the 2nd entry (right after Overview).
- Verified via `testing_agent_v3_fork` (iter_58): **9/9 backend pass**, frontend end-to-end verified, multi-tenant + multi-user isolation confirmed, zero bugs.

**Phase 2 doc library seed** (✅ COMPLETE in this iter):
- `/app/backend/doc_library_catalogue.py` — master catalogue of **251 system document templates** across 5 industries × 7–10 categories each. Each row: `{name, status_requirement, regulation, industry, category}`.
  - Trades: 60 · Hospitality: 45 · Transport: 48 · Healthcare: 58 · Retail: 40.
- `/app/backend/seed_doc_library.py` — batched (6 rows/call) async Claude (Sonnet 4.5) seeding script. For each batch Claude returns `fields_schema` + `ai_prompt_template`. Fully idempotent on `(industry, slug)`; resumable.
- Seed completed in this iter: **251/251 inserted, 0 fallback rows** (every template got a real Claude-generated prompt + fields_schema). Total elapsed: ~51 minutes.
- New `GET /api/document-library` endpoint exposes the seeded library (industry-locked, returns categories with their templates and `fields_schema`; `ai_prompt_template` is stripped from the list response for safety). Renamed from `/api/documents/library` to avoid route shadowing.

### Iteration 62 — Phase 1 of Academy Research Report spec (Feb 28, 2026)
Implements the 5 net-new pieces from the SafeBase spec phase 1:

- **Industry 403 defence-in-depth** — `GET /api/library/{kind}`, `/api/risks`, `/api/academy/catalogue`, `/api/ai-docs/types` now return **403** if `?industry=` is set to anything other than the caller's account industry. Default (no query param) returns the caller's industry.
- **Account-wide visibility for Risk Register (C7)** — `list_risks`, `get_risk`, `update_risk`, `archive_risk`, `risk_linked_records`, `list_library` all now filter on **account_id** (with legacy `user_id` fallback). Account members see each other's draft/submitted risks. `create_risk` and `create_library_item` stamp `account_id`.
- **Server-side "Me" resolution** — `_normalise_assignee(v, current_user)` now accepts a PeoplePicker payload with `source_type='me'` and overrides spoofed `user_id`/`email`/`role` with the JWT-derived current user. Applied in `routes/capa.py` (CAPA assignees) and `risk_module.py create_risk` (risk_owner + additional_actions[].assigned_to). Verified: a payload with `user_id:'FAKE-attempt'`, `email:'hacker@evil.com'`, `role:'super_admin'` is rejected and overwritten with the real JWT user.
- **Custom AI document templates (B5)** — owner/safety_manager/admin/super_admin only:
  - `POST /api/documents/custom/propose` — user supplies plain-language description; Claude returns `{suggested_name, suggested_category, suggested_regulation, fields_schema, ai_prompt_template}`.
  - `POST /api/documents/custom` — persists the confirmed template into `document_templates` collection with `is_custom=True`, `industry` locked to caller's, `account_id` set.
  - `GET /api/documents/custom/list` (renamed from `/documents/custom` to avoid shadowing by `/documents/{document_id}`).
  - `DELETE /api/documents/custom/{template_id}` — hard-deletes a custom template.
- **Inline "Create activity" / "Create task" in RiskForm (C5)** — when the desired activity/task isn't in the list, the user types it and clicks `+ Create` (data-testids: `activity-create-btn`, `task-create-btn`). The new row is created via `POST /api/library/activity|task` and immediately selected.
- Verified via `testing_agent_v3_fork` (iter_56 + retest iter_57): **22/22 backend pytest pass**, frontend create-activity/create-task UI verified, multi-tenant isolation confirmed, zero bugs.

### Iteration 61 — Idempotency + PeoplePicker rollout + control guidance (Feb 27, 2026)
- **Offline-replay idempotency** (`/app/backend/idempotency.py`) — POSTs accept a `client_event_id` (UUID v4); same key + same endpoint within an account returns the original record instead of creating a duplicate. Wired into `POST /api/incidents` (key stripped before persisting; field added to `IncidentIn` Pydantic model) and `POST /api/retail/lone-worker/checkin`. New `idempotency_keys` collection + unique compound index `(account_id, client_event_id, endpoint)` created on startup.
- **PeoplePicker rollout** to remaining major forms:
  - `IncidentDetail.jsx` — corrective + preventive action assignees now use `<PeoplePicker>` (legacy worker-name Select removed).
  - `SafetyModulePage.jsx` (generic safety module renderer) — new `type: 'person'` field type mounts PeoplePicker; table cells auto-render person objects via `personLabel()`.
  - `Inspections.jsx` and `ToolboxTalks.jsx` — `conducted_by` field migrated from `type: 'text'` to `type: 'person'`.
- **Implementation guidance** field on library controls (per PDF spec). Backend (`risk_module.py` library control insert) + LibraryPage create dialog + inline RiskForm control editor (amber-tinted Textarea per control). Auto-carries through when adding from library to a risk.
- Verified via `testing_agent_v3_fork` (iteration_55): 10/10 backend pytest pass, frontend verified, multi-tenant idempotency isolation confirmed, zero bugs.

### Iteration 60 — People-Picker + CAPA Register (Feb 27, 2026)
- **New `GET /api/users/picker`** (`/app/backend/routes/people_picker.py`) — unified person/people resolver. Returns `[{user_id, worker_id, display_name, email, role, source_type}, ...]` with "Me" pinned first when `include_me=true`. Searches both `users` (account members) and `workers` (WHS roster) within the caller's account, deduped by email. Ranking: exact name > email match > role match > recency.
- **New CAPA Register** (`/app/backend/routes/capa.py`) — Corrective & Preventive Actions cross-cutting collection. Endpoints: `GET/POST /api/capa`, `GET/PATCH /api/capa/{id}`, `POST /api/capa/{id}/close`, `DELETE /api/capa/{id}` (soft-archive), `GET /api/capa/summary`. `assigned_to` accepts either the PeoplePicker object OR a legacy plain string (normalised with `source_type: 'legacy'`).
- **Risk Review → CAPA auto-spawn** — `POST /api/risk-reviews/{id}/accept-remediation` now also accepts `capa_items[]` and creates one CAPA per item with `source: risk_review_remediation` and `linked_entity_type: review`. Gated to this explicit endpoint only (no auto-creation on failing-control detection).
- **New `<PeoplePicker>` React component** (`/app/frontend/src/components/PeoplePicker.jsx`) — debounced search popover with shadcn Popover + Input, keyboard-nav, single + multi variants, returns full object, legacy-string backward-compat with amber badge + Replace button. `personLabel()` helper for read-only displays.
- **Risk Register migration** — `risk_owner` and `additional_actions[].assigned_to` (RiskForm) + `assigned_to` and `new_actions[].assigned_to` (ReviewForm) now use `<PeoplePicker>`. Risk Detail + Risk Register CSV export use `personLabel()` for backward-compat rendering.
- **New `/dashboard/capa` page** (`/app/frontend/src/pages/capa/CapaRegister.jsx`) — full CRUD UI: stats row (open/in-progress/overdue/closed), filters (status, action_type), table with overdue highlighting, Create modal (with PeoplePicker), Close modal (with closure notes).
- **Sidebar nav** — new "CAPA Register" link (ListChecks icon) under Risk Reviews.
- Verified via `testing_agent_v3_fork` (iteration_54): 19/19 backend pytest pass, frontend smoke verified end-to-end across 2 tenants, zero bugs.

### Iteration 59 — SafeBase Academy Stage 1 MVP (Feb 27, 2026)
- **Rewrote `/app/backend/academy_module.py`** from the Academy Research Report (PDF). 88 modules now seeded across 5 industries with full schema: `slug`, `title`, `type` (microlearning/standard/full_course derived from duration), `duration_minutes`, `regulatory_anchor` (e.g., "WHS Reg 299", "HVNL Pt 1A"), `rto_boundary` + `rto_disclaimer`, `mvp_stage1` flag, `authoring_standard` ("SCORM 1.2 + xAPI"), `scorm_package_url` (null placeholder for future).
- **Module counts**: trades 18 · hospitality 16 · transport 16 · healthcare 22 · retail 16 = 88.
- **Stage 1 MVP modules** (17 total, marked "Yes" in PDF Stage-1 column) each ship with a **real 5-question regulatory quiz** (vs generic 3-Q fallback for non-MVP modules). Pass threshold 80% → certificate PDF.
- **RTO boundary disclaimer** seeded for 4 modules whose formal credential must be issued by an RTO (White Card, FSS, RSA Refresher, RSA Retail Awareness). Global Academy disclaimer surfaced on every catalogue response.
- **New endpoint**: `GET /api/academy/modules/{slug}` returns full module detail incl. anchor + disclaimer.
- **Updated**: `/api/academy/catalogue` now returns `modules` (flat list), `microlearning`, `standard`, `full_courses`, `stage1_mvp`, `total_modules`, `rto_boundary_notice`. Backwards-compatible derived `CATALOGUE` shim preserved.
- **Certificate PDF** now includes regulatory anchor footnote and "Academy is not an RTO" disclaimer.
- **Frontend `/app/frontend/src/pages/Academy.jsx` rewrite**: ModuleCard + QuizModal components; filter tabs (All / MVP / Microlearning / Standard / Full Course); amber RTO info-box (page-level + per-module); yellow MVP star badge; regulatory-anchor pill on every card; quiz modal carries anchor + RTO disclaimer.
- Legacy `/api/academy/courses` and `/api/academy/enrolments` routes in `server.py` left untouched (different LMS-progress flow).
- Verified via `testing_agent_v3_fork` (iteration_53): 40/40 backend tests pass, frontend renders all five industries with correct counts, RTO disclaimers, MVP badges, and filter tabs working.

### Iteration 57 — P1 backlog ship · Inline actions live (Feb 25, 2026)
- **Integrations API/Webhooks docs page** — `/integrations` rebuilt as a developer-facing reference: native OAuth cards (Xero, Deputy, Teletrac, AHPRA, Shopify), bearer-token quick-start curl, all REST endpoint groups, 9 webhook event types, sample webhook payload. Fixed icon-import crash (`Webhooks` → `WebhooksLogo` from `@phosphor-icons/react`).
- **Native OAuth scaffolding** (`/app/backend/routes/native_oauth.py`) — `/api/oauth/status` (lists 5 providers + configured flag), `/api/oauth/{vendor}/start` (returns auth URL or `not_configured` when env keys missing), `/api/oauth/{vendor}/callback` (state-TTL guarded). Ready for real vendor secrets in env.
- **Push notifications** (`/app/backend/routes/push_notifications.py`) — `POST /api/device-tokens/register`, `DELETE /api/device-tokens/{token_id}` with auto-deactivate on provider rejection. Added `/api/device-tokens/` + `/api/push/` to `_TRIAL_ALLOWLIST_PREFIXES` so re-engagement push works even for expired-trial users.
- **Industry Alert Tile inline actions** (`/app/backend/routes/inline_actions.py`) — 4 new endpoints power the actionable dashboard buttons:
  - `POST /api/transport/drivers/{driver_id}/pause` — writes `driver_pauses` row + flags `users.paused=true`.
  - `POST /api/healthcare/ahpra-register/{clinician_id}/remind` — emails clinician + logs `reminders` row (Resend best-effort, queued fallback).
  - `POST /api/licences/{licence_id}/remind` — emails worker + logs `reminders` row.
  - `POST /api/retail/lone-worker/{shift_id}/acknowledge` — stamps `last_acknowledged_at` on the shift.
- **Hospitality temp-log schema alignment** — frontend `IndustryAlertTile.jsx` now posts `{equipment, temp_c}` matching the backend contract.
- **Test coverage** — `/app/backend/tests/test_iter57_p1_backlog.py` 28/28 passing across all 5 inline actions, OAuth status/start, push register/deregister, dashboard widgets, and trial-gate allowlist.


### Iteration 56 — Trades + Retail dashboard widgets · Chat plain-prose (Feb 2026)
- **Trades widget** ("Credentials expiring", `GET /api/dashboard/widget/credential-expiry`) — reads `licences` joined to `workers`, returns expiring-in-60-days + already-expired counts and rows with worker name, licence type, licence number, days_left. Yellow accent matches the trades theme. Mounted on `OwnerDashboard` (trades default) below the stat cards.
- **Retail widget** ("Lone-worker check-ins", `GET /api/dashboard/widget/lone-worker`) — reads a new `lone_worker_shifts` collection, returns currently-open shifts + missed-check-in rows (where time since last check-in exceeds interval + 10 min grace). Purple accent matches the retail theme. Mounted on `RetailOwnerDashboard` below the top status strip.
- **Chat reads as natural conversation** — strengthened the concierge system prompt ("Write like a real human in a casual chat. Use plain prose only — no bullet points, no markdown, no headings, no asterisks…") AND added a deterministic server-side `_strip_markdown(text)` helper applied to every Claude reply before persistence. The helper removes `**bold**`, `__underline-bold__`, `*italic*`, `# headings`, and list markers (`- `, `* `, `• `, `1. ` at start of line). Idempotent and safe — preserves compound-word hyphens like "co-design" and "real-time".
- **Demo seed extended** (`backend/seed_widget_demo.py`) — now also provisions `trades.demo@safebase.com.au` + `retail.demo@safebase.com.au` (password `Demo@1234`, onboarding pre-completed) with 4 workers + 6 licences (1 expired, 4 expiring within 60 days) and 4 lone-worker shifts (2 missed check-ins).
- **Verified** via curl + 3 dashboard screenshots — trades shows the yellow "Credentials expiring" tile with Jack Mitchell's expired White Card visible; retail shows the purple "Lone-worker shifts" tile with Jose Romero and Riley Hughes flagged. Chat reply checks confirmed `Contains **`, `Contains markdown bullet`, `Contains markdown heading` all return `False`.

### Iteration 55 — Per-industry dashboard widgets (hospitality / transport / healthcare) · Notification template variants · Concierge lead-capture (Feb 2026)
- **Per-industry dashboard widgets** (`components/IndustryAlertTile.jsx`) — one shared tile component that conditionally renders the right body per industry. Mounted at the top of each industry-specific owner dashboard:
  - **Hospitality** ("Temperature alerts"): units tracked, overdue today, out-of-range readings — drills into `/dashboard/food-safety`. Endpoint: `GET /api/dashboard/widget/temp-alert` reads `temp_units`.
  - **Transport** ("Driver fatigue (24h)"): drivers approaching cap (≥85%), drivers exceeding cap (Standard 12h, BFM 14h, AFM 15h) — drills into `/dashboard/fleet`. Endpoint: `GET /api/dashboard/widget/fatigue-alert` aggregates `driver_work_diary` for the trailing 24h.
  - **Healthcare** ("AHPRA renewals"): clinicians with registrations expiring in <60 days + already-expired count — drills into `/dashboard/team`. Endpoint: `GET /api/dashboard/widget/ahpra-expiry` reads `clinicians.ahpra_registration.expires_on`.
  - Each tile has empty-state, loading-state, and an OK-state ("All units logged on time" / "No drivers approaching cap" / "Every AHPRA registration is current").
- **Per-industry notification template variants** (`backend/routes/notification_templates.py`) — `TEMPLATES` registry mapping `(template_key, industry)` to `{title, body, cta_label, cta_path, email_subject, email_html_intro}`. Three keys seeded (`credential_expiring_soon`, `primary_document_overdue`, `incident_assigned`), each with five industry variants. Public preview endpoint: `GET /api/notification-templates/preview?key=...&industry=...` returns rendered copy with realistic placeholder data. `render(key, industry, **ctx)` helper available for downstream notification pipelines.
- **Concierge lead-capture handoff** (`backend/routes/concierge.py` + `frontend/components/ChatWidget.jsx`) — backend now returns `offer_lead_capture: true` on `/concierge/chat` replies when the user's last message contains high-intent keywords (pricing, demo, integration, "talk to someone", etc.). The chat widget surfaces an inline yellow banner ("Want a human to follow up?") with "Yes, contact me" + "Not now". On accept, the user fills name/email + optional phone/industry/company/note. Submit POSTs `/api/concierge/lead` which stores in `concierge_leads`, sends a Resend email to `CONCIERGE_LEAD_INBOX` with the full chat transcript excerpt, and shows a green confirmation. Submission state persisted via `localStorage.sb_chat_lead_submitted_v1` so we don't pester returning visitors.
- **Demo data + seeded owners** (`backend/seed_widget_demo.py`) — provisions 3 industry demo owners (hospitality.demo / transport.demo / healthcare.demo @ safebase.com.au, password `Demo@1234`, onboarding pre-completed) plus 5 temp units / 4 driver-diary rows / 5 clinicians so the tiles render meaningful content for E2E and visual tests.
- **Verified** end-to-end via curl + 9 playwright screenshots — all 3 dashboards render the new tile with seeded data (overdue temps, fatigued drivers, expired AHPRA), and the concierge lead flow walks from intent-detected banner → form → submission → confirmation.

### Iteration 54 — Responsive Marketing Navigation (phone / tablet / desktop) (Feb 2026)
- **Mobile-first nav overhaul** (`components/marketing/Layout.jsx`) — the previous nav was desktop-only (`hidden md:flex` with no fallback), so phones and small tablets saw no navigation links and the auth buttons consumed the full bar.
- **Hamburger + side drawer** (Sheet component) opens from the right on `<768px`. Drawer contains the full nav tree as collapsible `<details>` accordions: Industries (6 entries), Pricing, Resources (9 entries), Tools (6 entries), Compare, Book a Demo, plus a pinned bottom CTA section with **Start Free Trial** + **Log in** (or **Dashboard** + **Log out** for signed-in users). Each link auto-closes the drawer on tap.
- **Responsive auth cluster** (`PublicAuthButtons`):
  - `"Book a Demo"` button: `hidden lg:inline-flex` — only ≥1024px (previously always showed on tablet, taking real estate).
  - `"Log in"` button: `hidden md:inline-flex` — only ≥768px (collapsed into the drawer on mobile).
  - `"Start Free Trial"` CTA always visible, but text condenses to `"TRY FREE"` below 640px and padding tightens (`px-3 sm:px-4`).
- **Tighter desktop spacing** — header padding scales `px-4 sm:px-6 lg:px-12`. Nav link gap scales `gap-4 lg:gap-6`. `"Compare"` top-level link moved to `hidden lg:inline` so the menu doesn't wrap on iPad-portrait (768–1024px).
- **Verified** via DOM inspection at 1920px: hamburger `display: none`, desktop nav `display: flex`, login/demo/start all visible. Below 768px (real-device only — the screenshot tool forces 1920px) the inverse applies via standard Tailwind media queries.

### Iteration 53 — Phase 2 Internal Admin · Article pre-warming · PlanRightsizer dynamic ROI (Feb 2026)
- **Internal Admin Phase 2 / Subscriptions page** (`/internal-admin/subscriptions`) — full subscription billing list across every owner account. Filterable by status (active/trial/past_due/canceled), billing cycle (monthly/annual), industry; free-text search across business + email. Summary tiles for active paid, active trials, MRR sum. Mocked-Stripe data flag visible. Backend: `GET /api/internal-admin/subscriptions` (joins `users` + `_mock_billing_for_user`).
- **Internal Admin Phase 2 / Feature Flags page** (`/internal-admin/feature-flags`) — 8 registered platform flags (ai_swms_v2, regulator_pipeline, concierge_lead_capture, iot_temperature_v1, ewd_v1, academy_v2, ahpra_live_poll, stripe_native_oauth) with global on/off toggles. Per-account override count displayed per flag. Toggle action requires ops_lead+ rank, logged to `internal_admin_audit_log`. UI shows EDITOR vs READ-ONLY pill based on caller's role.
  - Backend: `GET /internal-admin/feature-flags`, `PATCH /internal-admin/feature-flags/{key}`, `GET /internal-admin/feature-flags/{key}/overrides`, `PATCH /internal-admin/feature-flags/{key}/overrides/{account_id}`.
  - DB collection: `feature_flags` with `scope: global|account` discriminator.
  - "Phase 2" placeholder badges removed from the sidebar.
- **Article pre-warming script** (`/app/backend/seed_articles.py`) — pre-generates all 40 article bodies via Claude so the first reader gets instant-load pages instead of waiting for streaming. Safe to re-run (skips warmed slugs unless `--force`). Supports `--industry`/`--max` flags for partial runs. 38/40 articles successfully warmed; 2 remaining will lazy-generate on first view or can be retried (`python -m seed_articles`).
- **PlanRightsizer "Why this plan" now dynamic** (`pages/PlanRightsizer.jsx`) — replaced the static `RISK_ANCHOR` map (which always referenced the cheapest tier's price) with a `whyThisPlan(industry, annualNumeric)` function that:
  1. Substitutes the actually-recommended annual price into the headline (e.g. for the Enterprise tier: "A$39,990/year + GST", previously stuck on "A$7,990/year").
  2. Recomputes the percentage against an industry-specific risk benchmark (trades → A$116,979 average WorkSafe prosecution → 34% for Enterprise, 6.8% for Solo Tradie).
  3. Renders an updated supporting line interpolated with both numbers.
- **Also removed** the residual "30-DAY MONEY-BACK" line from PlanRightsizer trial footer (caught during the rewrite — per earlier guarantee-cleanup).
- **Verified** via curl + 5 playwright screenshots: subscriptions table renders 110 rows in trial state, flag toggle persists + emits success toast + audit log row, PlanRightsizer correctly displays 34% / A$39,990 for Enterprise and 6.8% / A$7,990 for Solo Tradie, pre-warmed hospitality/HACCP article body renders instantly.

### Iteration 52 — Templates per-industry · Articles populated · Sitewide UX polish (Feb 2026)
- **Templates page rebuilt** (`/templates`) — split from a flat trades-only list into a **5-industry tab layout** with 8 templates per industry (40 total). Industries: Trades, Hospitality, Transport, Healthcare, Retail. Each industry tab has its own category sub-filter and free-text search.
- **Word document downloads** (`/app/frontend/src/lib/downloadAsWord.js`) — every template downloads as a Microsoft-Word-compatible `.doc` file (dependency-free HTML+Office namespace wrapper). Opens in Word, LibreOffice, Pages, Google Docs.
- **Industry-specific content** — every template body authored to real Australian compliance: hospitality includes HACCP plan, temperature log, allergen matrix, RSA register, FSS checklist; transport includes CoR Mgmt Plan, pre-trip checklist, work-diary fatigue log, load restraint record, drug/alcohol policy; healthcare includes AHPRA register, NDIS Worker Screening register, manual handling RA, IPC policy, Strengthened Standards self-assessment; retail includes quick induction, lone-worker check-in log, cleaning + spill record, customer aggression procedure.
- **Articles populated** — `ARTICLE_STUBS` (backend `routes/resources.py`) extended from 3-tuple to 5-tuple including `excerpt` (1-2 sentence preview) and `read_mins`. `GET /api/resources/articles` now returns excerpt + read_mins. Resources.jsx article list rebuilt to show title, multi-line excerpt, tags, read time, and industry-coloured "Read article →" CTA.
- **ScrollToTop on route change** (`components/ScrollToTop.jsx`) — every navigation resets `window.scrollY` to 0 unless a `#hash` target exists.
- **Auto-hide on scroll** (`hooks/useScrollHide.js`) — both the "Talk to me" chat trigger and the "Accessibility" trigger fade and translate-down when the user scrolls down >12px (with >60px threshold to avoid jitter), reappear on scroll-up. 200ms easing.
- **Removed homepage industry signal "This week" eyebrow** — pulse text now reads inline without the eyebrow label.
- **Removed "Powered by Claude" mentions** — Resources page no longer reads "Powered by Claude" under the AI assistant heading; loading state replaced "Asking Claude" with "Thinking".
- **Emojis stripped from industry headings** — `IndustryProductPage.jsx` no longer renders `cfg.icon` (🔨 🍽️ 🚛 🏥 🛍️) before the `<h1>`. All 5 industry hero headings now read clean text.
- **Hospitality contrast fix** — `INDUSTRY_PAGE_CONFIG.hospitality.accent` changed from `#7C1D3F` (dark maroon, ~3.5:1 vs `bg-ink`) to `#F59E0B` (amber, ~9.5:1) so the hero eyebrow, accent stats and section divider are readable. Sitewide contrast audit confirmed no `text-white` on `bg-warning`/yellow combinations exist.
- **Verified** via 5 playwright screenshots: hospitality industry page, templates trades + hospitality tabs, resources articles list, and homepage hero — all rendering correctly.
- **Phase 2 partial** — sidebar nav re-labelling per industry (Workers→Drivers/Clinicians/Team Members; SWMS Library→Food Safety/Fleet & CoR/Care Quality/Inductions) is **already implemented** (`NAV_LABELS_BY_INDUSTRY` + `APPS_NAV_BY_INDUSTRY` in `DashboardLayout.jsx`). The remaining Phase 2 items (Internal Admin Subscriptions page, Feature Flags page, per-industry dashboard widgets, per-industry notification templates) are tracked in backlog.

### Iteration 51 — High Contrast WCAG-AAA Fix + Chat Widget Trigger Redesign (Feb 2026)
- **High Contrast rewrite** (`index.css`) — the previous HC implementation flatly forced `color: #000` on every element, which made white-on-dark hero/chatbox/industry copy unreadable. New implementation honours visual hierarchy:
  - Light surfaces → black text on white (default rule).
  - Dark surfaces (`.bg-ink`, `.bg-slate-800/900/950`, `.bg-black`, `.bg-authority`, `.bg-navy`, `[class*="bg-blue-700/800/900/950"]`, and the heuristic `[class~="text-white"]` to catch arbitrary gradients like `from-[#0A1F44]`) → white text retained, background-color forced to black where defined (gradients are preserved when they're already dark enough, e.g. the homepage hero).
  - Low-contrast pastel cards (`bg-amber-50/100/200`, `bg-emerald-50/100`, `bg-red-50/100`, etc.) → converted to high-vis yellow `#FFEB3B` with black text + 2px black border.
  - Bug fix: removed the over-broad `[class*="bg-red-5"]` selector that previously caught `bg-red-50/40` and flattened the "No documentation / Expired credentials / No investigation record" cards to solid black.
  - Links remain distinct (`#0033CC` on light, `#FFEB3B` on dark) with mandatory underline.
  - Chat panel inputs forced to white-on-black with 2px black border.
- **Chat Widget toggle redesign** (`ChatWidget.jsx`) — replaced the previous circular floating button with a sharp-edged rectangle: yellow SafeBase logo tile (Cube icon on `bg-warning`) + "Talk to me" wordmark in `font-display` uppercase white on `bg-ink`. Hover lifts 2px. Subtitle in the chat header changed from "AI · Claude 4.5" to **"Ask me anything"** (LLM branding stripped, matches the user-facing tone of the rest of the marketing copy).
- **Verification** — visual smoke-test screenshots in HC mode confirmed hero (white-on-navy), industry gradient cards (white-on-dark), pain-cards (black-on-yellow), and chat panel (proper layered contrast). Normal mode rendering unchanged.

### Iteration 50 — Accessibility Widget + Concierge Chat (Claude 4.5) + UX Cleanup (Feb 2026)
- **Removed "Made with Emergent" badge** — deleted the entire `<a id="emergent-badge">` block from `public/index.html`. Bottom-right is now reserved for the SafeBase Concierge chat.
- **Accessibility Widget** (`AccessibilityWidget.jsx`, bottom-left blue floating button) — UserWay-style 8-control menu: 4-step font scale, high-contrast mode, OpenDyslexic-friendly font, pause animations, highlight links, bigger custom-SVG cursor, reading guide bar that follows the mouse, reset all. CSS hooks in `index.css` apply via `html[data-a11y-*]` selectors. Per-user preferences persist server-side via `PUT /api/accessibility/preferences` (logged-in) AND `localStorage` (anonymous). Trial-gate allowlist updated so expired-trial users keep their settings.
- **SafeBase Concierge Chat** (`ChatWidget.jsx`, bottom-right) — powered by Claude Sonnet 4.5 via `emergentintegrations` + the Emergent LLM key. Per-session memory (last 10 turns), SafeBase-trained system prompt enforcing "+ GST" on every price, fallback message if LLM is down, anonymous + authenticated support. Routes: `POST /api/concierge/chat`, `GET /api/concierge/history`. Anonymous client persists via X-Anon-Id header.
- **Customer Dashboard sidebar scroll** — added `overflow-y-auto custom-scrollbar` to `<nav>` in `DashboardLayout.jsx`. The existing logout block at the bottom of the aside stays pinned while nav scrolls. Scroll-thumb styled as a subtle white-on-dark thin bar.
- **Internal Admin → Account Detail → Users tab** — every user row now has a "FORCE LOGOUT" button. Endpoint `POST /api/internal-admin/users/{user_id}/force-logout` deletes all `user_sessions` AND bumps `password_changed_at` so outstanding customer JWTs are immediately invalidated (uses the JWT-iat check already in `server.get_current_user`). Audit-logged with `action=force_logout` and the count of sessions killed.
- **"Network pulse · live" indicator REMOVED** from the homepage industry-tab signal block. The green animated dot + the literal text are both gone; the eyebrow now just reads "THIS WEEK".
- **Industry-page testimonials redesigned** — was a low-contrast muted-bg card grid; now a dark `bg-ink` section with industry-accent-coloured eyebrow + heading, white testimonial cards with a 6px industry-accent top border, large accent-coloured `<Quotes>` icon overlapping the top-left, bold ink body copy and an accent-coloured "VERIFIED SAFEBASE CUSTOMER" pill. Major contrast lift.
- **Removed "30-day money-back guarantee"** copy from Pricing (trust footer now 2 columns), Register (replaced bullet with cancel-anytime), and About (removed sentence from intro).
- **Testing** (`iteration_50.json`): Backend 14/14 + Frontend 100% across every flow. Testing agent found and fixed one trial-gate middleware bug in-flight (added `/api/accessibility/` + `/api/concierge/` to `_TRIAL_ALLOWLIST_PREFIXES`). `retest_needed: False`.

### Iteration 49 — Internal Admin Panel MVP (Foundations + Customers + Audit Log) (Feb 2026)
- **Separate auth tree** — `internal_admins` collection, `ADMIN_JWT_SECRET` env var, `sb_admin_token` localStorage key. Customer JWTs are rejected by admin endpoints and vice versa (verified in tests). New `/app/backend/internal_admin/` package wraps auth + RBAC + routes + seed.
- **6 RBAC roles** — `super_admin`, `ops_lead`, `support_agent`, `billing_analyst`, `content_manager`, `viewer` with `ROLE_RANK` ordering. `require_rank()` and `require_role()` dependencies enforce permissions per endpoint. Support agents capped at A$500 credit per spec; ops_lead+ unrestricted.
- **TOTP 2FA real** (`pyotp` + `qrcode`) — `/enroll-2fa/start` returns `{otpauth_uri, qr_data_uri (data:image/png;base64,…), secret}` for QR display; `/enroll-2fa/verify` confirms the code and flips `two_factor_enabled=true`. Subsequent logins return a short-lived `challenge_token` and require `/verify-2fa` to exchange for a session JWT. The seeded super_admin starts WITHOUT 2FA but receives `must_enroll_2fa:true` on login.
- **Brute-force lockout** — 5 failed login attempts lock the account. Lockout check runs **before** password verification so locked accounts return **423** regardless of password correctness (Iter49 fix from testing-agent feedback). Server startup re-seeds + unlocks the super_admin idempotently.
- **Admin shell (frontend)** — `/internal-admin` mounts its own React route tree at the App.js top level (outside customer `AuthProvider`). Slate-950 sidebar with red `#EF4444` accent, env indicator ("PRODUCTION" in red), per-admin name/role pill in the header. Dashboard KPIs (6 cards: accounts/users/MRR-mocked/trials/conversion/health), Activity feed (signups + demo requests + password resets, sorted by ts), Alerts panel (trials-48h, inactive-30d, low-compliance, failed-payments mocked).
- **All Accounts** — paginated DataTable with search + industry/status filters. Industry-coloured dots + status pills + mocked MRR column. Row click navigates via wrapping `<Link>` (Iter49 fix — keyboard/middle-click parity).
- **Account Detail** — 6 tabs: Overview (Account Details dl + Quick Actions panel with Extend Trial form) · Users (cross-account user table) · Billing (MOCKED Stripe data with prominent badge) · Compliance (Phase 2 placeholder) · Activity (login history + password resets) · Internal Notes (markdown body + tags, audit-logged on add).
- **Trials / Demos / Users / Audit Log** pages — paginated lean tables. Demo-request status dropdown writes back via PATCH (audit-logged). Audit log table is read-only with action-type filter.
- **Mocked Stripe billing per spec 4b** — `_mock_billing_for_user()` returns deterministic per-account data based on industry. Every mocked field is paired with `mocked:true` flag and the UI labels it prominently.
- **Audit log immutable** — append-only `internal_admin_audit_log` collection. Every login, 2FA event, trial extension, credit, note, demo-status change writes an entry with admin_id, IP, user-agent, target_type, target_id, details. No DELETE endpoint exists.
- **Phase 2 placeholders** — Subscriptions and Feature Flags sidebar items are visible but non-clickable with a "Phase 2" badge. Wires already exist for next-session unlock.
- **Testing** (`iteration_49.json`): Backend 24/24 (10 in test_internal_admin.py + 14 extended by the testing agent), Frontend 100% across all 12 critical flows including cross-app auth isolation. Two minor observations applied immediately. `retest_needed: False`.

### Iteration 47 — Forgot-Password + Resend Email + Auth-aware Navbar (Feb 2026)
- **Backend `/api/auth/forgot-password` + `/verify-reset-token` + `/reset-password`** — secure token-based reset with SHA-256 hashed tokens, 1-hour TTL, 3-per-hour rate limit (per email, with decoy records for non-existent emails to prevent enumeration-based limit bypass), real-time password rule validation (≥8 chars, upper, lower, number), invalidates ALL active reset tokens for the user on success, deletes all `user_sessions`, **and invalidates outstanding JWTs** by writing `password_changed_at` then comparing it to `jwt.iat` in `get_current_user`. Never reveals user enumeration.
- **Resend transactional email** — `routes/email_util.py` wraps the Resend SDK in `asyncio.to_thread`. Production-quality HTML template (`password_reset_html`) with SafeBase branding. `RESEND_API_KEY` + `SENDER_EMAIL=onboarding@resend.dev` configured. Email failures are non-blocking — the API response is identical regardless.
- **Frontend `/forgot-password` + `/reset-password` pages** — split-panel layout matching Login. Real-time password-rule checklist that enables Submit only when all rules met AND new+confirm match. Show/hide password toggle. Email hint masked (`o****@safetradie.demo`). Expired/used-token state with "Request a new link" CTA. Success state auto-redirects to /login in 5s. Dev mode shows the reset link inline (gated by `EXPOSE_RESET_TOKEN=true`).
- **Login page** — added "Forgot your password?" link below the password field.
- **Authenticated marketing navbar** — `MarketingNav` now consumes `useAuth()`. When logged in: hides LOG IN / BOOK A DEMO / START FREE TRIAL, shows `<Button asChild><Link to="/dashboard">` Dashboard CTA and a 36px circular avatar with the user's initials. Dropdown reveals name, email, role pill in the user's industry accent (#FFCC00 trades · #7C1D3F hospitality · #0DC4B5 transport · #2196A6 healthcare · #A855F7 retail), Dashboard / My profile / Billing (owner only) / Log out (red). Logout clears `st_token`, calls `/auth/logout`, navigates to `/`, shows a "You have been signed out" toast.
- **Testing**: `iteration_47.json` initial pass found 2 issues (JWT not invalidated, Dashboard btn missing href). Both fixed and retested in `iteration_48.json` — **100% backend (7/7) + 100% frontend**, `retest_needed: False`.

### Iteration 46 — Per-Industry Real Product Tour (5 industries × 4 dashboards = 20 captured screenshots) (Feb 2026)
- **Capture pipeline (`/tmp/capture_per_industry.py`)** — Playwright-driven script that logs into `owner@safetradie.demo` once, then iterates the 5 industries (PATCH `/api/auth/me/industry` per industry) capturing the same 4 dashboard URLs (`/dashboard`, `/dashboard/swms`, `/dashboard/licences`, `/dashboard/risk-register`) at 1600×1400 @ 2x DPR. After capture, the demo account is restored to `industry=trades`. Output: 20 PNGs at `/app/frontend/public/product-tour/{industry}-{overview|swms|licences|risk}.png` (167–335 KB each).
- **`<ProductTour />` component** — new `/app/frontend/src/components/marketing/ProductTour.jsx` exposing two modes: `<ProductTour switcher />` (tabbed homepage variant — 5 industry tabs with accent-coloured underline; CTA copy + href update per active tab) and `<ProductTour industry="{slug}" />` (fixed per-industry variant for `IndustryProductPage`). Window-chrome figure styling (traffic-light dots + `safebase.app/dashboard` URL strip + Live indicator dot in industry accent).
- **Homepage** — replaced the 92-line static trades-only Product Tour with a single `<ProductTour switcher />` call. Each industry tab swaps all 4 figures + the CTA copy ("Start free trial in {Industry}" → `/register?industry={slug}`).
- **Each `/industries/{slug}` page** — gained an industry-specific Product Tour section (after testimonials, before final CTA) with eyebrow `/ Product tour · {industry}`, heading "Not a marketing mockup. The actual product, configured for {Industry}.", and 4 figures sourcing that industry's captured PNGs.
- **Testing** (`iteration_46.json`): Frontend 100% — all 5 home-tour-tabs work, all 20 PNGs load (naturalWidth=3200), active-tab accent borderColor matches spec for all 5 industries, CTA text/href update correctly per tab, all 5 industry landing pages render their per-industry tour with correct PNG sources. Backend login regression: owner@safetradie.demo industry correctly restored to 'trades'. `retest_needed: False`.

### Iteration 45 — Homepage Monthly Pricing + Industry Dashboard Previews + Real Product Tour (Feb 2026)
- **Homepage pricing cards (`HomeMultiIndustry.jsx` — "Priced for Your Industry. Justified by the Risk.")** — flipped to show `From A${monthly}/month + GST` as the primary large font-display line, `or A${annual}/year + GST (save 2 months)` as secondary, for all 5 industries (trades 799/7,990 · retail 999/9,990 · hospitality 1,499/14,990 · transport 1,499/14,990 · healthcare 2,499/24,990).
- **Industry dashboard previews** — new `/app/frontend/src/components/industry/IndustryDashboardPreview.jsx` with 5 variants (TradesDash / HospitalityDash / TransportDash / HealthcareDash / RetailDash). Each variant renders a bespoke in-app dashboard mockup with realistic data — Trades SWMS & credential register with HRCW column + AI HRWL-expiry insight, Hospitality temperature & HACCP monitor with 3 sparkline-driven unit cards, Transport CoR control tower with fatigue/rest KPIs + 4 driver rows, Healthcare ACQSC strengthened standards progress bars + AHPRA live-register list + SIRS counter + regulator pipeline callout, Retail Quick Induct QR tile + 4 lone-worker check-ins. Injected into `IndustryProductPage.jsx` between the hero and problems section — visible on all 5 `/industries/*` routes.
- **Real Product Tour section on homepage** — 4 real captured screenshots via Playwright (`/tmp/capture_tour.py` uses owner@safetradie.demo credentials) saved to `/app/frontend/public/product-tour/` (dashboard-overview, swms-library, licences, risk-register PNGs). New section data-testid='home-product-tour' on `HomeMultiIndustry.jsx` with an 8/4/4/8 asymmetric figure grid styled with window-chrome (traffic-light dots + safebase.app URL strip). Primary CTA "Start free 14-day trial" + secondary "See pricing".
- **Testing** (`iteration_45.json`): Frontend 100% — 10/10 spec checks all pass (5 tier cards monthly-primary ✓, 4 product-tour PNGs load naturalWidth=3200 ✓, 5 industry dashboards with required content ✓, 5 dashboards correctly positioned between hero and problems ✓, interactive switcher regression preserved ✓). `retest_needed: False`.

### Iteration 44 — Definitive Pricing Display Overhaul (Feb 2026)
- **Pricing.jsx toggle behaviour** — default cycle flipped from `annual` to `monthly` (per Iter44 spec). Toggle segments swapped to Monthly-first; active segment now adopts `cfg.accent` per industry (Trades #FFCC00 · Hospitality #0F4C5C · Transport #0DC4B5 · Healthcare #2196A6 · Retail #A855F7) with `#0A0A0A` text for contrast. The save-badge block (`pricing-save-badge-{slug}`) was lifted out of the `cycle === annual` branch so it renders in **both monthly and annual states** whenever `annual_saving` is defined. Save-badge copy standardised to "Save A${x} + GST per year".
- **Stray $249/$299/$349/$399 eradication** — all 5 industry landing page hero stats and `pricing_anchor` strings in `industry-pages.config.js` updated to the correct Tier-1 monthly + GST ($799 trades / $1,499 hospitality / $1,499 transport / $2,499 healthcare / $999 retail).
- **industries.config.js copy refresh** — trades pricing block fixed (A$249/A$499/A$799 → A$799/A$1,599/A$2,499 month + GST; ROI headline "Less Than 0.3% Of One Fine" → "6.9% Of One Fine. Every Year."; ROI body A$2,988/year → A$7,990/year + GST with 6.9% multiplier). Footnote strings on hospitality/transport/healthcare/retail updated to correct Tier-1 monthly price + GST.
- **Add-on & Enterprise value lines** — Enterprise.jsx "All add-ons included" sub refreshed to current add-on pricing (SafeInduct A$299 + SafeCheck A$349 + Academy 30-workers A$799 = A$1,447/mo = A$17,364/yr + GST). ROI callout gained "+ GST" suffix on A$39,990/year. Franchises ROI header A$22,900 → A$19,900/mo + GST. TradeCheck/TradeInduct/Academy product-page final CTAs rewritten to reflect current standalone prices (A$349/A$299/A$499 + GST) and "Included free from Tier N on every industry plan" framing. Compare rows updated to A$1,000/A$1,500 + GST entry tiers. Landing consulting FAQ A$600 → A$1,800/month + GST. BlogPost "from A$150/mo" → "from A$799/mo + GST".
- **Testing** (`iteration_44.json`): Backend 5/5 PASS (billing tiers + regulator-pipeline + scheduling + api-keys integration-targets regressions). Frontend 100% — Monthly default verified, save-badges render in both states (4/4 tiers × 2 cycles), 5 unique industry accent colours verified against spec hex, 16× "+ GST" occurrences per view, unauth CTA redirect preserved, all 9 copy-change files code-reviewed clean. `retest_needed: False`.

### Iteration 43 — API Access on Every Plan + Real API-Key CRUD + Industry Integration Targets (Feb 2026)
- **Feature gate change** — `features_registry.py` `api_access` plan_min lowered from `enterprise` to `starter`. Every plan on every industry now has API access.
- **Backend `/app/backend/routes/api_keys.py`** (NEW) — full CRUD:
  - `POST /api/api-keys` (owner-only) — mints a 32-char URL-safe token prefixed `sb_live_`, SHA-256 hashed at rest, masked-form `sb_live_…last4` saved alongside. Plaintext returned exactly once.
  - `GET /api/api-keys` — lists masked keys with active/total counts.
  - `DELETE /api/api-keys/{id}` — soft-revoke (sets `revoked_at`).
  - `GET /api/api-keys/integration-targets[?industry=]` — returns curated targets per industry: trades (Xero, MYOB, simPRO, ServiceM8, Procore, Google/MS SSO), hospitality (Deputy, Tanda, Lightspeed, Kounta, iAuditor), transport (Teletrac Navman, EZY2C, iFleet, TransVirtual, NHVR portal), healthcare (Epi-Connect, Leecare, AHPRA register, NDIS PACE, Humanforce), retail (Deputy, Shopify, Vend/Lightspeed Retail, Square) — plus 4 universal targets (Webhooks, Zapier, Make, REST). Returns rate limits (120/min, 5000/hr, 200 burst) and scope options (read/write/webhook).
- **`server.py get_current_user`** — extended to recognise `sb_live_*` bearer tokens via `routes.api_keys.resolve_api_key()`. JWT path unchanged. Long-lived API tokens authenticate every existing endpoint with the same scoping (account_id, role, industry).
- **Frontend Settings → API panel** rewritten functional for everyone: generate-key form, one-time plaintext callout (`api-new-token-callout`) with copy-and-dismiss, masked key list with revoke, industry-aware integration targets section with rate-limit + docs link, deep-link to webhooks page.
- **`pricing.config.js`** — "API access + Webhooks" added to Tier 1 of every industry (Solo Tradie / Single Store / Single Venue / Owner-Operator / Solo Practice). Removed from Tier 4 lists since universal now.
- **Enterprise page** — "Priority integration + Custom SSO" card clarifies API+Webhooks are STANDARD on every plan; Enterprise adds priority integration support, dedicated engineer, sandbox.
- **Testing** (`iteration_43.json`): backend 16/16 PASS (create/list/revoke lifecycle, sb_live_* bearer auth on /api/workers + /api/auth/me, invalid → 401, last_used_at updates, integration-targets industry routing, regression Iter40-42 endpoints + 40 billing tiers + features registry). Frontend 100% (settings panel UI per spec, all 5 industry tier-1 lists carry the new bullet, enterprise page messaging correct). One minor leak fix applied post-test (token_hash removed from POST response). `retest_needed: False`.

### Iteration 42 — P1 Frontend Copy Polish + Auto-Triage on Incident Form (Feb 2026)
- **Homepage (`HomeMultiIndustry.jsx`)**: subheadline rewritten to exact Part 2 spec wording ("Every industry operates within its own configured ecosystem — documents, credentials, dashboards, and regulatory references built specifically for how your business operates."). Added two new sections: **STAT BAR** (`data-testid='home-stat-bar'`) with 994,178 · A$116,979 · Five industries anchors, and **THE RISK** (`data-testid='home-the-risk'`) with 3 destructive-bordered columns (No documentation · Expired credentials · No investigation record). Industries section gained eyebrow + subheadline per spec.
- **Login (`Login.jsx`)**: rotating taglines panel now renders a `data-testid='login-taglines'` list of 4 items per spec — "WHS compliance for every industry.", "From the kitchen to the clinic. From the depot to the store.", "Your industry. Your compliance. Your platform.", "AI-powered. Australian-built. Every industry." Industry strip retained below.
- **About (`About.jsx`)**: values copy tightened — first value now lists all 5 industries explicitly; grammar fix on the second value ("does not add" replaces "not adds").
- **P1 SMART IDEA IMPLEMENTED: Auto-triage on incident submit** (`incident/SubmitIncident.jsx`) — when a worker logs an incident, `submit()` now calls `/api/regulator-pipeline/triage` with the incident description + user's industry. If any pipeline (SIRS/NDIS/NHVR) fires, a draft case is auto-created via `/api/regulator-pipeline/draft` and a `toast.warning` surfaces the pipeline names for 8 seconds — directing the owner to `/dashboard/regulator-cases`. The 24-hour SIRS clock now starts automatically, with zero owner memory required. Entire block wrapped in try/catch so incident submission never fails if triage errors.
- **Testing** (`iteration_42.json`): Backend 6/6 PASS, Frontend 100%. All 5 homepage copy checks + 4 login taglines + About grammar + pricing regression + auto-triage code review all verified. `retest_needed: False`.

### Iteration 41 — Definitive Final Pricing + P0 Regulator Pipeline Automation (Feb 2026)
- **Pricing uplift** — trades (+33%), hospitality (+30%), retail (+25%) all raised; transport + healthcare unchanged. Every ROI statement rewritten with new multipliers (trades 6.9% of one fine; hospitality less than five months of consulting retainer; retail less than minimum excess on public liability). All add-on prices bumped: SafeInduct A$249→A$299, SafeCheck A$299→A$349, Academy A$399/699/999→A$499/799/1099, Partner A$2,499→A$2,999. Franchise per-location A$199/179/149→A$229/199/169.
- **Files touched** (same ripple as Iter40): `pricing.config.js`, `billing.py` (40 Stripe tiers), `iter39_aux.py` PRICING+RISK_ANCHOR, BillingPanel (20 tier strings), Enterprise (A$3,999/A$39,990 + 34.2% anchor), Dashboard upsell, Ecosystem, ServiceSwms, Settings, Academy/TradeInduct/TradeCheck, IndustryRiskCalculator 5 anchors, CredentialExpiry + InsuranceDiscount calculators, PlanRightsizer, Franchises (A$22,900/mo · A$274,800/yr · A$229/199/169), Partners, SEO HACCP (A$14,990 + new roiAnchor + plans), EnterpriseUpsellModal, Landing homepage. SeoLandingPage also now renders the `plans` prop (Single Venue A$14,990 + Multi-Venue A$44,990 on HACCP etc).
- **P0: Regulator Pipeline Automation** — new `/app/backend/routes/regulator_pipeline.py`:
  - `POST /api/regulator-pipeline/triage` — classifies an incident against 3 matrices (SIRS P1/P2, NDIS Immediate/5-day, NHVR Immediate). Returns matches with deadline_at, statutory basis, channel URL, and a per-pipeline pre-submission checklist.
  - `POST /api/regulator-pipeline/draft` — creates a case document (status='draft') with full match context. Returns 400 if the description doesn't trigger any pipeline.
  - `GET /api/regulator-pipeline/pending` — lists account cases awaiting submission with `earliest_deadline_at`, `hours_remaining`, `overdue` flag.
  - `POST /api/regulator-pipeline/mark-submitted/{case_id}` — transitions case to `submitted` with reference number.
  - `GET /api/regulator-pipeline/matrices` — public reference (19 SIRS P1 triggers, 7 SIRS P2, 14 NDIS Immediate, 5 NDIS 5-day, 9 NHVR Immediate).
- **Frontend** — new `/dashboard/regulator-cases` page (triage form + pending list with 'mark submitted' flow) + `RegulatorPipelineWidget` on Dashboard (silent when no cases, surfaces deadlines when active). Owner-only sidebar link `nav-regulator-cases`.
- **Testing** (`iteration_41.json`): backend 27/27 PASS, frontend ~90% — all pricing correct across /pricing (5 tabs × 4 tiers), /enterprise, /franchises, /partners, calculators, homepage, SEO HACCP. End-to-end regulator flow verified (healthcare death → 2 matches, transport rollover → NHVR Immediate, trades minor cut → 0 matches; draft → pending → mark-submitted lifecycle). `retest_needed: False`.

### Iteration 40 — Definitive Pricing Overhaul + Credential-Gated Scheduling (Feb 2026)
- **Master pricing config rewritten** (`/app/frontend/src/data/pricing.config.js`) with Iter40 numbers across all 5 industries including new ROI statements + value callouts reflecting the new maths (trades 5.1% of one fine · healthcare A$24,990 less than two ACQSC engagements · transport less than one month CoR legal fees · hospitality less than three days of venue closure · retail less than one preventable injury claim).
- **Backend billing.py** — all 40 Stripe tier slugs updated to new amounts. `sole_trader_annual=5990`, `health_enterprise_annual=179990`, every tier between refreshed. `/api/billing/tiers` verified returns new amounts for all 40.
- **Backend iter39_aux.py right-sizer** — PRICING dict + RISK_ANCHOR updated. Trades anchor now says "5.1% of one fine" (was 3.4%).
- **Frontend price ripple** — 20+ files touched: BillingPanel (20 tier price strings), Enterprise (A$2,999/A$17,999), EnterpriseUpsellModal, Dashboard upsell, Ecosystem, ServiceSwms, Settings, Academy, TradeCheck, TradeInduct, IndustryRiskCalculator anchors (5 tabs), CredentialExpiryCalculator + InsuranceDiscountCalculator (safebaseCost per industry), PlanRightsizer risk-anchor, 3 SEO landing pages (plans + roiAnchor), Franchises (A$199/A$179/A$149 per-location, A$25,000 setup, A$19,900/mo ROI card), Partners (A$2,499 fee, A$2,499/mo × 15% × 10 clients = A$3,748.50, A$17,999 Healthcare Enterprise yields A$2,699.85/mo commission).
- **P0: Credential-driven scheduling block** — new `/app/backend/routes/scheduling.py` module (mounted at `/api/scheduling/*`):
  - `GET /api/scheduling/mandatory-credentials[?industry=X]` — public reference of required credentials per industry.
  - `GET /api/scheduling/check-eligibility/{worker_id}` — returns `{can_roster, blockers[], warnings[], industry, worker_name}`. Checks: generic licences (expiry + mandatory kinds — white_card, hr_licence), AHPRA registrations, worker screening, fitness-for-duty (24h window), Quick Induct (90d validity). Cross-account 404, unauth 401.
  - `POST /api/scheduling/roster-gate` — batch check with `blocked_count` + `clear_count`.
  - `POST /api/scheduling/shifts` — creates a shift. Returns **409 `scheduling_blocked`** if any assigned worker is ineligible, preventing rostering. Timezone-aware date parsing. Handles legacy `user_id`-scoped licences via `$or {account_id, user_id}`.
- **Testing** (`iteration_40.json`): backend 35/35 PASS (plan-rightsizer 5 scenarios, billing tiers all 40, scheduling eligibility + batch + shift-create + auth + validation, regression green). Frontend 95% — one stale A$20,000→A$25,000 on Franchises banner fixed post-test. `retest_needed: False` after fix.

### Iteration 39 — P1/P2 Mega-batch: ROI Calculators + Admin Demos + Regulatory Digest + SEO Landing Pages (Feb 2026)
- **Backend `/app/backend/routes/iter39_aux.py`** — 4 endpoints mounted via `register_iter39_routes()`:
  - `GET /api/plan-rightsizer/recommend?industry=&team=&locations=` — server-side tier recommendation mirroring the frontend wizard. Returns plan_name, user_limit, annual_aud_ex_gst, monthly_aud_ex_gst, annual_saving_aud, risk_anchor, cta_register_url. Full PRICING dict for all 5 industries stays in lock-step with `pricing.config.js`.
  - `GET /api/demo-requests` (owner-only, 403 for non-owners) — lists demo_requests from `POST /api/demo/request`, grouped counts {new/contacted/qualified/closed}, filter by status + industry.
  - `PATCH /api/demo-requests/{id}` — owner updates status (one of new/contacted/qualified/closed) + internal note.
  - `GET /api/regulatory-digest?industry=` — curated 11-item list across 5 industries (ACQSC Aged Care Act 2024, AHPRA CPD audits, NDIS 24h clarification, NHVR s26C executive audits, fatigue record-keeping, FSANZ 3.2.2A FSS transition, NSW RSA refresh, retail psychosocial Code of Practice, Fair Work casual conversion, silica exposure threshold, NSW height-fall notifiable).
- **Frontend — 7 new public/dashboard routes wired into `App.js`**:
  - `/credential-expiry-calculator` — per-industry hidden-cost calculator (worker count × creds/worker × lapse-rate) with replacement/downtime/legal exposure breakdown and ROI multiple vs entry-tier plan.
  - `/insurance-discount-calculator` — premium × industry ceiling (7–15%) × WHS maturity multiplier → annual saving vs SafeBase cost; "pays for itself" threshold.
  - `/regulatory-digest` — "What changed this month" public page with Industry Select filter, severity chips, regulator link, CTA to Plan Right-sizer + 14-day trial.
  - `/seo/ndis-compliance`, `/seo/cor-compliance`, `/seo/haccp-compliance` — 3 SEO landing pages rendered by shared `SeoLandingPage.jsx` component. Each page has hero + painPoints + feature list + **inline Plan Right-sizer** (2-question form that POSTs to `/api/plan-rightsizer/recommend` and persists to localStorage `safebase_rightsizer`) + FAQ + regulator chips + ROI anchor.
  - `/dashboard/admin/demos` — owner-only admin view: 4 stat cards per status, filter by status + industry, expandable rows with inline status Select + internal notes.
- **Dashboard integrations**:
  - `RegulatoryDigestWidget` mounts below `ComplianceInboxWidget` on every Dashboard — top-3 items for the user's industry, deep-links to full digest.
  - `DashboardLayout` sidebar gains owner-only "Demo Requests" link (`nav-admin-demos`).
- **Register.jsx + Dashboard.jsx** — read `safebase_rightsizer` localStorage key (written by PlanRightsizer flow + any SEO landing page inline form) and surface a `signup-rightsizer-hint` panel so prospects carry their industry/team/locations context seamlessly from wizard → register → dashboard tuning.
- **MarketingNav + Footer**: TOOLS dropdown gains Credential Expiry + Insurance Discount calculators; RESOURCES dropdown gains Regulatory Digest; footer Tools and Resources columns updated. **Fixed link mismatch**: `/fine-calculator` → `/tools/fine-calculator` across nav + footer.
- **Testing verdict** (`/app/test_reports/iteration_39.json`): backend 17/17 pytest PASS (4 right-sizer scenarios including healthcare Enterprise A$139,990, regulatory digest filter, demo-requests owner-only + PATCH flow, regression). Frontend all 7 new routes render, inline right-sizer on /seo/ndis-compliance computes correctly, calculators update live, digest-widget shows on owner dashboard, admin demos page populated and interactive, marketing nav exposes all new entries. `retest_needed: False`.
- **Email delivery explicitly skipped** per user direction — no Resend integration added.

### Iteration 38 — Plan Right-sizer + Industry Risk Calculator + Book-a-Demo + Ecosystem Consolidation (Feb 2026)
*(See Iteration 38 section further below for full details.)*

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

### Iteration 38 — Plan Right-sizer + Industry Risk Calculator + Book-a-Demo + Ecosystem Consolidation (Feb 2026)
- **Plan Right-sizer wizard** (`/plan-rightsizer`): 3-question flow (industry → team size → locations) that returns a recommended tier card with annual price, annual-equivalent monthly, savings chip, 8-feature list, industry-specific risk anchor (ACQSC for healthcare, NHVR for transport, council closure for hospitality, injury claims for retail, WorkSafe fine for trades), plus a one-click "Start Free Trial" CTA that deep-links to `/register?industry=<slug>&tier=<0-3>`. Logic driven by `recommendTier()` using industry-specific thresholds (trades by team, hospitality/retail by locations, transport/healthcare by both). Verified against `pricing.config.js` for 4 combinations — trades solo → A$3,990, healthcare 40-user multi-site → A$139,990, hospitality 2-5 users/2-5 locations → A$14,990, transport 16-30 users/2-5 locations → A$27,990.
- **Industry Risk Calculator** (`/risk-calculator`): 5-industry tabbed ROI tool with 3 sliders per tab, live-computed monthly/annual exposure, annual SafeBase cost, and ROI multiple. Regulator-grounded anchors: WorkSafe A$116,979 (trades), A$15k-50k injury + A$20k-100k slip (retail), A$10k-50k council + closure revenue (hospitality), A$50k-200k CoR defence + NHVR 24h (transport), A$3k-8k retainer + A$5k-15k audit prep (healthcare). Each tab CTAs to the Plan Right-sizer.
- **Book-a-Demo** (`/book-demo`): industry-configured 30-minute demo request form with 13 fields. Posts to new `POST /api/demo/request` (public, no-auth) — writes to `demo_requests` collection with DMO-prefix ID. Side panel explains the 3-step demo flow + sidebar CTA to Plan Right-sizer as "start-now" alternative. Success screen links to both Plan Right-sizer and home.
- **Ecosystem consolidation**: `/ecosystem` route removed and permanently redirected to `/services/swms` via `<Navigate replace>`. Ecosystem's 6-product grid (SafeBase Core, SafeInduct, SafeCheck, Academy, Franchises, Consulting) is now rendered on the Trade Services page so content is preserved for the trades audience while freeing `/ecosystem` for other purposes.
- **Fine Calculator cleanup**: tiered plan comparison grid (`[data-testid="fine-plan-comparison"]`) removed entirely. Replaced with a single CTA panel pointing to Plan Right-sizer and 14-day free trial.
- **Navigation additions**: Marketing `MarketingNav` gained a TOOLS dropdown (Plan Right-sizer / Industry Risk Calculator / WHS Fine Calculator / Compare). Top-right "Book a Demo" button href updated to `/book-demo`. Footer gained a new "Tools" column alongside Platform/Resources/Company.
- **Homepage CTAs**: Under the 5-industry pricing preview, two new buttons surface — "Find your right-size plan (3 questions)" and "Calculate your risk exposure".
- **Compare page**: legacy copy referencing "sub-$300/mo" and "sub-$400/mo" SafeBase pricing removed, replaced with "under A$600/mo" framing that survives future price changes.
- **Testing verdict**: 13/13 backend pytest + full frontend verification all PASS (`/app/test_reports/iteration_38.json`). `retest_needed: False`. All 40 billing tiers preserved. Trades regression intact.

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
