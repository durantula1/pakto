"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { segmentClassName, segmentGroupClassName } from "@/components/workspace/segmented";
import { ClientCombobox } from "@/components/clients/client-combobox";
import type { ClientOption } from "@/modules/clients/queries";
import { createProjectAction } from "@/modules/projects/actions";

/**
 * One column, so it reads the same in the side panel and on the fallback page. The client is picked
 * from existing ones or entered as new; `defaultClient` comes from a client's card.
 */
export function NewProjectForm({ defaultClient = null }: { defaultClient?: ClientOption | null }) {
  const [mode, setMode] = useState<"new" | "existing">(defaultClient ? "existing" : "new");
  return (
    <ActionForm action={createProjectAction} success="Обектът е създаден" redirects className="grid gap-5">
      <Field>
        <FieldLabel htmlFor="project-name">Име на обекта</FieldLabel>
        <Input id="project-name" name="name" required autoFocus className="h-11" placeholder="Апартамент Иванови" />
      </Field>
      <Field>
        <FieldLabel htmlFor="project-address">Адрес</FieldLabel>
        <Input id="project-address" name="siteAddress" required className="h-11" placeholder="гр. София, ул. …" />
      </Field>
      <Field>
        <FieldLabel htmlFor="project-reference">Референция</FieldLabel>
        <Input id="project-reference" name="reference" className="h-11" placeholder="OBJ-2026-04" />
        <FieldDescription>По желание. Твой вътрешен номер или код.</FieldDescription>
      </Field>

      <div className="border-t pt-5">
        <p className="font-medium">Клиент, който одобрява</p>
        <p className="text-sm text-muted-foreground">Получава защитен линк към офертите, без да създава акаунт.</p>
      </div>
      <div role="radiogroup" aria-label="Клиент" className={segmentGroupClassName}>
        <label className={segmentClassName}><input type="radio" name="clientMode" value="new" checked={mode === "new"} onChange={() => setMode("new")} className="sr-only" />Нов клиент</label>
        <label className={segmentClassName}><input type="radio" name="clientMode" value="existing" checked={mode === "existing"} onChange={() => setMode("existing")} className="sr-only" />Съществуващ клиент</label>
      </div>
      {mode === "existing" ? (
        <Field>
          <FieldLabel htmlFor="client-id">Клиент</FieldLabel>
          <ClientCombobox name="clientId" id="client-id" defaultValue={defaultClient} isRequired />
          <FieldDescription>Данните му се попълват от картата на клиента.</FieldDescription>
        </Field>
      ) : (
        <>
          <Field>
            <FieldLabel htmlFor="contact-name">Име</FieldLabel>
            <Input id="contact-name" name="contactName" required autoComplete="off" className="h-11" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="contact-email">Имейл</FieldLabel>
              <Input id="contact-email" name="contactEmail" type="email" autoComplete="off" className="h-11" />
            </Field>
            <Field>
              <FieldLabel htmlFor="contact-phone">Телефон</FieldLabel>
              <Input id="contact-phone" name="contactPhone" type="tel" autoComplete="off" className="h-11" />
            </Field>
          </div>
        </>
      )}
      <ActionSubmit className="h-11">Създай обекта</ActionSubmit>
    </ActionForm>
  );
}

const projectSheetClassName = "w-full overflow-y-auto sm:max-w-md data-[side=right]:sm:max-w-md";

function NewProjectPanel({ defaultClient = null }: { defaultClient?: ClientOption | null }) {
  return (
    <>
      <SheetHeader className="px-6 pt-6">
        <SheetTitle className="text-lg font-semibold">Нов обект</SheetTitle>
        <SheetDescription>Добави мястото и човека, който одобрява.</SheetDescription>
      </SheetHeader>
      <div className="px-6 pb-8">
        <NewProjectForm defaultClient={defaultClient} />
      </div>
    </>
  );
}

/** "Нов обект" opens a panel over the list instead of a separate page. */
export function NewProjectSheet({ defaultClient = null, label = "Нов обект" }: { defaultClient?: ClientOption | null; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <SheetTrigger isOpen={open} onOpenChange={setOpen}>
      <Button type="button" className="min-h-10 gap-2 rounded-xl px-4 font-semibold">
        <Plus className="size-4" /> {label}
      </Button>
      <SheetContent side="right" className={projectSheetClassName}>
        <NewProjectPanel defaultClient={defaultClient} />
      </SheetContent>
    </SheetTrigger>
  );
}

/** The same panel, opened from somewhere that is not a button (the command palette). */
export function NewProjectSheetControlled({ open, onOpenChange, defaultClient = null }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClient?: ClientOption | null;
}) {
  return (
    <SheetContent side="right" isOpen={open} onOpenChange={onOpenChange} className={projectSheetClassName}>
      <NewProjectPanel defaultClient={defaultClient} />
    </SheetContent>
  );
}
