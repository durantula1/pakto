"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, LoaderCircle, TriangleAlert } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { DownloadLink, useDownloading } from "@/components/workspace/download-tray";
import { cn } from "@/lib/utils";
import type { AccountDeletionPlan, Blocker } from "@/modules/account/queries";
import {
  acceptLegalDocumentsAction, cancelAccountDeletionAction, changeEmailAction, changePasswordAction, leaveOrganizationAction, requestAccountDeletionAction, signOutEverywhereAction,
} from "@/modules/account/actions";

/** Explains why the button above is disabled and links to the fix, when there is one. */
function BlockerNote({ blocker }: { blocker: Blocker }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p>
        {blocker.message}
        {blocker.href ? <> <Link href={blocker.href} className="font-medium text-foreground underline underline-offset-4">{blocker.cta ?? "Отвори"}</Link></> : null}
      </p>
    </div>
  );
}

/** A download link styled as a button; the tray shows while the export is being put together. */
export function ExportDataLink({ href = "/api/account/export", label = "Изтегли данните (JSON)", fileLabel = "Твоите данни · JSON" }: { href?: string; label?: string; fileLabel?: string }) {
  const busy = useDownloading(href);
  return (
    <DownloadLink href={href} label={fileLabel} className={cn(buttonVariants({ variant: "outline" }), "h-9 gap-2")}>
      {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />} {label}
    </DownloadLink>
  );
}

export function SignOutEverywhereDialog() {
  return (
    <DialogTrigger>
      <Button type="button" variant="outline" className="h-9">Излез навсякъде</Button>
      <Dialog>
        <DialogHeader>
          <DialogTitle>Изход от всички устройства?</DialogTitle>
          <DialogDescription>Ще излезеш и от това устройство. После влизаш отново с имейла и паролата си.</DialogDescription>
        </DialogHeader>
        <ActionForm action={signOutEverywhereAction} success="" redirects className="flex justify-end">
          <ActionSubmit>Излез навсякъде</ActionSubmit>
        </ActionForm>
      </Dialog>
    </DialogTrigger>
  );
}

export function LeaveOrganizationDialog({ organizationName, blocker }: { organizationName: string; blocker: Blocker | null }) {
  return (
    <div className="grid justify-items-start gap-0 @xl:justify-items-end">
      <DialogTrigger>
        <Button type="button" variant="destructive" className="h-9" isDisabled={!!blocker}>Напусни</Button>
        <Dialog>
          <DialogHeader>
            <DialogTitle>Да напуснеш „{organizationName}“?</DialogTitle>
            <DialogDescription>
              Губиш достъп до обектите и офертите веднага. Собствениците ще получат известие.
              Профилът ти остава и може да бъдеш поканен отново.
            </DialogDescription>
          </DialogHeader>
          <ActionForm action={leaveOrganizationAction} success="" redirects className="flex justify-end">
            <ActionSubmit variant="destructive">Напусни</ActionSubmit>
          </ActionForm>
        </Dialog>
      </DialogTrigger>
      {blocker ? <BlockerNote blocker={blocker} /> : null}
    </div>
  );
}

