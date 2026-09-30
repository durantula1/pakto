"use server";

import { requireTenantContext } from "@/lib/authz/tenant-context";
import { searchClientOptions } from "@/modules/clients/queries";

export async function searchClientsAction(query: string, excludeProjectId?: string) {
  const context = await requireTenantContext();
  return searchClientOptions(context, typeof query === "string" ? query : "", typeof excludeProjectId === "string" ? excludeProjectId : undefined);
}
