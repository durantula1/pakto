import "server-only";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { activities, changeOrders, clients, companies, deals, pipelineStages, profiles, projects } from "@/db/schema";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { visibleProjects } from "@/modules/platform/scope";

/**
 * An offer the client approved closes its deal as won. The offer stays the only source of truth for
 * "approved"; the deal only follows it. Runs when the CRM opens, so no core code has to know about deals.
 */
export async function syncDealsWithOffers(organizationId: string) {
  const db = getDatabase();
  const stages = await db.select().from(pipelineStages).where(eq(pipelineStages.organizationId, organizationId)).orderBy(asc(pipelineStages.position));
  const won = stages.find((stage) => stage.kind === "won");
  const open = stages.filter((stage) => stage.kind === "open").map((stage) => stage.id);
  if (!won || !open.length) return;
  await db.execute(sql`
    update app.deals d set stage_id = ${won.id}, closed_at = now(), updated_at = now()
    from app.change_orders co
    where d.organization_id = ${organizationId} and d.offer_id = co.id and co.organization_id = ${organizationId}
      and co.approved_revision_id is not null and d.stage_id in (${sql.join(open.map((id) => sql`${id}::uuid`), sql`, `)})`);
}

export async function getBoard(organizationId: string) {
  const db = getDatabase();
  const [stages, rows] = await Promise.all([
    db.select().from(pipelineStages).where(eq(pipelineStages.organizationId, organizationId)).orderBy(asc(pipelineStages.position)),
    db
      .select({
        id: deals.id,
        title: deals.title,
        stageId: deals.stageId,
        value: deals.value,
        currency: deals.currency,
        expectedCloseOn: deals.expectedCloseOn,
        clientName: clients.name,
        companyName: companies.name,
        ownerName: profiles.displayName,
        offerId: deals.offerId,
      })
      .from(deals)
      .leftJoin(clients, eq(clients.id, deals.clientId))
      .leftJoin(companies, eq(companies.id, deals.companyId))
      .leftJoin(profiles, eq(profiles.id, deals.ownerId))
      .where(eq(deals.organizationId, organizationId))
      .orderBy(desc(deals.updatedAt))
      .limit(500),
  ]);
  return stages.map((stage) => ({ ...stage, deals: rows.filter((deal) => deal.stageId === stage.id) }));
}

export async function getDeal(organizationId: string, dealId: string) {
  const db = getDatabase();
  const [deal] = await db
    .select({
      id: deals.id,
      title: deals.title,
      stageId: deals.stageId,
      value: deals.value,
      currency: deals.currency,
      expectedCloseOn: deals.expectedCloseOn,
      source: deals.source,
      notes: deals.notes,
      lostReason: deals.lostReason,
      clientId: deals.clientId,
      clientName: clients.name,
      companyId: deals.companyId,
      companyName: companies.name,
      ownerId: deals.ownerId,
      offerId: deals.offerId,
      projectId: deals.projectId,
      closedAt: deals.closedAt,
    })
    .from(deals)
    .leftJoin(clients, eq(clients.id, deals.clientId))
    .leftJoin(companies, eq(companies.id, deals.companyId))
    .where(and(eq(deals.id, dealId), eq(deals.organizationId, organizationId)))
    .limit(1);
  if (!deal) return null;
  const items = await db
    .select({ id: activities.id, kind: activities.kind, subject: activities.subject, body: activities.body, dueAt: activities.dueAt, doneAt: activities.doneAt, createdAt: activities.createdAt, authorName: profiles.displayName })
    .from(activities)
    .leftJoin(profiles, eq(profiles.id, activities.createdBy))
    .where(and(eq(activities.dealId, dealId), eq(activities.organizationId, organizationId)))
    .orderBy(desc(activities.createdAt))
    .limit(200);
  return { ...deal, activities: items };
}

export async function listClientChoices(organizationId: string) {
  return getDatabase()
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.organizationId, organizationId), isNull(clients.archivedAt), isNull(clients.mergedIntoId)))
    .orderBy(asc(clients.name))
    .limit(1000);
}

export async function listCompanies(organizationId: string) {
  return getDatabase()
    .select({
      id: companies.id,
      name: companies.name,
      vatId: companies.vatId,
      phone: companies.phone,
      email: companies.email,
      contacts: sql<number>`(select count(*)::int from app.clients c where c.company_id = ${companies.id})`,
      deals: sql<number>`(select count(*)::int from app.deals d where d.company_id = ${companies.id})`,
    })
    .from(companies)
    .where(and(eq(companies.organizationId, organizationId), isNull(companies.archivedAt)))
    .orderBy(asc(companies.name))
    .limit(500);
}

/** Projects the caller can open, with their offers, for linking a deal to what it led to. */
export async function listLinkTargets(context: TenantContext) {
  const db = getDatabase();
  const list = await db.select({ id: projects.id, name: projects.name }).from(projects).where(visibleProjects(context)).orderBy(desc(projects.updatedAt)).limit(200);
  if (!list.length) return [];
  const offers = await db
    .select({ id: changeOrders.id, projectId: changeOrders.projectId, sequenceNumber: changeOrders.sequenceNumber, approved: sql<boolean>`${changeOrders.approvedRevisionId} is not null` })
    .from(changeOrders)
    .where(and(eq(changeOrders.organizationId, context.organizationId), eq(changeOrders.documentKind, "offer"), inArray(changeOrders.projectId, list.map((project) => project.id))))
    .orderBy(asc(changeOrders.sequenceNumber));
  return list.map((project) => ({ ...project, offers: offers.filter((offer) => offer.projectId === project.id) }));
}
