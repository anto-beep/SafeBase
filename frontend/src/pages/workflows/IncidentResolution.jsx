import WorkflowPage from "@/components/workflows/WorkflowPage";
import { Warning } from "@phosphor-icons/react";

export default function IncidentResolution() {
  return (
    <WorkflowPage
      wtype="incident_resolution"
      title="Incident Resolution"
      eyebrow="Workflow W2"
      lead="From report to close-out — 7 stages of incident management, regulator-ready evidence at every step."
      icon={Warning}
      entityLabel="Incident"
    />
  );
}
