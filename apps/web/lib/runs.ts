import { createId } from "@opsline/core";
import { createDrizzleRunStore, runs } from "@opsline/db";

import { inngest } from "@/inngest/client";
import { runRequested } from "@/inngest/events";
import { db } from "@/lib/db";

// Creates a Run, records the trigger in the audit log, and kicks off the engine.
// Shared by the manual trigger action, the webhook route, and the scheduler.
export async function startRun(opts: {
  orgId: string;
  versionId: string;
  trigger: "manual" | "schedule" | "webhook";
  triggerMeta?: Record<string, unknown>;
  actor: string;
}): Promise<string> {
  const runId = createId("run");
  await db.insert(runs).values({
    id: runId,
    workflowVersionId: opts.versionId,
    trigger: opts.trigger,
    triggerMeta: opts.triggerMeta ?? null,
    state: "pending",
  });
  await createDrizzleRunStore(db).recordAudit({
    orgId: opts.orgId,
    actor: opts.actor,
    action: "run.triggered",
    entityType: "run",
    entityId: runId,
    after: { trigger: opts.trigger },
  });
  await inngest.send(runRequested.create({ runId }));
  return runId;
}
