import type { Metadata } from "next";

import { PortalShell } from "@/components/portal/portal-shell";
import { DownloadTray } from "@/components/workspace/download-tray";
import { getPortalSession } from "@/modules/change-portal/session";

export const metadata: Metadata = {
  title: "Вашият обект",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PortalProjectLayout({ children, params }: LayoutProps<"/portal/[projectPublicId]">) {
  const { projectPublicId } = await params;
  const session = await getPortalSession(projectPublicId);
  // The whole frame only for a client session the code has opened; a bare link stays on its project.
  const nav = !!session?.clientId && session.unlocked;
  return (
    <PortalShell organizationName={session?.organizationName} logoPath={session?.organizationLogoPath} nav={nav}>
      {children}
      <DownloadTray />
    </PortalShell>
  );
}
