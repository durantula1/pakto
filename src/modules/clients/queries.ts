import "server-only";

import { and, asc, count, desc, eq, exists, ilike, isNull, or, sql, type SQL } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrders, clients, projectContacts, projectMembers, projects } from "@/db/schema";
import { seesAllProjects } from "@/lib/authz/project-access";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { normalizePhone } from "@/modules/clients/operations";

/** Projects the caller may see; a client exists for them only through these (docs/clients-plan.md, 8). */
function visibleProject(context: TenantContext): SQL | undefined {
  if (seesAllProjects(context)) return undefined;
  const db = getDatabase();
  return exists(db.select({ id: projectMembers.projectId }).from(projectMembers)
    .where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, context.userId))));
}

function matches(query: string) {
  const phone = normalizePhone(query);
  return or(
    ilike(clients.name, `%${query}%`),
    ilike(clients.email, `%${query}%`),
    ilike(clients.phone, `%${query}%`),
    phone && phone.length >= 6 ? ilike(clients.phoneNormalized, `%${phone.replace(/^\+359/, "")}%`) : undefined,
  );
}

function clientFilters(context: TenantContext, filters: { query?: string; archived?: boolean }) {
  return and(
    eq(clients.organizationId, context.organizationId),
    isNull(clients.mergedIntoId),
    filters.archived ? sql`${clients.archivedAt} is not null` : isNull(clients.archivedAt),
    filters.query ? matches(filters.query) : undefined,
  );
}

export async function listClients(context: TenantContext, filters: { query?: string; archived?: boolean; limit: number; offset?: number }) {
  const db = getDatabase();
  return db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      projects: sql<number>`count(distinct ${projects.id})::int`,
      activeProjects: sql<number>`count(distinct ${projects.id}) filter (where ${projects.status} = 'active' and ${projects.archivedAt} is null)::int`,
      waiting: sql<number>`count(distinct ${changeOrders.id}) filter (where ${changeOrders.lifecycleStatus} = 'open' and ${changeOrders.archivedAt} is null and exists (select 1 from app.change_order_revisions r where r.id = ${changeOrders.currentRevisionId} and r.status in ('sent', 'viewed')))::int`,
      lastActivity: sql<Date>`max(${projects.updatedAt})`,
    })
    .from(clients)
    .innerJoin(projects, and(eq(projects.clientId, clients.id), eq(projects.organizationId, clients.organizationId), visibleProject(context)))
    .leftJoin(changeOrders, eq(changeOrders.projectId, projects.id))
    .where(clientFilters(context, filters))
    .groupBy(clients.id)
    .orderBy(desc(sql`max(${projects.updatedAt})`))
    .limit(filters.limit)
    .offset(filters.offset ?? 0);
}

export async function countClients(context: TenantContext, filters: { query?: string; archived?: boolean }) {
  const db = getDatabase();
  const [row] = await db
    .select({ total: sql<number>`count(distinct ${clients.id})::int` })
    .from(clients)
    .innerJoin(projects, and(eq(projects.clientId, clients.id), eq(projects.organizationId, clients.organizationId), visibleProject(context)))
    .where(clientFilters(context, filters));
  return row?.total ?? 0;
}

/** The client card: only the projects the caller may see. No visible project means no card. */
export async function getClient(context: TenantContext, clientId: string) {
  const db = getDatabase();
  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      address: clients.address,
      notes: clients.notes,
      archivedAt: clients.archivedAt,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.organizationId, context.organizationId), isNull(clients.mergedIntoId)))
    .limit(1);
  if (!client) return null;
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      siteAddress: projects.siteAddress,
      status: projects.status,
      archivedAt: projects.archivedAt,
      updatedAt: projects.updatedAt,
      waiting: sql<number>`count(${changeOrders.id}) filter (where ${changeOrders.lifecycleStatus} = 'open' and ${changeOrders.archivedAt} is null and exists (select 1 from app.change_order_revisions r where r.id = ${changeOrders.currentRevisionId} and r.status in ('sent', 'viewed')))::int`,
      documents: sql<number>`count(${changeOrders.id}) filter (where ${changeOrders.archivedAt} is null)::int`,
    })
    .from(projects)
    .leftJoin(changeOrders, eq(changeOrders.projectId, projects.id))
    .where(and(eq(projects.organizationId, context.organizationId), eq(projects.clientId, clientId), visibleProject(context)))
    .groupBy(projects.id)
    .orderBy(asc(sql`${projects.archivedAt} is not null`), desc(projects.updatedAt));
  if (!rows.length) return null;
  const [verified] = await db.select({ id: projectContacts.id }).from(projectContacts)
    .where(and(eq(projectContacts.clientId, clientId), sql`${projectContacts.emailVerifiedAt} is not null`)).limit(1);
  return { ...client, emailVerified: !!verified, projects: rows };
}

export type ClientOption = { id: string; name: string; email: string | null; phone: string | null; projects: number };

