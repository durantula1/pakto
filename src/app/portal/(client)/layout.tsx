import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";
import { clientUnreadQuestions } from "@/modules/change-portal/navigation";
import { getClientPortal } from "@/modules/change-portal/session";

/**
 * The frame of the client-wide pages (Начало, Съобщения, Оферти). It stays on screen while a page
 * loads, so moving between them shows the header, the bar and a skeleton at once.
 */
export default async function ClientPortalLayout({ children }: LayoutProps<"/portal">) {
  const portal = await getClientPortal();
  if (!portal || !portal.projects.length) redirect("/portal/invalid");
  return (
    <PortalShell organizationName={portal.organizationName} logoPath={portal.organizationLogoPath} nav unread={clientUnreadQuestions(portal.clientId)}>
      {children}
    </PortalShell>
  );
}
