"use client";

import { Archive, ArchiveRestore, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { setClientArchivedAction, updateClientAction } from "@/modules/clients/actions";

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null; notes: string | null; archivedAt: Date | null };

/** "Редактирай" and, for owners, "Архивирай" / "Върни от архива" on the client card. */
export function ClientActions({ client, canEdit, canArchive, emailLocked }: {
  client: Client;
  canEdit: boolean;
  canArchive: boolean;
  /** The client confirmed the email in the portal; only they can change it. */
  emailLocked: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit ? (
        <DialogTrigger>
          <Button type="button" variant="outline" className="h-10 gap-1.5 rounded-xl bg-card px-3"><Pencil className="size-4" /> Редактирай</Button>
          <Dialog className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Данни на клиента</DialogTitle>
              <DialogDescription>Промените влизат във всички негови обекти.</DialogDescription>
            </DialogHeader>
            <ActionForm action={updateClientAction} success="Клиентът е записан" className="grid gap-4 sm:grid-cols-2">
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
        </DialogTrigger>
      ) : null}
      {canArchive ? (
        client.archivedAt ? (
          <ConfirmDialog
            trigger={<Button type="button" variant="ghost" className="h-10 gap-1.5 rounded-xl px-3"><ArchiveRestore className="size-4" /> Върни от архива</Button>}
            title="Да върна ли клиента от архива?"
            description="Клиентът отново се появява в търсенето при нов обект."
            confirmLabel="Върни"
            tone="default"
            action={setClientArchivedAction}
            fields={{ clientId: client.id, archived: "false" }}
            success="Клиентът е върнат"
          />
        ) : (
          <ConfirmDialog
            trigger={<Button type="button" variant="ghost" className="h-10 gap-1.5 rounded-xl px-3"><Archive className="size-4" /> Архивирай</Button>}
            title="Да архивирам ли клиента?"
            description="Изчезва от търсенето при нов обект. Обектите и историята му остават. Възможно е само когато няма активен обект."
            confirmLabel="Архивирай"
            tone="default"
            action={setClientArchivedAction}
            fields={{ clientId: client.id, archived: "true" }}
            success="Клиентът е архивиран"
          />
        )
      ) : null}
    </div>
  );
}
