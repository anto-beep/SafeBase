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
- Backend: JWT + Emergent Google Auth, Workers, Licences (expiry), Incidents (auto notify_regulator), Documents (Claude Sonnet 4.5), Compliance score
- Frontend: Landing, Login, Register, Dashboard, Documents, Incidents, Workers, Licences

### Iteration 3 — Marketing expansion
- 15 public routes: /, /ecosystem, /services/{swms,incidents,people,intelligence}, /products/{tradeinduct,tradecheck,academy}, /consulting, /pricing, /partners, /franchises, /resources, /about
- Pricing A$150/250/400 (monthly + annual toggle)
- MarketingNav with Products dropdown

### Iteration 4 — Batch (a): Foundation + Onboarding
- OnboardingWizard (6 steps, auto-trigger, save & exit)
- Settings (6 tabs: Business, Users & Roles, Notifications, Billing, Data, Danger Zone)
- Notifications Centre (6 filter tabs, live synthesis)
- Enhanced Register with trade/state/workers + trust column
- Bell icon with unread badge

### Iteration 5 — Batch (b): Core Safety Modules (Feb 2026)
- Generic `/api/safety/{module}` CRUD pattern + `/api/safety/summary`
- 6 modules: Toolbox Talks, Plant & Equipment, Hazardous Substances, Inspections, Risk Register, First Aid + PPE
- Shared `SafetyModulePage.jsx` component
- Risk Register auto-computes inherent + residual scores (L×C) with level (low/medium/high/extreme)
- Fixed route-ordering bug (`/api/safety/summary` now before generic)
- Fixed string-coercion bug in `_enrich()` via `_safe_int()` helper

### Iteration 6 — Batch (c): Reports + Workflows (Feb 2026)
- **Reports Module** (`/api/reports` + `/api/reports/{type}`): 10 live-computed reports — compliance_score, incidents_trend, licence_expiry, training_matrix, swms_register, toolbox_talks_log, risk_register_export, inspections_summary, plant_register, worker_roster
- **Reports page** (`/dashboard/reports`) — card grid, dialog viewer, JSON download, Print/PDF export
- **Workflows engine** (`/api/workflows/{wtype}` CRUD + step toggle): stepped progress tracking with progress_pct, status (not_started/in_progress/complete)
- **5 Workflows**:
  - W1 New Employee Onboarding (7 steps: profile → induction → licences → PPE → toolbox → SWMS sign → ready)
  - W2 Incident Resolution (7 steps: reported → triage → regulator → investigation → corrective → implemented → closed)
  - W3 SWMS to Job Start (6 steps: draft → reviewed → approved → site-brief → sign-off → started)
  - W4 Annual WHS Review (7 steps: scope → policies → registers → incidents → training → audit → sign-off)
  - W5 Subcontractor Engagement (7 steps: invite → company → insurance → licences → SWMS → induction → engaged)
- Shared `WorkflowPage.jsx` component
- Sidebar: new Reports link + Workflows section (5 links)

---

## Backend endpoints (current)
- Auth: POST /api/auth/{register,login,google-session,logout}, GET /api/auth/me
- Workers/Licences/Incidents/Documents: CRUD
- Compliance: GET /api/compliance/score
- Settings: GET/PUT /api/settings/{business,notifications}, /api/team CRUD
- Notifications: GET/POST /api/notifications (+ read/read-all)
- Onboarding: GET/PUT /api/onboarding
- **Safety (batch b)**: /api/safety/summary, /api/safety/{module} CRUD for 7 modules
- **Reports (batch c)**: /api/reports (catalog), /api/reports/{type}
- **Workflows (batch c)**: /api/workflows/catalog, /api/workflows/summary, /api/workflows/{wtype} CRUD + /api/workflows/{wtype}/{id}/step

---

## Backlog

### Next: batch d — Ecosystem Apps (product verticals)
- Mobile Worker PWA
- TradeInduct module (contractor/worker induction portal)
- TradeCheck module (licence/insurance verification marketplace)
- SafeTradie Academy module (training LMS)
- Partner/Consultant white-label portal

### Then: batch e — Marketing SEO blitz
- Blog + 20 seed articles
- Free Templates Library
- Competitor Comparison page
- State-by-State Guides
- WorkSafe Fine Calculator
- Integrations page
- Partner Program LP

### Refactoring backlog
- Split `server.py` into `/app/backend/routes/{auth,safety,reports,workflows,settings,...}.py`
- Split routes models into `/app/backend/models/`
- Move Pydantic validation for safety modules (typed `RiskCreate`, etc.) to replace `body: dict`

---

## Known environmental constraints
- EMERGENT_LLM_KEY budget may deplete — SWMS generation has fallback placeholder
- K8s ingress 60s timeout → backend AI timeout 50s
