import SafetyModulePage from "@/components/safety/SafetyModulePage";
import { ChatCircleText } from "@phosphor-icons/react";

const TOPICS = [
  "Working at Heights", "Electrical Safety", "Plumbing Safety", "Confined Spaces",
  "Manual Handling", "Hazardous Substances", "Emergency Procedures",
  "Mental Health & Wellbeing", "Psychosocial Safety", "Fatigue Management",
  "Heat & Cold Stress", "Traffic Management", "Fire Safety", "Noise & Hearing Protection",
].map((t) => ({ v: t, l: t }));

const STATUS = [
  { v: "scheduled", l: "Scheduled" },
  { v: "conducted", l: "Conducted" },
  { v: "archived", l: "Archived" },
];

export default function ToolboxTalks() {
  return (
    <SafetyModulePage
      module="toolbox_talks"
      title="Toolbox Talks"
      eyebrow="Safety briefings"
      lead="Short pre-start safety briefings with workers. Print-ready record for WorkSafe and principal contractors."
      icon={ChatCircleText}
      emptyMessage="Schedule your first toolbox talk — 5-minute pre-start safety briefing."
      fields={[
        { key: "topic", label: "Topic", type: "select", options: TOPICS, required: true, span: 2 },
        { key: "site", label: "Site", type: "text", span: 2 },
        { key: "scheduled_at", label: "Date & time", type: "datetime-local", required: true },
        { key: "conducted_by", label: "Conducted by", type: "text" },
        { key: "status", label: "Status", type: "select", options: STATUS, default: "scheduled" },
        { key: "attendees_count", label: "Expected attendees", type: "number", min: 1 },
        { key: "notes", label: "Key points / notes", type: "textarea", span: 2 },
      ]}
      columns={[
        { key: "topic", label: "Topic", render: (i) => <span className="font-bold">{i.topic}</span> },
        { key: "site", label: "Site" },
        { key: "scheduled_at", label: "Scheduled", render: (i) => i.scheduled_at ? new Date(i.scheduled_at).toLocaleString("en-AU") : "—" },
        { key: "conducted_by", label: "Conducted by" },
        { key: "status", label: "Status", render: (i) => <span className="bg-warning text-ink px-2 py-0.5 text-[10px] font-bold tracking-widest">{(i.status || "scheduled").toUpperCase()}</span> },
      ]}
    />
  );
}
