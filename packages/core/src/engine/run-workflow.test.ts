import { InngestTestEngine } from "@inngest/test";
import { Inngest } from "inngest";
import { describe, expect, it } from "vitest";

import { validateWorkflowIr, type WorkflowIr } from "../ir.ts";
import { consoleMailer } from "./activities.ts";
import { RUN_REQUESTED } from "./events.ts";
import { createRunWorkflowFunction } from "./run-workflow.ts";
import { createMemoryRunStore, type MemoryRunStore } from "./store.ts";

// @inngest/test@1.0.0 drives the real Inngest function through real step
// tooling, proving the adapter wiring (createFunction, triggers, step.run).
// It does not model step retries or auto-advance step.sleep, so retry,
// approval, and cancel scenarios are covered exhaustively in interpreter.test
// via the StepTools seam. Here we cover sleep-free paths end to end.
const client = new Inngest({ id: "test-app" });

function fetchStatus(status: number): typeof fetch {
  return (async () =>
    new Response(JSON.stringify({ ok: true }), {
      status,
    })) as unknown as typeof fetch;
}

function setup(ir: WorkflowIr, fetchImpl: typeof fetch) {
  const store: MemoryRunStore = createMemoryRunStore({
    run: {
      id: "run_x",
      orgId: "org_x",
      state: "pending",
      trigger: "manual",
      triggerMeta: {},
    },
    ir,
  });
  const fn = createRunWorkflowFunction(client, {
    store,
    mailer: consoleMailer,
    fetchImpl,
  });
  const engine = new InngestTestEngine({
    function: fn,
    events: [{ name: RUN_REQUESTED, data: { runId: "run_x" } }],
  });
  return { store, engine };
}

describe("run-workflow Inngest function (@inngest/test)", () => {
  it("drives a workflow to success through real step tooling", async () => {
    const ir = validateWorkflowIr({
      name: "wf",
      steps: [
        {
          id: "fetch",
          type: "http_request",
          method: "GET",
          url: "https://x.test/a",
        },
        {
          id: "notify",
          type: "send_email",
          to: "a@x.test",
          subject: "s",
          body: "b",
        },
      ],
    });
    const { store, engine } = setup(ir, fetchStatus(200));

    const { result, error } = await engine.execute();

    expect(error).toBeUndefined();
    expect((result as { state: string }).state).toBe("succeeded");
    expect(store.runs.get("run_x")?.state).toBe("succeeded");
    expect(
      [...store.stepRuns.values()].every((s) => s.state === "succeeded"),
    ).toBe(true);
  });

  it("fails the run on a non-retryable response", async () => {
    const ir = validateWorkflowIr({
      name: "wf",
      steps: [
        {
          id: "fetch",
          type: "http_request",
          method: "GET",
          url: "https://x.test/a",
        },
      ],
    });
    const { store, engine } = setup(ir, fetchStatus(400));

    const { result, error } = await engine.execute();

    expect(error).toBeUndefined();
    expect((result as { state: string }).state).toBe("failed");
    expect(store.runs.get("run_x")?.state).toBe("failed");
    expect([...store.stepRuns.values()]).toHaveLength(1);
  });
});
