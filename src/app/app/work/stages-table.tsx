import { redirect } from "next/navigation";

import { stageColumns, stageRows } from "@/components/work/stage-rows";
import { DataTable, DataTableSkeleton } from "@/components/workspace/data-table";
import { ListPagination, ListPaginationSkeleton } from "@/components/workspace/list-filters";
import { EmptyState } from "@/components/workspace/page/page-shell";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { lastPage, PAGE_SIZE, pageHref, pageOffset } from "@/lib/pagination";
import type { StageRange } from "@/modules/work/labels";
import { countStages, listStages } from "@/modules/work/queries";

const label = "Етапи";

export async function StagesTable({ context, range, query, page, searchState }: {
  context: TenantContext;
  range: StageRange;
  query: string;
  page: number;
  searchState: Record<string, string>;
}) {
  const [stages, total] = await Promise.all([
    listStages({ context, range, query, limit: PAGE_SIZE, offset: pageOffset(page) }),
    countStages({ context, range, query }),
  ]);
  if (!stages.length && page > lastPage(total)) redirect(pageHref("/app/work", searchState, "page", lastPage(total)));
  if (!stages.length) return <EmptyState title="Няма етапи за показване" description={range === "attention" ? "Няма просрочени и наближаващи етапи." : "Опитай с друг филтър."} />;
  return <DataTable
    label={label}
    columns={stageColumns}
    rows={stageRows(stages)}
    footer={<ListPagination path="/app/work" params={searchState} page={page} total={total} />}
  />;
}

export function StagesTableSkeleton() {
  return <DataTableSkeleton label={label} columns={stageColumns} footer={<ListPaginationSkeleton />} />;
}
