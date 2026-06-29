import {
  apiKeys,
  approvals,
  auditEvents,
  member,
  organization,
  runs,
  stepRuns,
  user,
  webhookEndpoints,
  workflows,
  workflowVersions,
} from "@opsline/db";
import { and, count, desc, eq, gte, sql, type SQL } from "drizzle-orm";

import { db } from "./db";

export type RunFilter = { state?: string; workflowSlug?: string };
export const PAGE_SIZE = 25;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// Everything the Insights dashboard needs, in one org-scoped pass: all-time
// status counts, a 14-day run series for the chart, the waiting-approvals
// count, recent failures, and per-workflow health.
export async function getDashboard(orgId: string) {
  const now = new Date();
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 13),
  );

  const [statusRows, recent, waiting, recentFailures, workflowRows] =
    await Promise.all([
      db
        .select({ state: runs.state, c: count() })
        .from(runs)
        .innerJoin(
          workflowVersions,
          eq(runs.workflowVersionId, workflowVersions.id),
        )
        .innerJoin(workflows, eq(workflowVersions.workflowId, workflows.id))
        .where(eq(workflows.orgId, orgId))
        .groupBy(runs.state),
      db
        .select({ state: runs.state, createdAt: runs.createdAt })
        .from(runs)
        .innerJoin(
          workflowVersions,
          eq(runs.workflowVersionId, workflowVersions.id),
        )
        .innerJoin(workflows, eq(workflowVersions.workflowId, workflows.id))
        .where(and(eq(workflows.orgId, orgId), gte(runs.createdAt, since))),
      db
        .select({ c: count() })
        .from(approvals)
        .innerJoin(stepRuns, eq(approvals.stepRunId, stepRuns.id))
        .innerJoin(runs, eq(stepRuns.runId, runs.id))
        .innerJoin(
          workflowVersions,
          eq(runs.workflowVersionId, workflowVersions.id),
        )
        .innerJoin(workflows, eq(workflowVersions.workflowId, workflows.id))
        .where(
          and(eq(workflows.orgId, orgId), eq(approvals.state, "requested")),
        ),
      db
        .select({
          id: runs.id,
          workflowName: workflows.name,
          finishedAt: runs.finishedAt,
          createdAt: runs.createdAt,
        })
        .from(runs)
        .innerJoin(
          workflowVersions,
          eq(runs.workflowVersionId, workflowVersions.id),
        )
        .innerJoin(workflows, eq(workflowVersions.workflowId, workflows.id))
        .where(and(eq(workflows.orgId, orgId), eq(runs.state, "failed")))
        .orderBy(desc(runs.createdAt))
        .limit(5),
      db
        .select({
          slug: workflows.slug,
          name: workflows.name,
          total: count(runs.id),
          succeeded:
            sql<number>`count(*) filter (where ${runs.state} = 'succeeded')`.mapWith(
              Number,
            ),
          failed:
            sql<number>`count(*) filter (where ${runs.state} = 'failed')`.mapWith(
              Number,
            ),
          lastRunAt: sql<Date | null>`max(${runs.createdAt})`,
        })
        .from(workflows)
        .leftJoin(
          workflowVersions,
          eq(workflowVersions.workflowId, workflows.id),
        )
        .leftJoin(runs, eq(runs.workflowVersionId, workflowVersions.id))
        .where(eq(workflows.orgId, orgId))
        .groupBy(workflows.id)
        .orderBy(desc(count(runs.id))),
    ]);

  const counts = {
    total: 0,
    pending: 0,
    running: 0,
    waiting: 0,
    succeeded: 0,
    failed: 0,
    canceled: 0,
  };
  for (const r of statusRows) {
    const n = Number(r.c);
    counts[r.state as keyof typeof counts] = n;
    counts.total += n;
  }
  const finished = counts.succeeded + counts.failed;
  const successRate = finished > 0 ? counts.succeeded / finished : null;

  const days = Array.from({ length: 14 }, (_, i) => ({
    date: new Date(since.getTime() + i * 86_400_000),
    total: 0,
    succeeded: 0,
    failed: 0,
  }));
  const byKey = new Map(days.map((d) => [dayKey(d.date), d]));
  for (const r of recent) {
    const bucket = byKey.get(dayKey(new Date(r.createdAt)));
    if (!bucket) continue;
    bucket.total += 1;
    if (r.state === "succeeded") bucket.succeeded += 1;
    else if (r.state === "failed") bucket.failed += 1;
  }

  return {
    counts,
    successRate,
    approvalsWaiting: Number(waiting[0]?.c ?? 0),
    series: days,
    recentFailures,
    workflows: workflowRows,
  };
}

