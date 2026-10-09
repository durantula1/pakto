const amountFormat = new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });

/** A money amount as Bulgarians write it: "1 466,40". For display only; stored values keep `toFixed(2)`. */
export function formatAmount(value: string | number) {
  // Intl writes a negative with a hyphen; a typographic minus reads as a sign, not a dash.
  return amountFormat.format(Number(value)).replace(/^-/, "−");
}

/** The currency as Bulgarians write it next to an amount: "384,00 €". Stored values keep the ISO code. */
export function currencySymbol(code: string | null | undefined) {
  const value = (code ?? "EUR").trim();
  return value === "EUR" ? "€" : value;
}
