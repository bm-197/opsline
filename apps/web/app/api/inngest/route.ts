import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { runWorkflow } from "@/inngest/functions/run-workflow";
import { scheduler } from "@/inngest/functions/scheduler";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runWorkflow, scheduler],
});
