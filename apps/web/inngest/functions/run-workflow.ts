import { consoleMailer, createRunWorkflowFunction } from "@opsline/core";
import { createClient, createDrizzleRunStore } from "@opsline/db";

import { inngest } from "@/inngest/client";

const { db } = createClient();

export const runWorkflow = createRunWorkflowFunction(inngest, {
  store: createDrizzleRunStore(db),
  mailer: consoleMailer,
});
