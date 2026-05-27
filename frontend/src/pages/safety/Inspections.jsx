import SafetyModulePage from "@/components/safety/SafetyModulePage";
import { ClipboardText } from "@phosphor-icons/react";

const TEMPLATES = [
  "Site Safety — General Construction", "Pre-Start Vehicle Check",
  "Pre-Start EWP / Boom Lift Check", "Electrical Installation Inspection",
  "Plumbing Work Inspection", "Working at Heights Setup Check",
  "Confined Space Pre-Entry Check", "Scaffold Inspection",
  "Emergency Equipment Check", "Office / Workshop Safety",
].map((t) => ({ v: t, l: t }));

const STATUS = [
  { v: "scheduled", l: "Scheduled" },
  { v: "passed", l: "Passed" },
  { v: "failed", l: "Failed" },
  { v: "in_progress", l: "In progress" },
];

export default function Inspections() {
  return (
    <SafetyModulePage
      module="inspections"
      title="Inspections"
      eyebrow="Inspection checklists"
      lead="Pre-start equipment checks, site safety inspections, scaffold and electrical checks — logged and trackable."
      icon={ClipboardText}
      emptyMessage="Log your first inspection or schedule a recurring one."
      fields={[
        { key: "template_name", label: "Template", type: "select", options: TEMPLATES, required: true, span: 2 },
        { key: "site", label: "Site", type: "text" },
        { key: "conducted_by", label: "Conducted by", type: "person" },
        { key: "conducted_at", label: "Date", type: "date" },
        { key: "score", label: "Score (%)", type: "number", min: 0, max: 100 },
        { key: "status", label: "Status", type: "select", options: STATUS, default: "scheduled" },
        { key: "fail_count", label: "Items failed", type: "number", min: 0 },
        { key: "notes", label: "Notes", type: "textarea", span: 2 },
      ]}
      columns={[
        { key: "template_name", label: "Template", render: (i) => <span className="font-bold">{i.template_name}</span> },
        { key: "site", label: "Site" },
        { key: "conducted_at", label: "Date" },
        { key: "conducted_by", label: "Conducted by" },
        { key: "score", label: "Score", render: (i) => i.score != null ? `${i.score}%` : "—" },
        { key: "status", label: "Status", render: (i) => {
          const cls = i.status === "passed" ? "bg-emerald-600 text-white" : i.status === "failed" ? "bg-red-600 text-white" : "bg-warning text-ink";
          return <span className={`${cls} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{(i.status || "scheduled").replace(/_/g, ' ').toUpperCase()}</span>;
        }},
      ]}
    />
  );
}
