"use server";

import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { changeOrderRevisions, changeOrders, portalGrants, portalSessions, projectContacts, staffNotifications, timelineEvents } from "@/db/schema";
import { attempt, type ActionResult } from "@/lib/action-result";
import { requireOwner, requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { createStablePortalToken } from "@/lib/crypto/portal-token";
import { requireActiveProject } from "@/modules/projects/lifecycle";
import { createClient, syncClientFromContact } from "@/modules/clients/operations";
import { clientConfirmedEmail, findUsableClient } from "@/modules/clients/queries";

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];

/** Revokes every link and device session of one contact. */
async function revokeContactAccess(tx: Transaction, projectId: string, contactId: string) {
  const now = new Date();
  const grants = await tx.update(portalGrants).set({ revokedAt: now })
    .where(and(eq(portalGrants.projectId, projectId), eq(portalGrants.projectContactId, contactId), isNull(portalGrants.revokedAt)))
    .returning({ id: portalGrants.id });
  // A client session confirmed by code keeps the client's other projects; it loses this one because
  // every request checks the contact and a live link. Anything unconfirmed from these links ends here.
  for (const grant of grants) {
    await tx.update(portalSessions).set({ revokedAt: now })
      .where(and(eq(portalSessions.portalGrantId, grant.id), isNull(portalSessions.revokedAt), or(isNull(portalSessions.clientId), isNull(portalSessions.verifiedAt))));
  }
}

async function issueLink(tx: Transaction, projectId: string, contactId: string, createdBy: string) {
  const generated = createStablePortalToken();
  await tx.insert(portalGrants).values({ id: generated.id, projectId, projectContactId: contactId, tokenHash: generated.tokenHash, tokenCiphertext: "derived-v1", scope: ["view"], expiresAt: null, createdBy });
}

async function contactOf(tx: Transaction, projectId: string, contactId: string) {
  const [contact] = await tx.select().from(projectContacts)
    .where(and(eq(projectContacts.id, contactId), eq(projectContacts.projectId, projectId), isNull(projectContacts.removedAt)))
    .for("update").limit(1);
  if (!contact) throw new Error("Контактът не е намерен.");
  return contact;
}

function refresh(projectId: string) {
  revalidatePath(`/app/projects/${projectId}`);
}

/**
 * Creates the contact's link, or with `rotate` replaces it: the old link and every device signed in
 * with it stop working. Without `contactId` it is the primary approver's link.
 */
export async function createOrRotatePortalLinkAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const projectId = z.uuid().parse(formData.get("projectId"));
    const contactId = formData.get("contactId") ? z.uuid().parse(formData.get("contactId")) : null;
    const rotate = formData.get("rotate") === "true";
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "send");
    if (rotate) await requireOwner(context);
    await getDatabase().transaction(async (tx) => {
      const [contact] = await tx.select({ id: projectContacts.id }).from(projectContacts)
        .where(and(
          eq(projectContacts.projectId, projectId), isNull(projectContacts.removedAt),
          contactId ? eq(projectContacts.id, contactId) : and(eq(projectContacts.isPrimary, true), eq(projectContacts.portalRole, "approver")),
        )).limit(1);
      if (!contact) throw new Error("Обектът няма такъв клиентски контакт.");
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${projectId}:${contact.id}`}))`);
      const grants = await tx.select({ id: portalGrants.id, tokenHash: portalGrants.tokenHash, tokenCiphertext: portalGrants.tokenCiphertext, expiresAt: portalGrants.expiresAt }).from(portalGrants)
        .where(and(eq(portalGrants.projectId, projectId), eq(portalGrants.projectContactId, contact.id), isNull(portalGrants.revokedAt)));
      if (!rotate && grants.some((grant) => grant.tokenCiphertext === "derived-v1" && grant.expiresAt === null && createStablePortalToken(grant.id).tokenHash === grant.tokenHash)) return;
      if (grants.length) await revokeContactAccess(tx, projectId, contact.id);
      await issueLink(tx, projectId, contact.id, context.userId);
    });
    refresh(projectId);
  }, "Линкът не беше създаден.");
}

const contactFields = {
  projectId: z.uuid(),
  name: z.string().trim().min(2, "Въведи име.").max(160),
  phone: z.string().trim().max(40).optional(),
  email: z.union([z.literal(""), z.email("Провери имейла, нещо в него не е наред.")]).optional(),
};

/**
 * Name and phone can always be fixed. The email only while the client has not confirmed it:
 * after that it is the client's (the decision codes go there), and only an owner's reset clears it.
 */
