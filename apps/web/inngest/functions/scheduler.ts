import { inngest } from "@/inngest/client";
import { triggerDueWorkflows } from "@/lib/scheduler";

// One heartbeat a minute. The per-workflow cron in the DB decides which
// workflows are actually due; Inngest just provides the tick.
export const scheduler = inngest.createFunction(
  { id: "scheduler", triggers: [{ cron: "* * * * *" }] },
  async ({ step }) => {
    const runIds = await step.run("trigger-due", () =>
      triggerDueWorkflows(new Date()),
    );
    return { triggered: runIds.length };
  },
);
