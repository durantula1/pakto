"use client";

import { useState } from "react";
import { EllipsisVertical, KeyRound, Mail, Pencil, Phone, Plus, ShieldCheck, ShieldOff, UserCheck, UserMinus, UserRound, Users } from "lucide-react";

import { contactRoleHint, contactRoleLabel } from "@/components/projects/contact-role";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { dateWithTime } from "@/lib/dates";

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

const dateTime = dateWithTime;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]![0] : "")).toUpperCase() || "?";
}

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
          <DialogDescription>Всеки контакт има свой линк. Одобрява само един; останалите виждат всичко, без да решават. Наблюдателите не получават имейл: прати им линка сам.</DialogDescription>
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
                <label className={segmentClassName}><input type="radio" name="viewerMode" checked={viewerMode === "new"} onChange={() => setViewerMode("new")} aria-label="Нов човек" className="sr-only" />Нов човек</label>
                <label className={segmentClassName}><input type="radio" name="viewerMode" checked={viewerMode === "existing"} onChange={() => setViewerMode("existing")} aria-label="От клиентите" className="sr-only" />От клиентите</label>
              </div>
            </div>
            {viewerMode === "existing" ? (
              <Field className="sm:col-span-2"><FieldLabel htmlFor="viewer-client">Клиент</FieldLabel><ClientCombobox name="clientId" id="viewer-client" isRequired excludeProjectId={projectId} /></Field>
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
          <Button type="button" variant="ghost" className="h-12 w-full border border-dashed border-foreground/20 text-muted-foreground hover:border-foreground/35 hover:text-foreground" onPress={() => setAdding(true)}><Plus data-icon="inline-start" />Добави наблюдател</Button>
        ) : null}
        <div className="flex justify-end"><DialogClose>Затвори</DialogClose></div>
      </Dialog>
    </DialogTrigger>
  );
}

type Confirm = "approver" | "rotate" | "reset" | "remove";

/**
 * One person with access: who they are and their state on top, then the link to copy (the reason the
 * dialog is opened) and "Редактирай". The rare and risky actions sit in the "⋯" menu, each behind a confirmation.
 */
