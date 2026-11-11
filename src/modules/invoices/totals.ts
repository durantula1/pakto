export type LineInput = { quantity: string | number; unitPrice: string | number; taxRate: string | number };

const toMinor = (value: string | number) => Math.round(Number(value) * 100);

/** Net, VAT and gross in whole cents per line, so the invoice total is exactly the sum of what it shows. */
export function lineAmounts(line: LineInput) {
  const net = Math.round((Number(line.quantity) * toMinor(line.unitPrice)) );
  const tax = Math.round((net * Number(line.taxRate)) / 100);
  return { net, tax, gross: net + tax };
}

export function invoiceTotals(lines: LineInput[]) {
  let subtotal = 0;
  let tax = 0;
  for (const line of lines) {
    const amounts = lineAmounts(line);
    subtotal += amounts.net;
    tax += amounts.tax;
  }
  return { subtotal: (subtotal / 100).toFixed(2), taxTotal: (tax / 100).toFixed(2), total: ((subtotal + tax) / 100).toFixed(2) };
}

/** An amount that already includes VAT, split into the net unit price that gives back the same gross. */
export function netFromGross(gross: string | number, taxRate: string | number) {
  return (toMinor(gross) / (1 + Number(taxRate) / 100) / 100).toFixed(2);
}
