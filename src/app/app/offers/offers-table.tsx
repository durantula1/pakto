import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { ListPagination, ListPaginationSkeleton } from "@/components/workspace/list-filters";
import { EmptyState } from "@/components/workspace/page/page-shell";
import { lastPage, PAGE_SIZE, pageHref, pageOffset } from "@/lib/pagination";
import { documentCode } from "@/modules/change-orders/labels";
import { countChangeOrders, countChangesByOffer, listChangeOrders } from "@/modules/change-orders/queries";
import { formatAmount } from "@/lib/money";

const label = "Всички оферти";

const columns: DataTableColumn[] = [
  { id: "code", header: "Код" },
  { id: "title", header: "Оферта", skeleton: "stack" },
  { id: "client", header: "Клиент" },
  { id: "status", header: "Статус", skeleton: "badge" },
  { id: "changes", header: "Промени" },
  { id: "total", header: "Сума", className: "text-right" },
];

export async function OffersTable({ filters, page, searchState }: {
  filters: Omit<Parameters<typeof listChangeOrders>[0], "limit" | "offset">;
  page: number;
  searchState: Record<string, string>;
}) {
  const [offers, total] = await Promise.all([
    listChangeOrders({ ...filters, limit: PAGE_SIZE, offset: pageOffset(page) }),
    countChangeOrders(filters),
  ]);
  if (!offers.length && page > lastPage(total)) redirect(pageHref("/app/offers", searchState, "page", lastPage(total)));
  if (!offers.length) return <EmptyState title="Няма оферти" description="Започни с оферта към обекта. Промените се добавят вътре в одобрената оферта." />;
  const changeCounts = await countChangesByOffer(filters.context, offers.map((offer) => offer.id));
  return <DataTable
    label={label}
    columns={columns}
    rows={offers.map((offer) => {
      const changeCount = changeCounts.get(offer.id);
      return {
        id: offer.id,
        href: `/app/offers/${offer.id}`,
        cells: [
          <span key="code" className="font-mono text-xs text-muted-foreground">{documentCode("offer", offer.sequenceNumber)}</span>,
          <div key="title"><p className="font-medium">{offer.title}</p><p className="text-sm text-muted-foreground">{offer.projectName} · версия {offer.revisionNumber}</p></div>,
          offer.clientName ? <span key="client">{offer.clientName}</span> : <span key="client" className="text-muted-foreground">—</span>,
          <DocumentStatusBadge key="status" status={offer.revisionStatus} />,
          changeCount?.total ? <span key="changes" className="inline-flex items-center gap-2 whitespace-nowrap"><span className="tabular-nums">{changeCount.total}</span>{changeCount.pending ? <Badge variant="sent">{changeCount.pending} {changeCount.pending === 1 ? "чака решение" : "чакат решение"}</Badge> : null}</span> : <span key="changes" className="text-muted-foreground">—</span>,
          <span key="total" className="font-semibold">{formatAmount(offer.total ?? 0)} {offer.currency}</span>,
        ],
      };
    })}
    footer={<ListPagination path="/app/offers" params={searchState} page={page} total={total} />}
  />;
}

export function OffersTableSkeleton() {
  return <DataTableSkeleton label={label} columns={columns} footer={<ListPaginationSkeleton />} />;
}
