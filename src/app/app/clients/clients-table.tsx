import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { ListPagination, ListPaginationSkeleton } from "@/components/workspace/list-filters";
import { EmptyState } from "@/components/workspace/page/page-shell";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { lastPage, PAGE_SIZE, pageHref, pageOffset } from "@/lib/pagination";
import { countClients, listClients } from "@/modules/clients/queries";

const label = "Клиенти";

const columns: DataTableColumn[] = [
  { id: "name", header: "Клиент", skeleton: "stack" },
  { id: "projects", header: "Обекти", className: "text-right" },
  { id: "waiting", header: "Чака клиента", skeleton: "badge", className: "text-right" },
];

export async function ClientsTable({ context, filters, page, searchState }: {
  context: TenantContext;
  filters: { query: string; archived: boolean };
  page: number;
  searchState: Record<string, string>;
}) {
  const [clients, total] = await Promise.all([
    listClients(context, { ...filters, limit: PAGE_SIZE, offset: pageOffset(page) }),
    countClients(context, filters),
  ]);
  if (!clients.length && page > lastPage(total)) redirect(pageHref("/app/clients", searchState, "page", lastPage(total)));
  if (!clients.length) {
    return filters.query || filters.archived
      ? <EmptyState title="Няма намерени клиенти" description="Опитай с друго име, имейл или телефон." />
      : <EmptyState title="Още няма клиенти" description="Добави клиент с „Нов клиент“ или направо с нов обект." />;
  }
  return <DataTable
    label={label}
    columns={columns}
    rows={clients.map((client) => ({
      id: client.id,
      href: `/app/clients/${client.id}`,
      cells: [
        <div key="name"><p className="font-medium">{client.name}</p><p className="text-sm text-muted-foreground">{[client.phone, client.email].filter(Boolean).join(" · ") || "Без контакти"}</p></div>,
        client.activeProjects === client.projects ? client.projects : `${client.activeProjects} активни от ${client.projects}`,
        client.waiting ? <Badge key="waiting" variant="warning-soft">{client.waiting}</Badge> : <span key="waiting" className="text-muted-foreground">—</span>,
      ],
    }))}
    footer={<ListPagination path="/app/clients" params={searchState} page={page} total={total} />}
  />;
}

export function ClientsTableSkeleton() {
  return <DataTableSkeleton label={label} columns={columns} footer={<ListPaginationSkeleton />} />;
}
