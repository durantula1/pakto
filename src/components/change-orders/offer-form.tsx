"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";

import { StagedAttachments, useUploadStagedFiles } from "@/components/change-orders/staged-attachments";
import { ScheduleEditor, schedulePayload, scheduleRowsFrom, type ScheduleRow } from "@/components/change-orders/schedule-editor";
import { DocumentBody } from "@/components/change-orders/document-body";
import { PaymentTermsEditor, termRowsFrom, termsPayload, termsProblem, type TermRow } from "@/components/change-orders/payment-terms-editor";
import { LineItemsEditor, blankLine, formatMoney, linesPayload, priceLines, type Line } from "@/components/change-orders/line-items-editor";
import { VatRateField } from "@/components/change-orders/vat-rate-field";
import { DiscountField } from "@/components/change-orders/discount-field";
import { discountLabel, priceOffer, type DiscountType } from "@/modules/change-orders/pricing";
import type { CatalogPick } from "@/components/catalog/catalog-picker";
import { formatDay, vatLabel } from "@/modules/change-orders/labels";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ProjectCombobox,
  type ProjectOption,
} from "@/components/workspace/project-combobox";
import {
  createOfferAction,
  type QuickChangeState,
} from "@/modules/change-orders/actions";

export type OfferFormInitial = {
  /** Where the prefill came from, shown above the form (a template name or the duplicated offer). */
  source: string;
  title: string;
  description: string;
  taxRate: string;
  lines: Array<{ description: string; quantity: number; unit: string; unitPrice: number }>;
  schedule?: Array<{ title: string; durationDays: number }>;
  paymentTerms?: Array<{ title: string; percent: number; dueTrigger: "on_approval" | "on_stage" | "on_completion" | "on_date"; dueOn?: string | null; stage?: number | null }>;
};

