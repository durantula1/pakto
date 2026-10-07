import { redirect } from "next/navigation";
import { Banknote, Building2, CircleEllipsis, CreditCard, Landmark, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { FinanceChart } from "@/components/workspace/finance-chart";
import { ListPagination, ListPaginationSkeleton } from "@/components/workspace/list-filters";
import { EmptyResultAction, EmptyResultActions } from "@/components/workspace/page/empty-result";
import { EmptyState } from "@/components/workspace/page/page-shell";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { lastPage, PAGE_SIZE, pageHref, pageOffset } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { countReceipts, listReceipts, sumReceiptsByMonth, type ReceiptFilters } from "@/modules/finance/queries";
import { cents, formatCents } from "@/modules/projects/state";
import { financeToolbarWidths, formatIsoDate, kindOptions, methodOptions } from "./finance-filters";

const label = "Получени плащания";

const columns: DataTableColumn[] = [
  { id: "date", header: "Дата", className: "w-28 tabular-nums" },
  { id: "project", header: "Обект", mobile: "primary" },
  { id: "kind", header: "Вид", skeleton: "badge" },
  { id: "method", header: "Начин на плащане" },
  { id: "amount", header: "Сума", className: "text-right" },
];

const methodIcons: Record<string, typeof Landmark> = { bank: Landmark, cash: Banknote, card: CreditCard };

const monthName = new Intl.DateTimeFormat("bg-BG", { month: "long", timeZone: "UTC" });

function monthOffset(month: string, offset: number) {
  const [year, part] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, part - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

/** The range of the same length that ends the day before `from`. */
function previousRange(from: string, to: string) {
  const day = 86_400_000;
  const start = Date.parse(`${from}T00:00:00Z`);
  const length = Date.parse(`${to}T00:00:00Z`) - start;
  const previousTo = start - day;
  return { from: new Date(previousTo - length).toISOString().slice(0, 10), to: new Date(previousTo).toISOString().slice(0, 10) };
}

function sum(rows: { total: string }[]) {
  return rows.reduce((total, row) => total + cents(row.total), 0n);
}

/** One card: totals on the left, the monthly bars on the right. The skeleton fills the same slots. */
function SummaryFrame({ total, delta, facts, chart }: {
  total: React.ReactNode;
  delta: React.ReactNode;
  facts: React.ReactNode;
  chart: React.ReactNode;
}) {
  return <Card className="grid gap-4 p-4 lg:grid-cols-[minmax(15rem,auto)_1fr] lg:gap-6">
    <div className="flex flex-col justify-center gap-1">
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Wallet className="size-4" />Получено</p>
      <div className="flex h-8 items-center text-2xl font-semibold tabular-nums">{total}</div>
      <div className="flex h-4 items-center text-xs">{delta}</div>
      <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">{facts}</div>
    </div>
    <div className="min-w-0">{chart}</div>
  </Card>;
}

function Delta({ current, previous }: { current: bigint; previous: bigint }) {
  if (previous === 0n) return <span className="text-muted-foreground">Няма плащания в предходния период</span>;
  const change = Number(((current - previous) * 1000n) / previous) / 10;
  const up = change >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return <span className="flex items-center gap-1">
    <span className={cn("flex items-center gap-0.5 font-medium", up ? "text-foreground" : "text-destructive")}>
      <Icon className={cn("size-3.5", up && "rounded-sm bg-brand-green text-[#102b38]")} />{up ? "+" : ""}{change.toLocaleString("bg-BG", { maximumFractionDigits: 1 })}%
    </span>
    <span className="text-muted-foreground">спрямо предходния период</span>
  </span>;
}

/** No receipts at all reads as a first step; no match for the filters offers a way back. */
function FinanceEmpty({ filtered, from, to }: { filtered: boolean; from: string; to: string }) {
  return filtered
    ? <EmptyState title="Нищо не отговаря на филтрите" description={`Няма плащания между ${formatIsoDate(from)} и ${formatIsoDate(to)} с избраните филтри.`}>
      <EmptyResultActions><EmptyResultAction href="/app/finance"><X />Изчисти филтрите</EmptyResultAction></EmptyResultActions>
    </EmptyState>
    : <EmptyState title="Все още няма плащания" description="Плащанията се записват от страницата на обекта: аванс, междинно или окончателно плащане.">
      <EmptyResultActions><EmptyResultAction href="/app/projects" primary><Building2 />Към обектите</EmptyResultAction></EmptyResultActions>
    </EmptyState>;
}

export async function FinanceContent({ context, filters, filtered, page, searchState }: {
  context: TenantContext;
  filters: ReceiptFilters & { from: string; to: string };
  /** Any filter differs from the defaults, so an empty result means "no match", not "nothing yet". */
  filtered: boolean;
  page: number;
  searchState: Record<string, string>;
}) {
  const [monthlyRows, previousRows, pageRows, total] = await Promise.all([
    sumReceiptsByMonth(context, filters),
    sumReceiptsByMonth(context, { ...filters, ...previousRange(filters.from, filters.to) }),
    listReceipts(context, { ...filters, limit: PAGE_SIZE, offset: pageOffset(page) }),
    countReceipts(context, filters),
  ]);
  if (!pageRows.length && page > lastPage(total)) redirect(pageHref("/app/finance", searchState, "page", lastPage(total)));
  const monthly = new Map(monthlyRows.map((row) => [row.month, cents(row.total)]));
  const eur = sum(monthlyRows);
  const lastMonth = filters.to.slice(0, 7);
  const chartData: { month: string; EUR: number }[] = [];
  for (let month = filters.from.slice(0, 7); month <= lastMonth; month = monthOffset(month, 1)) {
    chartData.push({ month, EUR: Number(monthly.get(month) ?? 0n) / 100 });
  }
  return <>
    <SummaryFrame
      total={formatCents(eur, "EUR")}
      delta={<Delta current={eur} previous={sum(previousRows)} />}
      facts={<>
        <span>{total} {total === 1 ? "плащане" : "плащания"} за периода</span>
        <span>{monthName.format(new Date(`${lastMonth}-01T00:00:00Z`))}: {formatCents(monthly.get(lastMonth) ?? 0n, "EUR")}</span>
      </>}
      chart={<FinanceChart data={chartData} compact className="h-32" />}
    />
    {/* An empty result only replaces the table, so the page keeps the skeleton's shape. */}
    {total === 0 ? <FinanceEmpty filtered={filtered} from={filters.from} to={filters.to} /> : <DataTable
      label={label}
      columns={columns}
      density="compact"
      rows={pageRows.map((receipt) => {
        const MethodIcon = methodIcons[receipt.method] ?? CircleEllipsis;
        return {
          id: receipt.id,
          href: `/app/projects/${receipt.projectId}`,
          cells: [
            formatIsoDate(receipt.receivedOn),
            <span key="project" className="font-medium">{receipt.projectName}</span>,
            <Badge key="kind" variant={receipt.correctionOfId ? "outline" : "secondary"}>{receipt.correctionOfId ? "Корекция" : kindOptions.find((item) => item.value === receipt.kind)?.label}</Badge>,
            <span key="method" className="inline-flex items-center gap-1.5 text-muted-foreground"><MethodIcon className="size-3.5" />{methodOptions.find((item) => item.value === receipt.method)?.label ?? receipt.method}</span>,
            <span key="amount" className="font-medium tabular-nums">{formatCents(cents(receipt.amount), receipt.currency)}</span>,
          ],
        };
      })}
      footer={<ListPagination path="/app/finance" params={searchState} page={page} total={total} density="compact" />}
    />}
  </>;
}

/** Same controls and widths as `FinanceToolbar`, drawn as placeholders. */
export function FinanceToolbarSkeleton() {
  return <div className="flex flex-wrap items-center gap-2">
    <Skeleton className={cn("h-8 rounded-lg", financeToolbarWidths.period)} />
    <Skeleton className={cn("h-8 rounded-lg", financeToolbarWidths.project)} />
    <Skeleton className={cn("h-8 rounded-lg", financeToolbarWidths.kind)} />
    <Skeleton className={cn("h-8 rounded-lg", financeToolbarWidths.method)} />
  </div>;
}

export function FinanceContentSkeleton() {
  return <>
    <SummaryFrame
      total={<Skeleton className="h-6 w-36" />}
      delta={<Skeleton className="h-3 w-44" />}
      facts={<><div className="flex h-4 items-center"><Skeleton className="h-3 w-32" /></div><div className="flex h-4 items-center"><Skeleton className="h-3 w-28" /></div></>}
      chart={<Skeleton className="h-32 w-full rounded-lg" />}
    />
    <DataTableSkeleton label={label} columns={columns} density="compact" rows={10} footer={<ListPaginationSkeleton density="compact" />} />
  </>;
}
