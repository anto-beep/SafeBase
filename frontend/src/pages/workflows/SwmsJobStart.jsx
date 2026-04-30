import WorkflowPage from "@/components/workflows/WorkflowPage";
import { FileText } from "@phosphor-icons/react";

export default function SwmsJobStart() {
  return (
    <WorkflowPage
      wtype="swms_job_start"
      title="SWMS to Job Start"
      eyebrow="Workflow W3"
      lead="From draft to first tool-on — 6 gates that ensure no worker starts without a signed-off SWMS."
      icon={FileText}
      entityLabel="Job"
    />
  );
}
