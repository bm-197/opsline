import {
  createId,
  validateWorkflowIr,
  type RunStore,
  type TriggerKind,
} from "@opsline/core";
import { eq } from "drizzle-orm";

import type { Database } from "./client.ts";
import {
  approvals,
  auditEvents,
  runs,
  stepRuns,
  workflows,
  workflowVersions,
} from "./schema.ts";

// The production RunStore: the engine writes through this and the UI reads the
// same rows. Mirrors the in-memory store used in engine tests.
export function createDrizzleRunStore(db: Database): RunStore {
  return {
    async loadRun(runId) {
      const [row] = await db
        .select({ run: runs, ir: workflowVersions.ir, orgId: workflows.orgId })
        .from(runs)
        .innerJoin(
          workflowVersions,
          eq(runs.workflowVersionId, workflowVersions.id),
        )
        .innerJoin(workflows, eq(workflowVersions.workflowId, workflows.id))
        .where(eq(runs.id, runId))
        .limit(1);
      if (!row) return null;
      return {
        run: {
          id: row.run.id,
          orgId: row.orgId,
          state: row.run.state,
          trigger: row.run.trigger as TriggerKind,
          triggerMeta: (row.run.triggerMeta as Record<string, unknown>) ?? null,
        },
        ir: validateWorkflowIr(row.ir),
      };
    },

    async loadStepHistory(runId) {
      const rows = await db
        .select()
        .from(stepRuns)
        .where(eq(stepRuns.runId, runId));
      const history: Record<
        string,
        { succeeded: boolean; output: unknown; maxAttempt: number }
      > = {};
      for (const sr of rows) {
        const prior = history[sr.stepId] ?? {
          succeeded: false,
          output: null,
          maxAttempt: 0,
        };
        history[sr.stepId] = {
          succeeded: prior.succeeded || sr.state === "succeeded",
          output: sr.state === "succeeded" ? sr.output : prior.output,
          maxAttempt: Math.max(prior.maxAttempt, sr.attempt),
        };
      }
      return history;
    },

    async setRunState(runId, state, patch) {
      await db
        .update(runs)
        .set({
          state,
          updatedAt: new Date(),
          ...(patch?.waitingReason !== undefined
            ? { waitingReason: patch.waitingReason }
            : {}),
          ...(patch?.startedAt ? { startedAt: patch.startedAt } : {}),
          ...(patch?.finishedAt ? { finishedAt: patch.finishedAt } : {}),
        })
        .where(eq(runs.id, runId));
    },

    async startStep(input) {
      const stepRunId = createId("stepRun");
      await db.insert(stepRuns).values({
        id: stepRunId,
        runId: input.runId,
        stepId: input.stepId,
        attempt: input.attempt,
        state: input.state,
        input: input.input ?? null,
        startedAt: new Date(),
      });
      return { stepRunId };
    },

    async setStepState(stepRunId, state) {
      await db
        .update(stepRuns)
        .set({ state, updatedAt: new Date() })
        .where(eq(stepRuns.id, stepRunId));
    },

    async finishStep(stepRunId, state, patch) {
      await db
        .update(stepRuns)
        .set({
          state,
          finishedAt: new Date(),
          updatedAt: new Date(),
          ...(patch?.output !== undefined ? { output: patch.output } : {}),
          ...(patch?.error !== undefined ? { error: patch.error } : {}),
        })
        .where(eq(stepRuns.id, stepRunId));
    },

    async createApproval(stepRunId) {
      const approvalId = createId("approval");
      await db.insert(approvals).values({
        id: approvalId,
        stepRunId,
        state: "requested",
      });
      return { approvalId };
    },

    async setApprovalState(approvalId, state, patch) {
      await db
        .update(approvals)
        .set({
          state,
          updatedAt: new Date(),
          ...(patch?.actorId !== undefined ? { actorId: patch.actorId } : {}),
          ...(patch?.comment !== undefined ? { comment: patch.comment } : {}),
          ...(patch?.decidedAt ? { decidedAt: patch.decidedAt } : {}),
        })
        .where(eq(approvals.id, approvalId));
    },

    async recordAudit(event) {
      await db.insert(auditEvents).values({
        id: createId("auditEvent"),
        orgId: event.orgId,
        actor: event.actor,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        before: event.before ?? null,
        after: event.after ?? null,
      });
    },
  };
}
