import { redirect } from "next/navigation";

import { WorkflowEditor } from "@/components/workflow-editor";
import { can } from "@/lib/authz";
import { requireContext } from "@/lib/context";

export default async function NewWorkflowPage() {
  const { role } = await requireContext();
  if (!can(role, { workflow: ["create"] })) redirect("/workflows");

  return (
    <WorkflowEditor
      mode="create"
      initial={{
        name: "",
        description: "",
        cron: "",
        webhookEnabled: false,
        steps: [],
      }}
    />
  );
}
