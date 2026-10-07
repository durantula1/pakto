import { Building2, CalendarX2, Hourglass, PencilLine } from "lucide-react";

import Link from "next/link";

import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { stageColumns, stageRows } from "@/components/work/stage-rows";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { EmptyState } from "@/components/workspace/page/page-shell";
import { StatCard, StatCardSkeleton } from "@/components/workspace/stat-card";
import { can } from "@/lib/authz/permissions";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { documentCode } from "@/modules/change-orders/labels";
import { listChangeOrders } from "@/modules/change-orders/queries";
import { getDashboardStats } from "@/modules/dashboard/queries";
import { formatAmount } from "@/lib/money";
import { listStages } from "@/modules/work/queries";

const statsClassName = "grid grid-cols-2 gap-3 xl:grid-cols-4";
const label = "Последни оферти";
const recentLimit = 8;
const stageLimit = 6;
const stagesLabel = "Срокове за внимание";

/** Says the list is a short slice, not everything, and where the rest is. Static, so the skeleton shows it as is. */
function RecentHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{label}</h2>
        <p className="text-sm text-muted-foreground">Последните {recentLimit} оферти и промени.</p>
      </div>
      <Link href="/app/offers" className="shrink-0 rounded-md text-sm font-medium text-primary-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Всички оферти →</Link>
    </div>
  );
}

/** Static, so the skeleton shows it as is. */
function StagesHeader({ total }: { total?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{stagesLabel}</h2>
        <p className="text-sm text-muted-foreground">Просрочени и наближаващи етапи.</p>
      </div>
      <Link href="/app/work" className="shrink-0 rounded-md text-sm font-medium text-primary-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{total && total > stageLimit ? `Всички ${total} етапа →` : "Всички етапи →"}</Link>
    </div>
  );
}

const stats = [
  // Same icons as elsewhere: Building2 is "Обекти" in the navigation, PencilLine is "Коригирай" on a document.
  { key: "activeProjects", label: "Активни обекти", icon: Building2, href: "/app/projects?status=active" },
  { key: "awaitingDecision", label: "Чакат решение", icon: Hourglass, href: "/app/offers?status=waiting" },
  { key: "overdueMilestones", label: "Просрочени етапи", icon: CalendarX2, href: "/app/work?status=overdue" },
  { key: "changesRequested", label: "Искат промяна", icon: PencilLine, href: "/app/offers?status=changes_requested" },
] as const;

const columns: DataTableColumn[] = [
  { id: "code", header: "Код" },
  { id: "title", header: "Заглавие", skeleton: "stack" },
  { id: "status", header: "Статус", skeleton: "badge" },
  { id: "total", header: "Сума", className: "text-right" },
];

export async function DashboardContent({ context }: { context: TenantContext }) {
  const [counts, changes, stages] = await Promise.all([
    getDashboardStats(context),
    listChangeOrders({ context, limit: recentLimit }),
    listStages({ context, range: "attention", limit: stageLimit }),
  ]);
  const hints: Partial<Record<(typeof stats)[number]["key"], string>> = {
    awaitingDecision: counts.waitingClients ? `от ${counts.waitingClients} ${counts.waitingClients === 1 ? "клиент" : "клиента"}` : undefined,
    overdueMilestones: counts.dueSoonMilestones ? `${counts.overdueMilestones ? "още " : ""}${counts.dueSoonMilestones} в следващите ${counts.stageWarningDays} дни` : undefined,
  };
  return <>
    <div className={statsClassName}>
      {/* Every card reserves its hint line, so the row keeps one height whichever cards have a hint. */}
      {stats.map(({ key, label, icon: Icon, href }) => <StatCard key={key} size="xl" label={label} value={counts[key]} icon={<Icon className="size-5" />} href={href}
        tone={key === "overdueMilestones" && counts.overdueMilestones ? "coral" : "default"}
        hint={hints[key] ?? null} />)}
    </div>
    <section className="flex flex-col gap-3">
      <StagesHeader total={counts.overdueMilestones + counts.dueSoonMilestones} />
      {stages.length
        ? <DataTable label={stagesLabel} columns={stageColumns} rows={stageRows(stages)} />
        : <p className="rounded-xl border bg-card px-4 py-5 text-sm text-muted-foreground">Няма просрочени етапи, нито етапи със срок в следващите {counts.stageWarningDays} дни.</p>}
    </section>
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
          <span key="total" className="font-semibold">{formatAmount(change.total ?? 0)} {change.currency}</span>,
        ],
      }))}
      />
    </section> : <EmptyState title="Още няма оферти" description={can(context, "offers.edit") || can(context, "projects.create") ? "Започни с обект и клиент, после направи оферта към него." : "Когато ти възложат обект, ще го видиш тук."}>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {can(context, "projects.create") ? <Link href="/app/projects/new" className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Нов обект</Link> : null}
        {can(context, "offers.edit") ? <Link href="/app/offers/new" className="inline-flex h-9 items-center rounded-lg border px-4 text-sm font-medium">Нова оферта</Link> : null}
      </div>
    </EmptyState>}
  </>;
}

export function DashboardContentSkeleton() {
  return <>
    <div className={statsClassName}>
      {stats.map(({ key, label, icon: Icon }) => <StatCardSkeleton key={key} size="xl" label={label} icon={<Icon className="size-5" />} hint="blank" />)}
    </div>
    <section className="flex flex-col gap-3">
      <StagesHeader />
      <DataTableSkeleton label={stagesLabel} columns={stageColumns} rows={3} />
    </section>
    <section className="flex flex-col gap-3">
      <RecentHeader />
      <DataTableSkeleton label={label} columns={columns} />
    </section>
  </>;
}
