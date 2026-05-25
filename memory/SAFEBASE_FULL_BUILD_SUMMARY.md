# SafeBase — Complete Build Summary (for Mobile App Planning)

> Generated Feb 2026 · iter56 codebase snapshot
> Use this document as the single source of truth when designing the SafeBase mobile companion app.

---

## 1. Product positioning

**SafeBase** is a multi-tenant Australian compliance SaaS that turns the regulatory paperwork of 5 industries — Trades & Construction, Hospitality, Transport & Logistics, Healthcare & Aged Care, Retail — into a single live platform.

**Pitch in one line:** "Every Industry. Every Obligation. One Platform."

**Anchor differentiators:**
- Industry-aware (every dashboard, document, notification adapts to the user's industry)
- Real Australian regulator coverage (WorkSafe, NHVR, ACQSC, AHPRA, NDIS Commission, state councils, Liquor & Gaming)
- AI-assisted (Claude Sonnet 4.5 for concierge chat, document generation, regulator triage)
- Universal API access (every account gets API keys + webhooks)
- Internal Admin Panel (fully isolated, RBAC, 2FA) for SafeBase staff to manage tenants

**Business model:**
- 14-day free trial, no credit card.
- Monthly + annual plans (annual = 2 months free).
- Per-industry pricing tiers (Solo / Small / Growing / Enterprise).
  - Trades: A$799/mo entry, up to A$3,999/mo Enterprise (annual: A$7,990 → A$39,990 + GST)
  - Hospitality: from A$1,499/mo
  - Transport: from A$1,499/mo
  - Healthcare: from A$2,499/mo
  - Retail: from A$999/mo
- Stripe checkout + add-ons marketplace.
- Industry-tagged ROI anchors used throughout marketing (e.g. "6.9% of one average WorkSafe prosecution" for trades).

---

## 2. Tech stack (production)

### Backend
| Component | Version | Notes |
|-----------|---------|-------|
| Python | 3.11+ | FastAPI app |
| FastAPI | 0.110.1 | Single ASGI app, all routes under `/api/*` |
| Motor (MongoDB async driver) | 3.3.1 | Database |
| bcrypt | 4.1.3 | Password hashing (12 rounds) |
| PyJWT | latest | Customer + Admin JWTs (separate secrets) |
| Stripe | 15.0.1 | Payments + checkout |
| Resend | 2.29.0 | Transactional email (forgot-password, internal admin invites, concierge leads) |
| pyotp | 2.9.0 | Internal admin TOTP 2FA |
| qrcode | 8.2 | TOTP QR generation |
| emergentintegrations | 0.1.0 | Wrapper for Claude / Gemini / OpenAI / Sora via the Emergent universal LLM key |

### Frontend
| Component | Version | Notes |
|-----------|---------|-------|
| React | 19.0.0 | SPA |
| React Router | 7.x | All routes |
| Axios | 1.8.4 | API client (`/lib/api.js`) |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | latest | All shared UI primitives at `/components/ui/*` |
| Recharts | 3.6.0 | Dashboard charts |
| Sonner | 2.0.3 | Toasts |
| Phosphor Icons | latest | Icon library |
| Motion (Framer Motion) | latest | Page transitions |

### Infrastructure
- **Hosting:** Kubernetes cluster (managed by Emergent)
- **DB:** MongoDB (single replica set)
- **Domain (preview):** `https://safe-systems.preview.emergentagent.com`
- **Routing:** All `/api/*` → backend on `:8001`. Everything else → frontend on `:3000`.
- **Process management:** supervisord (backend + frontend hot-reload)

---

## 3. Authentication

**Two completely separate JWT auth contexts:**

### A. Customer auth (JWT_SECRET)
- **Sign-up:** `POST /api/auth/register` → returns `{user_id, token, user}`. Onboarding wizard runs once.
- **Login:** `POST /api/auth/login` → returns `{token, user}`. JWT expires in 7 days.
- **Google OAuth:** `POST /api/auth/google-session` (Emergent-managed Google sign-in).
- **Logout:** `POST /api/auth/logout` (invalidates the session in `user_sessions`).
- **Me:** `GET /api/auth/me` — returns the full user object including industry, role, features available.
- **Forgot password:** `POST /api/auth/forgot-password` → sends Resend email with reset link.
- **Reset password:** `POST /api/auth/reset-password`.
- **Multi-industry support:** `PATCH /api/auth/me/industries` / `/industry` for accounts that operate across multiple industries.

### B. Internal Admin auth (ADMIN_JWT_SECRET — DIFFERENT secret)
- **Login:** `POST /api/internal-admin/login`. Returns `{token, requires_2fa?: bool, admin}`.
- **2FA enrolment:** `POST /api/internal-admin/enroll-2fa/start` + `/verify` (TOTP, QR code).
- **2FA verify:** `POST /api/internal-admin/verify-2fa`.
- **Logout:** `POST /api/internal-admin/logout`.
- **Me:** `GET /api/internal-admin/me`.
- **RBAC ranks:** super_admin (100) > ops_lead (80) > support_agent (60) > billing_analyst (50) > content_manager (40) > viewer (10). `require_rank(name)` decorator on sensitive routes.
- **Default seed:** `admin@safebase.internal / AdminDemo@1234` (re-seeded on every server start).

**Mobile app implications:** Mobile only needs the **customer** flow. Internal admin stays web-only.

---

## 4. Database schema (90+ collections)

### Identity & sessions
| Collection | Purpose |
|-----------|---------|
| `users` | Customer accounts. Fields: user_id, email, password_hash, name, role (owner/worker/admin), industry, primary_industry, industries[], company_name, subscription_status, onboarding_complete, fatigue_scheme (transport), auth_provider |
| `user_sessions` | Active JWT sessions (logout invalidates) |
| `password_resets` | Reset tokens with TTL |
| `team` / `team_invites` | Team-member invites with role pre-assignment |
| `internal_admins` | SafeBase staff accounts (separate from `users`) |
| `internal_admin_audit_log` | Every admin write captured here |
| `internal_admin_notes` | Free-form notes against a tenant account |
| `internal_admin_credits` | Manual billing credits applied by admin |

### Subscriptions, billing & plans
| Collection | Purpose |
|-----------|---------|
| `subscriptions` | Stripe subscription mirrors |
| `payment_transactions` | Checkout sessions + outcomes |
| `account_addons` | Activated add-ons (per `/addons/*` marketplace) |
| `account_integration_tokens` | OAuth tokens (Xero, Deputy etc — stubs ready) |
| `feature_flags` | Global + per-account overrides (admin Phase 2) |

### Compliance core (industry-neutral)
| Collection | Purpose |
|-----------|---------|
| `business_profiles` | Address, ABN, primary industry |
| `documents` | Generated docs (SWMS, HACCP plans, CoR plans etc) — pinned to `industry` |
| `docs_counters` | Per-tenant counters for sequential doc IDs |
| `compliance_docs` | Uploaded user docs |
| `compliance_inbox` | Inbox of documents needing action |
| `incidents` | Cross-industry incidents (with `industry`, `regulator_type`, `priority`) |
| `incident_workflow` | State machine for SIRS / NHVR / WorkSafe / NDIS |
| `incident_counters` | Counter per tenant |
| `customer_incidents` | Customer-facing (retail) incidents |
| `risks` / `risk_reviews` / `risk_counters` | Risk register (5×5 matrix) |
| `library_seed` / `library_activity` / `library_process` / `library_control` | Risk library taxonomy seeded per industry |
| `workers` | Team-member directory |
| `licences` | Worker credentials with `expiry_date`, `licence_type`, `licence_number` |
| `induction_programs` / `induction_submissions` / `quick_induct` / `quick_inducts` | TradeInduct + VenueInduct + FleetInduct + ClinicInduct + StoreInduct (one product, 5 industry skins) |
| `safety_inspections` / `safety_plant` / `safety_risks` / `safety_toolbox_talks` | Generic safety modules |
| `notifications` / `notification_prefs` | In-app + email notifications, per-channel prefs |
| `automations` / `automation_runs` | If-this-then-that recipes (e.g. "Notify supervisor when licence within 30 days of expiry") |
| `audit_log` | Every customer write captured |
| `onboarding` | First-time wizard progress |

### Industry-specific collections

**Hospitality**
- `temp_units` — fridges/freezers/hot-hold/dishwasher rinse with target ranges + last reading
- `haccp_ccp_log` — HACCP critical control point logs
- `cleaning_tasks` — daily/weekly cleaning schedule
- `fss_register` — Food Safety Supervisor certifications
- `liquor_certs` — RSA + RSG certifications
- `allergen_register` — 14 priority allergens × menu items
- `council_inspection_packs` — pre-bundled docs for council inspections

**Transport**
- `driver_work_diary` — work/rest segments with computed hours (Standard 12h / BFM 14h / AFM 15h caps)
- `fatigue_logs` / `fitness_for_duty` — pre-trip declarations
- `pretrip_inspections` — heavy vehicle pre-trip checklist
- `load_restraint` — Load Restraint Guide 3rd Edition records
- `mass_declarations` — mass & dimension declarations
- `nhvr_occurrences` — notifiable occurrence tracking (24-hour clock)
- `fleet_vehicles` — rego, GVM, expiry tracking
- `cor_due_diligence` — Chain of Responsibility evidence pack

**Healthcare**
- `clinicians` — clinician roster
- `ahpra_register` / `ahpra_registrations` — AHPRA registration tracking
- `care_minutes` — Aged Care care-minutes target tracking
- `acqsc_evidence` — Strengthened Standards evidence
- `sirs_incidents` — Serious Incident Response Scheme
- `ndis_reportable` — NDIS Commission reportable incidents

**Retail**
- `lone_worker_shifts` — active shifts with check-in interval
- `lone_worker_logs` — historical lone-worker check-ins
- `customer_incidents` — slip-and-fall, customer aggression, theft confrontation

### AI + concierge
| Collection | Purpose |
|-----------|---------|
| `concierge_messages` | Every chat turn (per session) |
| `concierge_leads` | Captured leads from the chat widget |
| `resources_articles` | AI-generated educational articles (40 pre-warmed) |
| `resources_ai_log` | Audit log of Ask SafeBase AI questions |
| `accessibility_prefs` | Per-account WCAG preferences |

### Partner program
| Collection | Purpose |
|-----------|---------|
| `partner_branding` | White-label partner branding (custom domain, logo, accent) |
| `partner_clients` | Partner-managed end-clients |
| `partner_test_emails` | Branded-email preview test sends |

### Marketing + ops
| Collection | Purpose |
|-----------|---------|
| `demo_requests` / `enterprise_requests` | Book-a-demo and Enterprise contact form submissions |
| `report_insights` | AI-generated report summaries |
| `regulator_cases` | Regulator pipeline (incidents that became regulator cases) |

---

## 5. API surface (254 endpoints total)

> Every route is `/api/<path>`. All customer routes require `Authorization: Bearer <jwt>` unless noted public.

### 5.1 Auth — `/api/auth/*`
- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/logout`
- POST `/auth/google-session`
- GET  `/auth/me`
- PATCH `/auth/me/industry`
- PATCH `/auth/me/industries`
- PATCH `/auth/me/role`
- POST `/auth/forgot-password`
- POST `/auth/verify-reset-token`
- POST `/auth/reset-password`

### 5.2 Onboarding & business
- GET / PUT `/onboarding`
- GET / PUT `/settings/business`
- GET / PUT `/settings/notifications`

### 5.3 Team
- GET / POST `/team`
- POST `/team/invite`
- DELETE `/team/{invite_id}`
- GET / PATCH `/workers/{worker_id}`
- GET `/workers`

### 5.4 Documents & SWMS
- GET / POST `/documents`
- POST `/documents/generate` (Claude-powered)
- GET / PATCH / DELETE `/documents/{document_id}`
- GET / POST `/swms`
- GET `/ai-docs/types`
- POST `/ai-docs/{industry}/{doc_type}/generate`

### 5.5 Safety register
- GET `/safety/summary`
- GET / POST `/safety/{module}` — module ∈ {inspections, plant, risks, toolbox_talks}
- GET / PATCH / DELETE `/safety/{module}/{item_id}`
- GET / POST `/risks/meta/hrcw`

### 5.6 Incidents (cross-industry workflow)
- GET / POST `/incidents`
- GET / PATCH / DELETE `/incidents/{incident_id}`
- GET / POST `/incident-workflow/meta/regulators`
- GET `/workflows/catalog`
- GET `/workflows/summary`
- GET / POST `/workflows/{wtype}`
- GET / PATCH `/workflows/{wtype}/{instance_id}`
- POST `/workflows/{wtype}/{instance_id}/step`

### 5.7 Compliance inbox
- GET `/compliance-inbox`
- GET `/compliance-inbox/summary`
- GET `/compliance/score`

### 5.8 Notifications & reports
- GET `/notifications`
- POST `/notifications/{notification_id}/read`
- POST `/notifications/read-all`
- GET `/api/notifications` (legacy alias)
- GET `/reports`
- GET `/reports/{report_type}`
- GET `/reports/{report_type}/insights` (Claude summary)

### 5.9 Hospitality
- GET / POST / PATCH `/hospitality/temperature-logs`
- GET `/hospitality/temperature-logs/stats`
- GET / POST `/hospitality/haccp-ccp`
- GET / POST / PATCH `/hospitality/cleaning-tasks`
- POST `/hospitality/cleaning-tasks/{task_id}/complete`
- GET / POST `/hospitality/fss-register`
- GET / POST `/hospitality/liquor-certs`
- GET / POST `/hospitality/allergens`
- GET / POST `/hospitality/suppliers`
- GET `/hospitality/inspection-pack`

### 5.10 Transport
- GET / POST / PATCH `/transport/fatigue-logs`
- GET `/transport/fatigue-logs/breaches`
- GET / POST `/transport/pretrip-inspections`
- GET / POST `/transport/load-restraint`
- GET / POST `/transport/mass-declarations`
- GET / POST / PATCH `/transport/nhvr-occurrences`
- GET / POST / PATCH `/transport/vehicles`
- GET / POST `/transport/fitness-for-duty`
- GET / POST `/transport/cor-due-diligence`

### 5.11 Healthcare
- GET / POST / PATCH `/healthcare/ahpra-register`
- GET `/healthcare/ahpra-register/expiring`
- GET / POST `/healthcare/care-minutes`
- GET / POST `/healthcare/acqsc-evidence`
- GET / POST / PATCH `/healthcare/sirs-incidents`
- POST `/healthcare/sirs-incidents/{incident_id}/submit`
- GET / POST / PATCH `/healthcare/ndis-reportable`
- GET / POST `/healthcare/worker-screening`

### 5.12 Retail
- GET `/retail/lone-worker/active`
- POST `/retail/lone-worker/checkin`
- POST `/retail/lone-worker/escalate`
- GET `/retail/lone-worker/logs`
- GET / POST `/retail/customer-incidents`
- GET / POST `/retail/quick-induct`
- GET `/retail/quick-induct/meta`
- GET `/retail/quick-induct/{casual_id}/status`
- GET `/retail/roster-eligibility/{worker_id}`

### 5.13 Industry router & dashboard widgets
- GET `/industries`
- GET `/public/industry-signal/{slug}` — public, no auth
- GET `/public/safebase-activity/today` — public, no auth
- GET `/dashboard/widget/temp-alert` (hospitality)
- GET `/dashboard/widget/fatigue-alert` (transport)
- GET `/dashboard/widget/ahpra-expiry` (healthcare)
- GET `/dashboard/widget/credential-expiry` (trades)
- GET `/dashboard/widget/lone-worker` (retail)
- GET `/dashboard/care-quality` (healthcare aggregate)
- GET `/dashboard/cor` (transport aggregate)
- GET `/dashboard/food-safety` (hospitality aggregate)
- GET `/dashboard/incidents`
- GET `/dashboard/inductions`
- GET `/dashboard/licences`

### 5.14 Scheduling (credential-gated rostering)
- GET `/scheduling/check-eligibility/{worker_id}`
- GET `/scheduling/mandatory-credentials`
- POST `/scheduling/roster-gate`
- GET / POST `/scheduling/shifts`

### 5.15 Worker self-service
- POST `/worker/checkin`
- GET `/worker/checkins`
- GET `/worker/my-summary`

### 5.16 Resources & marketing
- GET `/resources/articles?industry=trades` — public list (no auth)
- GET `/resources/articles/{slug}` — public single article
- GET `/resources/regulators/{industry}` — public regulator directory
- GET `/resources/templates` — public free templates index (the front-end uses local content but this endpoint can serve a real DB-backed library if needed later)
- POST `/resources/ai/ask` — Ask SafeBase AI (Claude)
- GET `/regulatory-digest` — "What changed this week" feed

### 5.17 Concierge chat + lead capture
- POST `/concierge/chat` — returns `{session_id, reply, offer_lead_capture}` (markdown stripped server-side)
- GET `/concierge/history?session_id=…`
- POST `/concierge/lead` — captures name/email/phone/industry/note + emails sales via Resend
- POST `/accessibility/preferences` — persist WCAG prefs

### 5.18 Notification template variants (Iter55)
- GET `/notification-templates/preview?key=…&industry=…` — render any of `credential_expiring_soon` / `primary_document_overdue` / `incident_assigned` for any of the 5 industries
- (the registry is also importable as `routes.notification_templates.render(key, industry, **ctx)` for the live notification pipeline)

### 5.19 Calculators & marketing tools
- POST `/plan-rightsizer/recommend`
- POST `/demo-requests`
- GET `/demo-requests/{request_id}`
- POST `/enterprise/demo-request`
- POST `/demo/request`

### 5.20 Universal API for tenants (NEW per tenant)
- GET / POST `/api-keys`
- DELETE `/api-keys/{key_id}`
- GET `/api-keys/integration-targets`
- All public-key routes are namespaced `/api/public/*` with `X-API-Key` header

### 5.21 Webhooks
- POST `/webhook/stripe` — Stripe subscription events
- POST `/webhooks/events`
- GET / POST `/webhooks/subscriptions`
- DELETE `/webhooks/subscriptions/{sid}`
- POST `/webhooks/test/{sid}`
- GET `/webhooks/deliveries`

### 5.22 Integrations (stubs ready)
- GET `/integrations`
- POST `/integrations/ahpra/poll`
- POST `/integrations/ahpra/webhook`
- POST `/integrations/ewd/fatigue`
- POST `/integrations/iot/temperature`

### 5.23 Regulator pipeline (Phase 1)
- POST `/regulator-pipeline/draft`
- POST `/regulator-pipeline/mark-submitted/{case_id}`
- GET `/regulator-pipeline/matrices`
- GET `/regulator-pipeline/pending`
- POST `/regulator-pipeline/triage`

### 5.24 TradeCheck (cross-employer credential verification)
- GET `/tradecheck/listings`
- GET `/tradecheck/my`
- GET `/tradecheck/required-credentials`
- GET `/tradecheck/stats`
- POST `/tradecheck/validate-listing`
- POST `/tradecheck/verify/{listing_id}`

### 5.25 TradeInduct + industry-skinned inductions
- GET `/tradeinduct/default-questions`
- GET / POST `/tradeinduct/programs`
- GET / PATCH / DELETE `/tradeinduct/programs/{program_id}`
- GET `/tradeinduct/programs/{program_id}/submissions`
- GET `/tradeinduct/public/{code}` — public induction landing page
- POST `/tradeinduct/public/{code}/submit` — public completion

### 5.26 Academy LMS
- GET `/academy/catalogue`
- GET `/academy/courses`
- GET / POST `/academy/enrolments`
- PATCH `/academy/enrolments/{enrolment_id}/progress`
- POST `/academy/{module_slug}/complete`
- GET `/academy/{module_slug}/quiz`
- POST `/academy/{module_slug}/submit-quiz`
- GET `/academy/completions`

### 5.27 Add-ons marketplace
- GET `/addons/available`
- GET `/addons/active`
- POST `/addons/{slug}/activate`
- POST `/addons/{slug}/deactivate`

### 5.28 Partner program
- GET / PUT `/partner/branding`
- POST `/partner/branding/test-email`
- POST `/partner/branding/verify-dns`
- GET / POST `/partner/clients`
- GET / PATCH / DELETE `/partner/clients/{client_id}`
- GET `/partner/summary`

### 5.29 Internal Admin (separate auth context — DO NOT mix with customer routes)
- POST `/internal-admin/login` · `/logout` · `/me`
- POST `/internal-admin/enroll-2fa/start` · `/verify`
- POST `/internal-admin/verify-2fa`
- GET  `/internal-admin/dashboard/kpi` · `/activity-feed` · `/alerts`
- GET  `/internal-admin/accounts` (filterable, paginated)
- GET / PATCH `/internal-admin/accounts/{account_id}`
- GET  `/internal-admin/accounts/{account_id}/activity-log`
- GET / POST `/internal-admin/accounts/{account_id}/notes`
- POST `/internal-admin/accounts/{account_id}/add-note`
- POST `/internal-admin/accounts/{account_id}/apply-credit`
- POST `/internal-admin/accounts/{account_id}/extend-trial`
- GET  `/internal-admin/accounts/{account_id}/users`
- GET  `/internal-admin/trials`
- GET  `/internal-admin/demos` · `/internal-admin/demos/{request_id}`
- GET  `/internal-admin/users`
- POST `/internal-admin/users/{user_id}/force-logout`
- GET  `/internal-admin/audit-logs` (filterable)
- GET  `/internal-admin/subscriptions` (mocked Stripe data — Iter53)
- GET / PATCH `/internal-admin/feature-flags`
- PATCH `/internal-admin/feature-flags/{key}`
- GET / PATCH `/internal-admin/feature-flags/{key}/overrides`
- PATCH `/internal-admin/feature-flags/{key}/overrides/{account_id}`

---

## 6. Frontend page inventory (84 pages)

### 6.1 Marketing (public)
| Route | Page |
|-------|------|
| `/` | HomeMultiIndustry — hero + industry signals + pricing previews |
| `/industries` | IndustriesOverview |
| `/industries/{slug}` | IndustryProductPage (5 industries) |
| `/pricing` | Pricing (monthly default, + GST everywhere, dynamic industry colors) |
| `/plan-rightsizer` | PlanRightsizer (5-step wizard → recommended tier with industry-specific ROI anchor — Iter53 made this dynamic per tier) |
| `/risk-calculator` | IndustryRiskCalculator |
| `/credential-expiry-calculator` | CredentialExpiryCalculator |
| `/insurance-discount-calculator` | InsuranceDiscountCalculator |
| `/tools/fine-calculator` | FineCalculator |
| `/compare` | Compare (SafeBase vs the rest) |
| `/templates` | TemplatesLibrary — 5-industry tab UI, 40 templates total, downloads as Word `.doc` |
| `/resources` | Resources (all-industry) |
| `/resources/{industry}` | IndustryResourcesPage |
| `/resources/{industry}/{slug}` | ResourceArticle (40 pre-warmed by `seed_articles.py`) |
| `/resources#ai` | Ask SafeBase AI (Claude) |
| `/regulatory-digest` | RegulatoryDigest |
| `/blog` · `/blog/{slug}` | Blog + BlogPost |
| `/book-demo` | BookDemo |
| `/about` | About |
| `/consulting` | Consulting |
| `/enterprise` | Enterprise |
| `/franchises` | Franchises |
| `/partners` | Partners |
| `/ecosystem` | Ecosystem |
| `/integrations` | Integrations (currently lists supported integrations — public docs page is a P1 follow-up) |

### 6.2 Auth flow
- `/login` · `/register` · `/forgot-password` · `/reset-password` · `/auth/callback`

### 6.3 Customer app (dashboard) — all under `/dashboard*`
- `/dashboard` — `Dashboard.jsx` (routes by `user.industry` to the right owner-dashboard component)
- Owner dashboards per industry:
  - Trades → default `OwnerDashboard` block inside `Dashboard.jsx`
  - Hospitality → `dashboards/HospitalityOwnerDashboard.jsx`
  - Transport → `dashboards/TransportOwnerDashboard.jsx`
  - Healthcare → `dashboards/HealthcareOwnerDashboard.jsx`
  - Retail → `dashboards/RetailOwnerDashboard.jsx`
  - Each one renders an `<IndustryAlertTile industry="…" />` at the top — Iter55/56
- Worker role → `WorkerDashboard.jsx`
- `/dashboard/team` (workers + licences + invitations)
- `/dashboard/swms` (SWMS library)
- `/dashboard/documents` · `/dashboard/documents/{id}` (AI-generated docs)
- `/dashboard/safety/*` (inspections, plant, risks, toolbox talks)
- `/dashboard/incidents` · `/dashboard/incidents/{id}`
- `/dashboard/inductions` (TradeInduct/VenueInduct/etc — single product, industry-skinned label)
- `/dashboard/licences` (Licences.jsx)
- `/dashboard/reports`
- `/dashboard/notifications`
- `/dashboard/automations`
- `/dashboard/compliance-inbox` (ComplianceInboxPage)
- `/dashboard/competency-matrix`
- `/dashboard/billing`
- `/dashboard/addons` (AddOnsMarketplace)
- `/dashboard/api-keys`
- `/dashboard/regulator-pipeline`
- Industry-specific deep pages:
  - Hospitality: `/dashboard/food-safety`, `/dashboard/haccp`, `/dashboard/temperature`, `/dashboard/allergens`, etc
  - Transport: `/dashboard/fleet`, `/dashboard/fatigue`, `/dashboard/pretrip`
  - Healthcare: `/dashboard/care`, `/dashboard/ahpra`, `/dashboard/sirs`
  - Retail: `/dashboard/lone-worker`, `/dashboard/store-incidents`
- Partner area:
  - `/partner-portal` · `/partner-branding`
- `/admin-demo-requests` (legacy customer-side admin)
- `/onboarding` (first-time wizard)
- `/mobile` (`MobileWorker.jsx` — a pre-existing trimmed mobile worker view; mobile app will eventually replace this)

### 6.4 Public widgets
- `/inductions/{code}` — `InductionPublic.jsx` (no auth, used by induction QR codes)

### 6.5 Internal Admin app (separate React tree at `/internal-admin/*`)
- `/internal-admin/login`
- `/internal-admin/dashboard` (KPI tiles, activity feed, alerts)
- `/internal-admin/accounts` · `/internal-admin/accounts/{id}` (6-tab account detail)
- `/internal-admin/subscriptions` (Iter53 — mocked Stripe billing list)
- `/internal-admin/feature-flags` (Iter53 — 8 flags, global toggles, override count)
- `/internal-admin/trials` · `/internal-admin/demos` · `/internal-admin/users` · `/internal-admin/audit-logs`

### 6.6 Floating widgets (everywhere)
- `ChatWidget.jsx` — bottom-right "Talk to me" concierge (Claude 4.5)
- `AccessibilityWidget.jsx` — bottom-left WCAG controls
- Both auto-hide on scroll-down (`useScrollHide` hook)

---

## 7. Major iterations shipped (history)

### Iter44 — Pricing display overhaul
Monthly default, + GST everywhere, dynamic industry colors throughout.

### Iter45 — Homepage Monthly Pricing + Industry Previews
Dashboard mockups rendered inline on homepage hero per industry.

### Iter46 — Per-Industry Real Product Tour
20 dashboard screenshots captured and wired into product tour.

### Iter47–48 — Forgot-Password + Resend email + Auth-aware Navbar + JWT invalidation
Customer auth hardened. Logout invalidates token server-side.

### Iter49 — Internal Admin Panel MVP
Separate JWT auth + TOTP 2FA + RBAC + KPI dashboard + accounts list + account detail (6 tabs).

### Iter50 — Removed "Made with Emergent" + Accessibility widget + Concierge Chat widget
- UserWay-style WCAG controls (font size, contrast, cursor, motion-pause, link emphasis, dyslexia-friendly font, reading guide)
- Concierge chat (Claude 4.5) via emergentintegrations

### Iter51 — High Contrast WCAG-AAA fix + Chat Widget Trigger Redesign
- Class-aware HC mode (light surfaces stay light, dark stay dark, pastels → high-vis yellow)
- Chat trigger rebuilt: rectangle with SafeBase logo tile + "TALK TO ME" wordmark

### Iter52 — Templates per-industry + Articles populated + Sitewide UX polish
- 5-industry tab on /templates, 40 templates, Word `.doc` downloads
- ARTICLE_STUBS extended with excerpts + read time
- ScrollToTop on every route change
- Hide-on-scroll for both widgets
- "This week" eyebrow + "Powered by Claude" copy removed
- Emojis stripped from all 5 industry hero headings (🔨 🍽️ 🚛 🏥 🛍️)
- Hospitality accent re-coloured from #7C1D3F (3.5:1) to #F59E0B (9.5:1)
- Sitewide contrast audit — zero `text-white` on yellow

### Iter53 — Phase 2 Internal Admin + Article pre-warming + PlanRightsizer dynamic ROI
- Internal Admin Subscriptions page (mocked Stripe)
- Internal Admin Feature Flags page (8 flags, global toggle, override counts, audit-logged)
- `backend/seed_articles.py` — pre-warms 38/40 article bodies via Claude (instant first read)
- PlanRightsizer "Why this plan" now dynamic — interpolates the actually-recommended price + recomputes % against industry risk benchmark

### Iter54 — Responsive Marketing Nav (phone / tablet / desktop)
- Hamburger drawer (Sheet component) on `<md`
- "Book a Demo" only ≥lg, "Log in" only ≥md, "Start Free Trial" condenses to "TRY FREE" below sm
- Header gap scales `gap-4 lg:gap-6`

### Iter55 — Per-industry dashboard widgets (hospitality/transport/healthcare) + Notification template variants + Concierge lead-capture
- Shared `IndustryAlertTile.jsx` component
- 3 endpoints: `/dashboard/widget/{temp-alert|fatigue-alert|ahpra-expiry}`
- `routes/notification_templates.py` — 3 keys × 5 industry variants
- Concierge `/concierge/chat` detects high-intent → returns `offer_lead_capture: true`
- ChatWidget surfaces inline yellow banner → opens lead form → POSTs `/concierge/lead`
- Resend email to sales with chat transcript excerpt
- `localStorage` prevents pestering returning visitors
- 3 demo owner accounts seeded with deterministic data

### Iter56 — Trades + Retail dashboard widgets + Chat plain-prose
- 2 more endpoints: `/dashboard/widget/{credential-expiry|lone-worker}`
- Trades tile: yellow accent, expiring credentials in 60-day window + already expired
- Retail tile: purple accent, active lone-worker shifts + missed check-ins (interval + 10 min grace)
- Concierge chat reply has all markdown stripped (`**bold**`, `__bold__`, `*italic*`, `# headings`, `- /` `* /` `• ` / `1. ` list markers) — chat now reads as natural human prose
- 2 more demo owners (trades.demo + retail.demo @ safebase.com.au)

---

## 8. Demo accounts (re-seeded by `python -m seed_widget_demo`)

| Email | Password | Role | Industry | Tile data |
|-------|----------|------|----------|-----------|
| trades.demo@safebase.com.au | Demo@1234 | owner | trades | 1 expired licence + 4 expiring in 60 days |
| hospitality.demo@safebase.com.au | Demo@1234 | owner | hospitality | 2 overdue temp logs + 1 out-of-range unit |
| transport.demo@safebase.com.au | Demo@1234 | owner | transport | 1 exceeding fatigue cap + 2 approaching |
| healthcare.demo@safebase.com.au | Demo@1234 | owner | healthcare | 1 expired AHPRA + 3 expiring in 60 days |
| retail.demo@safebase.com.au | Demo@1234 | owner | retail | 2 missed lone-worker check-ins out of 4 active shifts |
| owner@safetradie.demo | Demo@1234 | owner | trades | Original demo account |
| admin@safebase.internal | AdminDemo@1234 | internal_admin | n/a | Re-seeded on every server start |

All customer demo accounts have `onboarding_complete: true` so they land directly on the dashboard.

---

## 9. Third-party integrations

### Active
- **Claude Sonnet 4.5 (Anthropic)** — concierge chat, document generation, regulator triage. Uses Emergent universal LLM key (`EMERGENT_LLM_KEY`) via `emergentintegrations` SDK.
- **Resend** — transactional email (forgot-password, internal admin invites, concierge leads, partner-branded test sends). API key in `RESEND_API_KEY`.
- **Stripe** — payments and subscription mirroring (`STRIPE_API_KEY`).

### Stubs / scaffolding
- **AHPRA live polling** — `/integrations/ahpra/poll` endpoint exists, real SDK pending
- **EWD (Electronic Work Diary)** — `/integrations/ewd/fatigue`, SDK pending
- **IoT temperature sensors** — `/integrations/iot/temperature`, real device integration pending
- **Xero / Deputy / Teletrac / Shopify OAuth** — pages exist, native OAuth flows pending

### Planned (Phase 3 / backlog)
- Zapier app-directory listing
- Google Drive
- Real Stripe with Crypto

---

## 10. Mobile app — recommendations & API roadmap

### 10.1 What the mobile app should DO (priority)
1. **Worker-first daily flow** (highest value):
   - Lone-worker check-in (retail) — `POST /retail/lone-worker/checkin`
   - Pre-trip vehicle inspection (transport) — `POST /transport/pretrip-inspections`
   - Fitness-for-duty declaration (transport) — `POST /transport/fitness-for-duty`
   - Temperature log capture (hospitality) — `POST /hospitality/temperature-logs`
   - Incident report (every industry) — `POST /incidents`
   - SWMS sign-on (trades) — viewing + signing

2. **Owner real-time visibility**:
   - Push notification on missed lone-worker check-in
   - Push notification on driver fatigue cap exceedance
   - Push notification on AHPRA / credential expiry (D-30, D-14, D-0)
   - Dashboard widget endpoints listed in §5.13 are the perfect data source

3. **Concierge chat**:
   - Mobile-native chat surface
   - `POST /concierge/chat` already works for unauthenticated users
   - `POST /concierge/lead` for handoffs

### 10.2 Auth model for mobile
- Use the same customer `/api/auth/login` endpoint.
- Store JWT in Keychain (iOS) / Keystore (Android).
- JWT TTL = 7 days; refresh by re-login (no refresh-token flow yet — recommend adding one for mobile).
- Google Sign-In: `POST /api/auth/google-session` accepts a Google ID token.
- Biometric unlock: standard pattern — unlock the locally-stored JWT with FaceID/TouchID/Biometric prompt.

### 10.3 Endpoint shape considerations
- **Most endpoints already exclude `_id` from MongoDB projections** — clean JSON.
- All timestamps are ISO-8601 UTC strings (e.g. `"2026-05-24T11:48:42.804802+00:00"`).
- All money is in AUD cents as `int` for Stripe; otherwise floats in AUD as `mrr_aud: 1499.00`.
- Errors return `{ "detail": "<message>" }` with the appropriate HTTP status.
- 401 responses fire a global axios interceptor on web — mobile should do the same and redirect to login.

### 10.4 Push notifications (NEEDS NEW BACKEND HOOK)
- Backend currently has `notifications` (in-app) and email (Resend), but **no push channel**.
- Recommended addition: a `device_tokens` collection (`{user_id, platform: 'ios'|'android', token, registered_at}`) + a single `send_push(user_id, title, body, data)` helper that dispatches to APNs / FCM.
- Wire into the same places that currently write to `db.notifications` (e.g. when a lone-worker check-in is missed, fatigue cap exceeded, AHPRA renewal D-7 etc.).
- Strong candidate to reuse the `notification_templates.render(key, industry, **ctx)` registry — it already returns industry-appropriate copy.

### 10.5 Offline-first considerations
- **Temperature logs / pre-trip inspections / lone-worker check-ins** are the most likely use-cases needing offline capture (van/warehouse/clinic dead-zones).
- Recommended pattern: SQLite (Drift/Room) queue with sync-on-reconnect. Every backend write endpoint should ideally become idempotent — currently `POST /incidents` etc. would create duplicates on retry.
- Action item before going live with offline: add `client_event_id: string` to the body of `/retail/lone-worker/checkin`, `/transport/pretrip-inspections`, `/hospitality/temperature-logs`, `/incidents` so server can dedupe.

### 10.6 File uploads
- Backend accepts multipart uploads on document endpoints (server uses chunked-upload pattern per the existing implementation notes).
- Mobile: use `multipart/form-data`, chunked-upload for anything >5 MB. Plug into the same `/documents` / `/incidents` attachments endpoints.

### 10.7 Deep links from notifications
- All in-app notifications already carry a `cta_path` (e.g. `/dashboard/incidents/{id}`). The mobile app should map these to native routes.
- The notification template registry already defines `cta_path` per industry variant — reuse 1:1.

### 10.8 Theme / brand for mobile
- Primary ink: `#0A0A0A`
- Warning yellow: `#FFCC00`
- Industry accents:
  - Trades: `#FFCC00`
  - Hospitality: `#F59E0B`
  - Transport: `#0DC4B5`
  - Healthcare: `#2196A6`
  - Retail: `#A855F7`
- Display font: a sharp sans (web uses Aktiv-Grotesk-ish — pick a system equivalent like SF Pro Display on iOS / Roboto Flex on Android)
- Mono font for labels (used for eyebrows like `/ SECTION NAME`).
- All UI is sharp-cornered (`btn-sharp` utility = no border-radius).

### 10.9 Frontend conventions to mirror
- **Test IDs** — every interactive element on web has `data-testid="…"`. Mirror this with `testID` (RN) / `Semantics.identifier` (Flutter) on mobile so cross-platform QA can share selectors.
- **Toasts** — Sonner is used on web. Use the native equivalent.
- **Pull-to-refresh** — the dashboard widget endpoints are designed to be called repeatedly cheaply (no rate limits applied to /dashboard/widget/* yet).

---

## 11. Environment variables (`.env` reference)

### `backend/.env`
```
MONGO_URL=…
DB_NAME=safebase
CORS_ORIGINS=https://safe-systems.preview.emergentagent.com,…
EMERGENT_LLM_KEY=…       # universal LLM key (Claude/Gemini/OpenAI)
JWT_SECRET=…              # customer JWT signing
ADMIN_JWT_SECRET=…        # SEPARATE internal-admin JWT signing
STRIPE_API_KEY=…
RESEND_API_KEY=…
SENDER_EMAIL=noreply@safebase.com.au
INTERNAL_ADMIN_SEED_EMAIL=admin@safebase.internal
INTERNAL_ADMIN_SEED_PASSWORD=AdminDemo@1234
EXPOSE_RESET_TOKEN=0      # 1 in dev to expose tokens via the password-reset endpoint
CONCIERGE_LEAD_INBOX=hello@safebase.com.au  # optional, defaults to hello@
```

### `frontend/.env`
```
REACT_APP_BACKEND_URL=https://safe-systems.preview.emergentagent.com
WDS_SOCKET_PORT=0
ENABLE_HEALTH_CHECK=true
```

---

## 12. Open backlog (post-Iter56)

### P1 (this should ship next)
- Wire `notification_templates.render(...)` into the live notification dispatcher (templates exist but aren't called yet — currently in-app `notifications` use generic copy)
- Native OAuth flows for top integrations (Xero, Deputy, Teletrac, AHPRA, Shopify)
- Public `/integrations` documentation page (the page exists but should expose API key setup + webhook reference)
- Mobile push notification backend hook (`device_tokens` collection + `send_push` helper)
- Make alert tiles **actionable in one click** — e.g. "Log temperature now" mini-form inline on the hospitality tile

### P2 (backlog)
- Real Stripe integration to replace mocked subscriptions in /internal-admin/subscriptions (Stripe API + customers exist; just swap `_mock_billing_for_user`)
- Zapier app-directory listing
- Refactor `server.py` into router blueprints (now 2,550+ lines)
- Idempotency keys on POST endpoints (precursor to mobile offline-first)
- Refresh-token flow (customer JWT currently has fixed 7-day TTL)

### P3 (nice-to-have)
- Native dark mode (accessibility widget supports it; full dark-mode-by-default is a larger lift)
- Real IoT temperature + AHPRA polling + EWD SDKs
- Expand SafeBase Academy with additional microlearning per industry

---

## 13. File map (the 30 files you'll actually open most often)

### Backend
- `/app/backend/server.py` — main FastAPI app, customer routes (2,550 lines)
- `/app/backend/routes/auth.py` — customer auth + password reset
- `/app/backend/routes/concierge.py` — chat + lead capture + accessibility prefs
- `/app/backend/routes/dashboard_widgets.py` — all 5 industry widget endpoints
- `/app/backend/routes/notification_templates.py` — 5-industry × 3-key template registry
- `/app/backend/routes/hospitality.py` · `transport.py` · `healthcare.py` · `retail.py` — industry-specific endpoints
- `/app/backend/routes/billing.py` — Stripe checkout + plan tiers
- `/app/backend/routes/integrations.py` — integration stubs
- `/app/backend/routes/resources.py` — articles + AI ask
- `/app/backend/routes/regulator_pipeline.py`
- `/app/backend/routes/scheduling.py` — credential-gated rostering
- `/app/backend/internal_admin/routes.py` — admin endpoints
- `/app/backend/internal_admin/auth.py` — admin JWT + RBAC + 2FA
- `/app/backend/seed_articles.py` — pre-warm Claude article bodies
- `/app/backend/seed_widget_demo.py` — seed the 5 industry demo owners

### Frontend
- `/app/frontend/src/App.js` — route table
- `/app/frontend/src/lib/api.js` — axios client + JWT interceptor
- `/app/frontend/src/context/AuthContext.jsx` — user state
- `/app/frontend/src/components/marketing/Layout.jsx` — top nav (responsive)
- `/app/frontend/src/components/ChatWidget.jsx` — concierge chat
- `/app/frontend/src/components/AccessibilityWidget.jsx` — WCAG controls
- `/app/frontend/src/components/IndustryAlertTile.jsx` — the 5 widget bodies
- `/app/frontend/src/components/ScrollToTop.jsx` · `hooks/useScrollHide.js`
- `/app/frontend/src/pages/Dashboard.jsx` — dashboard router
- `/app/frontend/src/pages/dashboards/*.jsx` — 4 industry-specific owner dashboards + worker dashboard
- `/app/frontend/src/pages/PlanRightsizer.jsx` — quoting wizard
- `/app/frontend/src/pages/TemplatesLibrary.jsx` — Word `.doc` template downloads
- `/app/frontend/src/lib/downloadAsWord.js` — Word docx generator (dependency-free)
- `/app/frontend/src/internal-admin/InternalAdminApp.jsx` — admin route tree
- `/app/frontend/src/internal-admin/pages/*` — admin pages (Subscriptions, Feature Flags, Accounts etc)
- `/app/frontend/src/data/industries.config.js` — industry list + accent colours
- `/app/frontend/src/data/pricing.config.js` — per-industry plan tiers + ROI anchors
- `/app/frontend/src/data/industry-pages.config.js` — content for /industries/{slug}
- `/app/frontend/src/content/industryTemplates.js` — 40 free templates
- `/app/frontend/src/content/blogPosts.js` — blog content

### Memory & docs
- `/app/memory/PRD.md` — Product Requirements + full iteration changelog
- `/app/memory/test_credentials.md` — every demo account login

---

## 14. Quick-start for the mobile dev team

```bash
# 1. Spin up the backend (auto-managed in the preview env, but for local dev):
cd /app/backend && uvicorn server:app --reload --port 8001

# 2. Re-seed all demo data:
cd /app/backend && set -a && source .env && set +a && python -m seed_widget_demo

# 3. Login as any industry owner:
curl -X POST https://safe-systems.preview.emergentagent.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trades.demo@safebase.com.au","password":"Demo@1234"}'

# 4. Hit a widget endpoint:
curl https://safe-systems.preview.emergentagent.com/api/dashboard/widget/credential-expiry \
  -H "Authorization: Bearer <TOKEN>"
```

The single most useful endpoint surface for the mobile app's MVP is:
1. `/api/auth/*` (sign-in)
2. `/api/auth/me` (whoami)
3. `/api/dashboard/widget/*` (5 industry tiles)
4. `/api/notifications` + `/api/notifications/{id}/read`
5. The industry-specific capture endpoints (lone-worker checkin, temp log, pre-trip inspection, fitness-for-duty, incident report)

Build the mobile app around those 10 endpoints and you'll cover ~80% of daily-active value before adding anything else.

---

**End of summary.**

If anything in this map is unclear, every detail is also captured iteration-by-iteration in `/app/memory/PRD.md`.