export async function listRuns(
  orgId: string,
  filter: RunFilter = {},
  page = 0,
) {
  const where: SQL[] = [eq(workflows.orgId, orgId)];
  if (filter.state) where.push(eq(runs.state, filter.state as never));
  if (filter.workflowSlug) where.push(eq(workflows.slug, filter.workflowSlug));

  return db
    .select({
      id: runs.id,
      state: runs.state,
      trigger: runs.trigger,
      waitingReason: runs.waitingReason,
      startedAt: runs.startedAt,
      finishedAt: runs.finishedAt,
      createdAt: runs.createdAt,
      workflowName: workflows.name,
      workflowSlug: workflows.slug,
      version: workflowVersions.version,
    })
    .from(runs)
    .innerJoin(
      workflowVersions,
      eq(runs.workflowVersionId, workflowVersions.id),
    )
    .innerJoin(workflows, eq(workflowVersions.workflowId, workflows.id))
    .where(and(...where))
    .orderBy(desc(runs.createdAt))
    .limit(PAGE_SIZE)
    .offset(page * PAGE_SIZE);
}

export async function getRun(orgId: string, runId: string) {
  const [head] = await db
    .select({
      run: runs,
      workflowName: workflows.name,
      workflowSlug: workflows.slug,
      version: workflowVersions.version,
      ir: workflowVersions.ir,
    })
    .from(runs)
    .innerJoin(
      workflowVersions,
      eq(runs.workflowVersionId, workflowVersions.id),
    )
    .innerJoin(workflows, eq(workflowVersions.workflowId, workflows.id))
    .where(and(eq(runs.id, runId), eq(workflows.orgId, orgId)))
    .limit(1);
  if (!head) return null;

  const steps = await db
    .select()
    .from(stepRuns)
    .where(eq(stepRuns.runId, runId))
    .orderBy(stepRuns.startedAt, stepRuns.attempt);

  const stepApprovals = await db
    .select({ approval: approvals, stepId: stepRuns.stepId })
    .from(approvals)
    .innerJoin(stepRuns, eq(approvals.stepRunId, stepRuns.id))
    .where(eq(stepRuns.runId, runId));

  return { ...head, steps, approvals: stepApprovals };
}

export async function listWaitingApprovals(orgId: string) {
  return db
    .select({
      approval: approvals,
      stepId: stepRuns.stepId,
      input: stepRuns.input,
      runId: stepRuns.runId,
      workflowName: workflows.name,
    })
    .from(approvals)
    .innerJoin(stepRuns, eq(approvals.stepRunId, stepRuns.id))
    .innerJoin(runs, eq(stepRuns.runId, runs.id))
    .innerJoin(
      workflowVersions,
      eq(runs.workflowVersionId, workflowVersions.id),
    )
    .innerJoin(workflows, eq(workflowVersions.workflowId, workflows.id))
    .where(and(eq(workflows.orgId, orgId), eq(approvals.state, "requested")))
    .orderBy(desc(approvals.createdAt));
}

export async function listWorkflows(orgId: string) {
  return db
    .select()
    .from(workflows)
    .where(eq(workflows.orgId, orgId))
    .orderBy(desc(workflows.createdAt));
}

export async function getWorkflow(orgId: string, slug: string) {
  const [wf] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.slug, slug), eq(workflows.orgId, orgId)))
    .limit(1);
  if (!wf) return null;
  const versions = await db
    .select()
    .from(workflowVersions)
    .where(eq(workflowVersions.workflowId, wf.id))
    .orderBy(desc(workflowVersions.version));
  return { workflow: wf, versions };
}

// Every organization the user belongs to, for the sidebar workspace switcher.
export async function listMemberships(userId: string) {
  return db
    .select({
      id: organization.id,
      name: organization.name,
      logo: organization.logo,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(desc(member.createdAt));
}

export async function listMembers(orgId: string) {
  return db
    .select({
      memberId: member.id,
      userId: member.userId,
      role: member.role,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, orgId))
    .orderBy(desc(member.createdAt));
}

export async function listApiKeys(orgId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.orgId, orgId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function listOrgWebhooks(orgId: string) {
  return db
    .select({
      token: webhookEndpoints.token,
      lastUsedAt: webhookEndpoints.lastUsedAt,
      workflowName: workflows.name,
      workflowSlug: workflows.slug,
    })
    .from(webhookEndpoints)
    .innerJoin(workflows, eq(webhookEndpoints.workflowId, workflows.id))
    .where(eq(workflows.orgId, orgId));
}

export async function getWebhookEndpoint(workflowId: string) {
  const [endpoint] = await db
    .select({
      token: webhookEndpoints.token,
      lastUsedAt: webhookEndpoints.lastUsedAt,
    })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.workflowId, workflowId))
    .limit(1);
  return endpoint ?? null;
}

export async function listAudit(
  orgId: string,
  filter: { action?: string } = {},
  page = 0,
) {
  const where: SQL[] = [eq(auditEvents.orgId, orgId)];
  if (filter.action) where.push(eq(auditEvents.action, filter.action));
  return db
    .select()
    .from(auditEvents)
    .where(and(...where))
    .orderBy(desc(auditEvents.at))
    .limit(PAGE_SIZE)
    .offset(page * PAGE_SIZE);
}
