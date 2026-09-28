import "server-only";

import { and, desc, eq, exists, ilike, isNull, or, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrders, clients, projectContacts, projectMembers, projectMilestones, projects } from "@/db/schema";
import { seesAllProjects } from "@/lib/authz/project-access";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { portalLinkFor } from "@/modules/change-portal/links";

/** Name, address, reference, and the client's name, email or phone. */
function projectSearch(query: string) {
  return or(
    ilike(projects.name, `%${query}%`),
    ilike(projects.siteAddress, `%${query}%`),
    ilike(projects.reference, `%${query}%`),
    ilike(projectContacts.name, `%${query}%`),
    ilike(clients.name, `%${query}%`),
    ilike(clients.email, `%${query}%`),
    ilike(clients.phone, `%${query}%`),
  );
}

export async function listProjects(context: TenantContext, filters: {
  query?: string;
  status?: "active" | "completed" | "archived";
  clientId?: string;
  limit: number;
  offset?: number;
}) {
  const db = getDatabase();
  return db
    .select({
      id: projects.id,
      publicId: projects.publicId,
      name: projects.name,
      siteAddress: projects.siteAddress,
      reference: projects.reference,
      status: projects.status,
      updatedAt: projects.updatedAt,
      contactName: projectContacts.name,
      clientId: clients.id,
      clientName: clients.name,
      openChanges: sql<number>`count(${changeOrders.id}) filter (where ${changeOrders.lifecycleStatus} = 'open')::int`,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(
      projectContacts,
      and(
        eq(projectContacts.projectId, projects.id),
        eq(projectContacts.isPrimary, true),
        isNull(projectContacts.removedAt),
      ),
    )
    .leftJoin(
      changeOrders,
      and(
        eq(changeOrders.projectId, projects.id),
        isNull(changeOrders.archivedAt),
      ),
    )
    .where(
      and(
        eq(projects.organizationId, context.organizationId),
        // The archive is its own filter; every other view leaves archived projects out.
        filters.status === "archived" ? undefined : isNull(projects.archivedAt),
        filters.status ? eq(projects.status, filters.status) : undefined,
        filters.clientId ? eq(projects.clientId, filters.clientId) : undefined,
        filters.query ? projectSearch(filters.query) : undefined,
        seesAllProjects(context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, context.userId)))),
      ),
    )
    .groupBy(projects.id, projectContacts.id, clients.id)
    .orderBy(desc(projects.updatedAt))
    .limit(filters.limit)
    .offset(filters.offset ?? 0);
}

export async function countProjects(context: TenantContext, filters?: {
  query?: string;
  status?: "active" | "completed" | "archived";
  clientId?: string;
}) {
  const db = getDatabase();
  const [row] = await db.select({ total: sql<number>`count(distinct ${projects.id})::int` })
    .from(projects)
    .leftJoin(projectContacts, and(eq(projectContacts.projectId, projects.id), eq(projectContacts.isPrimary, true), isNull(projectContacts.removedAt)))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(and(
      eq(projects.organizationId, context.organizationId),
      filters?.status === "archived" ? undefined : isNull(projects.archivedAt),
      filters?.status ? eq(projects.status, filters.status) : undefined,
      filters?.clientId ? eq(projects.clientId, filters.clientId) : undefined,
      filters?.query ? projectSearch(filters.query) : undefined,
      seesAllProjects(context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, context.userId)))),
    ));
  return row?.total ?? 0;
}

export async function getProject(organizationId: string, projectId: string) {
  const [project] = await getDatabase()
    .select({
      id: projects.id,
      publicId: projects.publicId,
      name: projects.name,
      siteAddress: projects.siteAddress,
      reference: projects.reference,
      status: projects.status,
      createdAt: projects.createdAt,
      completedAt: projects.completedAt,
      archivedAt: projects.archivedAt,
      contactId: projectContacts.id,
      contactName: projectContacts.name,
      contactEmail: projectContacts.email,
      contactPhone: projectContacts.phone,
      contactRole: projectContacts.portalRole,
      contactEmailVerifiedAt: projectContacts.emailVerifiedAt,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(
      projectContacts,
      and(
        eq(projectContacts.projectId, projects.id),
        eq(projectContacts.isPrimary, true),
        isNull(projectContacts.removedAt),
      ),
    )
    // Archived projects still open (read-only); lists and pickers leave them out.
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projects.id, projectId),
      ),
    )
    .limit(1);

  return project ?? null;
}

