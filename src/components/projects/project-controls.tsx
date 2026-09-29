import { ClipboardCheck, Pencil, Plus } from "lucide-react";

import { BillLine, Quote, Slip } from "@/components/portal/paper";
import { ClaimRow, DisputeRow } from "@/components/projects/inline-actions";
import { PaymentAmountField } from "@/components/projects/payment-amount-field";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { FilterSelect } from "@/components/workspace/filter-select";
import {
  addInstallmentAction, assignReceiptAction, correctReceiptAction, editInstallmentAction, recordReceiptAction,
  requestAcceptanceAction, resolvePaymentDisputeAction,
} from "@/modules/projects/operations";
import type { ProjectState } from "@/modules/projects/state";
import { formatDay } from "@/modules/change-orders/labels";
import { formatAmount } from "@/lib/money";

const paymentKinds = [{ value: "deposit", label: "Капаро" }, { value: "progress", label: "Междинно" }, { value: "final", label: "Окончателно" }, { value: "other", label: "Друго" }];
const methods = [{ value: "bank", label: "Банков превод" }, { value: "cash", label: "В брой" }, { value: "card", label: "Карта" }, { value: "other", label: "Друго" }];
const methodLabels: Record<string, string> = { cash: "в брой", bank: "банков превод", card: "карта", other: "друго" };
const today = () => new Date().toISOString().slice(0, 10);

/** "Към оферта" options: the offers in force, then the project as a whole. */
export type OfferOption = { value: string; label: string };

export type OpenDispute = { id: string; reason: string; receiptId: string; createdAt: Date; receivedOn: string; amount: string; currency: string };
export type PendingClaim = { id: string; amount: string; currency: string; method: string; paidOn: string; note: string | null; contactName: string; offerLabel: string | null; installmentTitle: string | null; createdAt: Date };

/**
 * Open payment disputes, above the project tabs so they are seen from any tab. A staff
 * notification links to `#dispute-<id>`, and the linked one is shaded via `:target`.
 */
export function PaymentDisputesAlert({ projectId, disputes, canResolve }: { projectId: string; disputes: OpenDispute[]; canResolve: boolean }) {
  if (!disputes.length) return null;
  return <Slip label={disputes.length === 1 ? "Клиентът оспорва плащане" : `Клиентът оспорва ${disputes.length} плащания`} meta="Отговори или коригирай">
    <ul className="divide-y divide-dashed">
      {disputes.map((item) => {
        const row = <>
          <Entry date={formatDay(item.receivedOn)} title="Записано плащане" amount={`${Number(item.amount).toFixed(2)} ${item.currency}`} />
          <Quote by="Клиентът:" tone="danger" className="mt-2">{item.reason}</Quote>
          <p className="mt-1 text-xs text-muted-foreground">{item.createdAt.toLocaleString("bg-BG", { dateStyle: "short", timeStyle: "short" })}</p>
        </>;
        return <li key={item.id} id={`dispute-${item.id}`} className="scroll-mt-24 px-4 py-3 target:bg-primary/5">
          {canResolve ? <DisputeRow row={row} projectId={projectId} disputeId={item.id} /> : row}
        </li>;
      })}
    </ul>
  </Slip>;
}

/**
 * Payments the client reported ("Платих"), waiting for the team. Confirming records the receipt
 * (amount and date can be fixed first); "Още не е получено" sends the client the reason.
 */
export function PaymentClaimsBlock({ projectId, claims, canResolve }: { projectId: string; claims: PendingClaim[]; canResolve: boolean }) {
  if (!claims.length) return null;
  return <Slip label={claims.length === 1 ? "Клиентът отбеляза плащане" : `Клиентът отбеляза ${claims.length} плащания`} meta="Още не е в платеното">
    <ul className="divide-y divide-dashed">
      {claims.map((claim) => {
        const row = <>
          <Entry
            date={formatDay(claim.paidOn)}
            title={claim.installmentTitle ? `За „${claim.installmentTitle}“` : claim.offerLabel ?? "Плащане"}
            sub={`${claim.contactName} · ${methodLabels[claim.method] ?? claim.method}`}
            amount={`${Number(claim.amount).toFixed(2)} ${claim.currency}`}
          />
          {claim.note ? <Quote by="Бележка:" className="mt-2">{claim.note}</Quote> : null}
        </>;
        return <li key={claim.id} className="px-4 py-3">
          {canResolve ? <ClaimRow row={row} projectId={projectId} claim={claim} /> : row}
        </li>;
      })}
    </ul>
  </Slip>;
}

