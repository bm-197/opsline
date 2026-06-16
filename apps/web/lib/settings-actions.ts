"use server";

import { createId, createRawId } from "@opsline/core";
import { apiKeys, createDrizzleRunStore } from "@opsline/db";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// Returns the plaintext key once; only its hash is stored.
export async function createApiKeyAction(name: string): Promise<string> {
  const ctx = await requirePermission({ apiKey: ["create"] });
  const raw = `opslk_${createRawId("key").replace("key_", "")}`;
  await db.insert(apiKeys).values({
    id: createId("apiKey"),
    orgId: ctx.orgId,
    name: name || "Untitled key",
    hashedKey: hashKey(raw),
  });
  await createDrizzleRunStore(db).recordAudit({
    orgId: ctx.orgId,
    actor: ctx.userId,
    action: "api_key.created",
    entityType: "api_key",
    entityId: ctx.orgId,
    after: { name },
  });
  revalidatePath("/settings");
  return raw;
}

export async function revokeApiKeyAction(id: string): Promise<void> {
  const ctx = await requirePermission({ apiKey: ["delete"] });
  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.orgId, ctx.orgId)));
  await createDrizzleRunStore(db).recordAudit({
    orgId: ctx.orgId,
    actor: ctx.userId,
    action: "api_key.revoked",
    entityType: "api_key",
    entityId: id,
  });
  revalidatePath("/settings");
}
