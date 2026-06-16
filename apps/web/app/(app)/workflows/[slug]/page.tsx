import { collectStepIds, validateWorkflowIr } from "@opsline/core";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TriggerButton } from "@/components/run-actions";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Chip } from "@/components/ui/chip";
import { JsonBlock } from "@/components/ui/json-block";
import { can } from "@/lib/authz";
import { requireContext } from "@/lib/context";
import { formatStamp } from "@/lib/format";
import { getWebhookEndpoint, getWorkflow } from "@/lib/queries";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { orgId, role } = await requireContext();
  const found = await getWorkflow(orgId, slug);
  if (!found) notFound();
  const canRun = can(role, { workflow: ["run"] });
  const canEdit = can(role, { workflow: ["update"] });

  const { workflow, versions } = found;
  const latest = versions[0];
  const ir = latest ? validateWorkflowIr(latest.ir) : null;
  const webhook = await getWebhookEndpoint(workflow.id);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {workflow.name}
          </h1>
          {workflow.description && (
            <p className="max-w-2xl text-sm text-muted">
              {workflow.description}
            </p>
          )}
          <div className="mt-1 flex items-center gap-3 font-geist text-xs text-faint">
            <span>{workflow.slug}</span>
            <Link
              href={`/runs?workflow=${workflow.slug}`}
              className="underline-offset-4 hover:underline"
            >
              view runs
            </Link>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link href={`/workflows/${workflow.slug}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
          )}
          {canRun && <TriggerButton slug={workflow.slug} />}
        </div>
      </div>

      {ir && (
        <GlassCard className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <span className="font-medium">Definition</span>
            <Chip>version {latest!.version}</Chip>
          </div>
          <ol className="flex flex-col gap-2">
            {collectStepIds(ir).map((stepId, i) => (
              <li
                key={stepId}
                className="flex items-center gap-3 font-geist text-sm"
              >
                <span className="text-faint">{i + 1}</span>
                <span>{stepId}</span>
              </li>
            ))}
          </ol>
          <JsonBlock label="IR" value={ir} />
        </GlassCard>
      )}

      <div className="flex flex-wrap gap-3">
        {workflow.cron && <Chip>schedule {workflow.cron}</Chip>}
        {webhook && (
          <GlassCard className="flex flex-1 flex-col gap-2 p-5">
            <span className="font-medium">Webhook trigger</span>
            <p className="text-sm text-muted">
              POST a signed request to start a run. Sign with the endpoint
              secret over{" "}
              <span className="font-geist text-xs">timestamp.body</span>.
            </p>
            <code className="overflow-x-auto rounded-xl border border-line bg-canvas px-3 py-2 font-geist text-xs text-muted">
              POST /api/webhooks/{webhook.token}
            </code>
          </GlassCard>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-geist text-xs text-faint">Versions</span>
        {versions.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-2 font-geist text-xs text-muted"
          >
            <span>version {v.version}</span>
            <span>{formatStamp(v.createdAt)}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
