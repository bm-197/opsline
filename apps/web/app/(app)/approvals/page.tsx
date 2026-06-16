import Link from "next/link";

import { ApprovalForm } from "@/components/run-actions";
import { GlassCard } from "@/components/ui/glass-card";
import { CopyableId } from "@/components/ui/copyable-id";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/authz";
import { requireContext } from "@/lib/context";
import { listWaitingApprovals } from "@/lib/queries";

export default async function ApprovalsPage() {
  const { orgId, role } = await requireContext();
  const waiting = await listWaitingApprovals(orgId);
  const canDecide = can(role, { approval: ["decide"] });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted">
          Runs paused for a human decision. Approving or rejecting feeds the
          decision straight back into the workflow.
        </p>
      </div>

      {waiting.length === 0 ? (
        <EmptyState line="Nothing needs you right now. A clear inbox is a good sign." />
      ) : (
        <div className="flex flex-col gap-4">
          {waiting.map(({ approval, stepId, input, runId, workflowName }) => {
            const prompt = (input as { prompt?: string } | null)?.prompt;
            return (
              <GlassCard
                key={approval.id}
                tint="peri"
                className="flex flex-col gap-3 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{workflowName}</span>
                  <Link
                    href={`/runs/${runId}`}
                    className="font-geist text-xs text-muted underline-offset-4 hover:underline"
                  >
                    view run
                  </Link>
                </div>
                <p className="text-sm">
                  {prompt ?? `Step ${stepId} is awaiting approval.`}
                </p>
                <CopyableId id={approval.stepRunId} />
                {canDecide ? (
                  <ApprovalForm stepRunId={approval.stepRunId} runId={runId} />
                ) : (
                  <p className="font-geist text-xs text-faint">
                    view only: your role cannot decide approvals
                  </p>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </main>
  );
}
