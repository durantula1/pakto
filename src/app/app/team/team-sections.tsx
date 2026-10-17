import { Skeleton } from "@/components/ui/skeleton";
import { TabsSkeleton } from "@/components/ui/tabs";
import { DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { ListFiltersSkeleton, ListPaginationSkeleton } from "@/components/workspace/list-filters";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";

export const membersLabel = "Членове на екипа";
export const searchLabel = "Търси човек";

export const memberColumns: DataTableColumn[] = [
  { id: "member", header: "Член", skeleton: "stack" },
  { id: "role", header: "Роля", skeleton: "badge" },
  { id: "projects", header: "Проекти" },
  { id: "access", header: "Права" },
  { id: "status", header: "Статус", skeleton: "badge" },
  { id: "joined", header: "Добавен", className: "text-right" },
];

export function TeamPageSkeleton() {
  return (
    <PageShell loading>
      <PageHeader page="team" actions={<Skeleton className="h-8 w-36 rounded-lg" />} />
      <div className="flex flex-col gap-2">
        <TabsSkeleton labels={["Членове", "Покани", "Одобрения"]} />
        <div className="flex flex-col gap-4 pt-4">
          <ListFiltersSkeleton label={searchLabel} />
          <DataTableSkeleton label={membersLabel} columns={memberColumns} footer={<ListPaginationSkeleton />} />
        </div>
      </div>
    </PageShell>
  );
}
