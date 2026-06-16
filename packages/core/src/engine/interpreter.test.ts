import { describe, expect, it } from "vitest";

import { validateWorkflowIr, type WorkflowIr } from "../ir.ts";
import type { ActivityDeps, MailMessage, Mailer } from "./activities.ts";
import { cancelRun } from "./cancel.ts";
import { interpretRun, type StepTools } from "./interpreter.ts";
import {
  createMemoryRunStore,
  type MemoryRunStore,
  type StepRunRecord,
} from "./store.ts";

const RUN_ID = "run_test";
const ORG_ID = "org_test";

function makeStore(
  ir: WorkflowIr,
  triggerMeta: Record<string, unknown> = {},
): MemoryRunStore {
  return createMemoryRunStore({
    run: {
      id: RUN_ID,
      orgId: ORG_ID,
      state: "pending",
      trigger: "manual",
      triggerMeta,
    },
    ir,
  });
}

type ApprovalReply = {
  decision: "approved" | "rejected";
  actorId?: string;
  comment?: string;
};

function makeTools(
  approvals: Record<string, ApprovalReply | null> = {},
): StepTools {
  return {
    run: (_id, fn) => Promise.resolve(fn()),
    sleep: async () => {},
    waitForEvent: async (id, opts) => {
      const stepId = id.replace("approval-wait:", "");
      const reply = approvals[stepId];
      if (!reply) return null;
      return { data: { stepRunId: opts.matchStepRunId, ...reply } };
    },
  };
}

function fetchSeq(statuses: number[]): typeof fetch {
  let i = 0;
  return (async () => {
    const status = statuses[Math.min(i, statuses.length - 1)] ?? 200;
    i += 1;
    return new Response(JSON.stringify({ call: i }), { status });
  }) as unknown as typeof fetch;
}

function spyMailer(): { calls: MailMessage[]; mailer: Mailer } {
  const calls: MailMessage[] = [];
  return {
    calls,
    mailer: {
      async send(message) {
        calls.push(message);
        return { id: `m_${message.idempotencyKey}` };
      },
    },
  };
}

function deps(store: MemoryRunStore, tools: StepTools, activity: ActivityDeps) {
  return { runId: RUN_ID, store, tools, activity };
}

function stepsFor(store: MemoryRunStore, stepId: string): StepRunRecord[] {
  return [...store.stepRuns.values()]
    .filter((s) => s.stepId === stepId)
    .sort((a, b) => a.attempt - b.attempt);
}

describe("interpretRun: happy path", () => {
  it("runs http, delay, email, slack to success", async () => {
    const ir = validateWorkflowIr({
      name: "wf",
      steps: [
        {
          id: "fetch",
          type: "http_request",
          method: "GET",
          url: "https://x.test/a",
        },
        { id: "settle", type: "delay", durationMs: 1000 },
        {
          id: "notify",
          type: "send_email",
          to: "a@x.test",
          subject: "Hi",
          body: "b",
        },
        {
          id: "ping",
          type: "slack_webhook",
          webhookUrl: "https://x.test/hook",
          text: "done",
        },
      ],
    });
    const store = makeStore(ir);
    const mail = spyMailer();
    const result = await interpretRun(
      deps(store, makeTools(), {
        fetchImpl: fetchSeq([200]),
        mailer: mail.mailer,
      }),
    );

    expect(result.state).toBe("succeeded");
    expect(store.runs.get(RUN_ID)?.state).toBe("succeeded");
    for (const id of ["fetch", "settle", "notify", "ping"]) {
      expect(stepsFor(store, id).at(-1)?.state).toBe("succeeded");
    }
    // idempotency key is run + step + attempt.
    expect(mail.calls[0]?.idempotencyKey).toBe("run_test:notify:1");
  });
});

describe("interpretRun: retries", () => {
  it("retries a 5xx until it succeeds, recording each attempt", async () => {
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
    const store = makeStore(ir);
    const result = await interpretRun(
      deps(store, makeTools(), {
        fetchImpl: fetchSeq([500, 500, 200]),
        mailer: spyMailer().mailer,
      }),
    );

    expect(result.state).toBe("succeeded");
    const attempts = stepsFor(store, "fetch");
    expect(attempts.map((a) => a.attempt)).toEqual([1, 2, 3]);
    expect(attempts.map((a) => a.state)).toEqual([
      "failed",
      "failed",
      "succeeded",
    ]);
  });

  it("fails the run when retries are exhausted", async () => {
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
    const store = makeStore(ir);
    const result = await interpretRun(
      deps(store, makeTools(), {
        fetchImpl: fetchSeq([500]),
        mailer: spyMailer().mailer,
      }),
    );

    expect(result.state).toBe("failed");
    expect(store.runs.get(RUN_ID)?.state).toBe("failed");
    expect(stepsFor(store, "fetch")).toHaveLength(3);
  });

  it("does not retry a 4xx", async () => {
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
    const store = makeStore(ir);
    const result = await interpretRun(
      deps(store, makeTools(), {
        fetchImpl: fetchSeq([400]),
        mailer: spyMailer().mailer,
      }),
    );

    expect(result.state).toBe("failed");
    expect(stepsFor(store, "fetch")).toHaveLength(1);
  });
});

