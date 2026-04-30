import WorkflowPage from "@/components/workflows/WorkflowPage";
import { Calendar } from "@phosphor-icons/react";

export default function AnnualReview() {
  return (
    <WorkflowPage
      wtype="annual_review"
      title="Annual WHS Review"
      eyebrow="Workflow W4"
      lead="Run your yearly WHS audit in 7 structured stages — from scope definition to management sign-off. Use once per year, per entity."
      icon={Calendar}
      entityLabel="Review period"
    />
  );
}
