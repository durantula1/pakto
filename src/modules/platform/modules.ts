import "server-only";

import { cache } from "react";
import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { organizationModules } from "@/db/schema";
import { can } from "@/lib/authz/permissions";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { MODULES, isModuleKey, type ModuleKey } from "@/modules/platform/registry";

/** The modules a company switched on, once per request. A company with no rows gets the core product only. */
export const getEnabledModules = cache(async (organizationId: string): Promise<Set<ModuleKey>> => {
  const rows = await getDatabase()
    .select({ key: organizationModules.moduleKey })
    .from(organizationModules)
    .where(eq(organizationModules.organizationId, organizationId));
  return new Set(rows.map((row) => row.key).filter(isModuleKey));
});

/** True when the module is on for the company and the member may open it. */
export function canOpenModule(context: TenantContext, enabled: ReadonlySet<ModuleKey>, key: ModuleKey) {
  if (!enabled.has(key)) return false;
  const definition = MODULES[key];
  if (definition.ownerOnly) return context.role === "owner";
  return definition.permission === null || can(context, definition.permission);
}

/** For pages and Server Actions: throws a plain message when the module is off or not allowed. */
export async function requireModule(context: TenantContext, key: ModuleKey) {
  const enabled = await getEnabledModules(context.organizationId);
  if (!enabled.has(key)) throw new Error(`Модулът „${MODULES[key].label}“ не е включен. Собственикът го включва от Настройки → Модули.`);
  if (!canOpenModule(context, enabled, key)) throw new Error("Ролята ти не включва това. Попитай собственика на фирмата.");
  return enabled;
}

export async function setModule(organizationId: string, userId: string, key: ModuleKey, on: boolean) {
  const db = getDatabase();
  if (on) {
    await db.insert(organizationModules).values({ organizationId, moduleKey: key, enabledBy: userId }).onConflictDoNothing();
  } else {
    await db.delete(organizationModules).where(and(eq(organizationModules.organizationId, organizationId), eq(organizationModules.moduleKey, key)));
  }
}
