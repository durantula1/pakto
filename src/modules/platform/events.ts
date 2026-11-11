import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { domainEvents, webhookDeliveries, webhookEndpoints } from "@/db/schema";

type Executor = Pick<ReturnType<typeof getDatabase>, "insert" | "select">;

export type DomainEventInput = {
  organizationId: string;
  /** For example `task.completed`, `deal.won`, `invoice.issued`. */
  kind: string;
  subjectType: string;
  subjectId: string | null;
  actorId: string | null;
  payload?: Record<string, unknown>;
};

/**
 * Records what happened. It is the one source for webhooks and reports. A failure to write it must
 * never undo the user's action, so callers use `emitEvent` after their own write has committed.
 */
export async function emitEvent(input: DomainEventInput, executor: Executor = getDatabase()) {
  try {
    const [event] = await executor
      .insert(domainEvents)
      .values({ organizationId: input.organizationId, kind: input.kind, subjectType: input.subjectType, subjectId: input.subjectId, actorId: input.actorId, payload: input.payload ?? {} })
      .returning({ id: domainEvents.id });
    if (!event) return;
    const endpoints = await executor
      .select({ id: webhookEndpoints.id, events: webhookEndpoints.events })
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.organizationId, input.organizationId), eq(webhookEndpoints.active, true)));
    const wanted = endpoints.filter((endpoint) => endpoint.events.length === 0 || endpoint.events.includes(input.kind));
    if (wanted.length) {
      await executor
        .insert(webhookDeliveries)
        .values(wanted.map((endpoint) => ({ organizationId: input.organizationId, endpointId: endpoint.id, eventId: event.id })))
        .onConflictDoNothing();
    }
  } catch (cause) {
    console.error("domain event was not recorded", input.kind, cause);
  }
}

export async function pendingDeliveryCount() {
  const [row] = await getDatabase().select({ count: sql<number>`count(*)::int` }).from(webhookDeliveries).where(eq(webhookDeliveries.status, "pending"));
  return row?.count ?? 0;
}
