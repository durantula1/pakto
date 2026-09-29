import "server-only";

import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { organizationMembers, organizations } from "@/db/schema";
import type { Permission } from "@/lib/authz/permissions";
import { createClient } from "@/lib/supabase/server";

export type TenantContext = {
  userId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: "owner" | "admin" | "member" | "field" | "office";
  permissions: Permission[];
  allProjects: boolean;
};

export class AuthenticationRequiredError extends Error {
  readonly code = "UNAUTHORIZED";
}

export class MembershipRequiredError extends Error {
  readonly code = "MEMBERSHIP_REQUIRED";
}

/**
 * The signed-in user's id from the session JWT, verified locally (no query), once per request.
 * Lets callers start user-scoped reads alongside the membership read instead of after it.
 */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  return error ? null : data?.claims?.sub ?? null;
});

export const getOptionalTenantContext = cache(
  async (): Promise<TenantContext | null> => {
    const userId = await getSessionUserId();

    if (!userId) {
      return null;
    }

    const database = getDatabase();
    const [membership] = await database
      .select({
        organizationId: organizationMembers.organizationId,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        role: organizationMembers.role,
        permissions: organizationMembers.permissions,
        allProjects: organizationMembers.allProjects,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationMembers.organizationId),
      )
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.status, "active"),
        ),
      )
      .orderBy(asc(organizationMembers.createdAt))
      .limit(1);

    if (!membership) {
      return null;
    }

    return {
      userId,
      organizationId: membership.organizationId,
      organizationName: membership.organizationName,
      organizationSlug: membership.organizationSlug,
      role: membership.role,
      permissions: membership.permissions,
      allProjects: membership.allProjects,
    };
  },
);

export async function requireTenantContext(): Promise<TenantContext> {
  const context = await getOptionalTenantContext();
  if (!context) {
    throw new MembershipRequiredError(
      "Профилът няма активна организация. Завърши настройката на workspace-а.",
    );
  }
  return context;
}

export function requireRole(
  context: TenantContext,
  allowed: TenantContext["role"][],
) {
  if (!allowed.includes(context.role)) {
    throw new AuthenticationRequiredError("Нямаш право за това действие.");
  }
}
