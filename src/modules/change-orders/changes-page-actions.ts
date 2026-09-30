"use server";

import { z } from "zod";

import { requireTenantContext } from "@/lib/authz/tenant-context";
import { lastPage, pageOffset } from "@/lib/pagination";
import { countChangeOrders, listChangeOrders } from "@/modules/change-orders/queries";
import { documentCode, OFFER_CHANGES_PAGE_SIZE } from "@/modules/change-orders/labels";

export type OfferChangeRow = {
  id: string;
  code: string;
  title: string;
  revisionNumber: number | null;
  status: string | null;
  total: string | number;
  currency: string | null;
};

export type OfferChangesPage = { rows: OfferChangeRow[]; total: number; page: number };

/** One page of the changes table under an offer; the filters in `listChangeOrders` keep the caller's project and draft access. */
export async function loadOfferChangesPage(offerId: string, page: number): Promise<OfferChangesPage | null> {
  const parsed = z.object({ offerId: z.uuid(), page: z.number().int().min(1).max(100000) }).safeParse({ offerId, page });
  if (!parsed.success) return null;
  const context = await requireTenantContext();
  const total = await countChangeOrders({ context, baselineOfferId: parsed.data.offerId, documentKind: "change" });
  const current = Math.min(parsed.data.page, lastPage(total, OFFER_CHANGES_PAGE_SIZE));
  const items = await listChangeOrders({ context, baselineOfferId: parsed.data.offerId, documentKind: "change", limit: OFFER_CHANGES_PAGE_SIZE, offset: pageOffset(current, OFFER_CHANGES_PAGE_SIZE) });
  return {
    total,
    page: current,
    rows: items.map((item) => ({
      id: item.id,
      code: documentCode("change", item.sequenceNumber),
      title: item.title ?? "",
      revisionNumber: item.revisionNumber,
      status: item.revisionStatus,
      total: item.total ?? 0,
      currency: item.currency,
    })),
  };
}
