import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { DetailHeaderSkeleton } from "@/components/workspace/detail-header";
import { PageShell } from "@/components/workspace/page/page-shell";

const columns: DataTableColumn[] = [
  { id: "name", header: "Обект", skeleton: "stack" },
  { id: "status", header: "Статус", skeleton: "badge" },
  { id: "documents", header: "Оферти и промени", className: "text-right" },
  { id: "waiting", header: "Чака клиента", skeleton: "badge", className: "text-right" },
  { id: "remaining", header: "Остава", className: "text-right" },
];

/** The client card, not the clients list. The list skeleton lives in the parent segment. */
export default function ClientLoading() {
  return (
    <PageShell loading>
      <DetailHeaderSkeleton backLabel="Клиенти" status={false} inBreadcrumb />
      <div className="grid gap-3 sm:grid-cols-3">
        {["Договорено", "Платено", "Остава"].map((label) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <Skeleton className="mt-1 h-7 w-28" />
          </div>
        ))}
      </div>
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Обекти</h2>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <DataTableSkeleton label="Обекти на клиента" columns={columns} rows={3} className="min-h-0" />
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">История</h2>
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="divide-y rounded-xl border bg-card">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <Skeleton className="h-4 w-64 max-w-[70%]" />
              <Skeleton className="h-3 w-28 shrink-0" />
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
