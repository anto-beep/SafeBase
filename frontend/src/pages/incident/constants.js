// Shared constants for the 5-stage Incident Workflow module.
export const STAGES = [
  { key: "reported", label: "Reported", sla_hours: 24 },
  { key: "triage", label: "Triage", sla_hours: 48 },
  { key: "investigation", label: "Investigation", sla_days: 7 },
  { key: "actions", label: "Actions", sla_days: 30 },
  { key: "closed", label: "Closed" },
];

export const INCIDENT_CATEGORIES = [
  "Near Miss", "First Aid Injury", "Medical Treatment Injury",
  "Lost Time Injury", "Property Damage", "Environmental",
  "Dangerous Incident", "Other",
];

export const INCIDENT_TYPES = [
  { key: "near_miss", label: "Near Miss — no injury or damage" },
  { key: "first_aid_injury", label: "First Aid Injury" },
  { key: "medical_treatment_injury", label: "Medical Treatment Injury" },
  { key: "lost_time_injury", label: "Lost Time Injury" },
  { key: "restricted_work_injury", label: "Restricted Work Injury" },
  { key: "fatality", label: "Fatality" },
  { key: "property_damage_only", label: "Property Damage Only" },
  { key: "environmental_incident", label: "Environmental Incident" },
  { key: "dangerous_incident_no_injury", label: "Dangerous Incident (no injury)" },
  { key: "occupational_illness", label: "Occupational Illness / Disease" },
  { key: "psychological_injury", label: "Psychological Injury" },
  { key: "other", label: "Other" },
];

export const SEVERITIES = [
  { v: 1, label: "Negligible", help: "No injury, minimal damage." },
  { v: 2, label: "Minor", help: "First aid, minor damage." },
  { v: 3, label: "Moderate", help: "Medical treatment, moderate damage." },
  { v: 4, label: "Significant", help: "Lost time injury, regulatory interest possible." },
  { v: 5, label: "Critical", help: "Permanent disability, investigation likely." },
  { v: 6, label: "Catastrophic", help: "Fatality, destruction of assets, possible prosecution." },
];

export function severityColor(v) {
  if (!v) return "bg-muted text-muted-foreground";
  if (v <= 2) return "bg-emerald-600 text-white";
  if (v === 3) return "bg-yellow-400 text-ink";
  if (v === 4) return "bg-orange-500 text-white";
  return "bg-red-700 text-white";
}

export const SERIOUS_INJURY_ITEMS = [
  "Immediate in-patient hospital admission",
  "Amputation of any body part",
  "Serious head injury",
  "Serious eye injury",
  "Serious burn",
  "Spinal injury",
  "Loss of a bodily function",
  "Serious laceration requiring surgery",
  "Any other condition requiring immediate treatment as an in-patient",
];

export const DANGEROUS_OCCURRENCE_ITEMS = [
  "Uncontrolled escape of a substance",
  "Explosion or fire",
  "Electric shock requiring treatment",
  "Fall of any plant, substance or thing from a height that endangered a person",
  "Collapse, overturning, failure of any plant that is required to be registered",
  "Structural collapse of a building or structure",
  "Flooding of a tunnel or mine",
  "Implosion, explosion or rockburst in a mine",
  "Any other uncontrolled or unexpected event that seriously endangers a person",
];

export const BODY_AREAS = [
  // [key, label, side ('front'|'back'|'both'), x%, y%]
  ["head", "Head / Skull", "both", 50, 6],
  ["face", "Face", "front", 50, 10],
  ["eye_l", "Left eye", "front", 46, 9],
  ["eye_r", "Right eye", "front", 54, 9],
  ["neck", "Neck", "both", 50, 15],
  ["shoulder_l", "Left shoulder", "both", 38, 20],
  ["shoulder_r", "Right shoulder", "both", 62, 20],
  ["upper_arm_l", "Left upper arm", "both", 33, 28],
  ["upper_arm_r", "Right upper arm", "both", 67, 28],
  ["elbow_l", "Left elbow", "both", 30, 36],
  ["elbow_r", "Right elbow", "both", 70, 36],
  ["forearm_l", "Left forearm", "both", 28, 44],
  ["forearm_r", "Right forearm", "both", 72, 44],
  ["hand_l", "Left hand", "both", 25, 54],
  ["hand_r", "Right hand", "both", 75, 54],
  ["chest", "Chest", "front", 50, 26],
  ["upper_back", "Upper back", "back", 50, 26],
  ["lower_back", "Lower back", "back", 50, 40],
  ["abdomen", "Abdomen", "front", 50, 38],
  ["hip_l", "Left hip", "both", 44, 48],
  ["hip_r", "Right hip", "both", 56, 48],
  ["thigh_l", "Left thigh", "both", 44, 58],
  ["thigh_r", "Right thigh", "both", 56, 58],
  ["knee_l", "Left knee", "both", 44, 70],
  ["knee_r", "Right knee", "both", 56, 70],
  ["lower_leg_l", "Left lower leg", "both", 44, 82],
  ["lower_leg_r", "Right lower leg", "both", 56, 82],
  ["foot_l", "Left foot", "both", 44, 94],
  ["foot_r", "Right foot", "both", 56, 94],
];

