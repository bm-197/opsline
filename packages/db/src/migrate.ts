import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createClient } from "./client.ts";

async function main() {
  const { db, sql } = createClient();
  await migrate(db, {
    migrationsFolder: new URL("../drizzle", import.meta.url).pathname,
  });
  await sql.end();
  console.log("migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
