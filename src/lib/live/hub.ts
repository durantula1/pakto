import "server-only";

import postgres from "postgres";

import { getServerEnvironment } from "@/lib/env/server";

export type StaffRefresh = { event_type?: string; title?: string };
type Listener = (event: StaffRefresh) => void;

/**
 * One LISTEN connection per server process fans `staff_refresh` notifications (see the
 * app.broadcast_staff_refresh trigger) out to the open /api/live streams of that user.
 * LISTEN needs a session connection, so it uses the direct/session URL rather than the transaction pooler.
 * Kept on globalThis so dev reloads reuse the connection instead of opening another.
 */
const hub = globalThis as unknown as { paktoLiveV1?: { listeners: Map<string, Set<Listener>>; started?: Promise<void> } };

function state() {
  hub.paktoLiveV1 ??= { listeners: new Map() };
  return hub.paktoLiveV1;
}

function start() {
  const current = state();
  current.started ??= (async () => {
    const environment = getServerEnvironment();
    const url = environment.DATABASE_MIGRATION_URL ?? environment.DATABASE_URL;
    const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 0, connect_timeout: 10, ssl: environment.DATABASE_SSL ? "require" : false });
    // postgres.js re-runs LISTEN after a reconnect; events sent while it was down are caught up by the client's refresh on reconnect.
    await sql.listen("staff_refresh", (payload) => {
      let event: StaffRefresh & { user_id?: string };
      try { event = JSON.parse(payload); } catch { return; }
      if (!event.user_id) return;
      for (const listener of current.listeners.get(event.user_id) ?? []) listener({ event_type: event.event_type, title: event.title });
    });
  })().catch((cause) => {
    console.error("[live] listen failed", cause);
    current.started = undefined;
    throw cause;
  });
  return current.started;
}

/** Calls `listener` for each refresh addressed to `userId` until the returned function is called. */
export async function subscribeStaff(userId: string, listener: Listener) {
  await start();
  const { listeners } = state();
  const set = listeners.get(userId) ?? new Set();
  set.add(listener);
  listeners.set(userId, set);
  return () => {
    set.delete(listener);
    if (!set.size) listeners.delete(userId);
  };
}
