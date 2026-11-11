import "server-only";

import { createHmac } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { and, eq, lte, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { domainEvents, webhookDeliveries, webhookEndpoints } from "@/db/schema";

const BACKOFF_MINUTES = [1, 5, 15, 60, 180];
const MAX_ATTEMPTS = BACKOFF_MINUTES.length + 1;

function isPrivateAddress(address: string) {
  if (address.includes(":")) {
    const lower = address.toLowerCase();
    return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80") || lower.startsWith("::ffff:127.") || lower.startsWith("::ffff:10.") || lower.startsWith("::ffff:192.168.");
  }
  const [a = 0, b = 0] = address.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/** A webhook may only call a public https address: never the server's own network. */
export async function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Адресът не е валиден.");
  }
  if (url.protocol !== "https:") throw new Error("Адресът трябва да е https.");
  if (url.username || url.password) throw new Error("Адресът не може да съдържа потребител и парола.");
  const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true }).catch(() => []);
  if (!addresses.length) throw new Error("Адресът не може да бъде намерен.");
  if (addresses.some((item) => isPrivateAddress(item.address))) throw new Error("Адресът сочи към вътрешна мрежа и не е позволен.");
  return url;
}

export function signPayload(secret: string, timestamp: number, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/** Sends due deliveries one by one. Called every minute by the cron job. */
export async function processWebhookDeliveries(limit = 25) {
  const db = getDatabase();
  const due = await db
    .select({ delivery: webhookDeliveries, endpoint: webhookEndpoints, event: domainEvents })
    .from(webhookDeliveries)
    .innerJoin(webhookEndpoints, eq(webhookEndpoints.id, webhookDeliveries.endpointId))
    .innerJoin(domainEvents, eq(domainEvents.id, webhookDeliveries.eventId))
    .where(and(eq(webhookDeliveries.status, "pending"), lte(webhookDeliveries.nextAttemptAt, new Date())))
    .orderBy(webhookDeliveries.nextAttemptAt)
    .limit(limit);
  let sent = 0;
  let failed = 0;
  for (const { delivery, endpoint, event } of due) {
    const attempts = delivery.attempts + 1;
    try {
      if (!endpoint.active) throw new Error("Адресът е изключен.");
      const url = await assertPublicUrl(endpoint.url);
      const body = JSON.stringify({ id: event.id, type: event.kind, createdAt: event.createdAt.toISOString(), subject: { type: event.subjectType, id: event.subjectId }, data: event.payload });
      const timestamp = Math.floor(Date.now() / 1000);
      const response = await fetch(url, {
        method: "POST",
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: { "Content-Type": "application/json", "User-Agent": "Pakto-Webhooks/1", "X-Pakto-Event": event.kind, "X-Pakto-Signature": `t=${timestamp},v1=${signPayload(endpoint.secret, timestamp, body)}` },
        body,
      });
      if (!response.ok) throw new Error(`Отговор ${response.status}`);
      await db.update(webhookDeliveries).set({ status: "sent", attempts, lastError: null }).where(eq(webhookDeliveries.id, delivery.id));
      sent++;
    } catch (cause) {
      const message = (cause instanceof Error ? cause.message : "Грешка").slice(0, 300);
      const final = attempts >= MAX_ATTEMPTS;
      await db
        .update(webhookDeliveries)
        .set({ status: final ? "failed" : "pending", attempts, lastError: message, nextAttemptAt: sql`now() + make_interval(mins => ${BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)]})` })
        .where(eq(webhookDeliveries.id, delivery.id));
      failed++;
    }
  }
  return { due: due.length, sent, failed };
}
