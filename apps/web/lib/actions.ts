"use server";

import { cancelRun } from "@opsline/core";
import { createDrizzleRunStore, runs } from "@opsline/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { inngest } from "@/inngest/client";
import { approvalDecided, runCanceled, runRequested } from "@/inngest/events";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { getWorkflow } from "@/lib/queries";
import { startRun } from "@/lib/runs";

export async function triggerWorkflow(slug: string): Promise<void> {
  const ctx = await requirePermission({ workflow: ["run"] });
  const found = await getWorkflow(ctx.orgId, slug);
  const version = found?.versions[0];
  if (!version) throw new Error(`workflow ${slug} has no version`);

  const runId = await startRun({
    orgId: ctx.orgId,
    versionId: version.id,
    trigger: "manual",
    triggerMeta: { triggeredBy: ctx.userId },
    actor: ctx.userId,
  });
  redirect(`/runs/${runId}`);
}

export async function cancelRunAction(runId: string): Promise<void> {
  const ctx = await requirePermission({ run: ["cancel"] });
  await cancelRun(createDrizzleRunStore(db), runId, ctx.orgId, ctx.userId);
  await inngest.send(runCanceled.create({ runId, actorId: ctx.userId }));
  revalidatePath(`/runs/${runId}`);
  revalidatePath("/runs");
}

export async function retryRunAction(runId: string): Promise<void> {
  const ctx = await requirePermission({ run: ["retry"] });
  await db
    .update(runs)
    .set({
      state: "pending",
      finishedAt: null,
      waitingReason: null,
      updatedAt: new Date(),
    })
    .where(eq(runs.id, runId));
  await createDrizzleRunStore(db).recordAudit({
    orgId: ctx.orgId,
    actor: ctx.userId,
    action: "run.retried",
    entityType: "run",
    entityId: runId,
    after: { state: "pending" },
  });
  await inngest.send(runRequested.create({ runId }));
  revalidatePath(`/runs/${runId}`);
}

export async function decideApprovalAction(input: {
  stepRunId: string;
  runId: string;
  decision: "approved" | "rejected";
  comment?: string;
}): Promise<void> {
  const ctx = await requirePermission({ approval: ["decide"] });
  await inngest.send(
    approvalDecided.create({
      stepRunId: input.stepRunId,
      runId: input.runId,
      decision: input.decision,
      actorId: ctx.userId,
      comment: input.comment || undefined,
    }),
  );
  revalidatePath("/approvals");
  revalidatePath(`/runs/${input.runId}`);
}
