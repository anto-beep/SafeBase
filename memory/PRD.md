# SafeTradie - Product Requirements (PRD)

## Original Problem Statement
SafeTradie - WHS compliance infrastructure SaaS for Australian trade businesses. Four core functions: (1) AI Documentation Generation (SWMS, risk assessments, emergency procedures, induction checklists, hazardous substance registers); (2) Incident & Near-Miss Management (mobile-first, regulator-notify auto-routing); (3) People & Licence Management (white card, trade licence, HRWL, first aid, expiry alerts); (4) Compliance Intelligence (pattern detection, scoring, audit prep). Pricing A$79–299/mo SaaS plus implementation, consulting, white-label partner network, franchise multi-tenancy, and adjacent ecosystem (TradeInduct, TradeCheck, SafeTradie Academy).

## User Choices
- All 4 functions (broad MVP)
- Claude Sonnet 4.5 for AI generation
- Both auth (JWT email/password + Emergent Google OAuth)
- Design: Swiss/high-contrast (warning yellow + ink black, Cabinet Grotesk + IBM Plex Sans)
- Roles: owner / worker

## Architecture
- **Backend**: FastAPI + Motor (Mongo). Auth via JWT (Bearer) and Emergent Google session_token (cookie). emergentintegrations.LlmChat with Claude Sonnet 4.5 wrapped in asyncio.to_thread to avoid blocking event loop. 50s timeout (under K8s ingress 60s cap).
- **Frontend**: React 19 + Tailwind + shadcn-ui. Phosphor icons. Cabinet Grotesk via Fontshare, IBM Plex Sans via Google Fonts. react-fast-marquee.
- **Routing**: 10 public marketing routes + auth + protected /dashboard/* with sidebar layout

## What's Implemented (Dec 2025)
### Backend endpoints
- POST /api/auth/register, /login, /google-session, /logout, GET /me
- GET/POST/DELETE /api/workers
- GET/POST/DELETE /api/licences (with status & days_until_expiry computation)
- GET/POST/PATCH /api/incidents (auto notify_regulator on serious/critical)
- POST /api/documents/generate (Claude Sonnet 4.5), GET/DELETE list
- GET /api/compliance/score (score + metrics + insights)

### Frontend
- Marketing: /, /services/{swms,incidents,people,intelligence}, /pricing, /partners, /franchises, /resources, /about
- Auth: /login, /register, /auth/callback (OAuth)
- Dashboard: overview (score ring + AI insights + stat tiles), documents (gen dialog + view+print), incidents (mobile capture w/ photos), workers, licences (traffic-lights)

### Test status (iteration_2.json)
- Backend: 13/14 endpoints functional; AI doc gen blocked by EMERGENT_LLM_KEY budget exceeded (env constraint, not code) — endpoint returns clean 503 quickly now. Event loop verified non-blocking.
- Frontend: 100% - all 10 marketing routes + dashboard flows pass

## Personas
1. **Trade business owner** — primary buyer, runs 1–15 person crew, needs SWMS fast and audit-ready records
2. **Worker** — uses mobile to log incidents, complete inductions, view licences
3. **WHS consultant** — partner persona for white-label network
4. **Franchisor** — network-level dashboard buyer

## Backlog (P0/P1/P2)
### P0 (next iteration)
- Toolbox-talk generator (auto-from-incident-trends)
- CSV/PDF audit pack export
- Worker self-service induction completion (signature)
- Email/SMS notifications for licence expiry

### P1
- TradeInduct (QR site induction) module
- TradeCheck (subbie portable credential)
- White-label partner console (multi-client view)
- Voice-to-text incident reporting

### P2
- SafeTradie Academy (microlearning)
- Franchise multi-tenancy (network dashboard)
- Stripe billing
- Worker-app PWA install
- Integrations: MYOB, Xero, ServiceM8, simPRO

## Known Environmental Constraints
- EMERGENT_LLM_KEY has monthly budget — top up via Profile → Universal Key → Add Balance
- K8s ingress 60s upstream timeout — backend timeout set to 50s
