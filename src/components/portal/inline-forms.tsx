"use client";

import { useState, type ReactNode } from "react";
import { sofiaTodayIso } from "@/lib/sofia-today";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { FilterSelect } from "@/components/workspace/filter-select";
import { cn } from "@/lib/utils";
import { claimPaymentAction, disputePaymentAction } from "@/modules/change-portal/actions";

const methodOptions = [{ value: "bank", label: "Банков превод" }, { value: "cash", label: "В брой" }, { value: "card", label: "Карта" }, { value: "other", label: "Друго" }];
const today = () => sofiaTodayIso();

/** A row whose action opens a small form right under it, instead of a dialog. */
function Unfolding({ row, trigger, variant = "outline", stack = false, triggerClassName, children }: {
  row: ReactNode;
  trigger: string;
  variant?: "outline" | "ghost";
  /** A bigger button where the action is the point of the row, e.g. the portal's money card. */
  triggerClassName?: string;
  /** On phones, put the action under the row (for rows that need the full width). */
  stack?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className={stack ? "flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3" : "flex items-center gap-3"}>
        <div className="w-full min-w-0 flex-1">{row}</div>
        {open ? null : (
          <Button type="button" variant={variant} size="sm" className={cn("h-10 px-3 text-sm", variant === "ghost" && "-mx-2 text-muted-foreground", triggerClassName)} onPress={() => setOpen(true)}>{trigger}</Button>
        )}
      </div>
      {open ? <div className="mt-3 border-t border-dashed pt-3">{children(() => setOpen(false))}</div> : null}
    </div>
  );
}

/**
 * "Платих": the client says they paid. Amount and date come filled in (the installment's remainder,
 * today), so the usual case is one tap on "Изпрати". The company confirms it before it counts.
 */
export function ClaimPaymentRow({ row, trigger, portalPublicId, offerId, installmentId, amount, stack, triggerClassName }: {
  row: ReactNode;
  stack?: boolean;
  triggerClassName?: string;
  trigger: string;
  portalPublicId: string;
  offerId: string | null;
  installmentId?: string;
  amount?: string;
}) {
  const key = installmentId ?? offerId ?? "project";
  return (
    <Unfolding row={row} trigger={trigger} stack={stack} triggerClassName={triggerClassName}>
      {(close) => (
        <ActionForm action={claimPaymentAction} success="Изпратено на фирмата" onSuccess={close} className="grid gap-2">
          <input type="hidden" name="projectPublicId" value={portalPublicId} />
          {installmentId ? <input type="hidden" name="installmentId" value={installmentId} /> : null}
          {offerId ? <input type="hidden" name="offerId" value={offerId} /> : null}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[8rem_10rem_minmax(0,1fr)]">
            <Input aria-label="Сума в EUR" id={`claim-amount-${key}`} type="number" name="amount" min="0.01" step="0.01" defaultValue={amount} placeholder="Сума, EUR" required autoFocus className="tabular-nums" />
            <DatePicker id={`claim-date-${key}`} name="paidOn" defaultValue={today()} required max="today" aria-label="Дата на плащане" />
            <FilterSelect name="method" value="bank" options={methodOptions} className="col-span-2 sm:col-span-1" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActionSubmit>Изпрати на фирмата</ActionSubmit>
            <Button type="button" variant="ghost" size="sm" className="h-10 px-3 text-sm" onPress={close}>Отказ</Button>
            <span className="text-xs text-muted-foreground">Ще се отчете като платено, щом фирмата го потвърди.</span>
          </div>
        </ActionForm>
      )}
    </Unfolding>
  );
}

/** "Не е вярно?" under a receipt: one field that goes to the company. */
export function DisputeReceiptRow({ row, portalPublicId, receiptId }: { row: ReactNode; portalPublicId: string; receiptId: string }) {
  return (
    <Unfolding row={row} trigger="Не е вярно?" variant="ghost" stack>
      {(close) => (
        <ActionForm action={disputePaymentAction} success="Изпратено на фирмата" redirects onSuccess={close} className="grid gap-2">
          <input type="hidden" name="projectPublicId" value={portalPublicId} />
          <input type="hidden" name="receiptId" value={receiptId} />
          <Textarea aria-label="Какво не е вярно?" name="reason" required minLength={5} maxLength={1000} rows={2} autoFocus placeholder="Какво не е вярно? Напр. платих 4 500 €, не 5 000 €" />
          <div className="flex items-center gap-2">
            <ActionSubmit>Изпрати на фирмата</ActionSubmit>
            <Button type="button" variant="ghost" size="sm" className="h-10 px-3 text-sm" onPress={close}>Отказ</Button>
          </div>
        </ActionForm>
      )}
    </Unfolding>
  );
}
