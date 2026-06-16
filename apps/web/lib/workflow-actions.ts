"use server";

import {
  createId,
  createRawId,
  isValidCron,
  IrValidationError,
  validateWorkflowIr,
} from "@opsline/core";
import {
  createDrizzleRunStore,
  webhookEndpoints,
  workflows,
  workflowVersions,
} from "@opsline/db";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  draftToIrInput,
  slugify,
  type DraftWorkflow,
} from "@/lib/workflow-draft";

export type PublishResult =
  | { ok: true; slug: string; webhookSecret?: string }
  | { ok: false; error: string };

function formatIrError(error: unknown): string {
  if (error instanceof IrValidationError) {
    const issue = error.issues[0];
    if (!issue) return "The workflow is not valid.";
    const where = issue.path.length ? `${issue.path.join(".")}: ` : "";
    return `${where}${issue.message}`;
  }
  throw error;
}

async function mintWebhook(workflowId: string): Promise<string> {
  const secret = createRawId("whsec");
  await db.insert(webhookEndpoints).values({
    id: createId("webhookEndpoint"),
    workflowId,
    token: createRawId("whts"),
    hmacSecret: secret,
  });
  return secret;
}

export async function createWorkflow(
  draft: DraftWorkflow,
): Promise<PublishResult> {
  const ctx = await requirePermission({ workflow: ["create"] });

  let ir;
  try {
    ir = validateWorkflowIr(draftToIrInput(draft));
  } catch (e) {
    return { ok: false, error: formatIrError(e) };
  }
  const cron = draft.cron.trim();
  if (cron && !isValidCron(cron)) {
    return { ok: false, error: `Invalid cron expression: "${cron}"` };
  }

  const base = slugify(draft.name);
  const existing = await db
    .select({ slug: workflows.slug })
    .from(workflows)
    .where(eq(workflows.orgId, ctx.orgId));
  const taken = new Set(existing.map((r) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  const workflowId = createId("workflow");
  await db.insert(workflows).values({
    id: workflowId,
    orgId: ctx.orgId,
    name: draft.name,
    slug,
    description: ir.description ?? null,
    cron: cron || null,
  });
  await db.insert(workflowVersions).values({
    id: createId("workflowVersion"),
    workflowId,
    version: 1,
    ir,
    createdBy: ctx.userId,
  });

  const webhookSecret = draft.webhookEnabled
    ? await mintWebhook(workflowId)
    : undefined;

  await createDrizzleRunStore(db).recordAudit({
    orgId: ctx.orgId,
    actor: ctx.userId,
    action: "workflow.created",
    entityType: "workflow",
    entityId: workflowId,
    after: { slug, version: 1 },
  });

  revalidatePath("/workflows");
  return { ok: true, slug, webhookSecret };
}

export async function publishVersion(
  slug: string,
  draft: DraftWorkflow,
): Promise<PublishResult> {
  const ctx = await requirePermission({ workflow: ["update"] });

  const [wf] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.slug, slug), eq(workflows.orgId, ctx.orgId)))
    .limit(1);
  if (!wf) return { ok: false, error: "Workflow not found." };

  let ir;
  try {
    ir = validateWorkflowIr(draftToIrInput(draft));
  } catch (e) {
    return { ok: false, error: formatIrError(e) };
  }
  const cron = draft.cron.trim();
  if (cron && !isValidCron(cron)) {
    return { ok: false, error: `Invalid cron expression: "${cron}"` };
  }

  const [latest] = await db
    .select({ v: workflowVersions.version })
    .from(workflowVersions)
    .where(eq(workflowVersions.workflowId, wf.id))
    .orderBy(desc(workflowVersions.version))
    .limit(1);
  const nextVersion = (latest?.v ?? 0) + 1;

  await db.insert(workflowVersions).values({
    id: createId("workflowVersion"),
    workflowId: wf.id,
    version: nextVersion,
    ir,
    createdBy: ctx.userId,
  });
  await db
    .update(workflows)
    .set({
      name: draft.name,
      description: ir.description ?? null,
      cron: cron || null,
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, wf.id));

  const [endpoint] = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.workflowId, wf.id))
    .limit(1);
  let webhookSecret: string | undefined;
  if (draft.webhookEnabled && !endpoint) {
    webhookSecret = await mintWebhook(wf.id);
  } else if (!draft.webhookEnabled && endpoint) {
    await db
      .delete(webhookEndpoints)
      .where(eq(webhookEndpoints.id, endpoint.id));
  }

  await createDrizzleRunStore(db).recordAudit({
    orgId: ctx.orgId,
    actor: ctx.userId,
    action: "workflow.published",
    entityType: "workflow",
    entityId: wf.id,
    after: { slug, version: nextVersion },
  });

  revalidatePath(`/workflows/${slug}`);
  revalidatePath("/workflows");
  return { ok: true, slug, webhookSecret };
}
