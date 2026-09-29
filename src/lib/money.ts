const amountFormat = new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A money amount as Bulgarians write it: "1 466,40". For display only; stored values keep `toFixed(2)`. */
export function formatAmount(value: string | number) {
  return amountFormat.format(Number(value));
}