/** One statement line: date, what, amount. */
function Entry({ date, title, sub, amount }: { date: string; title: React.ReactNode; sub?: React.ReactNode; amount: React.ReactNode }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 text-sm sm:grid-cols-[5.5rem_minmax(0,1fr)_auto]">
    <span className="hidden font-mono text-xs text-muted-foreground sm:block">{date}</span>
    <span className="min-w-0">
      <span className="block truncate font-medium">{title}</span>
      <span className="block text-xs text-muted-foreground"><span className="font-mono sm:hidden">{date}{sub ? " · " : ""}</span>{sub}</span>
    </span>
    <span className="font-semibold tabular-nums">{amount}</span>
  </div>;
}

export function RecordPaymentDialog({ projectId, offerOptions, installments, remaining }: {
  projectId: string;
  /** What the agreed offers still owe, to warn before an overpayment. */
  remaining?: { cents: number; currency: string };
  /** Shown when there is a choice; a single offer is filled in. */
  offerOptions: OfferOption[];
  installments: { id: string; title: string; offerLabel: string | null }[];
}) {
  const installmentOptions = [{ value: "none", label: "Без конкретна вноска" }, ...installments.map((item) => ({ value: item.id, label: item.offerLabel ? `${item.title} · ${item.offerLabel}` : item.title }))];
  return <DialogTrigger>
    <Button type="button"><Plus data-icon="inline-start" />Запиши плащане</Button>
    <Dialog className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Запиши получено плащане</DialogTitle>
        <DialogDescription>Сумата влиза в полученото и в остатъка. Клиентът получава разписка по имейл.</DialogDescription>
      </DialogHeader>
      <ActionForm action={recordReceiptAction} success="Плащането е записано" className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="projectId" value={projectId} />
        <Field><FieldLabel>Вид</FieldLabel><FilterSelect name="kind" value="deposit" options={paymentKinds} /></Field>
        <PaymentAmountField remaining={remaining} />
        <Field><FieldLabel htmlFor="receipt-date">Дата</FieldLabel><DatePicker id="receipt-date" name="receivedOn" defaultValue={today()} required aria-label="Дата на получаване" /></Field>
        <Field><FieldLabel>Метод</FieldLabel><FilterSelect name="method" value="bank" options={methods} /></Field>
        {installments.length ? <Field className="sm:col-span-2"><FieldLabel>За вноска</FieldLabel><FilterSelect name="installmentId" value="none" options={installmentOptions} /></Field> : null}
        <OfferField options={offerOptions} hint={installments.length ? "Ако е избрана вноска, плащането отива към нейната оферта." : undefined} />
        <Field className="sm:col-span-2"><FieldLabel htmlFor="receipt-note">Бележка</FieldLabel><Input id="receipt-note" name="note" maxLength={500} /></Field>
        <ActionSubmit className="sm:col-span-2">Запиши плащането</ActionSubmit>
      </ActionForm>
    </Dialog>
  </DialogTrigger>;
}

/** "Към оферта": a select when there is a choice, a hidden field with the only offer otherwise. */
function OfferField({ options, value, hint }: { options: OfferOption[]; value?: string; hint?: string }) {
  if (options.length === 0) return null;
  if (options.length === 1) return <input type="hidden" name="offerId" value={options[0]!.value} />;
  return <Field className="sm:col-span-2">
    <FieldLabel>Към оферта</FieldLabel>
    <FilterSelect name="offerId" value={value ?? options[0]!.value} options={options} />
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </Field>;
}

type Installment = ProjectState["installments"][number];

