# Mobile App Prompt — Industry-Specific Roles on Sign-up

Copy-paste the block below into your mobile-app coding agent (Expo / React Native / Flutter — language-agnostic, the agent will adapt).

---

## PROMPT

> **Task: Wire industry-specific role selection into the mobile sign-up flow**
>
> On the SafeBase mobile app sign-up screen, the user picks an industry first. As soon as the industry is selected, the next screen must show **only the roles that belong to that industry** — exactly the same role catalogue used by the SafeBase web app. No generic role list.
>
> ### 1. Role catalogue (source of truth)
>
> Add this constant to the mobile app at `src/data/rolesByIndustry.ts` (or the equivalent path in your stack). The values must match the web app exactly — keep the `id`, `label`, `variant`, and `permission_role` strings intact because the backend `/api/auth/register` endpoint validates them.
>
> ```ts
> export const ROLES_BY_INDUSTRY = {
>   trades: [
>     { id: "owner",          label: "Business Owner / Director",        variant: "owner",       permission_role: "owner"  },
>     { id: "supervisor",     label: "Site Supervisor / Foreman",         variant: "supervisor", permission_role: "owner"  },
>     { id: "safety_officer", label: "Safety Officer / WHS Manager",      variant: "safety_lead",permission_role: "owner"  },
>     { id: "office_manager", label: "Office Manager / Administrator",    variant: "owner",       permission_role: "owner"  },
>     { id: "electrician",    label: "Electrician",                        variant: "worker",     permission_role: "worker" },
>     { id: "plumber",        label: "Plumber",                            variant: "worker",     permission_role: "worker" },
>     { id: "carpenter",      label: "Carpenter / Joiner",                 variant: "worker",     permission_role: "worker" },
>     { id: "roofer",         label: "Roofer",                             variant: "worker",     permission_role: "worker" },
>     { id: "concreter",      label: "Concreter",                          variant: "worker",     permission_role: "worker" },
>     { id: "builder",        label: "Builder / General Trades",           variant: "worker",     permission_role: "worker" },
>     { id: "apprentice",     label: "Apprentice",                         variant: "worker",     permission_role: "worker" },
>     { id: "subcontractor",  label: "Subcontractor",                      variant: "worker",     permission_role: "worker" },
>   ],
>   hospitality: [
>     { id: "owner",                    label: "Owner / Director",                    variant: "owner",      permission_role: "owner"  },
>     { id: "general_manager",          label: "General Manager",                     variant: "owner",      permission_role: "owner"  },
>     { id: "operations_manager",       label: "Operations Manager",                  variant: "owner",      permission_role: "owner"  },
>     { id: "head_chef",                label: "Head Chef / Executive Chef",          variant: "supervisor", permission_role: "owner"  },
>     { id: "sous_chef",                label: "Sous Chef / Kitchen Manager",         variant: "supervisor", permission_role: "owner"  },
>     { id: "venue_manager",            label: "Restaurant / Venue Manager",          variant: "supervisor", permission_role: "owner"  },
>     { id: "bar_manager",              label: "Bar Manager",                         variant: "supervisor", permission_role: "owner"  },
>     { id: "foh_manager",              label: "Front of House Manager",              variant: "supervisor", permission_role: "owner"  },
>     { id: "food_safety_supervisor",   label: "Food Safety Supervisor",              variant: "safety_lead",permission_role: "owner"  },
>     { id: "hr_manager",               label: "HR / People Manager",                 variant: "owner",      permission_role: "owner"  },
>     { id: "team_member",              label: "Staff Member / Team Member",          variant: "worker",     permission_role: "worker" },
>     { id: "casual",                   label: "Casual Worker",                       variant: "worker",     permission_role: "worker" },
>   ],
>   transport: [
>     { id: "owner",              label: "Business Owner / Director",                 variant: "owner",      permission_role: "owner"  },
>     { id: "fleet_manager",      label: "Transport Manager / Fleet Manager",         variant: "owner",      permission_role: "owner"  },
>     { id: "operations_manager", label: "Operations Manager / Dispatcher",           variant: "supervisor", permission_role: "owner"  },
>     { id: "safety_manager",     label: "Safety Manager / WHS Officer",              variant: "safety_lead",permission_role: "owner"  },
>     { id: "hc_driver",          label: "Heavy Vehicle Driver (HC/MC)",              variant: "worker",     permission_role: "worker" },
>     { id: "hr_driver",          label: "Rigid Truck Driver (HR)",                   variant: "worker",     permission_role: "worker" },
>     { id: "courier",            label: "Courier / Light Vehicle Driver",            variant: "worker",     permission_role: "worker" },
>     { id: "warehouse_manager",  label: "Warehouse Manager",                         variant: "supervisor", permission_role: "owner"  },
>     { id: "loader",             label: "Loader / Packer",                           variant: "worker",     permission_role: "worker" },
>     { id: "scheduler",          label: "Freight Manager / Scheduler",               variant: "supervisor", permission_role: "owner"  },
>     { id: "admin",              label: "Administration",                            variant: "owner",      permission_role: "owner"  },
>   ],
>   healthcare: [
>     { id: "owner",                label: "Practice Owner / Director",                variant: "owner",      permission_role: "owner"  },
>     { id: "practice_manager",     label: "Practice Manager / Operations Manager",    variant: "owner",      permission_role: "owner"  },
>     { id: "rn",                   label: "Registered Nurse",                         variant: "worker",     permission_role: "worker" },
>     { id: "en",                   label: "Enrolled Nurse",                           variant: "worker",     permission_role: "worker" },
>     { id: "physio",               label: "Physiotherapist",                          variant: "worker",     permission_role: "worker" },
>     { id: "ot",                   label: "Occupational Therapist",                   variant: "worker",     permission_role: "worker" },
>     { id: "psychologist",         label: "Psychologist",                             variant: "worker",     permission_role: "worker" },
>     { id: "allied_health",        label: "Allied Health Practitioner",               variant: "worker",     permission_role: "worker" },
>     { id: "support_worker",       label: "Support Worker / Care Worker",             variant: "worker",     permission_role: "worker" },
>     { id: "ndis_coordinator",     label: "NDIS Support Coordinator",                 variant: "supervisor", permission_role: "owner"  },
>     { id: "aged_care_manager",    label: "Aged Care Manager",                        variant: "supervisor", permission_role: "owner"  },
>     { id: "clinical_governance",  label: "Clinical Governance Officer",              variant: "safety_lead",permission_role: "owner"  },
>     { id: "admin",                label: "Administration / Reception",               variant: "owner",      permission_role: "owner"  },
>   ],
>   retail: [
>     { id: "owner",              label: "Business Owner / Director",                  variant: "owner",      permission_role: "owner"  },
>     { id: "store_manager",      label: "Store Manager",                              variant: "owner",      permission_role: "owner"  },
>     { id: "assistant_manager",  label: "Assistant Store Manager",                    variant: "supervisor", permission_role: "owner"  },
>     { id: "area_manager",       label: "Area / District Manager",                    variant: "owner",      permission_role: "owner"  },
>     { id: "shift_supervisor",   label: "Shift Supervisor",                           variant: "supervisor", permission_role: "owner"  },
>     { id: "full_time",          label: "Full-Time Staff Member",                     variant: "worker",     permission_role: "worker" },
>     { id: "part_time",          label: "Part-Time Staff Member",                     variant: "worker",     permission_role: "worker" },
>     { id: "casual",             label: "Casual Worker",                              variant: "worker",     permission_role: "worker" },
>     { id: "warehouse",          label: "Warehouse / Stockroom Team",                 variant: "worker",     permission_role: "worker" },
>     { id: "hr_manager",         label: "HR / People Manager",                        variant: "owner",      permission_role: "owner"  },
>     { id: "admin",              label: "Administration",                             variant: "owner",      permission_role: "owner"  },
>   ],
> } as const;
>
> export type Industry = keyof typeof ROLES_BY_INDUSTRY;
> export type Role = (typeof ROLES_BY_INDUSTRY)[Industry][number];
> ```
>
> ### 2. Sign-up screen behaviour
>
> Build (or refactor) the sign-up flow as a **3-step wizard** that mirrors the web app:
> 1. **Step 1 — Industry**: 5 large tap-tiles (Trades, Hospitality, Transport, Healthcare, Retail). Tapping a tile selects it and shows a "Continue" button. No role list is visible yet.
> 2. **Step 2 — Role**: When the user lands here, immediately compute `ROLES_BY_INDUSTRY[selectedIndustry]` and render the list. Show **only** that industry's roles — never a hard-coded set. Each row shows the `label`. Tapping selects it; selection state lives in component state.
> 3. **Step 3 — Account**: name, business name, email, password, marketing opt-in, terms accept, submit.
>
> Implementation rules:
> - The role list **MUST** rebuild whenever the user goes back and changes the industry. Don't cache it across industry changes.
> - Disable the "Continue" button on each step until a valid selection exists.
> - Show a "Back to industry" link on Step 2 so the user can change their mind.
> - Step indicator at the top: `STEP 2 OF 3 · YOUR ROLE`.
> - Persist the in-progress wizard state (industry, role) to AsyncStorage / SharedPreferences so users can resume after backgrounding the app.
>
> ### 3. API contract
>
> The backend register endpoint is unchanged. Submit:
>
> ```http
> POST {BACKEND_URL}/api/auth/register
> Content-Type: application/json
>
> {
>   "name": "...",
>   "email": "...",
>   "password": "...",
>   "company_name": "...",
>   "industry": "<one of: trades | hospitality | transport | healthcare | retail>",
>   "role_id": "<id from the selected industry's role array, e.g. 'electrician'>",
>   "role_label": "<label string, e.g. 'Electrician'>",
>   "role_variant": "<variant string: owner | safety_lead | supervisor | worker>",
>   "permission_role": "<permission_role string: owner | worker>",
>   "marketing_opt_in": true
> }
> ```
>
> Response is a JWT in `{ token, user }` — store the token in secure storage (Keychain / Keystore) and use it as `Authorization: Bearer <token>` on subsequent calls.
>
> ### 4. Post-signup routing (variant → screen)
>
> Use `role_variant` to pick which mobile dashboard the user lands on:
> - `owner` → Owner dashboard (full management view)
> - `safety_lead` → Compliance dashboard (compliance score prominent)
> - `supervisor` → Team dashboard (today's team + tasks)
> - `worker` → Worker dashboard (simplified, mobile-first, big tap targets, SWMS + induction + licences only)
>
> ### 5. Acceptance criteria
>
> - [ ] Selecting **Trades** then tapping next shows exactly the 12 trades roles (Owner, Supervisor, Safety Officer, Office Manager, Electrician, Plumber, Carpenter, Roofer, Concreter, Builder, Apprentice, Subcontractor).
> - [ ] Selecting **Hospitality** then tapping next shows exactly the 12 hospitality roles (Owner, GM, Ops Manager, Head Chef, Sous Chef, Venue Manager, Bar Manager, FOH Manager, Food Safety Supervisor, HR Manager, Team Member, Casual).
> - [ ] Selecting **Transport** → 11 transport roles.
> - [ ] Selecting **Healthcare** → 13 healthcare roles.
> - [ ] Selecting **Retail** → 11 retail roles.
> - [ ] Going back and changing industry rebuilds the role list — no stale state.
> - [ ] Submitting registers the user against `/api/auth/register` with the correct `industry`, `role_id`, `role_variant`, `permission_role` strings.
> - [ ] A worker variant lands on the worker dashboard, an owner variant lands on the owner dashboard.
>
> Ship it.

---

**Notes for you (Sandra/main agent):**

- This list lives in two places now (`/app/frontend/src/data/roles.config.js` on web + the mobile prompt above). If you ever add a sixth industry or a new role, update both.
- The mobile app should call `{REACT_APP_BACKEND_URL}` set in its own `.env` — same backend, no separate API.
