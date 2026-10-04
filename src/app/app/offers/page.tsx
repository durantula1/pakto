import type { Metadata } from "next";
import { Suspense } from "react";

import { ListFilters } from "@/components/workspace/list-filters";
import { PageAction, PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { parsePage } from "@/lib/pagination";
import { getProjectOption } from "@/modules/projects/queries";
import { OffersTable, OffersTableSkeleton } from "./offers-table";

const allowedStatus = ["draft", "sent", "viewed", "waiting", "approved", "declined", "changes_requested"] as const;

export const metadata: Metadata = { title: "Оферти" };

export default async function OffersPage({ searchParams }: PageProps<"/app/offers">) {
  const [context, params] = await Promise.all([requireTenantContext(), searchParams]);
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status = typeof params.status === "string" && allowedStatus.some((item) => item === params.status) ? params.status as typeof allowedStatus[number] : "all";
  const page = parsePage(params.page);
  const project = await getProjectOption(context, typeof params.projectId === "string" ? params.projectId : undefined);
  const projectId = project?.id ?? "all";
  const searchState = { q: query, status, projectId };
  return (
    <PageShell>
      <PageHeader page="offers" actions={can(context, "offers.edit") ? <PageAction href="/app/offers/new" hideOnMobile>Нова оферта</PageAction> : null} />
      <ListFilters query={query} status={status} projectFilter project={project} statusOptions={[{ value: "all", label: "Всички" }, { value: "draft", label: "Чернова" }, { value: "sent", label: "Изпратена" }, { value: "viewed", label: "Прегледана" }, { value: "waiting", label: "Чакат решение" }, { value: "approved", label: "Одобрена" }, { value: "declined", label: "Отказана" }, { value: "changes_requested", label: "Иска промяна" }]} placeholder="Заглавие или обект" />
      {/* Keyed by the filters so a new search shows the table skeleton instead of stale rows. */}
      <Suspense key={JSON.stringify({ ...searchState, page })} fallback={<OffersTableSkeleton />}>
        <OffersTable
          filters={{ context, documentKind: status === "waiting" || status === "changes_requested" ? undefined : "offer", query, projectId: project?.id, status: status === "all" ? undefined : status }}
          page={page}
          searchState={searchState}
        />
      </Suspense>
    </PageShell>
  );
}
