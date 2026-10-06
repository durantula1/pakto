import type { Metadata } from "next";
import Link from "next/link";
import { QuickChangeForm } from "@/components/change-orders/quick-change-form";
import { PageHeader } from "@/components/workspace/page/page-header";
import { EmptyState, PageShell } from "@/components/workspace/page/page-shell";
import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { listApprovedOffers } from "@/modules/change-orders/queries";
import { getProjectOption, hasProjects } from "@/modules/projects/queries";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Нова промяна" };

export default async function NewChangePage({
  searchParams,
}: PageProps<"/app/offers/changes/new">) {
  const [{ projectId, offerId }, context] = await Promise.all([
    searchParams,
    requireTenantContext(),
  ]);
  const [anyProjects, defaultProject, organization] = await Promise.all([
    hasProjects(context),
    getProjectOption(context, typeof projectId === "string" ? projectId : undefined, { activeOnly: true }),
    getDatabase()
      .select({ defaultTaxRate: organizations.defaultTaxRate })
      .from(organizations)
      .where(eq(organizations.id, context.organizationId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);
  const defaultOffers = defaultProject
    ? await listApprovedOffers(context, defaultProject.id)
    : [];
  return (
    <PageShell width="wide">
      <PageHeader page="newChange" back={{ href: projectId ? `/app/projects/${projectId}` : "/app/offers", label: "Назад" }} />
      {anyProjects ? (
        <div>
          <QuickChangeForm
            defaultProject={defaultProject}
            defaultOffers={defaultOffers}
            defaultOfferId={typeof offerId === "string" ? offerId : undefined}
            draftKey={typeof projectId === "string" ? projectId : undefined}
            defaultTaxRate={organization?.defaultTaxRate ?? "20.00"}
          />
        </div>
      ) : (
        <EmptyState title="Първо добави обект с одобряващ.">
          <Link href="/app/projects/new" className="mt-3 inline-block font-semibold text-primary-ink">
            Създай обект →
          </Link>
        </EmptyState>
      )}
    </PageShell>
  );
}
