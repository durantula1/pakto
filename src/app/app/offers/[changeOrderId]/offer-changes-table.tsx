"use client";

import { useState, useTransition } from "react";

import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { DataTable, type DataTableColumn } from "@/components/workspace/data-table";
import { ListPagination } from "@/components/workspace/list-filters";
import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";
import { loadOfferChangesPage, type OfferChangesPage } from "@/modules/change-orders/changes-page-actions";
import { OFFER_CHANGES_PAGE_SIZE } from "@/modules/change-orders/labels";
import { currencySymbol } from "@/lib/money";

export const offerChangeColumns: DataTableColumn[] = [{ id: "code", header: "Код" }, { id: "title", header: "Промяна", mobile: "primary", skeleton: "stack" }, { id: "status", header: "Статус", skeleton: "badge" }, { id: "total", header: "Сума", className: "text-right" }];

/** The changes under an offer. Page changes fetch only these rows through a Server Action instead of re-rendering the whole offer page. */
export function OfferChangesTable({ label, offerId, path, initial }: { label: string; offerId: string; path: string; initial: OfferChangesPage }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function select(page: number) {
    startTransition(async () => {
      const next = await loadOfferChangesPage(offerId, page).catch(() => null);
      if (!next) return setError("Промените не се заредиха. Опитай отново.");
      setError(null);
      setData(next);
      // Keep the address shareable and the back link honest without a navigation.
      const url = new URL(window.location.href);
      if (next.page > 1) url.searchParams.set("changesPage", String(next.page));
      else url.searchParams.delete("changesPage");
      window.history.replaceState(window.history.state, "", url);
    });
  }

  return <div aria-busy={pending} className={cn(pending && "opacity-60 transition-opacity")}>
    <DataTable
      label={label}
      columns={offerChangeColumns}
      rows={data.rows.map((item) => ({
        id: item.id,
        href: `/app/offers/${item.id}`,
        cells: [
          <span key="code" className="font-mono text-xs text-muted-foreground">{item.code}</span>,
          <div key="title"><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">версия {item.revisionNumber}</p></div>,
          <DocumentStatusBadge key="status" status={item.status} />,
          <span key="total" className="font-semibold tabular-nums">{formatAmount(item.total)} {currencySymbol(item.currency)}</span>,
        ],
      }))}
      footer={<ListPagination path={path} params={{}} page={data.page} total={data.total} pageSize={OFFER_CHANGES_PAGE_SIZE} pageParam="changesPage" onSelect={select} />}
    />
    {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
  </div>;
}
