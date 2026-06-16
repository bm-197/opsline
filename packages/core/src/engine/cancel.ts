import type { RunStore } from "./store.ts";

// Records a cancellation in the DB. The caller (the cancel API / approvals UI)
// also sends the `opsline/run.canceled` event, which stops the running Inngest
// function via cancelOn. In-flight steps keep their last recorded state since
// the function is interrupted; completed steps stay correct.
export async function cancelRun(
  store: RunStore,
  runId: string,
  orgId: string,
  actor = "system",
): Promise<void> {
  await store.setRunState(runId, "canceled", {
    finishedAt: new Date(),
    waitingReason: null,
  });
  await store.recordAudit({
    orgId,
    actor,
    action: "run.canceled",
    entityType: "run",
    entityId: runId,
    after: { state: "canceled" },
  });
}
