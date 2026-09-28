"use server";

import { requireTenantContext } from "@/lib/authz/tenant-context";
import { searchProjectOptions } from "@/modules/projects/queries";

export async function searchProjectsAction(query: string, activeOnly = false) {
  const context = await requireTenantContext();
  return searchProjectOptions(context, typeof query === "string" ? query : "", { activeOnly: activeOnly === true });
}
