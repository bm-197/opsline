import type { Step } from "../ir.ts";
import { runActivity, type ActivityDeps, type Mailer } from "./activities.ts";
import { evaluateCondition, type RunContext } from "./conditions.ts";
import type { ApprovalDecidedData } from "./events.ts";
import {
  backoffMs,
  DEFAULT_RETRY,
  isRetryable,
  serializeError,
} from "./retry.ts";
import { resolveStepConfig, resolveStringField } from "./templates.ts";
import type { RunStore, StepHistory } from "./store.ts";

// The subset of Inngest's step tooling the interpreter needs. The Inngest
// function adapts real `step.*` to this; tests pass a synchronous fake.
export interface StepTools {
  run<T>(id: string, fn: () => Promise<T> | T): Promise<T>;
  sleep(id: string, ms: number): Promise<void>;
  waitForEvent(
    id: string,
    opts: { event: string; timeoutMs?: number; matchStepRunId: string },
  ): Promise<{ data: ApprovalDecidedData } | null>;
}

export type InterpretDeps = {
  runId: string;
  store: RunStore;
  tools: StepTools;
  activity: ActivityDeps;
};

const now = () => new Date();

function idempotencyKey(
  runId: string,
  stepId: string,
  attempt: number,
): string {
  return `${runId}:${stepId}:${attempt}`;
}

function activityInput(step: Step): Record<string, unknown> {
  switch (step.type) {
    case "http_request":
      return { method: step.method, url: step.url };
    case "send_email":
      return { to: step.to, subject: step.subject };
    case "slack_webhook":
      return { webhookUrl: step.webhookUrl };
    default:
      return {};
  }
}

export async function interpretRun(
  deps: InterpretDeps,
): Promise<{ state: "succeeded" | "failed" }> {
  const { runId, store, tools } = deps;

  const loaded = await tools.run("load", () => store.loadRun(runId));
  if (!loaded) throw new Error(`run ${runId} not found`);
  const orgId = loaded.run.orgId;

  // Prior attempts let a retry-from-failed-step resume without re-running
  // steps that already succeeded.
  const history = await tools.run("load:history", () =>
    store.loadStepHistory(runId),
  );

  await tools.run("run:start", async () => {
    await store.setRunState(runId, "running", { startedAt: now() });
    await store.recordAudit({
      orgId,
      actor: "system",
      action: "run.running",
      entityType: "run",
      entityId: runId,
      after: { state: "running" },
    });
  });

  const context: RunContext = {
    trigger: loaded.run.triggerMeta ?? {},
    steps: {},
  };

  const ok = await executeSteps(loaded.ir.steps, context, deps, history, orgId);

  const finalState = ok ? "succeeded" : "failed";
  await tools.run("run:finalize", async () => {
    await store.setRunState(runId, finalState, {
      finishedAt: now(),
      waitingReason: null,
    });
    await store.recordAudit({
      orgId,
      actor: "system",
      action: `run.${finalState}`,
      entityType: "run",
      entityId: runId,
      after: { state: finalState },
    });
  });

  return { state: finalState };
}

async function executeSteps(
  steps: Step[],
  context: RunContext,
  deps: InterpretDeps,
  history: StepHistory,
  orgId: string,
): Promise<boolean> {
  for (const step of steps) {
    const ok = await executeStep(step, context, deps, history, orgId);
    if (!ok) return false;
  }
  return true;
}

