import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnvironment } from "@/lib/env/server";
import * as schema from "@/db/schema";

// Versioned keys: a dev server keeps globalThis across reloads, so a changed pool config needs a new key.
const globalDatabase = globalThis as unknown as {
  paktoSqlV3?: ReturnType<typeof postgres>;
  paktoDbV3?: ReturnType<typeof drizzle<typeof schema>>;
};

function getSqlClient() {
  if (!globalDatabase.paktoSqlV3) {
    const environment = getServerEnvironment();
    globalDatabase.paktoSqlV3 = postgres(environment.DATABASE_URL, {
      prepare: false,
      // Pages run their reads in parallel (about twenty at once on the project and document pages); a small pool
      // would queue them in waves of one network round trip each. Supavisor multiplexes these client connections.
      // The client is kept on globalThis, so dev reloads reuse it instead of opening more.
      max: 20,
      // Opening a connection to the Supabase pooler costs ~0.5 s (TLS and auth), far more than a query.
      // Idle connections stay open for 30 minutes so a page opened after a pause does not pay that again.
      idle_timeout: 1800,
      connect_timeout: 10,
      ssl: environment.DATABASE_SSL ? "require" : false,
    });
  }

  return globalDatabase.paktoSqlV3;
}

export function getDatabase() {
  globalDatabase.paktoDbV3 ??= drizzle(getSqlClient(), { schema });
  return globalDatabase.paktoDbV3;
}

/** Opens several pool connections ahead of the first request (see src/instrumentation.ts). */
export async function warmDatabase(connections = 16) {
  const sql = getSqlClient();
  await Promise.all(Array.from({ length: connections }, () => sql`select 1`));
}
