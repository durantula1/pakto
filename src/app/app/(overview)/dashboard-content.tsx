import { Building2, CalendarX2, Hourglass, PencilLine } from "lucide-react";

import Link from "next/link";

import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { EmptyState } from "@/components/workspace/page/page-shell";
import { StatCard, StatCardSkeleton } from "@/components/workspace/stat-card";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { documentCode } from "@/modules/change-orders/labels";
import { listChangeOrders } from "@/modules/change-orders/queries";
import { getDashboardStats } from "@/modules/dashboard/queries";

const statsClassName = "grid grid-cols-2 gap-3 xl:grid-cols-4";
const label = "Последни оферти";
const recentLimit = 8;

/** Says the list is a short slice, not everything, and where the rest is. Static, so the skeleton shows it as is. */
function RecentHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{label}</h2>
        <p className="text-sm text-muted-foreground">Последните {recentLimit} оферти и промени.</p>
      </div>
      <Link href="/app/offers" className="shrink-0 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Всички оферти →</Link>
    </div>
  );
}

const stats = [
  // Same icons as elsewhere: Building2 is "Обекти" in the navigation, PencilLine is "Коригирай" on a document.
  { key: "activeProjects", label: "Активни обекти", icon: Building2 },
  { key: "awaitingDecision", label: "Чакат решение", icon: Hourglass },
  { key: "overdueMilestones", label: "Просрочени етапи", icon: CalendarX2 },
  { key: "changesRequested", label: "Искат корекция", icon: PencilLine },
] as const;

const columns: DataTableColumn[] = [
  { id: "code", header: "Код" },
  { id: "title", header: "Заглавие", skeleton: "stack" },
  { id: "status", header: "Статус", skeleton: "badge" },
  { id: "total", header: "Сума", className: "text-right" },
];

export async function DashboardContent({ context }: { context: TenantContext }) {
  const [counts, changes] = await Promise.all([
    getDashboardStats(context),
    listChangeOrders({ context, limit: recentLimit }),
  ]);
  return <>
    <div className={statsClassName}>
      {stats.map(({ key, label, icon: Icon }) => <StatCard key={key} size="xl" label={label} value={counts[key]} icon={<Icon className="size-5" />} />)}
    </div>
    {changes.length ? <section className="flex flex-col gap-3">
      <RecentHeader />
      <DataTable
      label={label}
      columns={columns}
      rows={changes.map((change) => ({
        id: change.id,
        href: `/app/offers/${change.id}`,
        cells: [
          <span key="code" className="font-mono text-xs text-muted-foreground">{documentCode(change.documentKind, change.sequenceNumber)}</span>,
          <div key="title"><p className="font-medium">{change.title}</p><p className="text-sm text-muted-foreground">{change.clientName ? `${change.projectName} · ${change.clientName}` : change.projectName}</p></div>,
          <DocumentStatusBadge key="status" status={change.revisionStatus} />,
          <span key="total" className="font-semibold">{Number(change.total ?? 0).toFixed(2)} {change.currency}</span>,
        ],
      }))}
      />
    </section> : <EmptyState title="Още няма оферти" description="Започни с оферта към обект." />}
  </>;
}

export function DashboardContentSkeleton() {
  return <>
    <div className={statsClassName}>
      {stats.map(({ key, label, icon: Icon }) => <StatCardSkeleton key={key} size="xl" label={label} icon={<Icon className="size-5" />} />)}
    </div>
    <section className="flex flex-col gap-3">
      <RecentHeader />
      <DataTableSkeleton label={label} columns={columns} />
    </section>
  </>;
}
