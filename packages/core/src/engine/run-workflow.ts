import type { Inngest } from "inngest";

import type { ActivityDeps, Mailer } from "./activities.ts";
import {
  RUN_CANCELED,
  RUN_REQUESTED,
  type ApprovalDecidedData,
  type RunRequestedData,
} from "./events.ts";
import { interpretRun, type StepTools } from "./interpreter.ts";
import type { RunStore } from "./store.ts";

export type RunWorkflowDeps = {
  store: RunStore;
  mailer: Mailer;
  fetchImpl?: typeof fetch;
};

// Builds the single Inngest function that executes a Run by interpreting its
// WorkflowVersion IR. The client is injected so tests can supply their own.
export function createRunWorkflowFunction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: Inngest<any>,
  deps: RunWorkflowDeps,
) {
  const activity: ActivityDeps = {
    fetchImpl: deps.fetchImpl ?? fetch,
    mailer: deps.mailer,
  };

  return client.createFunction(
    {
      id: "run-workflow",
      retries: 0,
      triggers: [{ event: RUN_REQUESTED }],
      cancelOn: [{ event: RUN_CANCELED, match: "data.runId" }],
    },
    async ({ event, step }) => {
      const { runId } = event.data as RunRequestedData;

      const tools: StepTools = {
        run: <T>(id: string, fn: () => Promise<T> | T): Promise<T> =>
          step.run(id, fn) as unknown as Promise<T>,
        sleep: (id: string, ms: number) => step.sleep(id, ms),
        waitForEvent: async (id, opts) => {
          // Steps run sequentially, so at most one approval waits per run at a
          // time: matching on the run id is unambiguous. opts.matchStepRunId is
          // still echoed by the decision payload for the resolve handler.
          const received = await step.waitForEvent(id, {
            event: opts.event,
            timeout: opts.timeoutMs ?? "30d",
            match: "data.runId",
          });
          return received
            ? { data: received.data as ApprovalDecidedData }
            : null;
        },
      };

      return interpretRun({ runId, store: deps.store, tools, activity });
    },
  );
}
