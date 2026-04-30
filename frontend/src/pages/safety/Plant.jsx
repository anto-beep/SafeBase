import SafetyModulePage from "@/components/safety/SafetyModulePage";
import { Truck } from "@phosphor-icons/react";

const TYPES = [
  "Vehicle", "Trailer", "Generator", "EWP / Boom Lift", "Forklift",
  "Scaffolding", "Compressor", "Power Tool", "Ladder", "Electrical Test Equipment", "Other",
].map((t) => ({ v: t, l: t }));

export default function Plant() {
  return (
    <SafetyModulePage
      module="plant"
      title="Plant & Equipment"
      eyebrow="Plant register"
      lead="Every generator, EWP, power tool and vehicle tracked — with registration, service and pre-start inspections."
      icon={Truck}
      emptyMessage="Register your first piece of plant or equipment."
      fields={[
        { key: "name", label: "Equipment name", type: "text", required: true, span: 2 },
        { key: "type", label: "Type", type: "select", options: TYPES, required: true },
        { key: "make_model", label: "Make & model", type: "text" },
        { key: "serial_number", label: "Serial / Rego", type: "text" },
        { key: "site", label: "Assigned site", type: "text" },
        { key: "rego_expiry", label: "Registration expiry", type: "date" },
        { key: "next_service", label: "Next service due", type: "date" },
        { key: "next_inspection", label: "Next inspection due", type: "date" },
        { key: "operators", label: "Authorised operators", type: "text", span: 2, placeholder: "Comma separated names" },
      ]}
      columns={[
        { key: "name", label: "Equipment", render: (i) => <span className="font-bold">{i.name}</span> },
        { key: "type", label: "Type" },
        { key: "serial_number", label: "Rego/Serial", className: "font-mono text-xs" },
        { key: "site", label: "Site" },
        { key: "next_inspection", label: "Next inspection", render: (i) => {
          if (!i.next_inspection) return "—";
          const days = i.next_inspection_days;
          const cls = days == null ? "" : days < 0 ? "bg-red-600 text-white" : days <= 14 ? "bg-warning text-ink" : "bg-muted";
          return <span className={`px-2 py-0.5 text-[10px] font-bold ${cls}`}>{i.next_inspection}{days != null && ` · ${days}d`}</span>;
        }},
        { key: "rego_expiry", label: "Rego expiry" },
      ]}
    />
  );
}
