"use client";

import { startTransition, useActionState, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { sofiaTodayIso } from "@/lib/sofia-today";
import Link from "next/link";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VatRateField } from "@/components/change-orders/vat-rate-field";
import { DiscountField } from "@/components/change-orders/discount-field";
import { ScheduleEditor, schedulePayload, scheduleRowsFrom, type ScheduleRow } from "@/components/change-orders/schedule-editor";
import { PaymentTermsEditor, termRowsFrom, termsPayload, termsProblem, type TermRow } from "@/components/change-orders/payment-terms-editor";
import { Checkbox } from "@/components/ui/checkbox";
import { LineItemsEditor, formatMoney, linesPayload, priceLines, type Line } from "@/components/change-orders/line-items-editor";
import type { CatalogPick } from "@/components/catalog/catalog-picker";
import { createDocumentRevisionAction, type QuickChangeState } from "@/modules/change-orders/actions";
import { discountLabel, money, priceOffer, type DiscountType } from "@/modules/change-orders/pricing";
import { formatDay, vatLabel } from "@/modules/change-orders/labels";
import { currencySymbol } from "@/lib/money";

type ChangeKind = "addition" | "credit" | "no_cost" | "schedule_only";
export type RevisionFormInitial = {
  id: string; documentKind: "offer" | "change"; title: string; description: string;
  reason: string | null; changeKind: ChangeKind;
  subtotal: string; taxRate: string; scheduleImpactType: "none" | "days" | "unknown";
  scheduleImpactDays: number | null; agreedDeadline: string | null;
  clientNote: string | null;
  discountType?: "percent" | "amount" | null; discountValue?: string | null;
  lineItems: Array<{ description: string; quantity: string; unit: string | null; unitPrice: string }>;
  schedule?: Array<{ title: string; durationDays: number; lineKey?: string }>;
  paymentTerms?: Array<{ title: string; percent: number; dueTrigger: string; dueOn: string | null; stage: number | null }>;
  /** Approved changes the edited version already absorbs. */
  absorbedChangeIds?: string[];
};

/** An approved change of this offer that the new version could include. */
export type AbsorbableChange = { id: string; sequenceNumber: number; title: string; total: string };

const changeKinds: Array<{ value: ChangeKind; label: string }> = [
  { value: "addition", label: "Допълнителна работа" },
  { value: "credit", label: "Намаление" },
  { value: "no_cost", label: "Без цена" },
  { value: "schedule_only", label: "Само срок" },
];

/**
 * The editor for a new version of an offer or a change: the content in sections on the left,
 * a live bill with the save buttons on the right (a sticky bar on phones).
 * `withdrawsRevision` is set when the client already has this version; saving takes it back.
 * With `canSend`, "Запази и изпрати" sends the new version (and the email) in the same step.
 */
