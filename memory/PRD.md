# SafeTradie - PRD

## Original problem
WHS compliance SaaS for Australian trade businesses. Four core functions (SWMS gen, Incidents, People/Licences, Intelligence) + ecosystem (TradeInduct, TradeCheck, Academy, Franchise, Consulting). Priced A$150/250/400 per month.

## Users
- Business owner (primary buyer)
- Safety manager
- Supervisor (site-assigned)
- Worker (mobile app)
- WHS consultant (white-label partner)
- Franchisor

## Implemented (Dec 2025)

### Iteration 1-2 — Foundation
- Backend: JWT + Emergent Google Auth, Workers, Licences (expiry computation), Incidents (auto notify_regulator), Documents (Claude Sonnet 4.5), Compliance score
- Frontend: Landing, Login, Register, Dashboard overview, Documents, Incidents, Workers, Licences

### Iteration 3 — Marketing expansion
- 15 public routes: /, /ecosystem, /services/{swms,incidents,people,intelligence}, /products/{tradeinduct,tradecheck,academy}, /consulting, /pricing, /partners, /franchises, /resources, /about
- Pricing rewritten to A$150/250/400 (monthly + annual toggle)
- MarketingNav with Products dropdown
- All pricing references globally consistent

### Iteration 4 — Foundation + Onboarding (batch a)
- **Onboarding Wizard** (6 steps, auto-triggers for new email/password users, progress bar, save & exit, skip buttons on steps 3-5, dismiss-sticky via sessionStorage)
- **Settings** with 6 tabs: Business Profile (CRUD), Users & Roles (invite + role change + remove, 4 roles: admin/safety_manager/supervisor/worker), Notifications (expiry-day toggles, delivery, threshold, weekly summary, legislative digest), Billing, Data/Privacy, Danger Zone
- **Notifications Centre** with 6 filter tabs, live synthesis from incidents+licences when no stored notifications, mark-all + mark-one
- **Enhanced Register** with trade/state/workers fields + trust column (3 testimonials + 5 guarantees)
- Bell icon in sidebar + mobile top bar with unread badge (polls /60s)

## Backend endpoints (current)
- Auth: POST /api/auth/{register,login,google-session,logout}, GET /api/auth/me
- Workers/Licences/Incidents/Documents: CRUD
- Compliance: GET /api/compliance/score
- **NEW (iter 4)**: GET/PUT /api/settings/business, GET/PUT /api/settings/notifications, GET/POST/PATCH/DELETE /api/team, GET/POST /api/notifications (+ read/read-all), GET/PUT /api/onboarding

## Backlog (user-requested batches)
### Next: batch b — Core Safety Modules
- Toolbox Talks (Prompt 15)
- Plant & Equipment Register (16)
- Hazardous Substances + SDS (17)
- Inspection Checklists (18)
- Risk Register (19)
- First Aid + PPE (34)

### Then: batch c — Marketing SEO blitz
- Blog + 20 seed articles, Template Library, Competitor comparison, State guides, Fine Calculator, Integrations page, Partner Program LP

### Then: batch d — App depth
- SWMS wizard rebuild, Incidents investigation flow, Worker profile tabs, Compliance breakdown + audit pack gen, Reporting (10 types)

### Then: batch e — Workflows + Mobile
- W1 New Employee onboarding, W2 Incident→Resolution kanban, W3 SWMS→Job start, W5 Subcontractor engagement, Mobile Worker PWA

## Known environmental constraints
- EMERGENT_LLM_KEY budget exhausted (A$0.52 / A$0.40) — top up via Profile → Universal Key → Add Balance
- K8s ingress 60s upstream timeout → backend AI timeout set to 50s
