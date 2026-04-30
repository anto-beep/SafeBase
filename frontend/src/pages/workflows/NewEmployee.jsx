import WorkflowPage from "@/components/workflows/WorkflowPage";
import { UserPlus } from "@phosphor-icons/react";

export default function NewEmployee() {
  return (
    <WorkflowPage
      wtype="new_employee"
      title="New Employee Onboarding"
      eyebrow="Workflow W1"
      lead="Track every new worker from profile creation to ready-for-work — 7 steps that keep you compliant from day one."
      icon={UserPlus}
      entityLabel="Worker"
    />
  );
}
