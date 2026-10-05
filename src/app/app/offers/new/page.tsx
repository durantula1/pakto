import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";

import { OfferForm } from "@/components/change-orders/offer-form";
import { PageHeader } from "@/components/workspace/page/page-header";
import { EmptyState, PageShell } from "@/components/workspace/page/page-shell";
import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { getProjectOption, hasProjects } from "@/modules/projects/queries";
import { getCurrentMember } from "@/lib/authz/project-access";
import { can } from "@/lib/authz/permissions";
import type { OfferFormInitial } from "@/components/change-orders/offer-form";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { documentCode } from "@/modules/change-orders/labels";
import { getOfferCopy, getTemplate, listCatalog, listTemplates } from "@/modules/catalog/queries";
import { listRevisionPaymentTerms } from "@/modules/change-orders/queries";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const metadata: Metadata = { title: "Нова оферта" };

export default async function NewOfferPage({
  searchParams,
}: PageProps<"/app/offers/new">) {
  const [{ projectId, template: templateId, from }, context] = await Promise.all([
    searchParams,
    requireTenantContext(),
  ]);
  const member = await getCurrentMember(context);
  if (!can(member, "offers.edit")) return <PageShell><PageHeader page="newOffer" back={{ href: "/app/offers", label: "Назад" }} /><EmptyState illustration={false} title="Ролята ти не включва създаване на оферти. Попитай собственика на фирмата." /></PageShell>;
  const [anyProjects, defaultProject, organization, catalog, templates, template, copy] = await Promise.all([
    hasProjects(context),
    getProjectOption(context, typeof projectId === "string" ? projectId : undefined, { activeOnly: true }),
    getDatabase()
      .select({ defaultTaxRate: organizations.defaultTaxRate })
      .from(organizations)
      .where(eq(organizations.id, context.organizationId))
      .limit(1)
      .then((rows) => rows[0]),
    listCatalog(context.organizationId),
    listTemplates(context.organizationId),
    typeof templateId === "string" && isUuid(templateId) ? getTemplate(context.organizationId, templateId) : Promise.resolve(null),
    typeof from === "string" && isUuid(from) ? getOfferCopy(context.organizationId, from) : Promise.resolve(null),
  ]);
  // A copy is only offered from a project the person can see.
  const copyAllowed = copy ? await requireProjectCapability(context, copy.projectId, "view").then(() => true, () => false) : false;
  // A copy keeps the payment terms too; dates of "on a date" terms are the old ones and should be checked.
  const copyTerms = copy && copyAllowed ? await listRevisionPaymentTerms(copy.revisionId) : [];
  const initial: OfferFormInitial | null = template
    ? { source: `шаблон „${template.name}“`, title: template.title, description: template.description, taxRate: template.taxRate, lines: template.lines }
    : copy && copyAllowed
      ? { source: `копие на ${documentCode("offer", copy.sequenceNumber)} · ${copy.title}`, title: copy.title, description: copy.description, taxRate: copy.taxRate, lines: copy.lines, schedule: copy.schedule, paymentTerms: copyTerms }
      : null;
  return (
    <PageShell>
      <PageHeader page="newOffer" back={{ href: projectId ? `/app/projects/${projectId}` : "/app/offers", label: "Назад" }} />
      {anyProjects ? (
        <div>
          {templates.length && !initial ? (
            <div className="mb-5 flex flex-col gap-2">
              <p className="text-sm font-medium">Започни от шаблон</p>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {templates.map((item) => (
                  <Link key={item.id} href={`/app/offers/new?${new URLSearchParams({ template: item.id, ...(typeof projectId === "string" ? { projectId } : {}) })}`} className="flex min-h-11 shrink-0 flex-col justify-center rounded-xl border bg-card px-3 py-2 text-sm hover:border-primary/50">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.lines.length === 1 ? "1 услуга или материал" : `${item.lines.length} услуги и материали`}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <OfferForm
            key={template?.id ?? copy?.revisionId ?? "blank"}
            initial={initial}
            catalog={catalog}
            canSaveCatalog
            defaultProject={defaultProject}
            defaultTaxRate={organization?.defaultTaxRate ?? "20.00"}
          />
        </div>
      ) : (
        <EmptyState title="Първо добави обект.">
          <Link href="/app/projects/new" className="mt-3 inline-block font-semibold text-primary">
            Създай обект →
          </Link>
        </EmptyState>
      )}
    </PageShell>
  );
}