/** For "Съществуващ клиент" when creating a project: clients the caller already works with. */
export async function searchClientOptions(context: TenantContext, query: string): Promise<ClientOption[]> {
  const term = query.trim().slice(0, 100);
  const db = getDatabase();
  return db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      projects: count(projects.id),
    })
    .from(clients)
    .innerJoin(projects, and(eq(projects.clientId, clients.id), eq(projects.organizationId, clients.organizationId), visibleProject(context)))
    .where(clientFilters(context, { query: term || undefined }))
    .groupBy(clients.id)
    .orderBy(desc(sql`max(${projects.updatedAt})`))
    .limit(20);
}

/** A client the caller may attach a new project to; the same visibility as the picker. */
export async function findUsableClient(context: TenantContext, clientId: string) {
  const db = getDatabase();
  const [row] = await db
    .select({ id: clients.id, name: clients.name, email: clients.email, phone: clients.phone })
    .from(clients)
    .innerJoin(projects, and(eq(projects.clientId, clients.id), eq(projects.organizationId, clients.organizationId), visibleProject(context)))
    .where(and(eq(clients.id, clientId), clientFilters(context, {})))
    .limit(1);
  return row ?? null;
}

/** An existing client with this email or phone, for the "already exists" hint on a new client. */
export async function findClientDuplicate(context: TenantContext, input: { email: string | null; phone: string | null }) {
  const email = input.email?.trim().toLowerCase() || null;
  const phone = normalizePhone(input.phone);
  if (!email && !phone) return null;
  const db = getDatabase();
  const [row] = await db
    .select({ id: clients.id, name: clients.name, projects: count(projects.id) })
    .from(clients)
    .innerJoin(projects, and(eq(projects.clientId, clients.id), eq(projects.organizationId, clients.organizationId), visibleProject(context)))
    .where(and(
      clientFilters(context, {}),
      or(email ? eq(clients.emailNormalized, email) : undefined, phone ? eq(clients.phoneNormalized, phone) : undefined),
    ))
    .groupBy(clients.id)
    .limit(1);
  return row ?? null;
}

export type DuplicatePair = {
  reason: "email" | "phone";
  a: { id: string; name: string; email: string | null; phone: string | null; projects: number };
  b: { id: string; name: string; email: string | null; phone: string | null; projects: number };
};

/** Owners only: clients that share an email or a phone, for a manual merge. */
export async function listDuplicateClients(context: TenantContext): Promise<DuplicatePair[]> {
  if (context.role !== "owner") return [];
  const db = getDatabase();
  const rows = await db.execute<{
    reason: "email" | "phone";
    a_id: string; a_name: string; a_email: string | null; a_phone: string | null; a_projects: number;
    b_id: string; b_name: string; b_email: string | null; b_phone: string | null; b_projects: number;
  }>(sql`
    with live as (
      select c.id, c.name, c.email, c.phone, c.email_normalized, c.phone_normalized,
             (select count(*)::int from app.projects p where p.client_id = c.id) as projects
      from app.clients c
      where c.organization_id = ${context.organizationId} and c.merged_into_id is null and c.archived_at is null
    )
    select distinct on (least(a.id, b.id), greatest(a.id, b.id))
      case when a.email_normalized = b.email_normalized then 'email' else 'phone' end as reason,
      a.id as a_id, a.name as a_name, a.email as a_email, a.phone as a_phone, a.projects as a_projects,
      b.id as b_id, b.name as b_name, b.email as b_email, b.phone as b_phone, b.projects as b_projects
    from live a join live b on a.id < b.id
      and (a.email_normalized = b.email_normalized or a.phone_normalized = b.phone_normalized)
    order by least(a.id, b.id), greatest(a.id, b.id)
    limit 50
  `);
  return [...rows].map((row) => ({
    reason: row.reason,
    a: { id: row.a_id, name: row.a_name, email: row.a_email, phone: row.a_phone, projects: row.a_projects },
    b: { id: row.b_id, name: row.b_name, email: row.b_email, phone: row.b_phone, projects: row.b_projects },
  }));
}

/** The chosen client of a list filter, if the caller may see them. */
export async function getClientOption(context: TenantContext, clientId: string | undefined): Promise<ClientOption | null> {
  if (!clientId || !/^[0-9a-f-]{36}$/i.test(clientId)) return null;
  const client = await findUsableClient(context, clientId);
  return client ? { ...client, projects: 0 } : null;
}

/** The email the client confirmed in any invitation; a new invitation with it starts confirmed. */
export async function clientConfirmedEmail(clientId: string) {
  const [row] = await getDatabase()
    .select({ email: projectContacts.email })
    .from(projectContacts)
    .where(and(eq(projectContacts.clientId, clientId), sql`${projectContacts.emailVerifiedAt} is not null`, sql`${projectContacts.email} is not null`))
    .orderBy(desc(projectContacts.emailVerifiedAt))
    .limit(1);
  return row?.email?.trim().toLowerCase() ?? null;
}
