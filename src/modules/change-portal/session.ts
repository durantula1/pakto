import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { and, desc, eq, gt, isNotNull, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDatabase } from "@/db";
import {
  clients,
  organizationMembers,
  organizations,
  portalGrants,
  portalSessions,
  projectContacts,
  projects,
} from "@/db/schema";
import { hashPortalToken } from "@/lib/crypto/portal-token";
import { maskEmail } from "@/lib/email/send";
import { getSessionUser } from "@/lib/auth/server";

export const PORTAL_COOKIE = "sitechange_portal";
/** One cookie per organization for a client-wide session (docs/clients-plan.md, 6). */
const CLIENT_COOKIE_PREFIX = `${PORTAL_COOKIE}_c_`;
export const clientCookieName = (organizationId: string) => `${CLIENT_COOKIE_PREFIX}${organizationId}`;
/** A client session also ends after this long without a visit, since it opens several projects. */
export const CLIENT_IDLE_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_EVERY_MS = 60 * 60 * 1000;

const targetGrant = alias(portalGrants, "target_grant");

const sessionFields = {
  id: portalSessions.id,
  expiresAt: portalSessions.expiresAt,
  lastSeenAt: portalSessions.lastSeenAt,
  projectId: projects.id,
  organizationId: projects.organizationId,
  projectPublicId: projects.publicId,
  projectName: projects.name,
  projectStatus: projects.status,
  // The portal header comes with the session, so pages need no separate read for it.
  projectSiteAddress: projects.siteAddress,
  projectCompletedAt: projects.completedAt,
  organizationName: organizations.name,
  organizationLogoPath: organizations.logoStoragePath,
  organizationLogoSize: organizations.logoSize,
  organizationPhone: organizations.phone,
  organizationCurrency: organizations.defaultCurrency,
  contactId: projectContacts.id,
  contactName: projectContacts.name,
  contactRole: projectContacts.portalRole,
  contactEmail: projectContacts.email,
  contactEmailVerifiedAt: projectContacts.emailVerifiedAt,
};

/** A link opened before client sessions existed, or for a contact without a client: one project. */
async function projectSession(secret: string, projectPublicId: string) {
  const [session] = await getDatabase()
    .select({ ...sessionFields, grantId: portalGrants.id })
    .from(portalSessions)
    .innerJoin(portalGrants, eq(portalGrants.id, portalSessions.portalGrantId))
    .innerJoin(projects, eq(projects.id, portalGrants.projectId))
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .innerJoin(projectContacts, eq(projectContacts.id, portalGrants.projectContactId))
    .where(and(
      eq(portalSessions.sessionHash, hashPortalToken(secret)),
      isNull(portalSessions.revokedAt),
      gt(portalSessions.expiresAt, new Date()),
      isNull(portalGrants.revokedAt),
      or(isNull(portalGrants.expiresAt), gt(portalGrants.expiresAt, new Date())),
      eq(projects.publicId, projectPublicId),
      isNull(projectContacts.removedAt),
    ))
    .limit(1);
  return session ? { ...session, clientId: null, unlocked: false } : null;
}

/**
 * A client-wide session opens a project where the client is an active contact with a live link.
 * Before the code is confirmed (`verified_at`) only the project of the starting link opens, so a
 * forwarded link never reveals the client's other projects.
 */
async function clientSession(secret: string, projectPublicId: string) {
  const [session] = await getDatabase()
    .select({ ...sessionFields, grantId: targetGrant.id, clientId: portalSessions.clientId, verifiedAt: portalSessions.verifiedAt })
    .from(portalSessions)
    .innerJoin(portalGrants, eq(portalGrants.id, portalSessions.portalGrantId))
    .innerJoin(projectContacts, and(eq(projectContacts.clientId, portalSessions.clientId), isNull(projectContacts.removedAt)))
    .innerJoin(projects, and(eq(projects.id, projectContacts.projectId), eq(projects.publicId, projectPublicId)))
    .innerJoin(targetGrant, and(
      eq(targetGrant.projectContactId, projectContacts.id),
      isNull(targetGrant.revokedAt),
      or(isNull(targetGrant.expiresAt), gt(targetGrant.expiresAt, new Date())),
    ))
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(and(
      eq(portalSessions.sessionHash, hashPortalToken(secret)),
      isNotNull(portalSessions.clientId),
      isNull(portalSessions.revokedAt),
      gt(portalSessions.expiresAt, new Date()),
      gt(portalSessions.lastSeenAt, new Date(Date.now() - CLIENT_IDLE_MS)),
      // Confirmed: any project with a live link. Not confirmed: only the starting link's project,
      // and only while that link is live.
      or(isNotNull(portalSessions.verifiedAt), and(eq(portalGrants.projectId, projects.id), isNull(portalGrants.revokedAt))),
    ))
    .orderBy(desc(targetGrant.createdAt))
    .limit(1);
  if (!session) return null;
  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    await getDatabase().update(portalSessions).set({ lastSeenAt: new Date() }).where(eq(portalSessions.id, session.id));
  }
  const { verifiedAt, ...rest } = session;
  return { ...rest, unlocked: !!verifiedAt };
}