async function executeStep(
  step: Step,
  context: RunContext,
  deps: InterpretDeps,
  history: StepHistory,
  orgId: string,
): Promise<boolean> {
  const { runId, store, tools, activity } = deps;

  // Resume: a step that already succeeded on a prior attempt is not re-run.
  const prior = history[step.id];
  if (prior?.succeeded) {
    context.steps[step.id] = { output: prior.output };
    if (step.type === "branch") {
      const taken =
        (prior.output as { taken?: string } | null)?.taken === "then"
          ? step.then
          : (step.else ?? []);
      return executeSteps(taken, context, deps, history, orgId);
    }
    return true;
  }

  if (step.type === "delay") {
    const { stepRunId } = await tools.run(`begin:${step.id}`, () =>
      store.startStep({
        runId,
        stepId: step.id,
        attempt: 1,
        state: "running",
        input: { durationMs: step.durationMs },
      }),
    );
    await tools.sleep(`sleep:${step.id}`, step.durationMs);
    await tools.run(`end:${step.id}`, () =>
      store.finishStep(stepRunId, "succeeded", {
        output: { sleptMs: step.durationMs },
      }),
    );
    context.steps[step.id] = { output: { sleptMs: step.durationMs } };
    return true;
  }

  if (step.type === "branch") {
    const { taken } = await tools.run(`branch:${step.id}`, async () => {
      const result = evaluateCondition(step.condition, context)
        ? "then"
        : "else";
      const { stepRunId } = await store.startStep({
        runId,
        stepId: step.id,
        attempt: 1,
        state: "running",
        input: { condition: step.condition },
      });
      await store.finishStep(stepRunId, "succeeded", {
        output: { taken: result },
      });
      return { taken: result };
    });
    context.steps[step.id] = { output: { taken } };
    const arm = taken === "then" ? step.then : (step.else ?? []);
    return executeSteps(arm, context, deps, history, orgId);
  }

  if (step.type === "human_approval") {
    const prompt = resolveStringField(step.prompt, context);
    const begin = await tools.run(`approval-begin:${step.id}`, async () => {
      const { stepRunId } = await store.startStep({
        runId,
        stepId: step.id,
        attempt: 1,
        state: "waiting",
        input: { prompt },
      });
      const { approvalId } = await store.createApproval(stepRunId);
      await store.setRunState(runId, "waiting", {
        waitingReason: `Awaiting approval on ${step.id}`,
      });
      await store.recordAudit({
        orgId,
        actor: "system",
        action: "approval.requested",
        entityType: "approval",
        entityId: stepRunId,
        after: { state: "requested" },
      });
      return { stepRunId, approvalId };
    });

    const decision = await tools.waitForEvent(`approval-wait:${step.id}`, {
      event: "opsline/approval.decided",
      timeoutMs: step.timeoutMs,
      matchStepRunId: begin.stepRunId,
    });

    const resolved = await tools.run(
      `approval-resolve:${step.id}`,
      async () => {
        if (!decision) {
          await store.setApprovalState(begin.approvalId, "expired", {
            decidedAt: now(),
          });
          await store.finishStep(begin.stepRunId, "failed", {
            error: { reason: "approval timed out" },
          });
          await store.recordAudit({
            orgId,
            actor: "system",
            action: "approval.expired",
            entityType: "approval",
            entityId: begin.stepRunId,
            after: { state: "expired" },
          });
          return "expired" as const;
        }
        const d = decision.data;
        if (d.decision === "approved") {
          await store.setApprovalState(begin.approvalId, "approved", {
            actorId: d.actorId,
            comment: d.comment,
            decidedAt: now(),
          });
          await store.finishStep(begin.stepRunId, "succeeded", {
            output: { decision: "approved" },
          });
          await store.setRunState(runId, "running", { waitingReason: null });
          await store.recordAudit({
            orgId,
            actor: d.actorId ?? "system",
            action: "approval.approved",
            entityType: "approval",
            entityId: begin.stepRunId,
            after: { state: "approved" },
          });
          return "approved" as const;
        }
        await store.setApprovalState(begin.approvalId, "rejected", {
          actorId: d.actorId,
          comment: d.comment,
          decidedAt: now(),
        });
        await store.finishStep(begin.stepRunId, "failed", {
          error: { reason: "rejected", comment: d.comment ?? null },
        });
        await store.recordAudit({
          orgId,
          actor: d.actorId ?? "system",
          action: "approval.rejected",
          entityType: "approval",
          entityId: begin.stepRunId,
          after: { state: "rejected" },
        });
        return "rejected" as const;
      },
    );

    if (resolved !== "approved") return false;
    context.steps[step.id] = { output: { decision: "approved" } };
    return true;
  }

  // http_request, send_email, slack_webhook: retried per the IR's config.
  // Attempt numbers continue past any prior attempts so a retry-from-step adds
  // new attempts rather than overwriting the failed ones. Config is resolved
  // against the run context once, so every attempt sends the same values.
  const resolved = resolveStepConfig(step, context);
  const retry = step.retry ?? DEFAULT_RETRY;
  const base = prior?.maxAttempt ?? 0;
  let failed = false;
  for (let i = 1; i <= retry.maxAttempts; i++) {
    const attempt = base + i;
    const result = await tools.run(`step:${step.id}:${attempt}`, async () => {
      const { stepRunId } = await store.startStep({
        runId,
        stepId: step.id,
        attempt,
        state: "running",
        input: activityInput(resolved),
      });
      try {
        const output = await runActivity(
          resolved,
          idempotencyKey(runId, step.id, attempt),
          activity,
        );
        await store.finishStep(stepRunId, "succeeded", { output });
        return { ok: true as const, output };
      } catch (error) {
        await store.finishStep(stepRunId, "failed", {
          error: serializeError(error),
        });
        return { ok: false as const, retryable: isRetryable(error) };
      }
    });

    if (result.ok) {
      context.steps[step.id] = { output: result.output };
      failed = false;
      break;
    }

    failed = true;
    if (!result.retryable || i === retry.maxAttempts) break;
    await tools.sleep(`backoff:${step.id}:${attempt}`, backoffMs(retry, i));
  }

  return !failed;
}

export type { Mailer };
