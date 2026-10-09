"use client";

import { useState, type ReactElement, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";

type ConfirmDialogProps = {
  /** The button that opens the dialog; it must be a pressable `Button`. Omit it to open the dialog from outside (a menu item) with `isOpen`. */
  trigger?: ReactElement;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** The verb on the confirm button, e.g. "Изтрий". */
  confirmLabel: string;
  tone?: "destructive" | "default";
} & (
  | {
    /** A server action, submitted with `fields` as hidden inputs. The dialog closes on success. */
    action: (formData: FormData) => Promise<unknown>;
    fields: Record<string, string>;
    success: string;
    /** The action redirects on success (the next page shows its own notice). */
    redirects?: boolean;
    onConfirm?: never;
  }
  | {
    /** A client handler. Return `false` to keep the dialog open, e.g. after a failure it already reported. */
    onConfirm: () => Promise<boolean | void> | boolean | void;
    action?: never;
    fields?: never;
    success?: never;
    redirects?: never;
  }
);

/** Asks before anything destructive or hard to undo. One pattern for every delete, removal and revoke. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const { trigger, title, description, confirmLabel, tone = "destructive" } = props;
  const [ownOpen, setOwnOpen] = useState(false);
  const isOpen = props.isOpen ?? ownOpen;
  const setOpen = (open: boolean) => (props.onOpenChange ?? setOwnOpen)(open);
  const [pending, setPending] = useState(false);
  const variant = tone === "destructive" ? "destructive" : "default";

  async function confirm() {
    if (!props.onConfirm) return;
    setPending(true);
    try {
      if ((await props.onConfirm()) !== false) setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={(open) => { if (!pending) setOpen(open); }}>
      {trigger}
      <Dialog role="alertdialog" isDismissable={false} showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {props.action ? (
          <ActionForm action={props.action} success={props.success} redirects={props.redirects} className="grid gap-3">
            {Object.entries(props.fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <DialogClose>Отказ</DialogClose>
              <ActionSubmit variant={variant}>{confirmLabel}</ActionSubmit>
            </div>
          </ActionForm>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose isDisabled={pending}>Отказ</DialogClose>
            <Button variant={variant} onPress={confirm} isDisabled={pending}>{pending ? "Моля, изчакай…" : confirmLabel}</Button>
          </div>
        )}
      </Dialog>
    </DialogTrigger>
  );
}