/** Once per request: the layout, the page and the actions of one render share it. */
export const getPortalSession = cache(async (projectPublicId: string) => {
  const cookieStore = await cookies();
  // A client session first: an older one-project cookie on the same device must not hide it.
  for (const cookie of cookieStore.getAll()) {
    if (!cookie.name.startsWith(CLIENT_COOKIE_PREFIX)) continue;
    const session = await clientSession(cookie.value, projectPublicId);
    if (session) return session;
  }
  const projectSecret = cookieStore.get(`${PORTAL_COOKIE}_${projectPublicId}`)?.value;
  return projectSecret ? projectSession(projectSecret, projectPublicId) : null;
});

/**
 * The client session behind the portal home, from any client cookie on this device, with the
 * projects it opens: all the client's invitations once unlocked, else the starting project only.
 */
export const getClientPortal = cache(async () => {
  const cookieStore = await cookies();
  const db = getDatabase();
  for (const cookie of cookieStore.getAll()) {
    if (!cookie.name.startsWith(CLIENT_COOKIE_PREFIX)) continue;
    const [session] = await db
      .select({
        id: portalSessions.id,
        clientId: portalSessions.clientId,
        verifiedAt: portalSessions.verifiedAt,
        startProjectId: portalGrants.projectId,
        clientName: clients.name,
        organizationId: clients.organizationId,
        organizationName: organizations.name,
        organizationLogoPath: organizations.logoStoragePath,
      })
      .from(portalSessions)
      .innerJoin(portalGrants, eq(portalGrants.id, portalSessions.portalGrantId))
      .innerJoin(clients, eq(clients.id, portalSessions.clientId))
      .innerJoin(organizations, eq(organizations.id, clients.organizationId))
      .where(and(
        eq(portalSessions.sessionHash, hashPortalToken(cookie.value)),
        isNull(portalSessions.revokedAt),
        gt(portalSessions.expiresAt, new Date()),
        gt(portalSessions.lastSeenAt, new Date(Date.now() - CLIENT_IDLE_MS)),
        or(isNotNull(portalSessions.verifiedAt), isNull(portalGrants.revokedAt)),
      ))
      .limit(1);
    if (!session?.clientId) continue;
    const invited = await clientProjects(session.clientId);
    const visible = session.verifiedAt ? invited : invited.filter((project) => project.id === session.startProjectId);
    return {
      sessionId: session.id,
      clientId: session.clientId,
      cookieName: cookie.name,
      clientName: session.clientName,
      organizationId: session.organizationId,
      organizationName: session.organizationName,
      organizationLogoPath: session.organizationLogoPath,
      unlocked: !!session.verifiedAt,
      projects: visible,
      hiddenProjects: invited.length - visible.length,
    };
  }
  return null;
});

/** Projects where the client is an active contact with a live link, newest activity first. Shared by the portal frame and its pages. */
export const clientProjects = cache(async (clientId: string) => {
  const rows = await getDatabase()
    .selectDistinctOn([projects.id], {
      id: projects.id,
      publicId: projects.publicId,
      name: projects.name,
      siteAddress: projects.siteAddress,
      status: projects.status,
      archivedAt: projects.archivedAt,
      updatedAt: projects.updatedAt,
    })
    .from(projectContacts)
    .innerJoin(projects, eq(projects.id, projectContacts.projectId))
    .innerJoin(portalGrants, and(
      eq(portalGrants.projectContactId, projectContacts.id),
      isNull(portalGrants.revokedAt),
      or(isNull(portalGrants.expiresAt), gt(portalGrants.expiresAt, new Date())),
    ))
    .where(and(eq(projectContacts.clientId, clientId), isNull(projectContacts.removedAt)))
    .orderBy(projects.id);
  return rows
    .sort((a, b) => Number(!!a.archivedAt) - Number(!!b.archivedAt) || Number(a.status !== "active") - Number(b.status !== "active") || b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((row) => ({ id: row.id, publicId: row.publicId, name: row.name, siteAddress: row.siteAddress, status: row.status, archived: !!row.archivedAt }));
});

/** The email the client confirmed in any of their projects; the unlock code goes there. */
export const clientVerifiedEmail = cache(async (clientId: string) => {
  const [row] = await getDatabase()
    .select({ email: projectContacts.email })
    .from(projectContacts)
    .where(and(eq(projectContacts.clientId, clientId), isNotNull(projectContacts.emailVerifiedAt), isNotNull(projectContacts.email)))
    .orderBy(desc(projectContacts.emailVerifiedAt))
    .limit(1);
  return row?.email ?? null;
});

export async function isOrganizationStaff(organizationId: string) {
  const userId = (await getSessionUser())?.id;
  if (!userId) return false;
  const [member] = await getDatabase().select({ userId: organizationMembers.userId }).from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")))
    .limit(1);
  return !!member;
}

/** For the header: whether this session can switch projects, or could after the unlock code. */
export async function clientNavigation(session: { clientId: string | null; unlocked: boolean; projectId: string }) {
  if (!session.clientId) return null;
  const projects = await clientProjects(session.clientId);
  const others = projects.filter((project) => project.id !== session.projectId).length;
  if (!others) return null;
  if (session.unlocked) {
    return { unlocked: true as const, others, projects: projects.map((project) => ({ publicId: project.publicId, name: project.name, current: project.id === session.projectId })) };
  }
  const email = await clientVerifiedEmail(session.clientId);
  return email ? { unlocked: false as const, others, maskedEmail: maskEmail(email) } : null;
}
