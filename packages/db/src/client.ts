import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { authSchema } from "./auth-schema.ts";
import { schema } from "./schema.ts";

const fullSchema = { ...authSchema, ...schema };

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

export function createClient(url = requireDatabaseUrl()) {
  const sql = postgres(url);
  const db = drizzle(sql, { schema: fullSchema });
  return { db, sql };
}

export type Database = ReturnType<typeof createClient>["db"];
