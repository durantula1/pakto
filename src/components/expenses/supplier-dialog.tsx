"use client";

import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { createSupplierAction, updateSupplierAction } from "@/modules/expenses/actions";

export type SupplierValues = { id: string; name: string; vatId: string | null; email: string | null; phone: string | null; notes: string | null };

/** One dialog for adding and editing a supplier; pass `supplier` to edit. */
export function SupplierDialog({ supplier }: { supplier?: SupplierValues }) {
  const editing = Boolean(supplier);
  return (
    <DialogTrigger>
      {editing
        ? <Button type="button" variant="outline" size="sm" aria-label={`Редактирай ${supplier!.name}`}><Pencil className="size-3.5" /> Редактирай</Button>
        : <Button type="button" className="min-h-10 gap-2 rounded-xl px-4 font-semibold"><Plus className="size-4" /> Нов доставчик</Button>}
      <Dialog className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Редактирай доставчика" : "Нов доставчик"}</DialogTitle>
          <DialogDescription>Към него можеш да вържеш разходи. Данните не се показват на клиентите.</DialogDescription>
        </DialogHeader>
        <ActionForm action={editing ? updateSupplierAction : createSupplierAction} success={editing ? "Доставчикът е запазен" : "Доставчикът е добавен"} className="grid gap-4 sm:grid-cols-2">
          {supplier ? <input type="hidden" name="supplierId" value={supplier.id} /> : null}
          <Field autoId className="sm:col-span-2"><FieldLabel>Име</FieldLabel><Input name="name" required minLength={2} maxLength={160} defaultValue={supplier?.name ?? ""} autoFocus /></Field>
          <Field autoId><FieldLabel>ЕИК / ИН по ЗДДС</FieldLabel><Input name="vatId" maxLength={30} defaultValue={supplier?.vatId ?? ""} /></Field>
          <Field autoId><FieldLabel>Телефон</FieldLabel><Input name="phone" type="tel" maxLength={40} defaultValue={supplier?.phone ?? ""} /></Field>
          <Field autoId className="sm:col-span-2"><FieldLabel>Имейл</FieldLabel><Input name="email" type="email" maxLength={160} defaultValue={supplier?.email ?? ""} /></Field>
          <Field autoId className="sm:col-span-2"><FieldLabel>Бележка</FieldLabel><Textarea name="notes" maxLength={1000} rows={3} defaultValue={supplier?.notes ?? ""} /><FieldDescription>Например условия за плащане или лице за контакт.</FieldDescription></Field>
          <div className="flex justify-end gap-2 sm:col-span-2"><DialogClose>Отказ</DialogClose><ActionSubmit>{editing ? "Запази" : "Добави доставчика"}</ActionSubmit></div>
        </ActionForm>
      </Dialog>
    </DialogTrigger>
  );
}
