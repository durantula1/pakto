import type { Metadata } from "next";
import { Suspense } from "react";

import { ListFilters } from "@/components/workspace/list-filters";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { parsePage } from "@/lib/pagination";
import { stageRangeOptions, stageRanges } from "@/modules/work/labels";
import { StagesTable, StagesTableSkeleton } from "./stages-table";

export const metadata: Metadata = { title: "Етапи" };

export default async function WorkPage({ searchParams }: PageProps<"/app/work">) {
  const [context, params] = await Promise.all([requireTenantContext(), searchParams]);
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const range = stageRanges.find((item) => item === params.status) ?? "attention";
  const page = parsePage(params.page);
  const searchState = { q: query, status: range };
  return (
    <PageShell>
      <PageHeader page="work" />
      <ListFilters query={query} status={range} statusOptions={stageRangeOptions} placeholder="Етап, обект или клиент" />
      {/* Keyed by the filters so a new search shows the table skeleton instead of stale rows. */}
      <Suspense key={JSON.stringify({ ...searchState, page })} fallback={<StagesTableSkeleton />}>
        <StagesTable context={context} range={range} query={query} page={page} searchState={searchState} />
      </Suspense>
    </PageShell>
  );
}
