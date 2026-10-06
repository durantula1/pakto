import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnvironment } from "@/lib/env/server";
import * as schema from "@/db/schema";

// Versioned keys: a dev server keeps globalThis across reloads, so a changed pool config needs a new key.
const globalDatabase = globalThis as unknown as {
  paktoSqlV4?: ReturnType<typeof postgres>;
  paktoDbV4?: ReturnType<typeof drizzle<typeof schema>>;
};

function getSqlClient() {
  if (!globalDatabase.paktoSqlV4) {
    const environment = getServerEnvironment();
    globalDatabase.paktoSqlV4 = postgres(environment.DATABASE_URL, {
      // Pages run their reads in parallel (about twenty at once on the project and document pages); a small pool
      // would queue them. The client is kept on globalThis, so dev reloads reuse it instead of opening more.
      max: 20,
      idle_timeout: 300,
      connect_timeout: 10,
      ssl: environment.DATABASE_SSL ? "require" : false,
    });
  }

  return globalDatabase.paktoSqlV4;
}

export function getDatabase() {
  globalDatabase.paktoDbV4 ??= drizzle(getSqlClient(), { schema });
  return globalDatabase.paktoDbV4;
}
