# SafeTradie — PRD

## Original problem
WHS compliance SaaS for Australian trade businesses. Four core functions (SWMS gen, Incidents, People/Licences, Intelligence) + ecosystem (TradeInduct, TradeCheck, Academy, Franchise, Consulting). Pricing A$150/250/400 per month.

## Users
- Business owner (primary buyer)
- Safety manager
- Supervisor (site-assigned)
- Worker (mobile app)
- WHS consultant (white-label partner)
- Franchisor

## Batching roadmap
User provided 34-prompt + 5-workflow blueprint; built in batches (a, b, c, d, e).

---

## Implemented

### Iteration 1-2 — Foundation (Dec 2025)
- Backend: JWT + Emergent Google Auth, Workers, Licences, Incidents, Documents (Claude Sonnet 4.5), Compliance score
- Frontend: Landing, Login, Register, Dashboard, Documents, Incidents, Workers, Licences

### Iteration 3 — Marketing expansion
- 15 public routes + Pricing A$150/250/400 + MarketingNav

### Iteration 4 — Batch (a) Foundation + Onboarding
- OnboardingWizard (6 steps), Settings (6 tabs), Notifications Centre, enhanced Register

### Iteration 5 — Batch (b) Core Safety Modules (Feb 2026)
- Generic `/api/safety/{module}` + `/api/safety/summary`
- 6 modules: Toolbox Talks, Plant, Substances, Inspections, Risk Register, First Aid/PPE
- Shared `SafetyModulePage.jsx`; Risk auto-computes inherent + residual scores
- Bugs fixed: route ordering for /summary, int coercion via `_safe_int()`

### Iteration 6 — Batch (c) Reports + Workflows (Feb 2026)
- **Reports**: 10 live-computed reports (catalog + detail endpoints)
- **Workflows engine**: stepped progress, 5 workflows (W1 New Employee, W2 Incident Resolution, W3 SWMS→Job Start, W4 Annual WHS Review, W5 Subcontractor)
- Shared `WorkflowPage.jsx`; sidebar Reports + Workflows sections

### Iteration 7 — Batch (d) Ecosystem + AI Insights (Feb 2026)
- **AI Insights on Reports** (Claude Sonnet 4.5 via Emergent LLM Key): `POST /api/reports/{type}/insights` returns `{summary, actions:[{priority, action, why}]}` with 24h cache and graceful fallback
- **TradeInduct** (`/dashboard/tradeinduct` + public `/induct/:code`): create induction programs with auto-generated invite codes, worker submits form unauthenticated, certificate_id issued
- **TradeCheck** public marketplace (`/tradecheck`) + owner listing mgmt (`/dashboard/tradecheck`): filter by trade/state, verification flow (pending → verified)
- **Academy LMS** (`/dashboard/academy`): 8 seeded courses, enrol → module progress → auto-issued certificate on completion
- **Partner/Consultant Portal** (`/dashboard/partner`): client book with MRR, status dropdowns, auto-enriched docs/incidents/licences snapshots
- **Mobile Worker PWA** (`/worker`): dark mobile-optimised dashboard, site check-in, my-licences, upcoming toolbox, recent SWMS, my-courses
- Sidebar: new Ecosystem section with 5 links

---

## Backend endpoints (current, by module)
- **Auth**: POST /api/auth/{register,login,google-session,logout}, GET /api/auth/me
- **Core**: Workers/Licences/Incidents/Documents CRUD, /api/compliance/score
- **Settings**: /api/settings/{business,notifications}, /api/team CRUD
- **Notifications/Onboarding**: /api/notifications, /api/onboarding
- **Safety (batch b)**: /api/safety/summary, /api/safety/{module} CRUD ×7 modules
- **Reports (batch c)**: /api/reports (catalog), /api/reports/{type}, **POST /api/reports/{type}/insights** (AI, cached)
- **Workflows (batch c)**: /api/workflows/{catalog,summary}, /api/workflows/{wtype} CRUD + step toggle
- **Batch (d)**:
  - TradeInduct: /api/tradeinduct/programs CRUD, /api/tradeinduct/public/{code} (GET+submit, no auth), /api/tradeinduct/programs/{id}/submissions
  - TradeCheck: /api/tradecheck/listings (public list), /api/tradecheck/my, /api/tradecheck/listings (POST upsert), /api/tradecheck/verify/{id}
  - Academy: /api/academy/courses, /api/academy/enrolments (GET/POST), /api/academy/enrolments/{id}/progress
  - Partner: /api/partner/{clients,summary} CRUD
  - Worker: /api/worker/{my-summary,checkin,checkins}

---

## Backlog

### Next: batch e — Marketing SEO blitz
- Blog + 20 seed articles
- Free Templates Library
- Competitor Comparison page
- State-by-State Guides
- WorkSafe Fine Calculator
- Integrations page
- Partner Program LP

### Refactoring backlog
- Split `server.py` (1720+ lines) into `/app/backend/routes/{auth,safety,reports,workflows,tradeinduct,tradecheck,academy,partner,worker}.py`
- Typed Pydantic models per module (replace `body: dict`)
- Add ESLint rule for unresolved imports (would have caught TradecheckMarketplace default-import bug)

---

## Known environmental constraints
- EMERGENT_LLM_KEY budget may deplete — SWMS + AI insights have fallback placeholder
- K8s ingress 60s timeout → backend AI timeout 50s
