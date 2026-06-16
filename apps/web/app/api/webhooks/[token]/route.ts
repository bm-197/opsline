import {
  createRawId,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  verifyWebhook,
} from "@opsline/core";
import {
  webhookDeliveries,
  webhookEndpoints,
  workflows,
  workflowVersions,
} from "@opsline/db";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { startRun } from "@/lib/runs";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const rawBody = await req.text();

  const [endpoint] = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.token, token))
    .limit(1);
  if (!endpoint) {
    return Response.json({ error: "unknown endpoint" }, { status: 404 });
  }

  const signature = req.headers.get(SIGNATURE_HEADER);
  const result = verifyWebhook({
    secret: endpoint.hmacSecret,
    signature,
    timestamp: req.headers.get(TIMESTAMP_HEADER),
    rawBody,
    nowSec: Math.floor(Date.now() / 1000),
  });
  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: 401 });
  }

  // Replay protection: a signature seen before is rejected by the unique index.
  try {
    await db.insert(webhookDeliveries).values({
      id: createRawId("whd"),
      endpointId: endpoint.id,
      signature: signature!,
    });
  } catch {
    return Response.json({ error: "replay" }, { status: 409 });
  }

  const [version] = await db
    .select({ id: workflowVersions.id, orgId: workflows.orgId })
    .from(workflowVersions)
    .innerJoin(workflows, eq(workflowVersions.workflowId, workflows.id))
    .where(eq(workflowVersions.workflowId, endpoint.workflowId))
    .orderBy(desc(workflowVersions.version))
    .limit(1);
  if (!version) {
    return Response.json({ error: "no workflow version" }, { status: 422 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = {};
  }

  await db
    .update(webhookEndpoints)
    .set({ lastUsedAt: new Date() })
    .where(eq(webhookEndpoints.id, endpoint.id));

  const runId = await startRun({
    orgId: version.orgId,
    versionId: version.id,
    trigger: "webhook",
    triggerMeta: { ...payload, via: "webhook" },
    actor: "webhook",
  });

  return Response.json({ runId }, { status: 202 });
}
