import { createClient } from "@opsline/db";

// One pool per server process, preserved across HMR in dev.
const globalForDb = globalThis as unknown as {
  __opslineDb?: ReturnType<typeof createClient>["db"];
};

export const db = globalForDb.__opslineDb ?? createClient().db;

if (process.env.NODE_ENV !== "production") {
  globalForDb.__opslineDb = db;
}
