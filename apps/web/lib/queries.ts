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
import { and, desc, eq, type SQL } from "drizzle-orm";

import { db } from "./db";

export type RunFilter = { state?: string; workflowSlug?: string };
export const PAGE_SIZE = 25;

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
