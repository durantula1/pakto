"use client";

import { useState } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { currencySymbol } from "@/lib/money";

const money = (cents: number, currency: string) =>
  `${new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(cents / 100)} ${currencySymbol(currency)}`;

/**
 * "Получена сума" with what is still owed under it. More than that is allowed (an advance for work
 * not yet agreed, say), but only with an explicit tick: the server refuses it otherwise, since the
 * client gets a receipt by email and 99 999 instead of 999 is a typo.
 */
export function PaymentAmountField({ remaining }: {
  /** What the agreed offers still owe; absent while nothing is agreed. */
  remaining?: { cents: number; currency: string };
}) {
  const [value, setValue] = useState("");
  const cents = Math.round(Number(value) * 100);
  const over = remaining && value && cents > 0 ? cents - Math.max(remaining.cents, 0) : 0;

  return <Field>
    <FieldLabel htmlFor="receipt-amount">Получена сума</FieldLabel>
    <Input id="receipt-amount" type="number" name="amount" min="0.01" step="0.01" required value={value} onChange={(event) => setValue(event.target.value)} aria-describedby="receipt-amount-hint" />
    {remaining ? (
      <p id="receipt-amount-hint" role={over > 0 ? "alert" : undefined} className={over > 0 ? "text-xs font-medium text-tile-coral-foreground" : "text-xs text-muted-foreground"}>
        {over > 0
          ? remaining.cents <= 0
            ? "Обектът вече е изплатен. Цялата сума ще се отчете като надплатена."
            : `С ${money(over, remaining.currency)} над остатъка. Разликата ще се отчете като надплатена.`
          : remaining.cents > 0 ? `Остават ${money(remaining.cents, remaining.currency)}` : "Обектът е изплатен изцяло."}
      </p>
    ) : null}
    {over > 0 ? (
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="allowOverpay" value="1" className="mt-0.5 size-4 shrink-0 accent-primary" />
        <span>Да, сумата е повече от остатъка</span>
      </label>
    ) : null}
  </Field>;
}