export async function updateContactAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const data = z.object({ ...contactFields, contactId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "send");
    await requireActiveProject(context.organizationId, data.projectId, { allowCompleted: true });
    await getDatabase().transaction(async (tx) => {
      const contact = await contactOf(tx, data.projectId, data.contactId);
      const email = data.email?.trim().toLowerCase() || null;
      if (contact.emailVerifiedAt && email !== null && email !== contact.email) throw new Error("Клиентът вече потвърди имейла си. Само той може да го смени от портала.");
      await tx.update(projectContacts).set({
        name: data.name,
        phone: data.phone || null,
        ...(contact.emailVerifiedAt ? {} : { email }),
      }).where(eq(projectContacts.id, contact.id));
      if (contact.clientId) await syncClientFromContact(tx, contact.clientId, { name: data.name, phone: data.phone || null, ...(contact.emailVerifiedAt ? {} : { email }) });
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId: data.projectId, actorType: "staff", actorId: context.userId, eventType: "contact_updated", visibility: "internal", metadata: { contactId: contact.id, name: data.name } });
    });
    refresh(data.projectId);
  }, "Контактът не беше записан.");
}

/** Someone else who follows the project (a spouse, an architect): sees everything, decides nothing. Gets their own link. */
export async function addViewerAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const raw = Object.fromEntries(formData);
    const clientId = typeof raw.clientId === "string" && raw.clientId ? z.uuid().parse(raw.clientId) : null;
    const context = await requireTenantContext();
    const projectId = z.uuid().parse(raw.projectId);
    await requireProjectCapability(context, projectId, "send");
    await requireActiveProject(context.organizationId, projectId, { allowCompleted: true });

    // Someone already on file (an architect with projects of their own) is invited as they are;
    // a confirmed email carries over, so they do not confirm it again.
    const existing = clientId ? await findUsableClient(context, clientId) : null;
    if (clientId && !existing) throw new Error("Клиентът не е намерен. Избери го отново.");
    const data = existing ? null : z.object(contactFields).parse(raw);
    const person = existing
      ? { name: existing.name, email: existing.email?.trim().toLowerCase() || null, phone: existing.phone }
      : { name: data!.name, email: data!.email?.trim().toLowerCase() || null, phone: data!.phone || null };
    const confirmed = existing ? await clientConfirmedEmail(existing.id) : null;
    const inherited = confirmed && person.email === confirmed ? new Date() : null;

    await getDatabase().transaction(async (tx) => {
      if (existing) {
        const [already] = await tx.select({ id: projectContacts.id }).from(projectContacts)
          .where(and(eq(projectContacts.projectId, projectId), eq(projectContacts.clientId, existing.id), isNull(projectContacts.removedAt))).limit(1);
        if (already) throw new Error("Този клиент вече е в обекта.");
      }
      const newClientId = existing?.id ?? await createClient(tx, { organizationId: context.organizationId, createdBy: context.userId, ...person });
      const [contact] = await tx.insert(projectContacts).values({
        projectId, organizationId: context.organizationId, clientId: newClientId, ...person,
        ...(inherited ? { emailVerifiedAt: inherited, lockedAt: inherited } : {}),
        portalRole: "viewer", isPrimary: false,
      }).returning({ id: projectContacts.id });
      await issueLink(tx, projectId, contact!.id, context.userId);
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, actorType: "staff", actorId: context.userId, eventType: "contact_added", visibility: "internal", metadata: { contactId: contact!.id, name: person.name } });
    });
    refresh(projectId);
  }, "Контактът не беше добавен.");
}

/**
 * Hands the decisions to another contact. The previous approver stays as a viewer with the same link;
 * decisions check the role on every request, so nothing needs to be revoked.
 */
export async function makeApproverAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, contactId } = z.object({ projectId: z.uuid(), contactId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "send");
    await requireActiveProject(context.organizationId, projectId);
    await getDatabase().transaction(async (tx) => {
      const target = await contactOf(tx, projectId, contactId);
      if (target.portalRole === "approver" && target.isPrimary) return;
      await tx.update(projectContacts).set({ portalRole: "viewer", isPrimary: false })
        .where(and(eq(projectContacts.projectId, projectId), eq(projectContacts.isPrimary, true), isNull(projectContacts.removedAt)));
      await tx.update(projectContacts).set({ portalRole: "approver", isPrimary: true }).where(eq(projectContacts.id, target.id));
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, actorType: "staff", actorId: context.userId, eventType: "approver_changed", visibility: "client", metadata: { contactId: target.id, name: target.name } });
    });
    refresh(projectId);
  }, "Одобряващият не беше сменен.");
}

