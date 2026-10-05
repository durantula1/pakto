"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { FilterSelect } from "@/components/workspace/filter-select";
import { confirmPaymentClaimAction, rejectPaymentClaimAction, resolvePaymentDisputeAction } from "@/modules/projects/operations";

const paymentKinds = [{ value: "deposit", label: "Аванс" }, { value: "progress", label: "Междинно" }, { value: "final", label: "Окончателно" }, { value: "other", label: "Друго" }];

/** A row with its answers: each button opens its form right under the row, one at a time. */
function RowWithForms<Mode extends string>({ row, actions, form }: {
  row: ReactNode;
  actions: { mode: Mode; label: string; variant?: "default" | "outline" | "ghost" }[];
  form: (mode: Mode, close: () => void) => ReactNode;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const close = () => setMode(null);
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <div className="min-w-0 flex-1">{row}</div>
        {mode ? null : (
          <span className="flex shrink-0 gap-1.5">
            {actions.map((action) => <Button key={action.mode} type="button" size="sm" variant={action.variant ?? "default"} onPress={() => setMode(action.mode)}>{action.label}</Button>)}
          </span>
        )}
      </div>
      {mode ? <div className="mt-3 border-t border-dashed pt-3">{form(mode, close)}</div> : null}
    </div>
  );
}

/**
 * A client's "Платих" waiting for the team. "Потвърди" records the receipt with the client's
 * amount and date filled in (fix them if the bank says otherwise); "Още не е получено" answers why.
 */
export function ClaimRow({ row, projectId, claim }: { row: ReactNode; projectId: string; claim: { id: string; amount: string; paidOn: string; installmentKind?: string | null } }) {
  return (
    <RowWithForms<"confirm" | "reject">
      row={row}
      actions={[{ mode: "confirm", label: "Потвърди" }, { mode: "reject", label: "Още не е получено", variant: "ghost" }]}
      form={(mode, close) => mode === "confirm" ? (
        <ActionForm action={confirmPaymentClaimAction} success="Плащането е записано" onSuccess={close} className="grid gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="claimId" value={claim.id} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[8rem_10rem_minmax(0,12rem)]">
            <Input aria-label="Получена сума" type="number" name="amount" min="0.01" step="0.01" defaultValue={Number(claim.amount).toFixed(2)} required className="tabular-nums" />
            <DatePicker id={`claim-date-${claim.id}`} name="receivedOn" defaultValue={claim.paidOn} required max="today" aria-label="Дата на получаване" />
            <FilterSelect name="kind" value={claim.installmentKind ?? "progress"} options={paymentKinds} className="col-span-2 sm:col-span-1" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActionSubmit>Запиши като получено</ActionSubmit>
            <Button type="button" variant="ghost" size="sm" onPress={close}>Отказ</Button>
            <span className="text-xs text-muted-foreground">Клиентът получава разписка по имейл.</span>
          </div>
        </ActionForm>
      ) : (
        <ActionForm action={rejectPaymentClaimAction} success="Отговорът е изпратен" onSuccess={close} className="grid gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="claimId" value={claim.id} />
          <Textarea aria-label="Отговор към клиента" name="response" required minLength={3} maxLength={1000} rows={2} autoFocus placeholder="Отговор към клиента. Напр. още не виждаме превода от 12.10. Можеш ли да изпратиш платежното?" />
          <div className="flex items-center gap-2">
            <ActionSubmit>Изпрати на клиента</ActionSubmit>
            <Button type="button" variant="ghost" size="sm" onPress={close}>Отказ</Button>
          </div>
        </ActionForm>
      )}
    />
  );
}

/** An open payment dispute: answer the client right under their words. A wrong amount is fixed with "Коригирай" instead. */
export function DisputeRow({ row, projectId, disputeId }: { row: ReactNode; projectId: string; disputeId: string }) {
  return (
    <RowWithForms<"answer">
      row={row}
      actions={[{ mode: "answer", label: "Отговори", variant: "outline" }]}
      form={(_, close) => (
        <ActionForm action={resolvePaymentDisputeAction} success="Отговорът е изпратен" onSuccess={close} className="grid gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="disputeId" value={disputeId} />
          <Textarea aria-label="Отговор към клиента" name="resolution" required minLength={3} rows={2} autoFocus placeholder="Отговор към клиента. Напр. сумата съвпада с банковото извлечение от 26.09, прилагаме го." />
          <div className="flex flex-wrap items-center gap-2">
            <ActionSubmit>Изпрати отговора</ActionSubmit>
            <Button type="button" variant="ghost" size="sm" onPress={close}>Отказ</Button>
            <span className="text-xs text-muted-foreground">Ако сумата е грешна, коригирай плащането и въпросът се затваря сам.</span>
          </div>
        </ActionForm>
      )}
    />
  );
}
