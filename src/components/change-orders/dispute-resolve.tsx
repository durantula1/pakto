import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { resolveDecisionDisputeAction } from "@/modules/change-portal/staff-actions";

/**
 * Marks a disputed decision as dealt with, with a short note of how. The dispute itself stays in
 * the history; the decision stays in force either way.
 */
export function ResolveDecisionDisputeDialog({ changeOrderId, revisionId }: { changeOrderId: string; revisionId: number }) {
  return <DialogTrigger>
    <Button type="button" variant="outline" size="sm" className="mt-2 bg-card"><Check data-icon="inline-start" />Уредено</Button>
    <Dialog className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Оспорването уредено ли е?</DialogTitle>
        <DialogDescription>Напиши какво сте се разбрали с клиента. Оспорването остава в историята, а банерът става сив. Решението остава в сила; ако не е вярно, анулирай документа и изпрати нов.</DialogDescription>
      </DialogHeader>
      <ActionForm action={resolveDecisionDisputeAction} success="Оспорването е отбелязано като уредено" className="grid gap-3">
        <input type="hidden" name="changeOrderId" value={changeOrderId} />
        <input type="hidden" name="revisionId" value={revisionId} />
        <Field>
          <FieldLabel htmlFor={`dispute-note-${revisionId}`}>Как го уредихте?</FieldLabel>
          <Textarea id={`dispute-note-${revisionId}`} name="note" required minLength={3} maxLength={1000} autoFocus placeholder="Напр. „Говорих с клиента по телефона: решението е взето от съпругата му.“" className="min-h-24" />
        </Field>
        <div className="flex justify-end gap-2"><DialogClose>Отказ</DialogClose><ActionSubmit>Отбележи като уредено</ActionSubmit></div>
      </ActionForm>
    </Dialog>
  </DialogTrigger>;
}
