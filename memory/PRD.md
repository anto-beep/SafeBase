# SafeTradie — PRD

## Original problem
WHS compliance SaaS for Australian trade businesses. Four core functions + ecosystem products. Priced A$150/250/400/mo.

## Users
- Business owner (primary buyer) · Safety manager · Supervisor · Worker · WHS consultant · Franchisor

## Batching roadmap
Built in 5 batches (a, b, c, d, e) from a 34-prompt + 5-workflow blueprint. **All batches complete as of Feb 2026.**

---

## Implemented (chronological)

### Iteration 1-3 — Foundation + Marketing (Dec 2025)
- JWT + Google auth, Workers/Licences/Incidents/Documents CRUD, SWMS AI gen, Compliance score
- 15 public marketing routes + Pricing + MarketingNav

### Iteration 4 — Batch (a) Onboarding (Feb 2026)
- OnboardingWizard (6 steps), Settings (6 tabs), Notifications Centre, enhanced Register

### Iteration 5 — Batch (b) Core Safety Modules (Feb 2026)
- Generic `/api/safety/{module}` + 6 modules: Toolbox Talks, Plant, Substances, Inspections, Risks, First Aid/PPE
- Fixes: summary route ordering, int coercion in risks

### Iteration 6 — Batch (c) Reports + Workflows (Feb 2026)
- 10 live-computed reports (catalog + detail)
- Workflows engine + 5 stepped workflows (W1 New Employee, W2 Incident Resolution, W3 SWMS→Job, W4 Annual Review, W5 Subcontractor)

### Iteration 7 — Batch (d) Ecosystem Apps + AI Insights (Feb 2026)
- AI-powered report insights (Claude Sonnet 4.5, 24h cache, graceful fallback)
- TradeInduct (invite codes + public form at /induct/:code)
- TradeCheck (public marketplace /tradecheck + owner mgmt)
- Academy LMS (8 courses, enrolment→progress→certificate)
- Partner/Consultant portal (client book + MRR tracking)
- Mobile Worker PWA (/worker)

### Iteration 8 — Batch (e) Marketing SEO blitz (Feb 2026)
- **Blog** (/blog + /blog/:slug) with 20 seed SEO articles
- **Templates Library** (/templates) with 13 downloadable .txt templates
- **Competitor Comparison** (/compare) — SafeTradie vs HammerTech, HazardCo, SiteDocs, Donesafe
- **State Guides** (/guides + /guides/:state) for all 8 AU jurisdictions
- **WorkSafe Fine Calculator** (/tools/fine-calculator) — interactive estimator with slider
- **Integrations** (/integrations) — Xero, MYOB, ServiceM8, Tradify, Deputy, Slack, Teams, Zapier etc.
- **Social-proof badges** on /pricing (live verified-count from /api/tradecheck/stats)

---

## Backend endpoints (current)
- Auth: /api/auth/{register,login,google-session,logout}, /api/auth/me
- Core CRUD: Workers, Licences, Incidents, Documents
- Compliance: /api/compliance/score
- Settings / Notifications / Onboarding
- **Safety (b)**: /api/safety/summary, /api/safety/{module} CRUD
- **Reports (c)**: /api/reports, /api/reports/{type}, **POST /api/reports/{type}/insights** (AI, cached)
- **Workflows (c)**: /api/workflows/{catalog,summary,{wtype}} CRUD + step toggle
- **Batch (d)**: /api/tradeinduct/* (+ public /induct/), /api/tradecheck/{listings,my,verify,stats (public)}, /api/academy/{courses,enrolments}, /api/partner/{clients,summary}, /api/worker/{my-summary,checkin,checkins}

## Frontend routes
- Public: /, /ecosystem, /services/*, /products/*, /consulting, /pricing, /partners, /franchises, /resources, /about, /tradecheck, /induct/:code, /blog(+/:slug), /templates, /compare, /guides(+/:state), /tools/fine-calculator, /integrations
- Auth: /login, /register, /auth/callback, /worker (protected)
- Dashboard (protected): /dashboard/{overview, documents, incidents, workers, licences, notifications, settings, reports, toolbox-talks, plant, substances, inspections, risks, first-aid-ppe, workflows/*, tradeinduct, tradecheck, academy, partner}

---

## Backlog

### Refactoring backlog
- Split server.py (~1730 lines) into /app/backend/routes/*.py modules
- Typed Pydantic models per module (replace body: dict)
- Add ESLint rule for unresolved imports

### Possible future batches (P2/P3)
- Native mobile apps (React Native / Capacitor from existing PWA)
- Stripe billing integration
- Zapier actual triggers (beyond catalog page)
- Multi-language (translations for worker PWA)
- Advanced analytics dashboards (D3/Recharts)

---

## Known environmental constraints
- EMERGENT_LLM_KEY budget may deplete — SWMS + AI insights have graceful fallback
- K8s ingress 60s timeout → backend AI timeout 50s