/** Adds a planned installment by hand, or edits one (also those made from the offer's payment terms). */
export function InstallmentDialog({ projectId, offerOptions, stages, installment }: {
  projectId: string;
  offerOptions: OfferOption[];
  stages: { value: string; label: string; offerId: string | null }[];
  installment?: Installment;
}) {
  const key = installment?.id ?? "new";
  const stageOptions = [{ value: "none", label: "Без етап" }, ...stages.map((stage) => ({ value: stage.value, label: stage.label }))];
  return <DialogTrigger>
    {installment
      ? <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={`Редактирай ${installment.title}`}><Pencil /></Button>
      : <Button type="button" variant="outline"><Plus data-icon="inline-start" />Добави вноска</Button>}
    <Dialog className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{installment ? "Редактирай вноската" : "Нова вноска"}</DialogTitle>
        <DialogDescription>Клиентът вижда платежния план в портала и може да отбележи, че е платил.</DialogDescription>
      </DialogHeader>
      <ActionForm action={installment ? editInstallmentAction : addInstallmentAction} success={installment ? "Вноската е записана" : "Вноската е добавена"} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="projectId" value={projectId} />
        {installment ? <input type="hidden" name="installmentId" value={installment.id} /> : null}
        <Field className="sm:col-span-2"><FieldLabel htmlFor={`installment-title-${key}`}>Име</FieldLabel><Input id={`installment-title-${key}`} name="title" required minLength={2} maxLength={180} defaultValue={installment?.title} placeholder="Напр. Аванс за материали" autoFocus /></Field>
        <Field><FieldLabel htmlFor={`installment-amount-${key}`}>Сума (EUR)</FieldLabel><Input id={`installment-amount-${key}`} type="number" name="amount" min="0.01" step="0.01" defaultValue={installment ? Number(installment.amount).toFixed(2) : undefined} required /></Field>
        <Field><FieldLabel htmlFor={`installment-due-${key}`}>Падеж</FieldLabel><DatePicker id={`installment-due-${key}`} name="dueOn" defaultValue={installment?.dueOn ?? today()} required aria-label="Падеж" /></Field>
        <Field><FieldLabel>Вид</FieldLabel><FilterSelect name="kind" value={installment?.kind ?? "progress"} options={paymentKinds} /></Field>
        {stages.length ? <Field><FieldLabel>След етап</FieldLabel><FilterSelect name="milestoneId" value={installment?.milestoneId ?? "none"} options={stageOptions} /></Field> : null}
        <OfferField options={offerOptions} value={installment ? installment.offerId ?? "none" : undefined} />
        <div className="flex justify-end gap-2 sm:col-span-2"><DialogClose>Отказ</DialogClose><ActionSubmit>{installment ? "Запази" : "Добави"}</ActionSubmit></div>
      </ActionForm>
    </Dialog>
  </DialogTrigger>;
}

type Receipt = ProjectState["receipts"][number];

/** Row actions for one received payment: resolve its open dispute, assign it to an offer, or correct its amount. */
export function ReceiptActions({ projectId, receipt, receipts, dispute, assignOptions }: {
  projectId: string;
  receipt: Receipt;
  receipts: Receipt[];
  dispute?: { id: string; reason: string };
  /** Offers an unassigned receipt can go to. */
  assignOptions: OfferOption[];
}) {
  if (receipt.correctionOfId || Number(receipt.amount) <= 0) return null;
  const corrected = receipts.some((item) => item.correctionOfId === receipt.id);
  return <div className="flex justify-end gap-1.5">
    {dispute ? <ResolveDisputeDialog projectId={projectId} dispute={dispute} /> : null}
    {!receipt.offerId && assignOptions.length ? <AssignReceiptDialog projectId={projectId} receipt={receipt} options={assignOptions} /> : null}
    {corrected ? <span className="self-center text-xs text-muted-foreground">Коригирано</span> : <CorrectReceiptDialog projectId={projectId} receipt={receipt} />}
  </div>;
}

function AssignReceiptDialog({ projectId, receipt, options }: { projectId: string; receipt: Receipt; options: OfferOption[] }) {
  return <DialogTrigger>
    <Button type="button" variant="outline" size="sm">Разпредели</Button>
    <Dialog className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Към коя оферта е плащането?</DialogTitle>
        <DialogDescription>{formatAmount(receipt.amount)} {receipt.currency} от {formatDay(receipt.receivedOn)}. Разпределя се веднъж и влиза в платеното по тази оферта.</DialogDescription>
      </DialogHeader>
      <ActionForm action={assignReceiptAction} success="Плащането е разпределено" className="grid gap-3">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="receiptId" value={receipt.id} />
        <Field><FieldLabel>Оферта</FieldLabel><FilterSelect name="offerId" value={options[0]!.value} options={options} /></Field>
        <div className="flex justify-end gap-2"><DialogClose>Отказ</DialogClose><ActionSubmit>Разпредели</ActionSubmit></div>
      </ActionForm>
    </Dialog>
  </DialogTrigger>;
}

