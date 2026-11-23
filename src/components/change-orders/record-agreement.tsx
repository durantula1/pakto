"use client";

import { useFormStatus } from "react-dom";
import { Handshake } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import {
  segmentClassName,
  segmentGroupClassName,
} from "@/components/workspace/segmented";
import { sofiaTodayIso } from "@/lib/sofia-today";
import {
  recordAgreementAction,
  setDocumentApprovalModeAction,
} from "@/modules/change-orders/actions";
import { agreementMethodLabels } from "@/modules/change-orders/labels";

/**
 * The client agreed outside Pakto: the team records how and when. The version is locked as on
 * sending, and the stages and payment plan start as after the client's approval in the portal.
 */
export function RecordAgreementDialog({
  changeOrderId,
  kind,
  sent,
  primary,
}: {
  changeOrderId: string;
  kind: "offer" | "change";
  /** Already sent: the client had the link but agreed another way. */
  sent: boolean;
  /** The main action of the document (the company records agreements itself). */
  primary: boolean;
}) {
  const noun = kind === "offer" ? "офертата" : "промяната";
  const today = sofiaTodayIso();
  return (
    <DialogTrigger>
      <Button
        type="button"
        variant={primary ? "default" : "outline"}
        className="h-10 w-full gap-2 whitespace-nowrap lg:h-9 lg:w-auto"
      >
        <Handshake className="size-4" />{" "}
        {primary ? "Отбележи като договорено" : "Договорено извън Pakto"}
      </Button>
      <Dialog className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Клиентът съгласи ли се с {noun}?</DialogTitle>
          <DialogDescription>
            {sent
              ? `Ако клиентът се е съгласил по телефона, с подпис или по имейл, отбележи го тук. Линкът за одобрение спира да важи.`
              : `Тази версия се заключва, както при изпращане, и не може да се редактира. Промени се правят с нова версия.`}
            {kind === "offer"
              ? " Етапите и плащанията от офертата се появяват в проекта веднага."
              : " Промяната влиза в сумата на офертата."}
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={recordAgreementAction}
          success="Отбелязано като договорено"
          redirects
          className="grid gap-4"
        >
          <input type="hidden" name="changeOrderId" value={changeOrderId} />
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">
              Как се съгласи клиентът?
            </legend>
            <div
              className={`${segmentGroupClassName} h-auto flex-wrap sm:w-full`}
            >
              {(
                Object.keys(
                  agreementMethodLabels,
                ) as (keyof typeof agreementMethodLabels)[]
              ).map((method, index) => (
                <label key={method} className={`${segmentClassName} h-8`}>
                  <input
                    type="radio"
                    name="method"
                    value={method}
                    defaultChecked={index === 0}
                    required
                    className="sr-only"
                  />
                  {agreementMethodLabels[method]}
                </label>
              ))}
            </div>
          </fieldset>
          <Field>
            <FieldLabel>Кога?</FieldLabel>
            <DatePicker
              name="agreedOn"
              aria-label="Дата на съгласието"
              defaultValue={today}
              max="today"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`agreement-note-${changeOrderId}`}>
              Бележка (по желание)
            </FieldLabel>
            <Textarea
              id={`agreement-note-${changeOrderId}`}
              name="note"
              maxLength={1000}
              placeholder="Напр. „Договор № 14 от 20.11, подписан в офиса.“"
              className="min-h-20"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <DialogClose>Отказ</DialogClose>
            <ActionSubmit>Отбележи като договорено</ActionSubmit>
          </div>
        </ActionForm>
      </Dialog>
    </DialogTrigger>
  );
}

/**
 * How this draft will be confirmed, with a switch for this document only: the company's setting
 * applies unless the document overrides it.
 */
export function ApprovalModeSwitch({
  changeOrderId,
  kind,
  staff,
  overridden,
}: {
  changeOrderId: string;
  kind: "offer" | "change";
  staff: boolean;
  overridden: boolean;
}) {
  const noun = kind === "offer" ? "тази оферта" : "тази промяна";
  return (
    <ActionForm
      action={setDocumentApprovalModeAction}
      success="Записано"
      className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
    >
      <input type="hidden" name="changeOrderId" value={changeOrderId} />
      <input
        type="hidden"
        name="mode"
        value={overridden ? "company" : staff ? "client" : "staff"}
      />
      <span>
        {staff
          ? "Съгласието го отбелязваш ти, без линк за одобрение"
          : "Клиентът одобрява с линк и код от имейла"}
        {overridden ? ` (само за ${noun})` : " (настройка на фирмата)"}.
      </span>
      <LinkSubmit>
        {overridden
          ? "Върни настройката на фирмата"
          : staff
            ? `Изпрати ${noun} за одобрение`
            : "Отбележи съгласието сам"}
      </LinkSubmit>
    </ActionForm>
  );
}

function LinkSubmit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
    >
      {children}
    </button>
  );
}
