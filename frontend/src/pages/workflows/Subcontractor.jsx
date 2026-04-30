import WorkflowPage from "@/components/workflows/WorkflowPage";
import { Handshake } from "@phosphor-icons/react";

export default function Subcontractor() {
  return (
    <WorkflowPage
      wtype="subcontractor"
      title="Subcontractor Engagement"
      eyebrow="Workflow W5"
      lead="Onboard and manage subcontractors with the same rigour as your own crew — 7 stages from invite to active engagement."
      icon={Handshake}
      entityLabel="Subcontractor"
    />
  );
}
