import { notFound } from "next/navigation";

import {
  ApprovalForm,
  CancelButton,
  RetryButton,
} from "@/components/run-actions";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusChip, type RunStatus } from "@/components/ui/chip";
import { CopyableId } from "@/components/ui/copyable-id";
import { JsonBlock } from "@/components/ui/json-block";
import { requireContext } from "@/lib/context";
import { can } from "@/lib/authz";
import { formatDuration, formatStamp } from "@/lib/format";
import { getRun } from "@/lib/queries";

const ACTIVE = new Set(["pending", "running", "waiting"]);

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId, role } = await requireContext();
  const run = await getRun(orgId, id);
  if (!run) notFound();

  const canCancel = can(role, { run: ["cancel"] });
  const canRetry = can(role, { run: ["retry"] });
  const canDecide = can(role, { approval: ["decide"] });

  // Group every attempt by step id, preserving execution order.
  const order: string[] = [];
  const groups = new Map<string, typeof run.steps>();
  for (const step of run.steps) {
    if (!groups.has(step.stepId)) {
      groups.set(step.stepId, []);
      order.push(step.stepId);
    }
    groups.get(step.stepId)!.push(step);
  }

  const approvalByStepRun = new Map(
    run.approvals.map((a) => [a.approval.stepRunId, a.approval]),
  );

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {run.workflowName}
            </h1>
            <StatusChip status={run.run.state as RunStatus} />
          </div>
          <div className="flex flex-wrap items-center gap-3 font-geist text-xs text-muted">
            <span>v{run.version}</span>
            <span>{run.run.trigger}</span>
            <span>{formatDuration(run.run.startedAt, run.run.finishedAt)}</span>
            <span>
              started {formatStamp(run.run.startedAt ?? run.run.createdAt)}
            </span>
            <CopyableId id={run.run.id} />
          </div>
          {run.run.waitingReason && (
            <p className="text-sm text-muted">{run.run.waitingReason}</p>
          )}
        </div>
        <div className="flex gap-2">
          {canCancel && ACTIVE.has(run.run.state) && (
            <CancelButton runId={run.run.id} />
          )}
          {canRetry && run.run.state === "failed" && (
            <RetryButton runId={run.run.id} />
          )}
        </div>
      </div>

      {order.length === 0 ? (
        <p className="text-sm text-muted">No steps have run yet.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {order.map((stepId) => {
            const attempts = groups.get(stepId)!;
            const latest = attempts[attempts.length - 1]!;
            const approval = approvalByStepRun.get(latest.id);
            return (
              <li key={stepId}>
                <GlassCard className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-geist text-sm">{stepId}</span>
                    <StatusChip status={latest.state as RunStatus} />
                  </div>

                  {attempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex flex-col gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0"
                    >
                      {attempts.length > 1 && (
                        <span className="font-geist text-xs text-faint">
                          attempt {attempt.attempt}: {attempt.state}
                        </span>
                      )}
                      <JsonBlock label="input" value={attempt.input} />
                      <JsonBlock label="output" value={attempt.output} />
                      <JsonBlock label="error" value={attempt.error} />
                    </div>
                  ))}

                  {approval?.state === "requested" && canDecide && (
                    <div className="border-t border-line pt-3">
                      <p className="mb-2 text-sm text-muted">
                        This step is waiting on your decision.
                      </p>
                      <ApprovalForm stepRunId={latest.id} runId={run.run.id} />
                    </div>
                  )}
                  {approval && approval.state !== "requested" && (
                    <p className="border-t border-line pt-3 font-geist text-xs text-faint">
                      approval {approval.state}
                      {approval.comment ? `: ${approval.comment}` : ""}
                    </p>
                  )}
                </GlassCard>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
