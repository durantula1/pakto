import "server-only";

import { and, asc, count, eq, gt, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDatabase } from "@/db";
import { organizationMembers, organizations, ownerRoleRequests, profiles, projectMembers, projects, teamInvites } from "@/db/schema";

export type TeamMemberStatusFilter = "active" | "disabled" | "all";

type MemberFilters = { organizationId: string; query?: string; status: TeamMemberStatusFilter };

const memberColumns = {
  userId: organizationMembers.userId, role: organizationMembers.role, status: organizationMembers.status,
  permissions: organizationMembers.permissions, allProjects: organizationMembers.allProjects, joinedAt: organizationMembers.createdAt,
  displayName: profiles.displayName, email: profiles.email,
};

function memberFilter({ organizationId, query, status }: MemberFilters) {
  const term = query?.trim().slice(0, 100);
  return and(
    eq(organizationMembers.organizationId, organizationId),
    status === "all" ? undefined : eq(organizationMembers.status, status),
    term ? or(ilike(profiles.displayName, `%${term}%`), ilike(profiles.email, `%${term}%`)) : undefined,
  );
}

/** Project ids assigned to the given members, limited to projects of the organization. */
async function assignedProjectIds(organizationId: string, userIds: string[]) {
  const map = new Map<string, string[]>();
  if (!userIds.length) return map;
  const rows = await getDatabase().select({ userId: projectMembers.userId, projectId: projectMembers.projectId })
    .from(projectMembers).innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(and(eq(projects.organizationId, organizationId), inArray(projectMembers.userId, userIds)));
  for (const row of rows) map.set(row.userId, [...(map.get(row.userId) ?? []), row.projectId]);
  return map;
}

export async function listTeamMembers(filters: MemberFilters & { limit: number; offset: number }) {
  const members = await getDatabase().select(memberColumns)
    .from(organizationMembers).leftJoin(profiles, eq(profiles.id, organizationMembers.userId))
    .where(memberFilter(filters))
    .orderBy(asc(organizationMembers.createdAt), asc(organizationMembers.userId))
    .limit(filters.limit).offset(filters.offset);
  const assignments = await assignedProjectIds(filters.organizationId, members.map((member) => member.userId));
  return members.map((member) => ({ ...member, projectIds: assignments.get(member.userId) ?? [] }));
}

export async function countTeamMembers(filters: MemberFilters) {
  const [row] = await getDatabase().select({ total: count() })
    .from(organizationMembers).leftJoin(profiles, eq(profiles.id, organizationMembers.userId))
    .where(memberFilter(filters));
  return row?.total ?? 0;
}

/** Active members and active owners (the latter decides `allowOwnerInvite`), counted in SQL. */
export async function getTeamCounters(organizationId: string) {
  const [row] = await getDatabase().select({
    activeMembers: sql<number>`count(*) filter (where ${organizationMembers.status} = 'active')::int`,
    activeOwners: sql<number>`count(*) filter (where ${organizationMembers.status} = 'active' and ${organizationMembers.role} = 'owner')::int`,
  }).from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId));
  return { activeMembers: row?.activeMembers ?? 0, activeOwners: row?.activeOwners ?? 0 };
}

function pendingInviteFilter(organizationId: string) {
  return and(eq(teamInvites.organizationId, organizationId), isNull(teamInvites.acceptedAt), isNull(teamInvites.revokedAt), gt(teamInvites.expiresAt, new Date()));
}

/** Pending and not expired: an expired proposal can no longer be confirmed, so it is not listed either. */
function pendingRequestFilter(organizationId: string) {
  return and(eq(ownerRoleRequests.organizationId, organizationId), eq(ownerRoleRequests.status, "pending"), gt(ownerRoleRequests.expiresAt, new Date()));
}

const requester = alias(profiles, "requester");

export async function listPendingTeamInvites(organizationId: string) {
  return getDatabase().select({ id: teamInvites.id, email: teamInvites.email, role: teamInvites.role, permissions: teamInvites.permissions, allProjects: teamInvites.allProjects, projectIds: teamInvites.projectIds, expiresAt: teamInvites.expiresAt })
    .from(teamInvites).where(pendingInviteFilter(organizationId)).orderBy(asc(teamInvites.createdAt));
}

export async function listPendingOwnerRequests(organizationId: string) {
  return getDatabase().select({
    id: ownerRoleRequests.id, targetUserId: ownerRoleRequests.targetUserId, requestedRole: ownerRoleRequests.requestedRole,
    removeMember: ownerRoleRequests.removeMember, requestedBy: ownerRoleRequests.requestedBy, targetName: profiles.displayName,
    requesterName: requester.displayName, createdAt: ownerRoleRequests.createdAt, expiresAt: ownerRoleRequests.expiresAt,
  }).from(ownerRoleRequests).leftJoin(profiles, eq(profiles.id, ownerRoleRequests.targetUserId))
    .leftJoin(requester, eq(requester.id, ownerRoleRequests.requestedBy))
    .where(pendingRequestFilter(organizationId)).orderBy(asc(ownerRoleRequests.createdAt));
}

/** One member (any status) with the names of their assigned projects — only those, not the whole project list. */
export async function getTeamMember(organizationId: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const db = getDatabase();
  const [[member], assigned] = await Promise.all([
    db.select(memberColumns)
      .from(organizationMembers).leftJoin(profiles, eq(profiles.id, organizationMembers.userId))
      .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId))).limit(1),
    db.select({ id: projects.id, name: projects.name, siteAddress: projects.siteAddress })
      .from(projectMembers).innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(and(eq(projects.organizationId, organizationId), eq(projectMembers.userId, userId)))
      .orderBy(asc(projects.name)),
  ]);
  if (!member) return null;
  return { ...member, projects: assigned, projectIds: assigned.map((project) => project.id) };
}

export async function getTeamInvite(tokenHash: string) {
  const [invite] = await getDatabase().select({
    id: teamInvites.id, email: teamInvites.email, role: teamInvites.role,
    permissions: teamInvites.permissions, allProjects: teamInvites.allProjects, projectIds: teamInvites.projectIds,
    expiresAt: teamInvites.expiresAt, acceptedAt: teamInvites.acceptedAt, revokedAt: teamInvites.revokedAt,
    organizationName: organizations.name, inviterName: profiles.displayName,
  }).from(teamInvites)
    .innerJoin(organizations, eq(organizations.id, teamInvites.organizationId))
    .leftJoin(profiles, eq(profiles.id, teamInvites.createdBy))
    .where(eq(teamInvites.tokenHash, tokenHash)).limit(1);
  return invite ?? null;
}
