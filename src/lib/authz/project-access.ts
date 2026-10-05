import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { projects } from "@/db/schema";
import { can, type Permission } from "@/lib/authz/permissions";
import type { TenantContext } from "@/lib/authz/tenant-context";

export type ProjectCapability = "view" | "draft" | "offer" | "send" | "milestone" | "payment" | "manage";

/**
 * The caller's role and permissions. They come from the tenant context, which reads the active
 * membership once per request (React `cache`), so this adds no query of its own.
 */
export async function getCurrentMember(context: TenantContext) {
  return { role: context.role, permissions: context.permissions, allProjects: context.allProjects };
}

export async function requireOwner(context: TenantContext) {
  const member = await getCurrentMember(context);
  if (member.role !== "owner") throw new Error("Само собственик може да направи това.");
  return member;
}

export async function requirePermission(context: TenantContext, permission: Permission) {
  const member = await getCurrentMember(context);
  if (!can(member, permission)) throw new Error("Ролята ти не включва това. Попитай собственика на фирмата.");
  return member;
}

const capabilityPermissions: Record<Exclude<ProjectCapability, "view">, Permission[]> = {
  draft: ["changes.draft"],
  offer: ["offers.edit"],
  send: ["documents.send"],
  manage: ["documents.send"],
  milestone: ["milestones.manage"],
  payment: ["payments.record"],
};

export async function requireProjectCapability(
  context: TenantContext,
  projectId: string,
  capability: ProjectCapability,
) {
  const member = await getCurrentMember(context);
  // One round trip: the project, and whether the caller is assigned to it. Fully qualified: in a
  // single-table select Drizzle writes a bare "id", which is fragile inside a subquery.
  const [project] = await getDatabase()
    .select({
      id: projects.id,
      assigned: sql<boolean>`exists (select 1 from app.project_members pm where pm.project_id = app.projects.id and pm.user_id = ${context.userId})`,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, context.organizationId)))
    .limit(1);
  if (!project) throw new Error("Обектът не е намерен.");
  if (member.role === "owner") return member;
  if (!member.allProjects && !project.assigned) throw new Error("Нямаш достъп до този обект.");
  if (capability === "view") return member;
  if (capabilityPermissions[capability].some((permission) => member.permissions.includes(permission))) return member;
  if (capability === "payment") throw new Error("Ролята ти не включва записване на плащания. Попитай собственика на фирмата.");
  throw new Error("Ролята ти не включва това. Попитай собственика на фирмата.");
}

export function seesAllProjects(context: Pick<TenantContext, "role" | "allProjects">) {
  return context.role === "owner" || context.allProjects;
}
