"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Download, EllipsisVertical, Pencil, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { startDownload } from "@/components/workspace/download-tray";
import { anonymizeClientAction, setClientArchivedAction, updateClientAction } from "@/modules/clients/actions";

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null; notes: string | null; archivedAt: Date | null };

type MenuId = "archive" | "export" | "anonymize";

/**
 * Edit stays a button. Archive, export and anonymize sit in one menu.
 */
export function ClientActions({ client, canEdit, canArchive, emailLocked, hasActiveProject = false }: {
  client: Client;
  canEdit: boolean;
  canArchive: boolean;
  /** Anonymizing waits until no project of the client is active. */
  hasActiveProject?: boolean;
  /** The client confirmed the email in the portal; only they can change it. */
  emailLocked: boolean;
}) {
  const [open, setOpen] = useState<"edit" | Exclude<MenuId, "export"> | null>(null);
  const close = () => setOpen(null);
  const archive = client.archivedAt
    ? { label: "Върни от архива", icon: ArchiveRestore, title: "Да върна ли клиента от архива?", description: "Клиентът отново се появява в търсенето при нов обект.", confirm: "Върни", archived: "false", success: "Клиентът е върнат" }
    : { label: "Архивирай", icon: Archive, title: "Да архивирам ли клиента?", description: "Изчезва от търсенето при нов обект. Обектите и историята му остават. Възможно е само когато няма активен обект.", confirm: "Архивирай", archived: "true", success: "Клиентът е архивиран" };

  const menu: { id: MenuId; label: string; icon: typeof Archive; destructive?: boolean }[] = canArchive
    ? [
        { id: "archive", label: archive.label, icon: archive.icon },
        { id: "export", label: "Изтегли данните", icon: Download },
        ...(!hasActiveProject ? [{ id: "anonymize" as const, label: "Анонимизирай", icon: UserX, destructive: true }] : []),
      ]
    : [];
  if (!canEdit && !menu.length) return null;

  function onAction(key: string | number) {
    if (key === "export") {
      startDownload({ href: `/api/clients/${client.id}/export`, label: `${client.name} · данни` });
      return;
    }
    setOpen(key as "archive" | "anonymize");
  }

  const regular = menu.filter((item) => !item.destructive);
  const destructive = menu.filter((item) => item.destructive);

  return (
    <div className="flex items-center gap-2">
      {canEdit ? (
        <Button type="button" variant="outline" className="h-10 gap-1.5 rounded-xl bg-card px-3" onPress={() => setOpen("edit")}>
          <Pencil className="size-4" /> Редактирай
        </Button>
      ) : null}
      {menu.length ? (
        <DropdownMenuTrigger>
          <Button type="button" variant="outline" size="icon" className="size-10 rounded-xl bg-card" aria-label="Още действия за клиента">
            <EllipsisVertical className="size-4" />
          </Button>
          <DropdownMenu placement="bottom end" onAction={onAction} className="min-w-56">
            {regular.map((item) => (
              <DropdownMenuItem key={item.id} id={item.id} textValue={item.label} className="min-h-11 gap-2">
                <item.icon className="size-4" /> {item.label}
              </DropdownMenuItem>
            ))}
            {destructive.length ? <DropdownMenuSeparator /> : null}
            {destructive.map((item) => (
              <DropdownMenuItem key={item.id} id={item.id} variant="destructive" textValue={item.label} className="min-h-11 gap-2">
                <item.icon className="size-4" /> {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>
        </DropdownMenuTrigger>
      ) : null}

      {canEdit ? (
        <Dialog isOpen={open === "edit"} onOpenChange={(value) => !value && close()} className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Данни на клиента</DialogTitle>
            <DialogDescription>Промените влизат във всички негови обекти.</DialogDescription>
          </DialogHeader>
          <ActionForm action={updateClientAction} success="Клиентът е записан" onSuccess={close} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="clientId" value={client.id} />
            <Field className="sm:col-span-2"><FieldLabel htmlFor="client-name">Име</FieldLabel><Input id="client-name" name="name" required minLength={2} maxLength={160} defaultValue={client.name} className="h-11" /></Field>
            <Field><FieldLabel htmlFor="client-phone">Телефон</FieldLabel><Input id="client-phone" name="phone" type="tel" maxLength={40} defaultValue={client.phone ?? ""} className="h-11" /></Field>
            {emailLocked ? (
              <Field><FieldLabel htmlFor="client-email">Имейл</FieldLabel><Input id="client-email" value={client.email ?? ""} readOnly disabled className="h-11" /><FieldDescription>Потвърден от клиента. Само той може да го смени.</FieldDescription></Field>
            ) : (
              <Field><FieldLabel htmlFor="client-email">Имейл</FieldLabel><Input id="client-email" name="email" type="email" defaultValue={client.email ?? ""} className="h-11" /></Field>
            )}
            <Field className="sm:col-span-2"><FieldLabel htmlFor="client-address">Адрес за кореспонденция</FieldLabel><Input id="client-address" name="address" maxLength={300} defaultValue={client.address ?? ""} className="h-11" /><FieldDescription>По желание. Адресите на обектите са в самите обекти.</FieldDescription></Field>
            <Field className="sm:col-span-2"><FieldLabel htmlFor="client-notes">Бележка</FieldLabel><Textarea id="client-notes" name="notes" maxLength={2000} rows={3} defaultValue={client.notes ?? ""} placeholder="Вижда се само от екипа" /></Field>
            <div className="flex justify-end gap-2 sm:col-span-2"><DialogClose>Отказ</DialogClose><ActionSubmit>Запази</ActionSubmit></div>
          </ActionForm>
        </Dialog>
      ) : null}

      {canArchive ? (
        <Dialog isOpen={open === "archive"} onOpenChange={(value) => !value && close()} role="alertdialog" isDismissable={false} showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{archive.title}</DialogTitle>
            <DialogDescription>{archive.description}</DialogDescription>
          </DialogHeader>
          <ActionForm action={setClientArchivedAction} success={archive.success} onSuccess={close} className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <input type="hidden" name="clientId" value={client.id} />
            <input type="hidden" name="archived" value={archive.archived} />
            <DialogClose>Отказ</DialogClose>
            <ActionSubmit>{archive.confirm}</ActionSubmit>
          </ActionForm>
        </Dialog>
      ) : null}

      {canArchive && !hasActiveProject ? (
        <Dialog isOpen={open === "anonymize"} onOpenChange={(value) => !value && close()} role="alertdialog" isDismissable={false} showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Да анонимизирам ли клиента?</DialogTitle>
            <DialogDescription>Името, имейлът, телефонът и бележките се изтриват от клиента и от всички обекти, а линковете му спират. Решенията остават с името и имейла, с които са взети. Това не може да се върне.</DialogDescription>
          </DialogHeader>
          <ActionForm action={anonymizeClientAction} success="Клиентът е анонимизиран" onSuccess={close} className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <input type="hidden" name="clientId" value={client.id} />
            <DialogClose>Отказ</DialogClose>
            <ActionSubmit variant="destructive">Анонимизирай</ActionSubmit>
          </ActionForm>
        </Dialog>
      ) : null}
    </div>
  );
}
