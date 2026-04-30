import SafetyModulePage from "@/components/safety/SafetyModulePage";
import { Warning } from "@phosphor-icons/react";

const CATEGORIES = [
  "Physical / Injury", "Electrical", "Height", "Confined Space",
  "Plant & Equipment", "Chemical / Hazardous", "Fire", "Environmental",
  "Psychosocial", "Security", "Other",
].map((t) => ({ v: t, l: t }));

const SCORES = [1, 2, 3, 4, 5].map((n) => ({ v: String(n), l: String(n) }));

const levelCls = (lvl) => ({
  low: "bg-emerald-600 text-white",
  medium: "bg-warning text-ink",
  high: "bg-orange-500 text-white",
  extreme: "bg-red-700 text-white",
}[lvl] || "bg-muted");

export default function RiskRegister() {
  return (
    <SafetyModulePage
      module="risks"
      title="Risk Register"
      eyebrow="Proactive risk management"
      lead="Identify known risks, rate likelihood × consequence, document controls, assign ownership and review dates."
      icon={Warning}
      emptyMessage="Add your first risk — hazards you already know about."
      fields={[
        { key: "title", label: "Risk title", type: "text", required: true, span: 2 },
        { key: "description", label: "Description — what could happen", type: "textarea", span: 2 },
        { key: "category", label: "Category", type: "select", options: CATEGORIES, required: true },
        { key: "sites", label: "Sites affected", type: "text", placeholder: "All sites / site names" },
        { key: "likelihood", label: "Likelihood (1–5)", type: "select", options: SCORES, required: true },
        { key: "consequence", label: "Consequence (1–5)", type: "select", options: SCORES, required: true },
        { key: "controls", label: "Existing controls", type: "textarea", span: 2 },
        { key: "residual_likelihood", label: "Residual likelihood (after controls)", type: "select", options: SCORES },
        { key: "residual_consequence", label: "Residual consequence", type: "select", options: SCORES },
        { key: "owner", label: "Risk owner", type: "text" },
        { key: "review_date", label: "Review date", type: "date" },
      ]}
      columns={[
        { key: "title", label: "Risk", render: (i) => <span className="font-bold">{i.title}</span> },
        { key: "category", label: "Category" },
        { key: "inherent_level", label: "Inherent", render: (i) => i.inherent_level ? <span className={`${levelCls(i.inherent_level)} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{i.inherent_level.toUpperCase()} · {i.inherent_score}</span> : "—" },
        { key: "residual_level", label: "Residual", render: (i) => i.residual_level ? <span className={`${levelCls(i.residual_level)} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>{i.residual_level.toUpperCase()} · {i.residual_score}</span> : "—" },
        { key: "owner", label: "Owner" },
        { key: "review_date", label: "Review" },
      ]}
    />
  );
}
