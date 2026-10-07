"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { createClientAction } from "@/modules/clients/actions";

/** „Нов клиент“ on the clients list: the same fields as editing a client; saving opens the new card. */
export function NewClientDialog() {
  return (
    <DialogTrigger>
      <Button type="button" className="min-h-10 gap-2 rounded-xl px-4 font-semibold">
        <Plus className="size-4" /> Нов клиент
      </Button>
      <Dialog className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Нов клиент</DialogTitle>
          <DialogDescription>После от картата му можеш да добавиш обект и да изпратиш оферта.</DialogDescription>
        </DialogHeader>
        <ActionForm action={createClientAction} success="Клиентът е добавен" redirects className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2"><FieldLabel htmlFor="new-client-name">Име</FieldLabel><Input id="new-client-name" name="name" required minLength={2} maxLength={160} autoFocus className="h-11" /></Field>
          <Field><FieldLabel htmlFor="new-client-phone">Телефон</FieldLabel><Input id="new-client-phone" name="phone" type="tel" maxLength={40} className="h-11" /></Field>
          <Field><FieldLabel htmlFor="new-client-email">Имейл</FieldLabel><Input id="new-client-email" name="email" type="email" className="h-11" /></Field>
          <Field className="sm:col-span-2"><FieldLabel htmlFor="new-client-address">Адрес за кореспонденция</FieldLabel><Input id="new-client-address" name="address" maxLength={300} className="h-11" /><FieldDescription>По желание. Адресите на обектите са в самите обекти.</FieldDescription></Field>
          <Field className="sm:col-span-2"><FieldLabel htmlFor="new-client-notes">Бележка</FieldLabel><Textarea id="new-client-notes" name="notes" maxLength={2000} rows={3} placeholder="Вижда се само от екипа" /></Field>
          <div className="flex justify-end gap-2 sm:col-span-2"><DialogClose>Отказ</DialogClose><ActionSubmit>Добави клиента</ActionSubmit></div>
        </ActionForm>
      </Dialog>
    </DialogTrigger>
  );
}