export const INJURY_NATURES = [
  "Laceration / Cut", "Bruise / Contusion", "Burn (heat)", "Burn (chemical)",
  "Burn (electrical)", "Fracture (suspected)", "Sprain / Strain", "Dislocation",
  "Crush injury", "Amputation", "Eye injury", "Hearing damage", "Electric shock",
  "Inhalation / Respiratory", "Allergic reaction", "Head injury / Concussion",
  "Spinal injury", "Soft tissue injury", "Abrasion / Graze", "Puncture wound", "Other",
];

export const TREATMENT_OPTIONS = [
  "Wound cleaned and dressed", "Ice / cold pack applied", "Eye wash / eye irrigation",
  "Rest and monitoring", "Limb immobilised / splinted", "CPR performed",
  "AED (defibrillator) used", "Oxygen administered", "Ambulance called (000)",
  "Taken to hospital (by car)", "Taken to GP / medical centre", "Medication administered",
  "No treatment — person refused", "Other",
];

export const CONTRIBUTING_FACTORS = [
  { cat: "Human", items: ["Fatigue", "Distraction", "Inexperience", "Rushing / time pressure", "Complacency", "Failure to follow procedure", "Miscommunication"] },
  { cat: "Environment", items: ["Inadequate lighting", "Extreme weather", "Housekeeping / slip/trip hazard", "Inadequate workspace", "Noise affecting communication", "Extreme temperature"] },
  { cat: "Equipment", items: ["Equipment failure or malfunction", "Inadequate maintenance", "Wrong tool used", "Defective materials", "Equipment not fit for purpose"] },
  { cat: "Supervision", items: ["Inadequate supervision", "Workload too high", "Inadequate planning", "Production pressure", "Inadequate hazard identification"] },
  { cat: "Training", items: ["Inadequate induction", "Inadequate task-specific training", "Training not current", "Competency not verified"] },
  { cat: "System", items: ["No procedure existed", "Procedure inadequate", "Procedure not accessible", "SWMS absent/outdated", "Risk assessment not conducted"] },
];

export const SHORT_TERM_ACTION_TYPES = [
  "Remove hazard immediately", "Repair or replace equipment", "Implement temporary barrier or control",
  "Update or create SWMS", "Conduct toolbox talk", "Increase supervision",
  "Suspend affected work activity", "Notify workers of hazard", "Provide additional PPE", "Other",
];

export const LONG_TERM_ACTION_TYPES = [
  "Update safety management system", "Review and revise risk register",
  "Develop or update safe work procedures", "Implement engineering control",
  "Redesign work process", "Procure safer equipment", "Conduct formal training program",
  "Review supervision arrangements", "Review contractor management process",
  "Conduct workplace audit", "Report to senior management / board", "Other",
];

export const CLOSE_CHECKLIST = {
  regulatory: [
    "Notifiability has been assessed and documented",
    "If notifiable — regulator has been notified by phone (date and reference recorded)",
    "If notifiable — written notification provided if requested",
    "Workers compensation insurer notified if required",
    "Injured worker's treating practitioner notified if required",
    "Return to work plan in place if worker was absent",
  ],
  investigation: [
    "Detailed description of incident completed",
    "Contributing factors identified and documented",
    "Root cause determined and documented",
    "Affected worker(s) consulted",
    "Evidence attached",
  ],
  actions: [
    "All short-term corrective actions assigned and underway",
    "All long-term corrective actions assigned with due dates",
    "Risk register reviewed and updated if required",
    "SWMS reviewed and updated if required",
    "Relevant toolbox talk conducted",
    "Workers informed of incident outcome",
  ],
  documentation: [
    "Incident record is complete and accurate",
    "All required fields completed",
    "Evidence and supporting documents attached",
    "Investigation report generated if required",
  ],
};