/** A removed contact's links stop working at once. The approver is replaced first, never removed. */
export async function removeContactAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, contactId } = z.object({ projectId: z.uuid(), contactId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "send");
    await getDatabase().transaction(async (tx) => {
      const contact = await contactOf(tx, projectId, contactId);
      if (contact.isPrimary) throw new Error("Първо направи друг контакт одобряващ.");
      await tx.update(projectContacts).set({ removedAt: new Date() }).where(eq(projectContacts.id, contact.id));
      await revokeContactAccess(tx, projectId, contact.id);
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, actorType: "staff", actorId: context.userId, eventType: "contact_removed", visibility: "internal", metadata: { contactId: contact.id, name: contact.name } });
    });
    refresh(projectId);
  }, "Контактът не беше премахнат.");
}

/**
 * When the wrong person confirmed the email (the link reached someone else first), an owner clears it:
 * the confirmed email goes, every link and device of the contact stops working and a new link is issued.
 * The right person then opens the new link and confirms their own email.
 */
export async function resetContactVerificationAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, contactId } = z.object({ projectId: z.uuid(), contactId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "send");
    await requireOwner(context);
    await getDatabase().transaction(async (tx) => {
      const contact = await contactOf(tx, projectId, contactId);
      await tx.execute(sql`select set_config('app.contact_change', 'reset', true)`);
      await tx.update(projectContacts).set({ email: null, emailVerifiedAt: null, lockedAt: null }).where(eq(projectContacts.id, contact.id));
      await revokeContactAccess(tx, projectId, contact.id);
      // The wrong person may hold a confirmed client session: it ends on every device and project.
      if (contact.clientId) {
        await tx.update(portalSessions).set({ revokedAt: new Date() })
          .where(and(eq(portalSessions.clientId, contact.clientId), isNull(portalSessions.revokedAt)));
      }
      await issueLink(tx, projectId, contact.id, context.userId);
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, actorType: "staff", actorId: context.userId, eventType: "contact_verification_reset", visibility: "internal", metadata: { contactId: contact.id, previousEmail: contact.email } });
    });
    refresh(projectId);
  }, "Потвърждението не беше нулирано.");
}

/**
 * A disputed decision is dealt with: a note on how, kept in the history. The decision itself is not
 * touched. A new event, since the timeline is append-only.
 */
export async function resolveDecisionDisputeAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { changeOrderId, revisionId, note } = z.object({ changeOrderId: z.uuid(), revisionId: z.coerce.number().int().positive(), note: z.string().trim().min(3, "Напиши накратко как е уредено.").max(1000) }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    const [document] = await getDatabase().select({ projectId: changeOrders.projectId }).from(changeOrders)
      .where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.organizationId, context.organizationId))).limit(1);
    if (!document) throw new Error("Офертата или промяната не е намерена.");
    await requireProjectCapability(context, document.projectId, "send");
    await getDatabase().transaction(async (tx) => {
      const [revision] = await tx.select({ id: changeOrderRevisions.id }).from(changeOrderRevisions)
        .where(and(eq(changeOrderRevisions.id, revisionId), eq(changeOrderRevisions.changeOrderId, changeOrderId))).limit(1);
      if (!revision) throw new Error("Версията не е намерена.");
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`dispute:${revisionId}`}))`);
      const events = await tx.select({ eventType: timelineEvents.eventType }).from(timelineEvents)
        .where(and(eq(timelineEvents.revisionId, revisionId), inArray(timelineEvents.eventType, ["decision_disputed", "decision_dispute_resolved"]))).orderBy(desc(timelineEvents.createdAt), desc(timelineEvents.id)).limit(1);
      if (events[0]?.eventType !== "decision_disputed") throw new Error("Няма отворено оспорване за тази версия.");
      await tx.insert(timelineEvents).values({
        organizationId: context.organizationId, projectId: document.projectId, changeOrderId, revisionId,
        actorType: "staff", actorId: context.userId, eventType: "decision_dispute_resolved", visibility: "internal", metadata: { note },
      });
      // Answered, so it stops asking the team for a reply.
      await tx.update(staffNotifications).set({ readAt: new Date() })
        .where(and(eq(staffNotifications.organizationId, context.organizationId), eq(staffNotifications.eventType, "decision_disputed"), eq(staffNotifications.href, `/app/offers/${changeOrderId}`), isNull(staffNotifications.readAt)));
    });
    revalidatePath(`/app/offers/${changeOrderId}`);
    revalidatePath("/app/notifications");
  }, "Не се получи да отбележа оспорването.");
}
