import Link from "next/link";

import { TriggerButton } from "@/components/run-actions";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/authz";
import { requireContext } from "@/lib/context";
import { listWorkflows } from "@/lib/queries";

export default async function WorkflowsPage() {
  const { orgId, role } = await requireContext();
  const workflows = await listWorkflows(orgId);
  const canRun = can(role, { workflow: ["run"] });
  const canCreate = can(role, { workflow: ["create"] });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="text-sm text-muted">
            Code-first pipelines. Trigger one and watch it run.
          </p>
        </div>
        {canCreate && (
          <Link href="/workflows/new">
            <Button size="sm">New workflow</Button>
          </Link>
        )}
      </div>

      {workflows.length === 0 ? (
        <EmptyState
          line="No workflows yet. Define one and watch it run."
          action={
            canCreate ? (
              <Link href="/workflows/new">
                <Button variant="secondary">New workflow</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {workflows.map((wf) => (
            <GlassCard key={wf.id} className="flex flex-col gap-3 p-5">
              <div className="flex flex-col gap-1">
                <Link
                  href={`/workflows/${wf.slug}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {wf.name}
                </Link>
                {wf.description && (
                  <p className="text-sm text-muted">{wf.description}</p>
                )}
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="font-geist text-xs text-faint">{wf.slug}</span>
                {canRun && <TriggerButton slug={wf.slug} size="sm" />}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </main>
  );
}
