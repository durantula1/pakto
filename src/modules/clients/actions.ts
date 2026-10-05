"use server";

import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { clients, portalGrants, portalSessions, projectContacts, projects, timelineEvents } from "@/db/schema";
import { attempt, type ActionResult } from "@/lib/action-result";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { managesClients } from "@/modules/clients/access";
import { normalizePhone } from "@/modules/clients/operations";

const clientSchema = z.object({
  clientId: z.uuid(),
  name: z.string().trim().min(2, "Въведи име на клиента.").max(160),
  phone: z.string().trim().max(40).optional(),
  email: z.union([z.literal(""), z.email("Провери имейла, нещо в него не е наред.")]).optional(),
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
    if (!managesClients(context)) throw new Error("Ролята ти не включва редакция на клиенти. Попитай собственика на фирмата.");
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

/**
 * An owner merges a duplicate into the client that stays: projects and invitations move over, the
 * duplicate is kept (archived, `merged_into_id`) so history still resolves. Refused when both confirmed
 * different emails, or when both are active contacts on the same project.
 */
export async function mergeClientsAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { keepId, mergeId } = z.object({ keepId: z.uuid(), mergeId: z.uuid() }).parse(Object.fromEntries(formData));
    if (keepId === mergeId) throw new Error("Избери двама различни клиенти.");
    const context = await requireTenantContext();
    if (context.role !== "owner") throw new Error("Само собственик може да слива клиенти.");
    await getDatabase().transaction(async (tx) => {
      const pair = await tx.select().from(clients)
        .where(and(inArray(clients.id, [keepId, mergeId]), eq(clients.organizationId, context.organizationId), isNull(clients.mergedIntoId)))
        .for("update");
      const keep = pair.find((client) => client.id === keepId);
      const merge = pair.find((client) => client.id === mergeId);
      if (!keep || !merge) throw new Error("Клиентът не е намерен.");

      const verified = await tx.select({ clientId: projectContacts.clientId, email: projectContacts.email }).from(projectContacts)
        .where(and(inArray(projectContacts.clientId, [keepId, mergeId]), isNotNull(projectContacts.emailVerifiedAt)));
      const emailOf = (id: string) => verified.find((row) => row.clientId === id)?.email?.trim().toLowerCase() ?? null;
      const keepEmail = emailOf(keepId);
      const mergeEmail = emailOf(mergeId);
      if (keepEmail && mergeEmail && keepEmail !== mergeEmail) throw new Error("Двамата клиенти са потвърдили различни имейли. Това са различни хора.");

      const [shared] = await tx.select({ projectId: projectContacts.projectId }).from(projectContacts)
        .where(and(inArray(projectContacts.clientId, [keepId, mergeId]), isNull(projectContacts.removedAt)))
        .groupBy(projectContacts.projectId)
        .having(sql`count(distinct ${projectContacts.clientId}) > 1`)
        .limit(1);
      if (shared) throw new Error("И двамата са поканени в един и същ обект. Премахни единия от обекта и опитай отново.");

      // The only path allowed to move a project to another client (trigger projects_protect_client).
      await tx.execute(sql`select set_config('app.client_merge', 'on', true)`);
      const moved = await tx.update(projects).set({ clientId: keepId }).where(eq(projects.clientId, mergeId)).returning({ id: projects.id });
      const contacts = await tx.update(projectContacts).set({ clientId: keepId }).where(eq(projectContacts.clientId, mergeId)).returning({ projectId: projectContacts.projectId });
      await tx.execute(sql`select set_config('app.client_merge', '', true)`);

      await tx.update(clients).set({
        // A confirmed email wins over an unconfirmed one.
        email: mergeEmail && !keepEmail ? merge.email : keep.email ?? merge.email,
        phone: keep.phone ?? merge.phone,
        phoneNormalized: keep.phoneNormalized ?? merge.phoneNormalized,
        address: keep.address ?? merge.address,
        notes: [keep.notes, merge.notes].filter(Boolean).join("\n\n") || null,
        archivedAt: null,
        updatedAt: new Date(),
      }).where(eq(clients.id, keepId));
      await tx.update(clients).set({ mergedIntoId: keepId, archivedAt: new Date(), updatedAt: new Date() }).where(eq(clients.id, mergeId));

      const projectIds = [...new Set([...moved.map((row) => row.id), ...contacts.map((row) => row.projectId)])];
      if (projectIds.length) {
        await tx.insert(timelineEvents).values(projectIds.map((projectId) => ({
          organizationId: context.organizationId, projectId, actorType: "staff" as const, actorId: context.userId,
          eventType: "client_merged", visibility: "internal" as const, metadata: { keptClientId: keepId, mergedClientId: mergeId, name: keep.name },
        })));
      }
    });
    revalidatePath("/app/clients");
    revalidatePath(`/app/clients/${keepId}`);
    revalidatePath("/app/projects");
  }, "Клиентите не бяха слети.");
}

