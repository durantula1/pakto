import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { WelcomeCarousel } from "@/components/onboarding/welcome-carousel";
import { can, roleLabel } from "@/lib/authz/permissions";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { getAccountSummary } from "@/modules/account/queries";

export const metadata: Metadata = { title: "Добре дошъл в Pakto" };

/** Shown once after sign-up or after joining a team; `?again` replays it from "Как работи". */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ again?: string }> }) {
  const context = await getOptionalTenantContext();
  if (!context) redirect("/onboarding");
  const [account, { again }] = await Promise.all([getAccountSummary(context.userId), searchParams]);
  if (!account) redirect("/auth/signed-out");
  if (account.welcomeSeen && again === undefined) redirect("/app");
  const firstName = account.displayName.trim().split(/\s+/)[0] ?? "";
  return (
    <WelcomeCarousel
      firstName={firstName}
      organizationName={context.organizationName}
      owner={context.role === "owner"}
      roleLabel={roleLabel(context)}
      finance={can(context, "finance.view")}
      createsProjects={can(context, "projects.create")}
      editsOffers={can(context, "offers.edit")}
    />
  );
}
