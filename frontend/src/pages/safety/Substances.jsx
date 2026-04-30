import SafetyModulePage from "@/components/safety/SafetyModulePage";
import { Flask } from "@phosphor-icons/react";

const HAZARD_CLASSES = [
  "Flammable liquid", "Flammable gas", "Corrosive", "Toxic", "Oxidising",
  "Irritant", "Carcinogenic", "Environmental hazard", "Other",
].map((t) => ({ v: t, l: t }));

const PRODUCT_TYPES = [
  "Solvent", "Adhesive", "Flux", "Thread sealant", "Gas",
  "Chemical cleaner", "Paint", "Lubricant", "Refrigerant", "Other",
].map((t) => ({ v: t, l: t }));

export default function Substances() {
  return (
    <SafetyModulePage
      module="substances"
      title="Hazardous Substances"
      eyebrow="Substances & SDS register"
      lead="Required under WHS Reg 344–348. Keep a current register of every hazardous substance stored or used on site."
      icon={Flask}
      emptyMessage="Add your first hazardous substance — solvent, adhesive, flux or gas."
      fields={[
        { key: "product_name", label: "Product name", type: "text", required: true, span: 2 },
        { key: "manufacturer", label: "Manufacturer", type: "text" },
        { key: "product_type", label: "Product type", type: "select", options: PRODUCT_TYPES },
        { key: "hazard_class", label: "Hazard class", type: "select", options: HAZARD_CLASSES },
        { key: "sds_date", label: "SDS date", type: "date" },
        { key: "storage_location", label: "Storage location", type: "text", span: 2 },
        { key: "max_quantity", label: "Max quantity on site", type: "text", placeholder: "e.g. 20L" },
        { key: "required_ppe", label: "Required PPE", type: "text", span: 2, placeholder: "gloves, eye protection, respirator" },
      ]}
      columns={[
        { key: "product_name", label: "Product", render: (i) => <span className="font-bold">{i.product_name}</span> },
        { key: "manufacturer", label: "Manufacturer" },
        { key: "hazard_class", label: "Hazard class", render: (i) => i.hazard_class ? <span className="bg-warning text-ink px-2 py-0.5 text-[10px] font-bold tracking-widest">{i.hazard_class.toUpperCase()}</span> : "—" },
        { key: "storage_location", label: "Storage" },
        { key: "sds_date", label: "SDS date", render: (i) => {
          if (!i.sds_date) return "—";
          const ageDays = Math.floor((Date.now() - new Date(i.sds_date).getTime()) / 86400000);
          const stale = ageDays > 365 * 5;
          return <span className={stale ? "text-red-600 font-bold" : ""}>{i.sds_date}{stale && " · review"}</span>;
        }},
      ]}
    />
  );
}
