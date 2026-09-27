"use server";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDatabase } from "@/db";
import { clients, projectContacts, projects, timelineEvents } from "@/db/schema";
import { attempt, type ActionResult } from "@/lib/action-result";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { managesClients } from "@/modules/clients/access";
import { normalizePhone } from "@/modules/clients/operations";

const clientSchema = z.object({
  clientId: z.uuid(),
  name: z.string().trim().min(2, "Въведи име на клиента.").max(160),
  phone: z.string().trim().max(40).optional(),
  email: z.union([z.literal(""), z.email("Невалиден имейл.")]).optional(),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Name, phone, address and notes can always be fixed; they are copied into the client's current
 * project contacts. The email only until the client confirms it in the portal.
 */
export async function updateClientAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const data = clientSchema.parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    if (!managesClients(context)) throw new Error("Нямаш право да редактираш клиенти.");
    await getDatabase().transaction(async (tx) => {
      const [client] = await tx.select({ id: clients.id, email: clients.email }).from(clients)
        .where(and(eq(clients.id, data.clientId), eq(clients.organizationId, context.organizationId), isNull(clients.mergedIntoId)))
        .for("update").limit(1);
      if (!client) throw new Error("Клиентът не е намерен.");
      const [verified] = await tx.select({ id: projectContacts.id }).from(projectContacts)
        .where(and(eq(projectContacts.clientId, client.id), isNotNull(projectContacts.emailVerifiedAt))).limit(1);
      const email = data.email === undefined ? client.email : data.email.trim().toLowerCase() || null;
      if (verified && email !== client.email) throw new Error("Клиентът вече потвърди имейла си. Само той може да го смени от портала.");

      const phone = data.phone || null;
      await tx.update(clients).set({
        name: data.name,
        phone,
        phoneNormalized: normalizePhone(phone),
        email,
        address: data.address || null,
        notes: data.notes || null,
        updatedAt: new Date(),
      }).where(eq(clients.id, client.id));
      const touched = await tx.update(projectContacts).set({
        name: data.name,
        phone,
        ...(verified ? {} : { email }),
      }).where(and(eq(projectContacts.clientId, client.id), isNull(projectContacts.removedAt)))
        .returning({ id: projectContacts.id, projectId: projectContacts.projectId });
      if (touched.length) {
        await tx.insert(timelineEvents).values(touched.map((contact) => ({
          organizationId: context.organizationId, projectId: contact.projectId, actorType: "staff" as const, actorId: context.userId,
          eventType: "contact_updated", visibility: "internal" as const, metadata: { contactId: contact.id, name: data.name, fromClient: true },
        })));
      }
    });
    revalidatePath("/app/clients");
    revalidatePath(`/app/clients/${data.clientId}`);
    revalidatePath("/app/projects");
  }, "Клиентът не беше записан.");
}

/** An owner archives a client once every project of theirs is completed or archived; restoring is always allowed. */
export async function setClientArchivedAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { clientId, archived } = z.object({ clientId: z.uuid(), archived: z.enum(["true", "false"]) }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    if (context.role !== "owner") throw new Error("Само собственик може да архивира клиенти.");
    const db = getDatabase();
    if (archived === "true") {
      const [open] = await db.select({ id: projects.id }).from(projects)
        .where(and(eq(projects.clientId, clientId), eq(projects.organizationId, context.organizationId), eq(projects.status, "active"), isNull(projects.archivedAt)))
        .limit(1);
      if (open) throw new Error("Клиентът има активен обект. Приключи обектите му, преди да го архивираш.");
    }
    await db.update(clients).set({ archivedAt: archived === "true" ? new Date() : null, updatedAt: new Date() })
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, context.organizationId)));
    revalidatePath("/app/clients");
    revalidatePath(`/app/clients/${clientId}`);
  }, "Клиентът не беше записан.");
}