function CorrectReceiptDialog({ projectId, receipt }: { projectId: string; receipt: Receipt }) {
  const amountId = `correct-amount-${receipt.id}`;
  const reasonId = `correct-reason-${receipt.id}`;
  return <DialogTrigger>
    <Button type="button" variant="ghost" size="sm"><Pencil data-icon="inline-start" />Коригирай</Button>
    <Dialog className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Коригирай плащане</DialogTitle>
        <DialogDescription>Записът не се изтрива. Добавяме сторно и нов запис с вярната сума, а клиентът вижда корекцията.</DialogDescription>
      </DialogHeader>
      <BillLine code={formatDay(receipt.receivedOn)} label={`Записано · ${paymentKinds.find((kind) => kind.value === receipt.kind)?.label ?? receipt.kind}`} amount={`${formatAmount(receipt.amount)} ${receipt.currency}`} className="border-y border-dashed py-2.5" />
      <ActionForm action={correctReceiptAction} success="Плащането е коригирано" className="grid gap-3">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="receiptId" value={receipt.id} />
        <Field><FieldLabel htmlFor={amountId}>Вярна сума ({receipt.currency})</FieldLabel><Input id={amountId} type="number" name="amount" step="0.01" min="0.01" defaultValue={formatAmount(receipt.amount)} required autoFocus /></Field>
        <Field><FieldLabel htmlFor={reasonId}>Причина</FieldLabel><Input id={reasonId} name="reason" required minLength={3} maxLength={500} placeholder="Напр. грешно въведена сума" /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <DialogClose>Отказ</DialogClose>
          <ActionSubmit>Запиши корекцията</ActionSubmit>
        </div>
      </ActionForm>
    </Dialog>
  </DialogTrigger>;
}

function ResolveDisputeDialog({ projectId, dispute }: { projectId: string; dispute: { id: string; reason: string } }) {
  const resolutionId = `dispute-resolution-${dispute.id}`;
  return <DialogTrigger>
    <Button type="button" variant="outline" size="sm">Отговори</Button>
    <Dialog className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Отговор на оспорването</DialogTitle>
        <DialogDescription>Ако сумата е грешна, коригирай плащането — спорът се затваря автоматично. Клиентът получава отговора по имейл.</DialogDescription>
      </DialogHeader>
      <Quote by="Клиентът:" tone="danger">{dispute.reason}</Quote>
      <ActionForm action={resolvePaymentDisputeAction} success="Отговорът е изпратен" className="grid gap-3">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="disputeId" value={dispute.id} />
        <Field><FieldLabel htmlFor={resolutionId}>Отговор към клиента</FieldLabel><Textarea id={resolutionId} name="resolution" required minLength={3} rows={2} placeholder="Напр. сумата съвпада с банковото извлечение от 26.09" /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <DialogClose>Отказ</DialogClose>
          <ActionSubmit>Изпрати и затвори спора</ActionSubmit>
        </div>
      </ActionForm>
    </Dialog>
  </DialogTrigger>;
}

/** Asks the client to accept one offer's work (handover). */
export function RequestAcceptanceDialog({ projectId, offerId, title, openStages, again }: { projectId: string; offerId: string; title: string; openStages: number; again: boolean }) {
  return <DialogTrigger>
    <Button type="button" variant={openStages ? "outline" : "default"} size="sm"><ClipboardCheck data-icon="inline-start" />{again ? "Поискай приемане отново" : "Поискай приемане"}</Button>
    <Dialog className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Приемане на „{title}“</DialogTitle>
        <DialogDescription>Клиентът получава имейл и в портала може да приеме работата или да опише забележките си.</DialogDescription>
      </DialogHeader>
      {openStages ? <Quote tone="warning" className="text-muted-foreground">{openStages === 1 ? "1 етап още не е завършен." : `${openStages} етапа още не са завършени.`} Можеш да поискаш приемане и сега.</Quote> : null}
      <ActionForm action={requestAcceptanceAction} success="Искането е изпратено" className="grid gap-3">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="offerId" value={offerId} />
        <Field><FieldLabel htmlFor={`acceptance-note-${offerId}`}>Бележка към клиента (по желание)</FieldLabel><Textarea id={`acceptance-note-${offerId}`} name="note" maxLength={2000} placeholder={again ? "Напр. фугата е подменена" : "Напр. готови сме, заповядайте на оглед"} /></Field>
        <div className="flex justify-end gap-2"><DialogClose>Отказ</DialogClose><ActionSubmit>Изпрати</ActionSubmit></div>
      </ActionForm>
    </Dialog>
  </DialogTrigger>;
}