/**
 * On a personal data request, once no project of the client is active: name and contacts are erased
 * from the client and every invitation, and their links stop working. Decisions keep the typed name
 * and confirmed email as the legal record of what was agreed (docs/portal-simplify-plan.md, В3).
 */
export async function anonymizeClientAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { clientId } = z.object({ clientId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    if (context.role !== "owner") throw new Error("Само собственик може да анонимизира клиент.");
    await getDatabase().transaction(async (tx) => {
      const [client] = await tx.select({ id: clients.id }).from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.organizationId, context.organizationId))).for("update").limit(1);
      if (!client) throw new Error("Клиентът не е намерен.");
      const [open] = await tx.select({ id: projects.id }).from(projects)
        .where(and(eq(projects.clientId, clientId), eq(projects.status, "active"), isNull(projects.archivedAt))).limit(1);
      if (open) throw new Error("Клиентът има активен обект. Приключи го, преди да анонимизираш клиента.");

      const now = new Date();
      const erased = "Анонимизиран клиент";
      await tx.update(clients).set({ name: erased, email: null, phone: null, phoneNormalized: null, address: null, notes: null, archivedAt: now, updatedAt: now }).where(eq(clients.id, clientId));
      // Confirmed contacts are locked against email changes; this is the owner's explicit reset.
      await tx.execute(sql`select set_config('app.contact_change', 'reset', true)`);
      const contacts = await tx.update(projectContacts).set({ name: erased, email: null, phone: null, emailVerifiedAt: null, lockedAt: null, removedAt: sql`coalesce(${projectContacts.removedAt}, now())` })
        .where(eq(projectContacts.clientId, clientId)).returning({ id: projectContacts.id, projectId: projectContacts.projectId });
      if (!contacts.length) return;
      const grants = await tx.update(portalGrants).set({ revokedAt: now })
        .where(and(inArray(portalGrants.projectContactId, contacts.map((contact) => contact.id)), isNull(portalGrants.revokedAt))).returning({ id: portalGrants.id });
      await tx.update(portalSessions).set({ revokedAt: now }).where(and(eq(portalSessions.clientId, clientId), isNull(portalSessions.revokedAt)));
      if (grants.length) await tx.update(portalSessions).set({ revokedAt: now }).where(and(inArray(portalSessions.portalGrantId, grants.map((grant) => grant.id)), isNull(portalSessions.revokedAt)));
      await tx.insert(timelineEvents).values([...new Set(contacts.map((contact) => contact.projectId))].map((projectId) => ({
        organizationId: context.organizationId, projectId, actorType: "staff" as const, actorId: context.userId,
        eventType: "client_anonymized", visibility: "internal" as const, metadata: {},
      })));
    });
    revalidatePath("/app/clients");
    revalidatePath(`/app/clients/${clientId}`);
    revalidatePath("/app/projects");
  }, "Клиентът не беше анонимизиран.");
}
