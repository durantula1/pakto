"use client";

import { useState } from "react";
import { Mail, Phone, Plus, ShieldCheck, UserRound, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { segmentClassName, segmentGroupClassName } from "@/components/workspace/segmented";
import { ClientCombobox } from "@/components/clients/client-combobox";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { CopyPortalLink } from "@/components/change-orders/copy-portal-link";
import {
  addViewerAction, createOrRotatePortalLinkAction, makeApproverAction, removeContactAction, resetContactVerificationAction, updateContactAction,
} from "@/modules/change-portal/staff-actions";

export type AccessContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "approver" | "viewer";
  isPrimary: boolean;
  emailVerifiedAt: Date | null;
  lastSeenAt: Date | null;
  link: string | null;
};

const dateTime = new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Sofia" });

/**
 * "Достъп на клиента": who follows the project in the portal, who decides, whether they confirmed
 * their email, and each person's own link. The header shows the approver's name as the button.
 */
export function ClientAccess({ projectId, contacts, canEdit, isOwner, defaultOpen = false }: {
  projectId: string;
  contacts: AccessContact[];
  canEdit: boolean;
  isOwner: boolean;
  defaultOpen?: boolean;
}) {
  const approver = contacts.find((contact) => contact.isPrimary) ?? contacts[0];
  const [adding, setAdding] = useState(false);
  const [viewerMode, setViewerMode] = useState<"new" | "existing">("new");
  return (
    <DialogTrigger defaultOpen={defaultOpen}>
      <Button type="button" variant="outline" className="h-8 max-w-56 gap-1.5 bg-card px-2.5">
        {contacts.length > 1 ? <Users className="size-4" /> : <UserRound className="size-4" />}
        <span className="truncate">{approver?.name ?? "Клиент"}</span>
        {approver && !approver.emailVerifiedAt ? <span className="size-2 shrink-0 rounded-full bg-tile-sand-foreground" aria-label="имейлът не е потвърден" /> : null}
      </Button>
      <Dialog className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Достъп на клиента</DialogTitle>
          <DialogDescription>Всеки контакт има свой линк. Одобрява само един; останалите виждат всичко, без да решават.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-3">
          {contacts.map((contact) => <ContactCard key={contact.id} projectId={projectId} contact={contact} canEdit={canEdit} isOwner={isOwner} />)}
        </ul>
        {canEdit ? adding ? (
          <ActionForm action={addViewerAction} success="Контактът е добавен" onSuccess={() => setAdding(false)} className="grid gap-3 rounded-xl border border-dashed p-3 sm:grid-cols-2">
            <input type="hidden" name="projectId" value={projectId} />
            <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
              <p className="text-sm font-medium">Нов наблюдател</p>
              <div role="radiogroup" aria-label="Наблюдател" className={segmentGroupClassName}>
                <label className={segmentClassName}><input type="radio" name="viewerMode" checked={viewerMode === "new"} onChange={() => setViewerMode("new")} className="sr-only" />Нов човек</label>
                <label className={segmentClassName}><input type="radio" name="viewerMode" checked={viewerMode === "existing"} onChange={() => setViewerMode("existing")} className="sr-only" />От клиентите</label>
              </div>
            </div>
            {viewerMode === "existing" ? (
              <Field className="sm:col-span-2"><FieldLabel htmlFor="viewer-client">Клиент</FieldLabel><ClientCombobox name="clientId" id="viewer-client" isRequired /></Field>
            ) : (
              <>
                <Field><FieldLabel htmlFor="viewer-name">Име</FieldLabel><Input id="viewer-name" name="name" required minLength={2} maxLength={160} autoFocus /></Field>
                <Field><FieldLabel htmlFor="viewer-phone">Телефон</FieldLabel><Input id="viewer-phone" name="phone" maxLength={40} /></Field>
                <Field className="sm:col-span-2"><FieldLabel htmlFor="viewer-email">Имейл (по желание)</FieldLabel><Input id="viewer-email" name="email" type="email" /></Field>
              </>
            )}
            <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onPress={() => setAdding(false)}>Отказ</Button><ActionSubmit>Добави</ActionSubmit></div>
          </ActionForm>
        ) : (
          <Button type="button" variant="outline" className="justify-self-start" onPress={() => setAdding(true)}><Plus data-icon="inline-start" />Добави наблюдател</Button>
        ) : null}
        <div className="flex justify-end"><DialogClose>Затвори</DialogClose></div>
      </Dialog>
    </DialogTrigger>
  );
}

