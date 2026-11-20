"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { startNavigationProgress } from "@/components/workspace/navigation-progress";
import { tableSlotClassName } from "@/components/workspace/page/page-shell";
import { cn } from "@/lib/utils";

export type DataTableColumn = {
  id: string;
  header: string;
  className?: string;
  /** Placeholder shape while loading: `stack` is a title with a subtitle line, `action` a button. */
  skeleton?: "text" | "stack" | "badge" | "action" | "none";
  /**
   * On phones, `primary` shows this cell as the card's title (implied for `stack` columns and
   * header-less columns); `actions` puts it last, right-aligned, without a label.
   */
  mobile?: "primary" | "actions";
};

export type DataTableDensity = "default" | "compact";

const cellClassNames: Record<DataTableDensity, string> = {
  default: "px-4 py-3 align-middle",
  compact: "px-3 py-2 align-middle",
};
const headClassNames: Record<DataTableDensity, string> = {
  default: "h-10 px-4 font-medium text-foreground",
  compact: "h-9 px-3 text-xs font-medium text-muted-foreground",
};

/**
 * Below `sm` every row becomes a card: the `stack` column (the row's title) spans the card
 * on top, and each other cell is a "header: value" line built from `data-label`.
 */
const mobileTableClassName = "max-sm:block";
const mobileRowClassName = "max-sm:flex max-sm:flex-col max-sm:gap-2 max-sm:px-4 max-sm:py-3.5";
const mobileCellClassName = "max-sm:flex max-sm:min-h-6 max-sm:items-center max-sm:justify-between max-sm:gap-4 max-sm:p-0 max-sm:text-right max-sm:before:shrink-0 max-sm:before:text-left max-sm:before:text-xs max-sm:before:font-normal max-sm:before:text-muted-foreground max-sm:before:content-[attr(data-label)]";
const mobilePrimaryCellClassName = "max-sm:order-first max-sm:block max-sm:p-0 max-sm:pb-1 max-sm:text-left";

const mobileActionsCellClassName = "max-sm:order-last max-sm:flex max-sm:justify-end max-sm:p-0 max-sm:empty:hidden";

function mobileCell(column?: DataTableColumn) {
  if (column?.mobile === "actions") return mobileActionsCellClassName;
  return column?.mobile === "primary" || column?.skeleton === "stack" || !column?.header ? mobilePrimaryCellClassName : mobileCellClassName;
}

function TableFrame({ label, columns, density, className, footer, children }: {
  label: string;
  columns: DataTableColumn[];
  density: DataTableDensity;
  className?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      <div className="overflow-x-auto">
        <table aria-label={label} className={cn("w-full text-sm", mobileTableClassName)}>
          <thead className="max-sm:hidden">
            <tr className="border-b">
              {columns.map((column) => (
                <th key={column.id} className={cn("text-left align-middle whitespace-nowrap", headClassNames[density], column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="max-sm:block">{children}</tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

export function DataTable({
  label,
  columns,
  rows,
  density = "default",
  className,
  footer,
}: {
  label: string;
  columns: DataTableColumn[];
  rows: { id: string; href?: string; className?: string; cells: ReactNode[] }[];
  density?: DataTableDensity;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <TableFrame label={label} columns={columns} density={density} className={className} footer={footer}>
      {rows.map((row) => (
        <DataTableRow key={row.id} href={row.href} className={row.className}>
          {row.cells.map((cell, index) => (
            <td key={columns[index]?.id ?? index} data-label={columns[index]?.header} className={cn(cellClassNames[density], columns[index]?.className, mobileCell(columns[index]))}>
              {cell}
            </td>
          ))}
        </DataTableRow>
      ))}
    </TableFrame>
  );
}

/**
 * Clickable row. Rows navigate with `router.push` rather than `<Link>`, so they prefetch
 * like a link would: once visible and again on hover/touch. That way the target's
 * `loading.tsx` is already on the client and the skeleton paints on click.
 */
function DataTableRow({ href, className, children }: { href?: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!href || !element) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      router.prefetch(href);
      observer.disconnect();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [href, router]);

  const prefetch = href ? () => router.prefetch(href) : undefined;
  return (
    <tr
      ref={ref}
      className={cn("border-b last:border-0 hover:bg-muted/50", mobileRowClassName, href && "cursor-pointer", className)}
      onPointerEnter={prefetch}
      onTouchStart={prefetch}
      onClick={(event) => {
        if (!href) return;
        const target = event.target as HTMLElement;
        if (target.closest("a, button, input, select, textarea, label")) return;
        startNavigationProgress(href);
        router.push(href);
      }}
    >
      {children}
    </tr>
  );
}

function SkeletonLine({ className, align }: { className: string; align?: boolean }) {
  return <div className="flex h-5 items-center"><Skeleton className={cn(className, align && "ml-auto")} /></div>;
}

function SkeletonCell({ column }: { column: DataTableColumn }) {
  const right = column.className?.includes("text-right");
  switch (column.skeleton ?? "text") {
    case "stack":
      return <><SkeletonLine className="h-3.5 w-40 max-w-full" align={right} /><SkeletonLine className="h-3 w-28 max-w-full" align={right} /></>;
    case "badge":
      return <Skeleton className={cn("h-5 w-20", right && "ml-auto")} />;
    case "action":
      return <Skeleton className={cn("h-8 w-28 rounded-lg", right && "ml-auto")} />;
    case "none":
      return null;
    default:
      return <SkeletonLine className="h-3.5 w-20 max-w-full" align={right} />;
  }
}

/** Same frame, headers and cell padding as `DataTable`; pass it the same `columns`. */
export function DataTableSkeleton({
  label,
  columns,
  rows = 5,
  density = "default",
  className,
  footer,
}: {
  label: string;
  columns: DataTableColumn[];
  rows?: number;
  density?: DataTableDensity;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <TableFrame label={label} columns={columns} density={density} className={cn(tableSlotClassName, className)} footer={footer}>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={index} className={cn("border-b last:border-0", mobileRowClassName)}>
          {columns.map((column) => (
            <td key={column.id} data-label={column.header} className={cn(cellClassNames[density], column.className, mobileCell(column))}>
              <SkeletonCell column={column} />
            </td>
          ))}
        </tr>
      ))}
    </TableFrame>
  );
}