describe("interpretRun: branch", () => {
  const branchIr = (then: string, els: string) =>
    validateWorkflowIr({
      name: "wf",
      steps: [
        {
          id: "gate",
          type: "branch",
          condition: {
            left: { path: "trigger.amount" },
            op: "gt",
            right: 1000,
          },
          then: [{ id: then, type: "delay", durationMs: 0 }],
          else: [{ id: els, type: "delay", durationMs: 0 }],
        },
      ],
    });

  it("takes the then arm when the condition holds", async () => {
    const store = makeStore(branchIr("high", "low"), { amount: 5000 });
    const result = await interpretRun(
      deps(store, makeTools(), {
        fetchImpl: fetchSeq([200]),
        mailer: spyMailer().mailer,
      }),
    );
    expect(result.state).toBe("succeeded");
    expect(stepsFor(store, "gate").at(0)?.output).toEqual({ taken: "then" });
    expect(stepsFor(store, "high")).toHaveLength(1);
    expect(stepsFor(store, "low")).toHaveLength(0);
  });

  it("takes the else arm otherwise", async () => {
    const store = makeStore(branchIr("high", "low"), { amount: 10 });
    await interpretRun(
      deps(store, makeTools(), {
        fetchImpl: fetchSeq([200]),
        mailer: spyMailer().mailer,
      }),
    );
    expect(stepsFor(store, "gate").at(0)?.output).toEqual({ taken: "else" });
    expect(stepsFor(store, "low")).toHaveLength(1);
    expect(stepsFor(store, "high")).toHaveLength(0);
  });
});

describe("interpretRun: approvals", () => {
  const approvalIr = validateWorkflowIr({
    name: "wf",
    steps: [{ id: "approve", type: "human_approval", prompt: "ok?" }],
  });

  it("continues when approved", async () => {
    const store = makeStore(approvalIr);
    const result = await interpretRun(
      deps(
        store,
        makeTools({
          approve: { decision: "approved", actorId: "usr_a", comment: "ok" },
        }),
        { fetchImpl: fetchSeq([200]), mailer: spyMailer().mailer },
      ),
    );
    expect(result.state).toBe("succeeded");
    expect([...store.approvals.values()][0]?.state).toBe("approved");
    expect(stepsFor(store, "approve").at(0)?.state).toBe("succeeded");
    expect(store.audit.some((a) => a.action === "approval.approved")).toBe(
      true,
    );
  });

  it("fails the run when rejected", async () => {
    const store = makeStore(approvalIr);
    const result = await interpretRun(
      deps(
        store,
        makeTools({
          approve: { decision: "rejected", actorId: "usr_a", comment: "dupe" },
        }),
        { fetchImpl: fetchSeq([200]), mailer: spyMailer().mailer },
      ),
    );
    expect(result.state).toBe("failed");
    expect([...store.approvals.values()][0]?.state).toBe("rejected");
    expect(stepsFor(store, "approve").at(0)?.state).toBe("failed");
  });

  it("expires the approval and fails the run on timeout", async () => {
    const store = makeStore(approvalIr);
    const result = await interpretRun(
      deps(store, makeTools({ approve: null }), {
        fetchImpl: fetchSeq([200]),
        mailer: spyMailer().mailer,
      }),
    );
    expect(result.state).toBe("failed");
    expect([...store.approvals.values()][0]?.state).toBe("expired");
    expect(store.audit.some((a) => a.action === "approval.expired")).toBe(true);
  });
});

describe("interpretRun: retry-from-failed-step", () => {
  it("skips already-succeeded steps and adds a new attempt to the failed one", async () => {
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
    const store = makeStore(ir);
    // Simulate a prior run: fetch succeeded, notify failed once.
    store.stepRuns.set("step_prior_fetch", {
      id: "step_prior_fetch",
      runId: RUN_ID,
      stepId: "fetch",
      attempt: 1,
      state: "succeeded",
      input: null,
      output: { status: 200, body: { cached: true } },
      error: null,
    });
    store.stepRuns.set("step_prior_notify", {
      id: "step_prior_notify",
      runId: RUN_ID,
      stepId: "notify",
      attempt: 1,
      state: "failed",
      input: null,
      output: null,
      error: { message: "smtp down" },
    });

    const mail = spyMailer();
    const result = await interpretRun(
      deps(store, makeTools(), {
        fetchImpl: fetchSeq([500]),
        mailer: mail.mailer,
      }),
    );

    expect(result.state).toBe("succeeded");
    // fetch is not re-run: still a single attempt, no new HTTP call needed.
    expect(stepsFor(store, "fetch")).toHaveLength(1);
    // notify gets a fresh attempt numbered after the prior failed one.
    const notifyAttempts = stepsFor(store, "notify");
    expect(notifyAttempts.map((s) => s.attempt)).toEqual([1, 2]);
    expect(notifyAttempts.at(-1)?.state).toBe("succeeded");
    expect(mail.calls).toHaveLength(1);
  });
});

describe("cancelRun", () => {
  it("marks the run canceled and writes an audit event", async () => {
    const ir = validateWorkflowIr({
      name: "wf",
      steps: [{ id: "settle", type: "delay", durationMs: 0 }],
    });
    const store = makeStore(ir);
    await store.setRunState(RUN_ID, "running");
    await cancelRun(store, RUN_ID, ORG_ID, "usr_x");

    expect(store.runs.get(RUN_ID)?.state).toBe("canceled");
    expect(
      store.audit.some(
        (a) => a.action === "run.canceled" && a.actor === "usr_x",
      ),
    ).toBe(true);
  });
});
