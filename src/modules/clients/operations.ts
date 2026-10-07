import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { clients } from "@/db/schema";

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];

/** Digits with a leading +; a Bulgarian local number (0888…) becomes +359888…. Used to suggest duplicates. */
export function normalizePhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/[^0-9+]/g, "").replace(/^00/, "+").replace(/^0/, "+359");
  return digits || null;
}

/** A new client, entered with a new project or on its own from „Нов клиент“ in the clients section. */
export async function createClient(tx: Transaction, input: {
  organizationId: string;
  createdBy: string;
  name: string;
  email: string | null;
  phone: string | null;
  address?: string | null;
  notes?: string | null;
}) {
  const [client] = await tx.insert(clients).values({
    organizationId: input.organizationId,
    createdBy: input.createdBy,
    name: input.name,
    email: input.email,
    phone: input.phone,
    phoneNormalized: normalizePhone(input.phone),
    address: input.address ?? null,
    notes: input.notes ?? null,
  }).returning({ id: clients.id });
  if (!client) throw new Error("Клиентът не беше създаден.");
  return client.id;
}

/** Keeps the client in step when staff fix a contact; a confirmed email is left alone. */
export async function syncClientFromContact(tx: Transaction, clientId: string, input: {
  name: string;
  phone: string | null;
  email?: string | null;
}) {
  await tx.update(clients).set({
    name: input.name,
    phone: input.phone,
    phoneNormalized: normalizePhone(input.phone),
    ...(input.email !== undefined ? { email: input.email } : {}),
    updatedAt: new Date(),
  }).where(eq(clients.id, clientId));
}
