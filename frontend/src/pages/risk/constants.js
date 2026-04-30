// Shared constants + tiny helpers for the Risk Register & Library UI.
// Keep everything here so individual pages stay focused on composition.

export const HIERARCHY_LEVELS = [
  { key: "elimination", label: "Elimination", desc: "Remove the hazard entirely", color: "bg-emerald-600 text-white" },
  { key: "substitution", label: "Substitution", desc: "Replace with something less hazardous", color: "bg-teal-600 text-white" },
  { key: "isolation", label: "Isolation", desc: "Separate people from the hazard", color: "bg-sky-600 text-white" },
  { key: "engineering", label: "Engineering", desc: "Physical controls to reduce risk", color: "bg-indigo-600 text-white" },
  { key: "administrative", label: "Administrative", desc: "Procedures, training, supervision", color: "bg-amber-600 text-white" },
  { key: "ppe", label: "PPE", desc: "Personal protective equipment as last resort", color: "bg-red-600 text-white" },
];

export const HIERARCHY_MAP = Object.fromEntries(HIERARCHY_LEVELS.map((h) => [h.key, h]));

export const HAZARD_CATEGORIES = [
  "Electrical", "Mechanical", "Chemical / Hazardous Substance", "Physical / Ergonomic",
  "Biological", "Psychosocial", "Environmental", "Fire / Explosion", "Height / Fall",
  "Confined Space", "Vehicle / Traffic", "Noise", "Radiation", "Temperature Extremes", "Other",
];

export const TRADE_TYPES = [
  "Electrical", "Plumbing", "Gas Fitting", "Roof Plumbing",
  "General Construction", "Civil", "All Trades",
];

export const LIKELIHOOD_SCALE = [
  { v: 1, label: "Rare", help: "May occur only in exceptional circumstances." },
  { v: 2, label: "Unlikely", help: "Could occur at some time but not expected." },
  { v: 3, label: "Possible", help: "Might occur at some time." },
  { v: 4, label: "Likely", help: "Will probably occur in most circumstances." },
  { v: 5, label: "Almost Certain", help: "Is expected to occur in most circumstances." },
];

export const CONSEQUENCE_SCALE = [
  { v: 1, label: "Insignificant", help: "No injuries. Negligible damage. No regulatory interest." },
  { v: 2, label: "Minor", help: "First aid. Minor damage. No regulator notification." },
  { v: 3, label: "Moderate", help: "Medical treatment. Moderate damage. Notification may be required." },
  { v: 4, label: "Major", help: "Serious injury. Lost time. Regulatory investigation likely." },
  { v: 5, label: "Catastrophic", help: "Fatality or permanent disability. Prosecution possible." },
];

export const SOURCE_OPTIONS = [
  "Incident or Near Miss", "Inspection Finding", "Hazard Report", "Risk Assessment",
  "Audit", "Legislative Change", "New Work Activity", "Worker Consultation",
  "Management Review", "Other",
];

export const REVIEW_REASONS = [
  "Scheduled periodic review", "New incident linked to this risk", "Failed inspection finding",
  "Near-miss occurrence", "Change in work practice or procedure", "New equipment or materials introduced",
  "Legislative or regulatory change", "Worker feedback or complaint", "Management direction",
  "Post-incident investigation finding", "Change in site or operating conditions",
  "New subcontractor or worker type engaged", "Other",
];

export const ACTION_TYPES = [
  "Improve existing control", "Add new control", "Update SWMS", "Schedule training",
  "Conduct toolbox talk", "Repair or replace equipment", "Update procedure or work instruction",
  "Escalate to management", "Other",
];

export function riskLevel(score) {
  if (!score) return { key: null, label: "—", color: "bg-muted text-muted-foreground" };
  if (score <= 5) return { key: "low", label: "LOW", color: "bg-emerald-600 text-white" };
  if (score <= 11) return { key: "medium", label: "MEDIUM", color: "bg-yellow-400 text-ink" };
  if (score <= 19) return { key: "high", label: "HIGH", color: "bg-orange-500 text-white" };
  return { key: "extreme", label: "EXTREME", color: "bg-red-700 text-white" };
}

export function MatrixCellClass(score) {
  // for heat-map cell backgrounds
  if (score <= 5) return "bg-emerald-600/90 text-white";
  if (score <= 11) return "bg-yellow-400 text-ink";
  if (score <= 19) return "bg-orange-500 text-white";
  return "bg-red-700 text-white";
}