function ContactCard({ projectId, contact, canEdit, isOwner }: { projectId: string; contact: AccessContact; canEdit: boolean; isOwner: boolean }) {
  const [editing, setEditing] = useState(false);
  const fields = { projectId, contactId: contact.id };
  return (
    <li className="rounded-xl border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{contact.name}</p>
          <div className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
            {contact.email ? <span className="flex min-w-0 items-center gap-1.5"><Mail className="size-3.5 shrink-0" /><span className="truncate">{contact.email}</span></span> : <span className="text-xs">Без имейл: клиентът ще го въведе при първото отваряне</span>}
            {contact.phone ? <span className="flex items-center gap-1.5"><Phone className="size-3.5" />{contact.phone}</span> : null}
            <span className="text-xs">{contact.lastSeenAt ? `Последно в портала ${dateTime.format(contact.lastSeenAt)}` : "Още не е отварял портала"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={contact.isPrimary ? "info-soft" : "secondary"}>{contact.isPrimary ? "Одобрява" : "Наблюдава"}</Badge>
          {contact.emailVerifiedAt ? <Badge variant="success-soft"><ShieldCheck className="size-3" />Потвърден</Badge> : <Badge variant="warning-soft">Непотвърден</Badge>}
        </div>
      </div>

      {editing ? (
        <ActionForm action={updateContactAction} success="Контактът е записан" onSuccess={() => setEditing(false)} className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="contactId" value={contact.id} />
          <Field><FieldLabel htmlFor={`contact-name-${contact.id}`}>Име</FieldLabel><Input id={`contact-name-${contact.id}`} name="name" required minLength={2} maxLength={160} defaultValue={contact.name} autoFocus /></Field>
          <Field><FieldLabel htmlFor={`contact-phone-${contact.id}`}>Телефон</FieldLabel><Input id={`contact-phone-${contact.id}`} name="phone" maxLength={40} defaultValue={contact.phone ?? ""} /></Field>
          {contact.emailVerifiedAt ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">Имейлът е потвърден от клиента. Само той може да го смени от портала{isOwner ? ", или ти с „Нулирай потвърждението“" : ""}.</p>
          ) : (
            <Field className="sm:col-span-2"><FieldLabel htmlFor={`contact-email-${contact.id}`}>Имейл</FieldLabel><Input id={`contact-email-${contact.id}`} name="email" type="email" defaultValue={contact.email ?? ""} /></Field>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onPress={() => setEditing(false)}>Отказ</Button><ActionSubmit>Запази</ActionSubmit></div>
        </ActionForm>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
          {contact.link ? <CopyPortalLink url={contact.link} variant="outline" className="h-8" label="Копирай линка" /> : canEdit ? (
            <ActionForm action={createOrRotatePortalLinkAction} success="Линкът е създаден">
              <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="contactId" value={contact.id} />
              <ActionSubmit variant="outline" className="h-8">Създай линк</ActionSubmit>
            </ActionForm>
          ) : null}
          {canEdit ? <Button type="button" variant="ghost" size="sm" onPress={() => setEditing(true)}>Редактирай</Button> : null}
          {canEdit && !contact.isPrimary ? <ConfirmDialog trigger={<Button type="button" variant="ghost" size="sm">Направи одобряващ</Button>} title={`${contact.name} да одобрява ли?`} description="Решенията по офертите и промените минават към този човек. Досегашният одобряващ остава наблюдател със същия линк." confirmLabel="Направи одобряващ" tone="default" action={makeApproverAction} fields={fields} success="Одобряващият е сменен" /> : null}
          {canEdit && isOwner && contact.link ? <ConfirmDialog trigger={<Button type="button" variant="ghost" size="sm">Смени линка</Button>} title="Да сменя ли линка?" description="Старият линк спира да работи веднага, включително на устройствата, от които вече е влизано. Ще трябва да пратиш новия." confirmLabel="Смени линка" tone="default" action={createOrRotatePortalLinkAction} fields={{ ...fields, rotate: "true" }} success="Линкът е сменен" /> : null}
          {canEdit && isOwner && contact.emailVerifiedAt ? <ConfirmDialog trigger={<Button type="button" variant="ghost" size="sm">Нулирай потвърждението</Button>} title="Да нулирам ли потвърждението?" description={`Имейлът ${contact.email ?? ""} се изчиства, всички устройства излизат и се създава нов линк. Прати го на правилния човек: той ще потвърди своя имейл.`} confirmLabel="Нулирай" action={resetContactVerificationAction} fields={fields} success="Потвърждението е нулирано" /> : null}
          {canEdit && !contact.isPrimary ? <ConfirmDialog trigger={<Button type="button" variant="ghost" size="sm" className="text-destructive">Премахни</Button>} title={`Да премахна ли ${contact.name}?`} description="Линкът му спира да работи веднага. Историята остава." confirmLabel="Премахни" action={removeContactAction} fields={fields} success="Контактът е премахнат" /> : null}
        </div>
      )}
    </li>
  );
}
