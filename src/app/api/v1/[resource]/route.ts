import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/db";
import { apiKeys, clients, deals, organizationModules, projects, tasks } from "@/db/schema";
import { hashApiKey } from "@/modules/integrations/keys";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

/**
 * Read-only company API: `GET /api/v1/{projects|clients|tasks|deals}?limit=50&offset=0` with
 * `Authorization: Bearer pk_live_…`. A key sees only its own company, and only when the module is on.
 */
export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const token = /^Bearer\s+(pk_live_[A-Za-z0-9_-]{20,})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return json({ error: "Липсва API ключ." }, 401);
  const db = getDatabase();
  const [key] = await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash, hashApiKey(token)), isNull(apiKeys.revokedAt))).limit(1);
  if (!key) return json({ error: "Невалиден API ключ." }, 401);
  const [module] = await db.select({ key: organizationModules.moduleKey }).from(organizationModules).where(and(eq(organizationModules.organizationId, key.organizationId), eq(organizationModules.moduleKey, "api"))).limit(1);
  if (!module) return json({ error: "API модулът не е включен." }, 403);
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
  const org = key.organizationId;

  let data: unknown[];
  if (resource === "projects") {
    data = await db.select({ id: projects.id, name: projects.name, address: projects.siteAddress, reference: projects.reference, status: projects.status, clientId: projects.clientId, startsOn: projects.startsOn, dueOn: projects.dueOn, createdAt: projects.createdAt })
      .from(projects).where(and(eq(projects.organizationId, org), isNull(projects.archivedAt))).orderBy(desc(projects.createdAt)).limit(limit).offset(offset);
  } else if (resource === "clients") {
    data = await db.select({ id: clients.id, name: clients.name, email: clients.email, phone: clients.phone, address: clients.address, tags: clients.tags, createdAt: clients.createdAt })
      .from(clients).where(and(eq(clients.organizationId, org), isNull(clients.archivedAt), isNull(clients.mergedIntoId))).orderBy(desc(clients.createdAt)).limit(limit).offset(offset);
  } else if (resource === "tasks") {
    data = await db.select({ id: tasks.id, projectId: tasks.projectId, title: tasks.title, status: tasks.status, priority: tasks.priority, assigneeId: tasks.assigneeId, dueOn: tasks.dueOn, completedAt: tasks.completedAt, createdAt: tasks.createdAt })
      .from(tasks).where(eq(tasks.organizationId, org)).orderBy(desc(tasks.createdAt)).limit(limit).offset(offset);
  } else if (resource === "deals") {
    data = await db.select({ id: deals.id, title: deals.title, stageId: deals.stageId, value: deals.value, currency: deals.currency, clientId: deals.clientId, offerId: deals.offerId, projectId: deals.projectId, expectedCloseOn: deals.expectedCloseOn, createdAt: deals.createdAt })
      .from(deals).where(eq(deals.organizationId, org)).orderBy(desc(deals.createdAt)).limit(limit).offset(offset);
  } else {
    return json({ error: "Непознат ресурс. Позволени: projects, clients, tasks, deals." }, 404);
  }
  // Best effort, at most once a minute per key, so reading never turns into a write per request.
  db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id)).catch(() => undefined);
  return json({ data, limit, offset });
}
