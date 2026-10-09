/** Shared by the offer forms and the server, so what the user sees is what gets stored. */

export type DiscountType = "percent" | "amount";
export type Discount = { type: DiscountType; value: number } | null;

export function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Lines → gross, minus an offer-level discount → taxable base (`subtotal`), plus VAT → total.
 * A percentage is capped at 100 and an amount at the gross, so the base never goes negative.
 */
/**
 * The largest offer or change the pilot takes: far above any real job, well inside numeric(14,2) and exact in
 * a JS number. Above it the save failed in Postgres and the editor showed the generic error page.
 */
export const MAX_DOCUMENT_TOTAL = 99_999_999.99;

export function totalTooLarge(...amounts: number[]) {
  return amounts.some((amount) => Math.abs(amount) > MAX_DOCUMENT_TOTAL)
    ? "Сумата е твърде голяма. Най-много 99 999 999,99 € на документ."
    : null;
}

export function priceOffer(lines: Array<{ quantity: number; unitPrice: number }>, taxRate: number, discount: Discount) {
  const gross = money(lines.reduce((sum, line) => sum + money(line.quantity * line.unitPrice), 0));
  const discountAmount = !discount || !(discount.value > 0)
    ? 0
    : discount.type === "percent"
      ? money(gross * Math.min(discount.value, 100) / 100)
      : money(Math.min(discount.value, gross));
  const subtotal = money(gross - discountAmount);
  const taxAmount = money(subtotal * taxRate / 100);
  return { gross, discountAmount, subtotal, taxAmount, total: money(subtotal + taxAmount) };
}

export function discountLabel(type: DiscountType | null, value: string | number | null) {
  if (!type || value === null || !Number(value)) return "Отстъпка";
  return type === "percent" ? `Отстъпка ${Number(value)}%` : "Отстъпка";
}