export function OfferForm({
  defaultProject,
  defaultTaxRate,
  catalog = [],
  canSaveCatalog = false,
  initial,
}: {
  defaultProject?: ProjectOption | null;
  defaultTaxRate: string;
  catalog?: CatalogPick[];
  canSaveCatalog?: boolean;
  initial?: OfferFormInitial | null;
}) {
  const [state, action, pending] = useActionState<QuickChangeState, FormData>(
    createOfferAction,
    {},
  );
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [project, setProject] = useState<ProjectOption | null>(
    defaultProject ?? null,
  );
  const projectId = project?.id ?? "";
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [lines, setLines] = useState<Line[]>(() => initial?.lines.length
    ? initial.lines.map((line, index) => ({ key: `line-${index + 1}`, description: line.description, quantity: String(line.quantity), unit: line.unit, unitPrice: String(line.unitPrice) }))
    : [blankLine("line-1")]);
  const [deadline, setDeadline] = useState("");
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(() => scheduleRowsFrom(initial?.schedule ?? []));
  const schedule = schedulePayload(scheduleRows);
  const [termRows, setTermRows] = useState<TermRow[]>(() => termRowsFrom(initial?.paymentTerms ?? []));
  const paymentTerms = termsPayload(termRows);
  const today = new Date().toISOString().slice(0, 10);
  const [localError, setLocalError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const uploadProgress = useUploadStagedFiles(state.createdId, files, "offer-created");

  const [taxRateValue, setTaxRateValue] = useState(String(Number(initial?.taxRate ?? defaultTaxRate)));

  const taxRate = Number(taxRateValue);
  const [discountType, setDiscountType] = useState<"" | DiscountType>("");
  const [discountValue, setDiscountValue] = useState("");
  const projectName = project?.name ?? "";

  const priced = useMemo(() => priceLines(lines), [lines]);

  const totals = useMemo(() => {
    const price = priceOffer(priced, taxRate, discountType ? { type: discountType, value: Number(discountValue) } : null);
    return { gross: price.gross, discount: price.discountAmount, subtotal: price.subtotal, tax: price.taxAmount, total: price.total };
  }, [priced, taxRate, discountType, discountValue]);

  const payload = linesPayload(lines);

  function openPreview() {
    if (!projectId) return setLocalError("Избери обект.");
    if (title.trim().length < 3) return setLocalError("Добави кратко заглавие.");
    if (description.trim().length < 5) return setLocalError("Опиши работата.");
    if (!deadline) return setLocalError("Посочи договорен краен срок.");
    if (!payload.length) return setLocalError("Добави поне една услуга или материал.");
    if (payload.some((line) => line.description.length < 2)) {
      return setLocalError("Добави описание на всяка услуга и материал.");
    }
    if (payload.some((line) => line.quantity <= 0)) {
      return setLocalError("Количеството трябва да е над 0.");
    }
    const termsError = termsProblem(termRows);
    if (termsError) return setLocalError(termsError);
    setLocalError("");
    setStep("preview");
  }

  const error = localError || state.error;
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <div>
      {initial ? <p className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">Попълнено от <span className="font-semibold">{initial.source}</span>. Провери обекта, цените и срока, преди да продължиш.</p> : null}
      <ol className="mb-4 flex items-center gap-2 text-sm">
        <li className={step === "edit" ? "font-semibold" : "text-muted-foreground"}>
          1. Оферта
        </li>
        <li aria-hidden className="h-px w-8 bg-border" />
        <li
          className={
            step === "preview" ? "font-semibold" : "text-muted-foreground"
          }
        >
          2. Преглед
        </li>
      </ol>

      {step === "edit" ? (
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-5">
        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="block text-sm">
                <label htmlFor="projectId" className="mb-1.5 block font-medium">
                  Обект
                </label>
                <ProjectCombobox
                  id="projectId"
                  defaultValue={project}
                  placeholder="Избери обект"
                  isRequired
                  activeOnly
                  inputClassName="h-10"
                  onChange={setProject}
                />
              </div>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Заглавие</span>
                <Input
                  value={title}
                  required
                  placeholder="Какво предлагаш"
                  className="h-10"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
            </div>
            <label className="mt-3 block text-sm">
              <span className="mb-1.5 block font-medium">Обхват</span>
              <Textarea
                value={description}
                required
                placeholder="Какво включва работата и какво остава извън нея."
                className="min-h-20"
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </section>

          <LineItemsEditor lines={lines} setLines={setLines} catalog={catalog} canSaveCatalog={canSaveCatalog} />

          <section className="grid gap-4 rounded-2xl border bg-card p-4 md:grid-cols-2 md:gap-6">
            <VatRateField value={taxRateValue} onChange={setTaxRateValue} />
            <DiscountField defaultType={discountType} defaultValue={discountValue} onChange={(type, value) => { setDiscountType(type); setDiscountValue(value); }} />
          </section>

          <label className="block rounded-2xl border bg-card p-4 text-sm font-medium">Договорен краен срок
            <div className="mt-2"><DatePicker aria-label="Договорен краен срок" required value={deadline} onChange={setDeadline} /></div>
          </label>

          <section className="rounded-2xl border bg-card p-4">
            <p className="mb-2 text-sm font-medium">Ориентировъчен график <span className="font-normal text-muted-foreground">(по желание)</span></p>
            <ScheduleEditor rows={scheduleRows} setRows={setScheduleRows} deadline={deadline} today={today} />
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <p className="mb-2 text-sm font-medium">Плащане <span className="font-normal text-muted-foreground">(по желание)</span></p>
            <PaymentTermsEditor rows={termRows} setRows={setTermRows} total={totals.total} stages={schedule.map((line) => line.title)} />
          </section>

          <StagedAttachments files={files} onChange={setFiles} />
        </div>

        <aside className="mt-4 rounded-2xl border bg-card p-4 lg:sticky lg:top-20 lg:mt-0">
          <p className="text-sm font-semibold">Сметка</p>
          <dl className="mt-3 space-y-2 text-sm">
            {totals.discount ? <>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Сума без отстъпка</dt>
                <dd className="tabular-nums">{formatMoney(totals.gross)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-primary">
                <dt>{discountLabel(discountType || null, discountValue)}</dt>
                <dd className="tabular-nums">−{formatMoney(totals.discount)}</dd>
              </div>
            </> : null}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Без ДДС</dt>
              <dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{vatLabel(taxRate)}</dt>
              <dd className="tabular-nums">{formatMoney(totals.tax)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t pt-2 text-base font-semibold">
              <dt>Общо</dt>
              <dd className="tabular-nums">{formatMoney(totals.total)} EUR</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            {deadline ? `Срок до ${deadline}` : "Посочи договорен краен срок"}
          </p>
        </aside>
      </div>
      ) : null}

      {step === "preview" ? (
        <form action={action}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="description" value={description} />
        <input type="hidden" name="lines" value={JSON.stringify(payload)} />
        <input type="hidden" name="taxRate" value={taxRateValue} />
        <input type="hidden" name="discountType" value={discountType} />
        <input type="hidden" name="discountValue" value={discountType ? discountValue : ""} />
        <input type="hidden" name="scheduleImpactType" value="none" />
        <input type="hidden" name="agreedDeadline" value={deadline} />
        <input type="hidden" name="schedule" value={JSON.stringify(schedule)} />
        <input type="hidden" name="paymentTerms" value={JSON.stringify(paymentTerms)} />
        {files.length ? <input type="hidden" name="hasAttachments" value="1" /> : null}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-5">
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-dashed border-primary/40 px-4 py-3">
              <p className="font-mono text-xs tracking-wide text-primary uppercase">Чернова · {projectName}</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Така ще я види клиентът. Докато не я изпратиш, само ти я виждаш.</p>
            </div>
            <DocumentBody document={{
              documentKind: "offer",
              description,
              reason: null,
              clientNote: null,
              subtotal: totals.subtotal.toFixed(2),
              discountAmount: totals.discount ? totals.discount.toFixed(2) : null,
              discountType: discountType || null,
              discountValue: discountType ? discountValue : null,
              taxRate: taxRateValue,
              total: totals.total.toFixed(2),
              lineItems: priced.filter((line) => line.description.trim()).map((line) => ({ id: line.key, description: line.description, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice, lineTotal: line.lineTotal })),
              schedule,
              agreedDeadline: deadline || null,
              paymentTerms: paymentTerms.map((term) => ({ ...term, dueOn: term.dueOn ?? null, stageTitle: term.stage ? schedule[term.stage - 1]?.title ?? null : null })),
            }} />
          </div>
          <aside className="mt-3 space-y-3 rounded-2xl bg-sidebar p-5 text-sidebar-foreground lg:sticky lg:top-4 lg:mt-0">
            <div>
              <p className="text-xs text-sidebar-foreground/70">{taxRate ? `Общо с ${vatLabel(taxRate)}` : "Общо, без ДДС"}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(totals.total)} <span className="text-base text-sidebar-foreground/70">EUR</span></p>
            </div>
            <p className="border-t border-sidebar-border pt-3 text-sm">Срок <strong>до {formatDay(deadline)}</strong></p>
            {paymentTerms.length ? <p className="text-sm text-sidebar-foreground/80">{paymentTerms.length === 1 ? "1 плащане" : `${paymentTerms.length} плащания`}{schedule.length ? ` · ${schedule.length === 1 ? "1 етап" : `${schedule.length} етапа`}` : ""}</p> : schedule.length ? <p className="text-sm text-sidebar-foreground/80">{schedule.length === 1 ? "1 етап" : `${schedule.length} етапа`}</p> : null}
            {files.length ? <p className="text-sm text-sidebar-foreground/80">{files.length === 1 ? "1 прикачен файл" : `${files.length} прикачени файла`}</p> : null}
          </aside>
        </div>
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <div className="sticky bottom-20 z-20 mt-4 flex items-center justify-between gap-2 border-t bg-background/95 py-3 backdrop-blur lg:bottom-0">
          <Button type="button" variant="ghost" className="h-11 gap-2 px-3" onPress={() => setStep("edit")}>
            <Pencil className="size-4" /> Редакция
          </Button>
          <Button type="submit" isDisabled={pending || !!state.createdId} className="h-11 px-6 font-semibold">
            {uploadProgress ? `Качване на файлове ${uploadProgress.done + 1}/${uploadProgress.total}…` : pending || state.createdId ? "Запазване…" : "Създай черновата"}
          </Button>
        </div>
        </form>
      ) : (
        <>
          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <div className="sticky bottom-20 z-20 mt-4 border-t bg-background/95 py-3 backdrop-blur lg:bottom-0">
            <Button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
              onPress={openPreview}
            >
              Преглед
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
