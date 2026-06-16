// Gives the seeded demo user a password so the demo login works. Runs after
// `pnpm db:seed` (which creates the user without a credential). Idempotent.
import { createRawId } from "@opsline/core";
import { account, createClient, user } from "@opsline/db";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

const DEMO_EMAIL = "operator@northwind.example";
const DEMO_PASSWORD = "opsline-demo";

const { db, sql } = createClient();

const [u] = await db
  .select()
  .from(user)
  .where(eq(user.email, DEMO_EMAIL))
  .limit(1);
if (!u) throw new Error("demo user not found; run pnpm db:seed first");

await db.delete(account).where(eq(account.userId, u.id));
await db.insert(account).values({
  id: createRawId("acc"),
  accountId: u.id,
  providerId: "credential",
  userId: u.id,
  password: await hashPassword(DEMO_PASSWORD),
});

await sql.end();
console.log(`demo login ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
