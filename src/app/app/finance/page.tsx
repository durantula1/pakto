import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/workspace/page/page-header";
import { EmptyState, PageShell } from "@/components/workspace/page/page-shell";
import { getCurrentMember } from "@/lib/authz/project-access";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { parsePage } from "@/lib/pagination";
import { defaultReceiptRange, type ReceiptFilters } from "@/modules/finance/queries";
import { getProjectOption } from "@/modules/projects/queries";
import { getClientOption } from "@/modules/clients/queries";
import { FinanceContent, FinanceContentSkeleton } from "./finance-content";
import { kindOptions, methodOptions } from "./finance-filters";
import { FinanceToolbar } from "./finance-toolbar";

const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const metadata: Metadata = { title: "Плащания" };

export default async function FinancePage({ searchParams }: PageProps<"/app/finance">) {
  const context = await requireTenantContext();
  const member = await getCurrentMember(context);
  if (!can(member, "finance.view")) return <PageShell><PageHeader page="finance" /><EmptyState illustration={false} title="Нямаш достъп до месечната справка." /></PageShell>;
  const params = await searchParams;
  const defaults = defaultReceiptRange();
  const requestedFrom = typeof params.from === "string" && datePattern.test(params.from) ? params.from : defaults.from;
  const requestedTo = typeof params.to === "string" && datePattern.test(params.to) ? params.to : defaults.to;
  const from = requestedFrom <= requestedTo ? requestedFrom : defaults.from;
  const to = requestedFrom <= requestedTo ? requestedTo : defaults.to;
  const kind = kindOptions.some((item) => item.value === params.kind) ? String(params.kind) : "all";
  const method = methodOptions.some((item) => item.value === params.method) ? String(params.method) : "all";
  const page = parsePage(params.page);
  const [project, client] = await Promise.all([
    getProjectOption(context, typeof params.projectId === "string" ? params.projectId : undefined),
    getClientOption(context, typeof params.clientId === "string" ? params.clientId : undefined),
  ]);
  const projectId = project?.id ?? "all";
  const clientId = client?.id ?? "all";
  const filters = { from, to, projectId: project?.id, clientId: client?.id, kind: kind === "all" ? undefined : kind as ReceiptFilters["kind"], method: method === "all" ? undefined : method };
  const searchState = { from, to, projectId, clientId, kind, method };
  const filtered = from !== defaults.from || to !== defaults.to || projectId !== "all" || clientId !== "all" || kind !== "all" || method !== "all";

  // Filters sit above everything they drive (totals, chart and table) and stay mounted while the data reloads.
  return <PageShell className="gap-4">
    <PageHeader page="finance" variant="hidden" />
    <FinanceToolbar filters={searchState} defaults={defaults} project={project} client={client} />
    <Suspense key={JSON.stringify({ ...searchState, page })} fallback={<FinanceContentSkeleton />}>
      <FinanceContent context={context} filters={filters} filtered={filtered} page={page} searchState={searchState} />
    </Suspense>
  </PageShell>;
}