function ContactCard({ projectId, contact, canEdit, isOwner }: { projectId: string; contact: AccessContact; canEdit: boolean; isOwner: boolean }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const fields = { projectId, contactId: contact.id };
  const menu = [
    canEdit && !contact.isPrimary ? { id: "approver", label: "Направи одобряващ", icon: UserCheck } : null,
    canEdit && isOwner && contact.link ? { id: "rotate", label: "Смени линка", icon: KeyRound } : null,
    canEdit && isOwner && contact.emailVerifiedAt ? { id: "reset", label: "Отмени потвърждението", icon: ShieldOff } : null,
  ].filter((item) => item !== null);
  const removable = canEdit && !contact.isPrimary;
  const dialog = (id: Confirm) => ({ isOpen: confirm === id, onOpenChange: (open: boolean) => setConfirm(open ? id : null), fields });
  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary-ink">{initials(contact.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-medium">{contact.name}</p>
            <Badge variant="outline" title={contactRoleHint(contact.isPrimary)}>{contactRoleLabel(contact.isPrimary)}</Badge>
            {contact.emailVerifiedAt ? <Badge variant="success-soft"><ShieldCheck className="size-3" />Имейлът е потвърден</Badge> : <Badge variant="warning-soft">Непотвърден</Badge>}
          </div>
          <div className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
            {contact.email ? <span className="flex min-w-0 items-center gap-1.5"><Mail className="size-3.5 shrink-0" /><span className="truncate">{contact.email}</span></span> : <span className="text-xs">Без имейл: клиентът ще го въведе при първото отваряне</span>}
            {contact.phone ? <span className="flex items-center gap-1.5"><Phone className="size-3.5" />{contact.phone}</span> : null}
            <span className="text-xs">{contact.lastSeenAt ? `Последно в портала: ${dateTime.format(contact.lastSeenAt)}` : "Още не е отварял портала"}</span>
          </div>
        </div>
      </div>

      {editing ? (
        <ActionForm action={updateContactAction} success="Контактът е записан" onSuccess={() => setEditing(false)} className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="contactId" value={contact.id} />
          <Field><FieldLabel htmlFor={`contact-name-${contact.id}`}>Име</FieldLabel><Input id={`contact-name-${contact.id}`} name="name" required minLength={2} maxLength={160} defaultValue={contact.name} autoFocus /></Field>
          <Field><FieldLabel htmlFor={`contact-phone-${contact.id}`}>Телефон</FieldLabel><Input id={`contact-phone-${contact.id}`} name="phone" maxLength={40} defaultValue={contact.phone ?? ""} /></Field>
          {contact.emailVerifiedAt ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">Имейлът е потвърден от клиента. Само той може да го смени от портала{isOwner ? ", или ти с „Отмени потвърждението“ от менюто" : ""}.</p>
          ) : (
            <Field className="sm:col-span-2"><FieldLabel htmlFor={`contact-email-${contact.id}`}>Имейл</FieldLabel><Input id={`contact-email-${contact.id}`} name="email" type="email" defaultValue={contact.email ?? ""} /></Field>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onPress={() => setEditing(false)}>Отказ</Button><ActionSubmit>Запази</ActionSubmit></div>
        </ActionForm>
      ) : (
        <div className="mt-4 flex items-center gap-2">
          {contact.link ? <CopyPortalLink url={contact.link} className="h-9" label="Копирай линка" /> : canEdit ? (
            <ActionForm action={createOrRotatePortalLinkAction} success="Линкът е създаден">
              <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="contactId" value={contact.id} />
              <ActionSubmit className="h-9">Създай линк</ActionSubmit>
            </ActionForm>
          ) : null}
          {canEdit ? <Button type="button" variant="outline" className="h-9" onPress={() => setEditing(true)}><Pencil data-icon="inline-start" />Редактирай</Button> : null}
          {menu.length || removable ? (
            <DropdownMenuTrigger>
              <Button type="button" variant="outline" size="icon" className="ml-auto size-9" aria-label={`Още действия за ${contact.name}`}><EllipsisVertical className="size-4" /></Button>
              <DropdownMenu placement="bottom end" onAction={(key) => setConfirm(key as Confirm)} className="min-w-60">
                {menu.map((item) => (
                  <DropdownMenuItem key={item.id} id={item.id} textValue={item.label} className="min-h-11 gap-2">
                    <item.icon className="size-4" /> {item.label}
                  </DropdownMenuItem>
                ))}
                {removable && menu.length ? <DropdownMenuSeparator /> : null}
                {removable ? (
                  <DropdownMenuItem id="remove" textValue="Премахни" variant="destructive" className="min-h-11 gap-2">
                    <UserMinus className="size-4" /> Премахни
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenu>
            </DropdownMenuTrigger>
          ) : null}
        </div>
      )}

      <ConfirmDialog {...dialog("approver")} title={`Да стане ли ${contact.name} одобряващ?`} description="Решенията по офертите и промените минават към този човек. Досегашният одобряващ остава наблюдател със същия линк." confirmLabel="Направи одобряващ" tone="default" action={makeApproverAction} success="Одобряващият е сменен" />
      <ConfirmDialog {...dialog("rotate")} title="Да сменя ли линка?" description="Старият линк спира да работи веднага. Устройство, на което клиентът е потвърдил имейла си с код, остава влязло; всички други трябва да отворят новия линк, затова го прати." confirmLabel="Смени линка" tone="default" action={createOrRotatePortalLinkAction} fields={{ ...fields, rotate: "true" }} success="Линкът е сменен" />
      <ConfirmDialog {...dialog("reset")} title="Да отменя ли потвърждението на имейла?" description={`Имейлът ${contact.email ?? ""} се изчиства, всички устройства излизат и се създава нов линк. Прати го на правилния човек: той ще потвърди своя имейл.`} confirmLabel="Отмени потвърждението" action={resetContactVerificationAction} success="Потвърждението е отменено" />
      <ConfirmDialog {...dialog("remove")} title={`Да премахна ли ${contact.name}?`} description="Линкът му спира да работи веднага. Историята остава." confirmLabel="Премахни" action={removeContactAction} success="Контактът е премахнат" />
    </li>
  );
}