export function RevisionForm({ initial, revisionNumber, frozen, withdrawsRevision, canSend = false, catalog = [], currency = "EUR", cancelHref, attachments, absorbable = [] }: {
  initial: RevisionFormInitial;
  /** Approved changes of this offer that are not absorbed yet (offers only). */
  absorbable?: AbsorbableChange[];
  /** The version being edited; saving creates the next one. */
  revisionNumber: number;
  /** The edited version was sent at some point, so it stays in the history as it was. */
  frozen: boolean;
  withdrawsRevision?: number;
  canSend?: boolean;
  catalog?: CatalogPick[];
  currency?: string;
  cancelHref: string;
  /** The files panel; it saves on its own, so it sits beside the form rather than inside it. */
  attachments?: ReactNode;
}) {
  const formId = useId();
  const isOffer = initial.documentKind === "offer";
  const [state, action, pending] = useActionState<QuickChangeState, FormData>(createDocumentRevisionAction, {});
  const [intent, setIntent] = useState<"send" | "save">(canSend ? "send" : "save");
  const [lines, setLines] = useState<Line[]>(() => initial.lineItems.map((item, index) => ({ key: `line-${index + 1}`, description: item.description, quantity: String(Number(item.quantity)), unit: item.unit ?? "", unitPrice: String(Number(item.unitPrice)) })));
  const [taxRate, setTaxRate] = useState(String(Number(initial.taxRate)));
  const [discountType, setDiscountType] = useState<"" | DiscountType>(initial.discountType ?? "");
  const [discountValue, setDiscountValue] = useState(initial.discountValue ? String(Number(initial.discountValue)) : "");
  const [changeKind, setChangeKind] = useState<ChangeKind>(initial.changeKind);
  const [changePrice, setChangePrice] = useState(String(Math.abs(Number(initial.subtotal))));
  const [scheduleType, setScheduleType] = useState(initial.scheduleImpactType === "days" ? "days" : "none");
  const [deadline, setDeadline] = useState(initial.agreedDeadline ?? "");
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(() => scheduleRowsFrom(initial.schedule ?? []));
  const [termRows, setTermRows] = useState<TermRow[]>(() => termRowsFrom(initial.paymentTerms ?? []));
  const [absorbed, setAbsorbed] = useState<string[]>(() => (initial.absorbedChangeIds ?? []).filter((id) => absorbable.some((change) => change.id === id)));
  const today = sofiaTodayIso();
  const [localError, setLocalError] = useState("");
  const error = localError || state.error;

  const payload = linesPayload(lines);
  const priced = useMemo(() => priceLines(lines), [lines]);
  const pricedChange = changeKind !== "no_cost" && changeKind !== "schedule_only";
  const bill = useMemo(() => {
    const rate = Number(taxRate);
    if (isOffer) return priceOffer(priced, rate, discountType ? { type: discountType, value: Number(discountValue) } : null);
    const subtotal = pricedChange ? money(Number(changePrice || 0)) : 0;
    const taxAmount = money(subtotal * rate / 100);
    return { gross: subtotal, discountAmount: 0, subtotal, taxAmount, total: money(subtotal + taxAmount) };
  }, [isOffer, priced, taxRate, discountType, discountValue, pricedChange, changePrice]);
  const sign = !isOffer && changeKind === "credit" ? "−" : "";
  const nextVersion = revisionNumber + 1;

  function validate(event: FormEvent<HTMLFormElement>) {
    let message = "";
    if (isOffer && !payload.length) message = "Добави поне една услуга или материал.";
    else if (payload.some((line) => line.description.length < 2)) message = "Добави описание на всяка услуга и материал.";
    else if (payload.some((line) => !(line.quantity > 0))) message = "Количеството трябва да е над 0.";
    else if (isOffer) message = termsProblem(termRows) ?? "";
    setLocalError(message);
    // Sent by hand, not as a form action: React resets the form after an action, and React Aria's
    // checkboxes then snap back, so a failed save quietly unticked "already includes this change".
    event.preventDefault();
    if (message) return;
    const formData = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(formData));
  }

  const deadlineText = isOffer
    ? deadline ? `До ${formatDay(deadline)}` : "Посочи краен срок"
    : scheduleType === "days" ? deadline ? `Нов срок: ${formatDay(deadline)}` : "Посочи нов срок" : "Без промяна";
  const outcome = withdrawsRevision
    ? `Версия ${withdrawsRevision} се оттегля. Запазваш версия ${nextVersion}.`
    : frozen
      ? `Запазването създава версия ${nextVersion}. Версия ${revisionNumber} остава в историята.`
      : "Промените остават в черновата, докато не я изпратиш.";

  const submitButtons = (compact: boolean) => canSend ? (
    <>
      <Button type="submit" form={formId} name="intent" value="send" isDisabled={pending} onPress={() => setIntent("send")} className={compact ? "h-11 flex-1 gap-2" : "h-11 w-full gap-2"}>
        <Send className="size-4" /> {pending && intent === "send" ? "Изпращане…" : "Запази и изпрати"}
      </Button>
      <Button type="submit" form={formId} name="intent" value="save" variant="outline" isDisabled={pending} onPress={() => setIntent("save")} className={compact ? "h-11 px-3" : "h-11 w-full"}>
        {pending && intent === "save" ? "Запазване…" : compact ? "Чернова" : "Запази като чернова"}
      </Button>
    </>
  ) : (
    <Button type="submit" form={formId} isDisabled={pending} className={compact ? "h-11 flex-1" : "h-11 w-full"}>
      {pending ? "Запазване…" : withdrawsRevision ? `Оттегли версия ${withdrawsRevision} и запази` : "Запази версията"}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {withdrawsRevision ? (
        <div role="note" className="rounded-xl bg-tile-sand px-4 py-3 text-sm text-tile-sand-foreground">
          <p className="font-semibold">Клиентът вече има версия {withdrawsRevision}.</p>
          <p className="mt-0.5">{canSend
            ? `При запазване тя се оттегля. „Запази и изпрати“ му изпраща новата версия с имейл за разликите; „Запази като чернова“ му показва „Офертата се обновява“, докато не я изпратиш.`
            : `При запазване тя се оттегля и клиентът вижда „Офертата се обновява“, докато служител с право да изпраща не изпрати новата.`}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <form noValidate id={formId} onSubmit={validate} className="flex flex-col gap-4">
            <input type="hidden" name="changeOrderId" value={initial.id} />
            <input type="hidden" name="lines" value={JSON.stringify(payload)} />
            {isOffer ? <>
              <input type="hidden" name="schedule" value={JSON.stringify(schedulePayload(scheduleRows))} />
              <input type="hidden" name="paymentTerms" value={JSON.stringify(termsPayload(termRows))} />
              <input type="hidden" name="absorbedChanges" value={JSON.stringify(absorbed)} />
            </> : null}

            <EditorSection title={isOffer ? "Какво предлагаш" : "Промяната"}>
              <Field><FieldLabel htmlFor={`${formId}-title`}>Заглавие</FieldLabel><Input id={`${formId}-title`} name="title" defaultValue={initial.title} required minLength={3} maxLength={180} className="h-10" /></Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-description`}>{isOffer ? "Обхват" : "Описание"}</FieldLabel>
                <Textarea id={`${formId}-description`} name="description" defaultValue={initial.description} required minLength={5} className="min-h-24" placeholder={isOffer ? "Какво включва работата и какво остава извън нея." : undefined} />
              </Field>
            </EditorSection>

            {isOffer ? (
              <>
                <input type="hidden" name="changeKind" value="addition" />
                <input type="hidden" name="subtotal" value="0" />
                <input type="hidden" name="scheduleImpactType" value="none" />
                <LineItemsEditor lines={lines} setLines={setLines} catalog={catalog} canSaveCatalog minQuantity={0} currency={currency} />
              </>
            ) : (
              <EditorSection title="Цена">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Вид промяна</FieldLabel>
                    <input type="hidden" name="changeKind" value={changeKind} />
                    <Select aria-label="Вид промяна" selectedKey={changeKind} onSelectionChange={(key) => setChangeKind(key as ChangeKind)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectGroup>{changeKinds.map((kind) => <SelectItem key={kind.value} id={kind.value}>{kind.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                  </Field>
                  {pricedChange ? (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-subtotal`}>Цена без ДДС</FieldLabel>
                      <label className="flex h-10 items-center rounded-lg border bg-background px-3">
                        <Input id={`${formId}-subtotal`} name="subtotal" inputMode="decimal" value={changePrice} onChange={(event) => setChangePrice(event.target.value.replace(",", "."))} className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-right tabular-nums focus-visible:ring-0" />
                        <span className="shrink-0 pl-2 text-xs text-muted-foreground">{currencySymbol(currency)}</span>
                      </label>
                    </Field>
                  ) : <input type="hidden" name="subtotal" value="0" />}
                </div>
              </EditorSection>
            )}

            <EditorSection title={isOffer ? "ДДС, отстъпка и срок" : "ДДС и срок"}>
              {/* Side by side only when the column is wide enough; beside the menu and the bill it is not. */}
              <div className="@container"><div className="grid gap-4 @xl:grid-cols-2 @xl:gap-6">
                <VatRateField value={taxRate} onChange={setTaxRate} />
                {isOffer ? <DiscountField defaultType={discountType} defaultValue={discountValue} currency={currency} onChange={(type, value) => { setDiscountType(type); setDiscountValue(value); }} /> : null}
              </div></div>
              {isOffer ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-deadline`}>Договорен краен срок</FieldLabel>
                  <DatePicker id={`${formId}-deadline`} name="agreedDeadline" required min="today" value={deadline} onChange={setDeadline} aria-label="Договорен краен срок" />
                </Field>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Промяна в срока</FieldLabel>
                    <input type="hidden" name="scheduleImpactType" value={scheduleType} />
                    <Select aria-label="Промяна в срока" selectedKey={scheduleType} onSelectionChange={(key) => setScheduleType(String(key))}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectGroup><SelectItem id="none">Без промяна</SelectItem><SelectItem id="days">Нов краен срок</SelectItem></SelectGroup></SelectContent>
                    </Select>
                  </Field>
                  {scheduleType === "days" ? (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-new-deadline`}>Нов договорен краен срок</FieldLabel>
                      <DatePicker id={`${formId}-new-deadline`} name="agreedDeadline" required min="today" value={deadline} onChange={setDeadline} aria-label="Нов договорен краен срок" />
                    </Field>
                  ) : <input type="hidden" name="agreedDeadline" value="" />}
                </div>
              )}
            </EditorSection>

            {isOffer ? (
              <EditorSection title="Ориентировъчен график" description="По желание и само ориентировъчно. Договореният срок е крайният срок по-горе.">
                <ScheduleEditor rows={scheduleRows} setRows={setScheduleRows} deadline={deadline} today={today} />
              </EditorSection>
            ) : null}

            {isOffer ? (
              <EditorSection title="Плащане" description="По желание. Клиентът ги одобрява с офертата; след одобрение стават вноски.">
                <PaymentTermsEditor rows={termRows} setRows={setTermRows} total={bill.total} stages={schedulePayload(scheduleRows).map((line) => line.title)} />
              </EditorSection>
            ) : null}

            {isOffer && absorbable.length ? (
              <EditorSection title="Одобрени промени към тази оферта" description="Отбележи промените, които новата версия вече включва в цената. След одобрение те спират да се добавят отделно.">
                <ul className="flex flex-col divide-y rounded-xl border">
                  {absorbable.map((change) => (
                    <li key={change.id} className="px-3 py-2.5">
                      <Checkbox isSelected={absorbed.includes(change.id)} onChange={(selected) => setAbsorbed(selected ? [...absorbed, change.id] : absorbed.filter((id) => id !== change.id))} className="w-full">
                        <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate">{change.title} <span className="text-muted-foreground">· ПР-{String(change.sequenceNumber).padStart(3, "0")}</span></span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">{formatMoney(Number(change.total))} {currencySymbol(currency)}</span>
                        </span>
                      </Checkbox>
                    </li>
                  ))}
                </ul>
              </EditorSection>
            ) : null}

            <EditorSection title="За клиента" description="Двете полета се виждат в PDF-а и в портала.">
              <Field>
                <FieldLabel htmlFor={`${formId}-reason`}>Причина</FieldLabel>
                <Input id={`${formId}-reason`} name="reason" defaultValue={initial.reason ?? ""} maxLength={2000} placeholder={isOffer ? "По желание" : "Защо е необходима промяната?"} className="h-10" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-client-note`}>Бележка към клиента</FieldLabel>
                <Textarea id={`${formId}-client-note`} name="clientNote" defaultValue={initial.clientNote ?? ""} maxLength={2000} className="min-h-20" />
                <FieldDescription>Бележки само за екипа се пишат в раздел „Бележки“.</FieldDescription>
              </Field>
            </EditorSection>
          </form>
          {attachments}
        </div>

        <aside aria-label="Сметка и запазване" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:sticky lg:top-20">
          <div>
            <h2 className="text-sm font-semibold">Сметка</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {bill.discountAmount ? <>
                <BillRow label="Сума без отстъпка" value={formatMoney(bill.gross)} />
                <BillRow label={discountLabel(discountType || null, discountValue)} value={`−${formatMoney(bill.discountAmount)}`} className="text-primary-ink" />
              </> : null}
              <BillRow label="Без ДДС" value={`${sign}${formatMoney(bill.subtotal)}`} />
              <BillRow label={vatLabel(taxRate)} value={`${sign}${formatMoney(bill.taxAmount)}`} />
              <div className="flex justify-between gap-3 border-t pt-2 text-base font-semibold">
                <dt>Общо</dt>
                <dd className="tabular-nums">{sign}{formatMoney(bill.total)} {currencySymbol(currency)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">{deadlineText}</p>
            {absorbed.length ? <p className="mt-1 text-xs text-muted-foreground">Включва {absorbed.length === 1 ? "1 одобрена промяна" : `${absorbed.length} одобрени промени`}.</p> : null}
          </div>
          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-xs text-muted-foreground">{outcome}</p>
            {error ? <p role="alert" className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}
            <div className="hidden flex-col gap-2 lg:flex">
              {submitButtons(false)}
              <Link href={cancelHref} className="inline-flex h-9 items-center justify-center rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Отказ</Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Phones: the total and the save buttons stay in reach above the bottom navigation. */}
      <div className="sticky bottom-20 z-20 -mx-4 flex flex-col gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <p className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Общо · версия {nextVersion}</span>
          <span className="font-semibold tabular-nums">{sign}{formatMoney(bill.total)} {currencySymbol(currency)}</span>
        </p>
        <div className="flex gap-2">{submitButtons(true)}</div>
      </div>
    </div>
  );
}

function EditorSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex flex-col gap-4 p-4">{children}</div>
    </section>
  );
}

function BillRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between gap-3 ${className ?? ""}`}>
      <dt className={className ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