export function DeleteAccountDialog({ plan, graceDays, hasPassword }: { plan: AccountDeletionPlan; graceDays: number; /** An account made with Google has none: typing ИЗТРИЙ is the confirmation. */ hasPassword: boolean }) {
  const company = plan.kind === "account_and_company" ? plan.organizationName : null;
  return (
    <div className="grid justify-items-start gap-0 @xl:justify-items-end">
      <DialogTrigger>
        <Button type="button" variant="destructive" className="h-9" isDisabled={plan.kind === "blocked"}>Изтрий</Button>
        <Dialog className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{company ? "Изтриване на профила и фирмата" : "Изтриване на профила"}</DialogTitle>
            <DialogDescription>
              {company
                ? <>Ти си единственият член на „{company}“. Заедно с профила ще изтрием фирмата, всички обекти, оферти, плащания и клиентски линкове.</>
                : "Ще излезеш от всички устройства."}{" "}
              Изтриването става след {graceDays} дни. Дотогава можеш да влезеш и да го отмениш.
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Излизаш от всички устройства веднага.</li>
            {company ? <li>Клиентските линкове спират да работят след изтриването.</li> : <>
              <li>Изтриваме имейла, телефона и паролата ти.</li>
              <li>Офертите, които си създал, остават във фирмата. Там ще се показваш като „Изтрит потребител“.</li>
            </>}
          </ul>
          {company ? (
            <p className="rounded-xl bg-muted px-3 py-2.5 text-sm">
              Първо <DownloadLink href="/api/organization/export" label="Данните на фирмата · JSON" className="font-medium underline underline-offset-4">изтегли данните на фирмата</DownloadLink>. Може да ти трябват за счетоводството.
            </p>
          ) : null}
          <ActionForm action={requestAccountDeletionAction} success="" redirects className="grid gap-4">
            {hasPassword ? (
              <Field>
                <FieldLabel htmlFor="delete-password">Парола</FieldLabel>
                <Input id="delete-password" name="password" type="password" autoComplete="current-password" required className="h-10" />
              </Field>
            ) : null}
            {company ? (
              <Field>
                <FieldLabel htmlFor="delete-company">Напиши името на фирмата</FieldLabel>
                <Input id="delete-company" name="organizationName" autoComplete="off" required placeholder={company} className="h-10" />
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="delete-confirmation">Напиши ИЗТРИЙ</FieldLabel>
              <Input id="delete-confirmation" name="confirmation" autoComplete="off" required className="h-10" />
              <FieldDescription>Така няма да изтриеш нищо по невнимание.</FieldDescription>
            </Field>
            <ActionSubmit variant="destructive" className="h-10">Изтрий след {graceDays} дни</ActionSubmit>
          </ActionForm>
        </Dialog>
      </DialogTrigger>
      {plan.kind === "blocked" ? <BlockerNote blocker={plan} /> : null}
    </div>
  );
}

export function DeletionPendingBanner({ deleteOn, companyName }: { deleteOn: string; companyName?: string | null }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">
        <span className="font-semibold text-destructive">{companyName ? `Профилът ти и фирмата „${companyName}“ ще бъдат изтрити на ${deleteOn}.` : `Профилът ти ще бъде изтрит на ${deleteOn}.`}</span>{" "}
        <span className="text-muted-foreground">Докато не отмениш, можеш да работиш както обикновено.</span>
      </p>
      <ActionForm action={cancelAccountDeletionAction} success="Изтриването е отменено" className="shrink-0">
        <ActionSubmit variant="outline" className="h-10">Отмени изтриването</ActionSubmit>
      </ActionForm>
    </div>
  );
}

/** Shown on every workspace page until the current terms and privacy policy are accepted (accounts made without the sign-up form, or after a new version). */
export function ConsentBanner() {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">
        <span className="font-semibold">Потвърди текущите условия.</span>{" "}
        <span className="text-muted-foreground">Прочети <a href="/terms" target="_blank" className="underline underline-offset-4">Условията за ползване</a> и <a href="/privacy" target="_blank" className="underline underline-offset-4">Политиката за поверителност</a> и ги приеми, за да продължиш спокойно.</span>
      </p>
      <ActionForm action={acceptLegalDocumentsAction} success="Записахме съгласието ти" className="shrink-0">
        <ActionSubmit className="h-10">Приемам</ActionSubmit>
      </ActionForm>
    </div>
  );
}

/** Opens on "Смени" next to the current email; the change waits for the link in the new inbox. */
export function ChangeEmailDialog() {
  const [open, setOpen] = useState(false);
  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" className="h-9">Смени</Button>
      <Dialog>
        <DialogHeader>
          <DialogTitle>Нов имейл за вход</DialogTitle>
          <DialogDescription>Ще изпратим линк на новия адрес. Смяната важи, след като го отвориш.</DialogDescription>
        </DialogHeader>
        <ActionForm action={changeEmailAction} success="Изпратихме линк за потвърждение" onSuccess={() => setOpen(false)} className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="profile-email">Нов имейл</FieldLabel>
            <Input id="profile-email" name="email" type="email" required autoComplete="email" autoFocus className="h-10" />
          </Field>
          <ActionSubmit className="h-10">Изпрати линк</ActionSubmit>
        </ActionForm>
      </Dialog>
    </DialogTrigger>
  );
}

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" className="h-9">Смени</Button>
      <Dialog>
        <DialogHeader>
          <DialogTitle>Смяна на паролата</DialogTitle>
          <DialogDescription>Поне 8 символа. Другите устройства остават влезли, докато не излезеш от тях.</DialogDescription>
        </DialogHeader>
        <ActionForm action={changePasswordAction} success="Паролата е сменена" onSuccess={() => setOpen(false)} className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="current-password">Текуща парола</FieldLabel>
            <Input id="current-password" name="currentPassword" type="password" required autoComplete="current-password" autoFocus className="h-10" />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-password">Нова парола</FieldLabel>
            <Input id="new-password" name="password" type="password" required minLength={8} autoComplete="new-password" className="h-10" />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-password">Повтори новата парола</FieldLabel>
            <Input id="confirm-password" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className="h-10" />
          </Field>
          <ActionSubmit className="h-10">Смени паролата</ActionSubmit>
        </ActionForm>
      </Dialog>
    </DialogTrigger>
  );
}
