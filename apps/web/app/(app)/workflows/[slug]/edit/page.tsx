import { validateWorkflowIr } from "@opsline/core";
import { notFound, redirect } from "next/navigation";

import { WorkflowEditor } from "@/components/workflow-editor";
import { can } from "@/lib/authz";
import { requireContext } from "@/lib/context";
import { getWebhookEndpoint, getWorkflow } from "@/lib/queries";
import { irToDraft } from "@/lib/workflow-draft";

export default async function EditWorkflowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { orgId, role } = await requireContext();
  if (!can(role, { workflow: ["update"] })) redirect(`/workflows/${slug}`);

  const found = await getWorkflow(orgId, slug);
  const latest = found?.versions[0];
  if (!found || !latest) notFound();

  const ir = validateWorkflowIr(latest.ir);
  const webhook = await getWebhookEndpoint(found.workflow.id);
  const { draft, editable } = irToDraft(ir, {
    cron: found.workflow.cron,
    webhookEnabled: Boolean(webhook),
  });

  return (
    <WorkflowEditor
      mode="edit"
      slug={slug}
      initial={draft}
      editable={editable}
    />
  );
}
