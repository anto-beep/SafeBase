/**
 * Role configuration per industry — Part 1 of the Multi-Industry brief.
 *
 * Each role maps to a `variant` that drives which dashboard layout the
 * user lands on after login:
 *   - owner          → Full management dashboard (existing rich Dashboard)
 *   - safety_lead    → Compliance-lead dashboard (compliance score dominant)
 *   - supervisor     → Team dashboard (today's team + tasks)
 *   - worker         → Simplified mobile-first worker view
 *
 * The `permission_role` is the persisted server-side role string used by
 * existing API guards — we keep it limited to {owner, worker} since auth
 * was originally trades-only. `role_title` is the human-readable variant.
 */

export const ROLES_BY_INDUSTRY = {
  trades: [
    { id: "owner", label: "Business Owner / Director", variant: "owner", permission_role: "owner" },
    { id: "supervisor", label: "Site Supervisor / Foreman", variant: "supervisor", permission_role: "owner" },
    { id: "safety_officer", label: "Safety Officer / WHS Manager", variant: "safety_lead", permission_role: "owner" },
    { id: "office_manager", label: "Office Manager / Administrator", variant: "owner", permission_role: "owner" },
    { id: "electrician", label: "Electrician", variant: "worker", permission_role: "worker" },
    { id: "plumber", label: "Plumber", variant: "worker", permission_role: "worker" },
    { id: "carpenter", label: "Carpenter / Joiner", variant: "worker", permission_role: "worker" },
    { id: "roofer", label: "Roofer", variant: "worker", permission_role: "worker" },
    { id: "concreter", label: "Concreter", variant: "worker", permission_role: "worker" },
    { id: "builder", label: "Builder / General Trades", variant: "worker", permission_role: "worker" },
    { id: "apprentice", label: "Apprentice", variant: "worker", permission_role: "worker" },
    { id: "subcontractor", label: "Subcontractor", variant: "worker", permission_role: "worker" },
  ],
  hospitality: [
    { id: "owner", label: "Owner / Director", variant: "owner", permission_role: "owner" },
    { id: "general_manager", label: "General Manager", variant: "owner", permission_role: "owner" },
    { id: "operations_manager", label: "Operations Manager", variant: "owner", permission_role: "owner" },
    { id: "head_chef", label: "Head Chef / Executive Chef", variant: "supervisor", permission_role: "owner" },
    { id: "sous_chef", label: "Sous Chef / Kitchen Manager", variant: "supervisor", permission_role: "owner" },
    { id: "venue_manager", label: "Restaurant / Venue Manager", variant: "supervisor", permission_role: "owner" },
    { id: "bar_manager", label: "Bar Manager", variant: "supervisor", permission_role: "owner" },
    { id: "foh_manager", label: "Front of House Manager", variant: "supervisor", permission_role: "owner" },
    { id: "food_safety_supervisor", label: "Food Safety Supervisor", variant: "safety_lead", permission_role: "owner" },
    { id: "hr_manager", label: "HR / People Manager", variant: "owner", permission_role: "owner" },
    { id: "team_member", label: "Staff Member / Team Member", variant: "worker", permission_role: "worker" },
    { id: "casual", label: "Casual Worker", variant: "worker", permission_role: "worker" },
  ],
  transport: [
    { id: "owner", label: "Business Owner / Director", variant: "owner", permission_role: "owner" },
    { id: "fleet_manager", label: "Transport Manager / Fleet Manager", variant: "owner", permission_role: "owner" },
    { id: "operations_manager", label: "Operations Manager / Dispatcher", variant: "supervisor", permission_role: "owner" },
    { id: "safety_manager", label: "Safety Manager / WHS Officer", variant: "safety_lead", permission_role: "owner" },
    { id: "hc_driver", label: "Heavy Vehicle Driver (HC/MC)", variant: "worker", permission_role: "worker" },
    { id: "hr_driver", label: "Rigid Truck Driver (HR)", variant: "worker", permission_role: "worker" },
    { id: "courier", label: "Courier / Light Vehicle Driver", variant: "worker", permission_role: "worker" },
    { id: "warehouse_manager", label: "Warehouse Manager", variant: "supervisor", permission_role: "owner" },
    { id: "loader", label: "Loader / Packer", variant: "worker", permission_role: "worker" },
    { id: "scheduler", label: "Freight Manager / Scheduler", variant: "supervisor", permission_role: "owner" },
    { id: "admin", label: "Administration", variant: "owner", permission_role: "owner" },
  ],
  healthcare: [
    { id: "owner", label: "Practice Owner / Director", variant: "owner", permission_role: "owner" },
    { id: "practice_manager", label: "Practice Manager / Operations Manager", variant: "owner", permission_role: "owner" },
    { id: "rn", label: "Registered Nurse", variant: "worker", permission_role: "worker" },
    { id: "en", label: "Enrolled Nurse", variant: "worker", permission_role: "worker" },
    { id: "physio", label: "Physiotherapist", variant: "worker", permission_role: "worker" },
    { id: "ot", label: "Occupational Therapist", variant: "worker", permission_role: "worker" },
    { id: "psychologist", label: "Psychologist", variant: "worker", permission_role: "worker" },
    { id: "allied_health", label: "Allied Health Practitioner", variant: "worker", permission_role: "worker" },
    { id: "support_worker", label: "Support Worker / Care Worker", variant: "worker", permission_role: "worker" },
    { id: "ndis_coordinator", label: "NDIS Support Coordinator", variant: "supervisor", permission_role: "owner" },
    { id: "aged_care_manager", label: "Aged Care Manager", variant: "supervisor", permission_role: "owner" },
    { id: "clinical_governance", label: "Clinical Governance Officer", variant: "safety_lead", permission_role: "owner" },
    { id: "admin", label: "Administration / Reception", variant: "owner", permission_role: "owner" },
  ],
  retail: [
    { id: "owner", label: "Business Owner / Director", variant: "owner", permission_role: "owner" },
    { id: "store_manager", label: "Store Manager", variant: "owner", permission_role: "owner" },
    { id: "assistant_manager", label: "Assistant Store Manager", variant: "supervisor", permission_role: "owner" },
    { id: "area_manager", label: "Area / District Manager", variant: "owner", permission_role: "owner" },
    { id: "shift_supervisor", label: "Shift Supervisor", variant: "supervisor", permission_role: "owner" },
    { id: "full_time", label: "Full-Time Staff Member", variant: "worker", permission_role: "worker" },
    { id: "part_time", label: "Part-Time Staff Member", variant: "worker", permission_role: "worker" },
    { id: "casual", label: "Casual Worker", variant: "worker", permission_role: "worker" },
    { id: "warehouse", label: "Warehouse / Stockroom Team", variant: "worker", permission_role: "worker" },
    { id: "hr_manager", label: "HR / People Manager", variant: "owner", permission_role: "owner" },
    { id: "admin", label: "Administration", variant: "owner", permission_role: "owner" },
  ],
};

export const VALID_VARIANTS = ["owner", "safety_lead", "supervisor", "worker"];

export function findRole(industry, role_id) {
  const list = ROLES_BY_INDUSTRY[industry] || ROLES_BY_INDUSTRY.trades;
  return list.find((r) => r.id === role_id) || list[0];
}
