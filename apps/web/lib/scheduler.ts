import { dueCronWorkflows } from "@opsline/core";
import { workflows, workflowVersions } from "@opsline/db";
import { desc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { startRun } from "@/lib/runs";

// Finds every enabled workflow whose cron matches `now` and starts a scheduled
// run of its latest version. Called each minute by the Inngest cron function.
export async function triggerDueWorkflows(now: Date): Promise<string[]> {
  const scheduled = await db
    .select()
    .from(workflows)
    .where(isNotNull(workflows.cron));

  const due = dueCronWorkflows(
    scheduled.map((w) => ({ ...w, cron: w.cron })),
    now,
  );

  const runIds: string[] = [];
  for (const wf of due) {
    const [version] = await db
      .select({ id: workflowVersions.id })
      .from(workflowVersions)
      .where(eq(workflowVersions.workflowId, wf.id))
      .orderBy(desc(workflowVersions.version))
      .limit(1);
    if (!version) continue;
    runIds.push(
      await startRun({
        orgId: wf.orgId,
        versionId: version.id,
        trigger: "schedule",
        triggerMeta: { cron: wf.cron },
        actor: "system",
      }),
    );
  }
  return runIds;
}