function visibleProjectFilter(context: TenantContext) {
  const db = getDatabase();
  return and(
    eq(projects.organizationId, context.organizationId),
    isNull(projects.archivedAt),
    seesAllProjects(context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, context.userId)))),
  );
}

/** Lightweight id/name lookup for pickers; never loads the whole project list. */
/** `activeOnly` leaves out completed and archived projects, for pickers that start new work. */
export async function searchProjectOptions(context: TenantContext, query: string, { activeOnly = false, limit = 20 } = {}) {
  const term = query.trim().slice(0, 100);
  return getDatabase()
    .select({ id: projects.id, name: projects.name, siteAddress: projects.siteAddress })
    .from(projects)
    .where(and(
      visibleProjectFilter(context),
      activeOnly ? eq(projects.status, "active") : undefined,
      term ? or(ilike(projects.name, `%${term}%`), ilike(projects.siteAddress, `%${term}%`), ilike(projects.reference, `%${term}%`)) : undefined,
    ))
    .orderBy(desc(projects.updatedAt))
    .limit(limit);
}

export async function getProjectOption(context: TenantContext, projectId: string | undefined) {
  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) return null;
  const [project] = await getDatabase()
    .select({ id: projects.id, name: projects.name, siteAddress: projects.siteAddress })
    .from(projects)
    .where(and(visibleProjectFilter(context), eq(projects.id, projectId)))
    .limit(1);
  return project ?? null;
}

export async function hasProjects(context: TenantContext) {
  const [row] = await getDatabase().select({ id: projects.id }).from(projects).where(visibleProjectFilter(context)).limit(1);
  return Boolean(row);
}

/** Tab title for a project page: the name, only when the caller could open the project. */
export async function getProjectTitle(context: TenantContext, projectId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return null;
  const db = getDatabase();
  const [project] = await db.select({ name: projects.name })
    .from(projects)
    .where(and(
      eq(projects.organizationId, context.organizationId),
      eq(projects.id, projectId),
      seesAllProjects(context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, context.userId)))),
    ))
    .limit(1);
  return project?.name ?? null;
}

/** Whether any stage of the work schedule covers this change. */
export async function changeHasStage(organizationId: string, changeOrderId: string) {
  const [row] = await getDatabase().select({ id: projectMilestones.id }).from(projectMilestones)
    .where(and(eq(projectMilestones.organizationId, organizationId), eq(projectMilestones.changeOrderId, changeOrderId))).limit(1);
  return !!row;
}

/** The project's client contacts for the access panel: role, confirmed email, last visit and their link. One query. */
export async function listProjectContacts(projectId: string) {
  const rows = await getDatabase()
    .select({
      id: projectContacts.id,
      name: projectContacts.name,
      email: projectContacts.email,
      phone: projectContacts.phone,
      role: projectContacts.portalRole,
      isPrimary: projectContacts.isPrimary,
      emailVerifiedAt: projectContacts.emailVerifiedAt,
      // Fully qualified: in a single-table select Drizzle writes a bare "id", which inside these subqueries is ambiguous.
      lastSeenAt: sql<string | null>`(select max(s.last_seen_at) from app.portal_sessions s join app.portal_grants g on g.id = s.portal_grant_id where g.project_contact_id = app.project_contacts.id and g.revoked_at is null)`,
      grants: sql<Array<{ id: string; tokenHash: string }> | null>`(select json_agg(json_build_object('id', g.id, 'tokenHash', g.token_hash)) from app.portal_grants g where g.project_contact_id = app.project_contacts.id and g.project_id = app.project_contacts.project_id and g.revoked_at is null and g.expires_at is null and g.token_ciphertext = 'derived-v1')`,
    })
    .from(projectContacts)
    .where(and(eq(projectContacts.projectId, projectId), isNull(projectContacts.removedAt)))
    .orderBy(desc(projectContacts.isPrimary), projectContacts.createdAt);
  return rows.map(({ grants, ...row }) => ({
    ...row,
    lastSeenAt: row.lastSeenAt ? new Date(row.lastSeenAt) : null,
    link: (grants ?? []).map(portalLinkFor).find(Boolean) ?? null,
  }));
}

export type ProjectContactRow = Awaited<ReturnType<typeof listProjectContacts>>[number];
