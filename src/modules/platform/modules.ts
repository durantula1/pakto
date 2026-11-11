import "server-only";

import { cache } from "react";

import { can } from "@/lib/authz/permissions";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { MODULES, MODULE_KEYS, type ModuleKey } from "@/modules/platform/registry";

/**
 * The optional modules are one package that comes with the paid plans (the middle and the top one;
 * the lowest plan has none). Until plans exist every company gets the whole package, so this is the
 * single place to restrict it by plan later.
 */
export const getEnabledModules = cache(async (_organizationId: string): Promise<Set<ModuleKey>> => new Set(MODULE_KEYS));

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
