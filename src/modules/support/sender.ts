import "server-only";

import { cache } from "react";

import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { getSessionUser } from "@/lib/auth/server";
import { clientVerifiedEmail, getClientPortal } from "@/modules/change-portal/session";

/** What the session says about the sender: a staff account first, else a client portal session. */
export const describeSender = cache(async (): Promise<{ email: string | null; lines: [string, string | null][] }> => {
  const user = await getSessionUser();
  if (user) {
    const tenant = await getOptionalTenantContext();
    const email = user.email;
    return {
      email,
      lines: [
        ["Подател", "Служител (влязъл в профила си)"],
        ["Акаунт", email],
        ["Фирма", tenant ? `${tenant.organizationName} (${tenant.organizationId})` : "без фирма"],
        ["Роля", tenant?.role ?? null],
      ],
    };
  }
  const client = await getClientPortal();
  if (client) {
    const email = await clientVerifiedEmail(client.clientId);
    return {
      email,
      lines: [
        ["Подател", "Клиент от портала"],
        ["Клиент", client.clientName],
        ["Потвърден имейл", email],
        ["Фирма", `${client.organizationName} (${client.organizationId})`],
        ["Обекти", client.projects.map((project) => project.name).join(", ") || null],
      ],
    };
  }
  return { email: null, lines: [["Подател", "Без профил"]] };
});
