import "server-only";

import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { organizationMembers, organizations, type ApprovalMode, type PortalMode } from "@/db/schema";
import type { Permission } from "@/lib/authz/permissions";
import { getSessionUser } from "@/lib/auth/server";

export type TenantContext = {
  userId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: "owner" | "admin" | "member" | "field" | "office";
  permissions: Permission[];
  allProjects: boolean;
  features: OrganizationFeatures;
};

/** How the company works with Pakto: chosen in Settings → Company, preset by the sign-up profile. */
export type OrganizationFeatures = {
  approvalMode: ApprovalMode;
  portalMode: PortalMode;
  tasks: boolean;
  catalog: boolean;
  finance: boolean;
};

class ModuleDisabledError extends Error {
  readonly code = "MODULE_DISABLED";
}

const moduleNames = { tasks: "Задачи", catalog: "Каталог", finance: "Пари" } as const;

/** Refuses a write to a module the company has switched off. Its data stays; switching it on brings it back. */
export function requireModule(context: TenantContext, module: keyof typeof moduleNames) {
  if (!context.features[module]) {
    throw new ModuleDisabledError(`Модулът „${moduleNames[module]}“ е изключен. Включи го от Настройки → Фирма.`);
  }
}

class AuthenticationRequiredError extends Error {
  readonly code = "UNAUTHORIZED";
}

class MembershipRequiredError extends Error {
  readonly code = "MEMBERSHIP_REQUIRED";
}

/**
 * The signed-in user's id from the session (cookie cache, else one read), once per request.
 * Lets callers start user-scoped reads alongside the membership read instead of after it.
 */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  return (await getSessionUser())?.id ?? null;
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
        approvalMode: organizations.approvalMode,
        portalMode: organizations.portalMode,
        tasksEnabled: organizations.tasksEnabled,
        catalogEnabled: organizations.catalogEnabled,
        financeEnabled: organizations.financeEnabled,
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
      features: {
        approvalMode: membership.approvalMode,
        portalMode: membership.portalMode,
        tasks: membership.tasksEnabled,
        catalog: membership.catalogEnabled,
        finance: membership.financeEnabled,
      },
    };
  },
);

export async function requireTenantContext(): Promise<TenantContext> {
  const context = await getOptionalTenantContext();
  if (!context) {
    throw new MembershipRequiredError(
      "Профилът няма фирма. Завърши настройката на фирмата.",
    );
  }
  return context;
}

export function requireRole(
  context: TenantContext,
  allowed: TenantContext["role"][],
) {
  if (!allowed.includes(context.role)) {
    throw new AuthenticationRequiredError("Ролята ти не включва това. Попитай собственика на фирмата.");
  }
}
