"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Copy, Download, EllipsisVertical, FilePen, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { startNavigationProgress } from "@/components/workspace/navigation-progress";
import { saveTemplateFromOfferAction } from "@/modules/catalog/actions";
import { cancelDocumentAction } from "@/modules/change-orders/actions";
import { DialogClose } from "@/components/ui/dialog";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { Field, FieldLabel } from "@/components/ui/field";
import { startDownload } from "@/components/workspace/download-tray";

/** Secondary document actions, kept out of the header's main row so phones see only what matters. */
export function DocumentMoreMenu({ changeOrderId, kind, title, pdfHref, canCopy, renegotiateHref = null, cancel }: {
  changeOrderId: string;
  kind: "offer" | "change";
  title: string;
  pdfHref: string | null;
  canCopy: boolean;
  /** An approved offer: opens a new version after a warning that changes are the usual route. */
  renegotiateHref?: string | null;
  /** Cancel the document, or with `partial` only the newer version of an approved offer. */
  cancel?: { partial: boolean; notifiesClient: boolean } | null;
}) {
  const router = useRouter();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [renegotiateOpen, setRenegotiateOpen] = useState(false);
  const items = [
    ...(renegotiateHref ? [{ id: "renegotiate", label: "Нова версия на одобрената оферта", icon: FilePen }] : []),
    ...(canCopy ? [{ id: "copy", label: "Дублирай като нова оферта", icon: Copy }, { id: "template", label: "Запази като шаблон", icon: LayoutTemplate }] : []),
    ...(pdfHref ? [{ id: "pdf", label: "Свали PDF", icon: Download }] : []),
    ...(cancel ? [{ id: "cancel", label: cancel.partial ? "Оттегли новата версия" : "Анулирай", icon: Ban }] : []),
  ];
  if (!items.length) return null;
  function go(href: string) {
    startNavigationProgress(href);
    router.push(href);
  }
  function onAction(key: React.Key) {
    if (key === "copy") go(`/app/offers/new?from=${changeOrderId}`);
    if (key === "renegotiate") setRenegotiateOpen(true);
    if (key === "template") setTemplateOpen(true);
    if (key === "pdf" && pdfHref) startDownload({ href: pdfHref, label: `${title} · PDF` });
    if (key === "cancel") setCancelOpen(true);
  }
  return (
    <>
      <DropdownMenuTrigger>
        <Button type="button" variant="outline" className="h-8 gap-1.5 bg-card px-2.5" aria-label="Още действия"><EllipsisVertical className="size-4" /> Още</Button>
        <DropdownMenu placement="bottom end" onAction={onAction} className="min-w-56">
          {items.map((item) => (
            <DropdownMenuItem key={item.id} id={item.id} textValue={item.label} className="min-h-11 gap-2">
              <item.icon className="size-4" /> {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      </DropdownMenuTrigger>
      {renegotiateHref ? (
        <Dialog isOpen={renegotiateOpen} onOpenChange={setRenegotiateOpen} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Да предоговорим ли офертата?</DialogTitle>
            <DialogDescription>
              Правиш нова версия на вече договореното. Одобрената версия остава в сила, докато клиентът не одобри новата.
              За допълнителна работа или корекция на част от обхвата използвай „Нова промяна“.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <DialogClose>Отказ</DialogClose>
            <Button type="button" onPress={() => { setRenegotiateOpen(false); go(renegotiateHref); }}>Нова версия</Button>
          </div>
        </Dialog>
      ) : null}
      <SaveTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} changeOrderId={changeOrderId} defaultName={title} />
      {cancel ? (
        <Dialog isOpen={cancelOpen} onOpenChange={setCancelOpen} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{cancel.partial ? "Да оттегля ли новата версия?" : `Да анулирам ли ${kind === "offer" ? "офертата" : "промяната"}?`}</DialogTitle>
            <DialogDescription>
              {cancel.partial
                ? "В сила остава одобрената версия. Новата остава в историята като оттеглена."
                : `${kind === "offer" ? "Офертата" : "Промяната"} спира да чака решение и остава в историята като анулирана. Това не може да се върне.`}
              {cancel.notifiesClient ? " Клиентът получава имейл." : ""}
            </DialogDescription>
          </DialogHeader>
          <ActionForm action={cancelDocumentAction} success={cancel.partial ? "Новата версия е оттеглена" : kind === "offer" ? "Офертата е анулирана" : "Промяната е анулирана"} onSuccess={() => setCancelOpen(false)} className="grid gap-3">
            <input type="hidden" name="changeOrderId" value={changeOrderId} />
            <Field><FieldLabel htmlFor="cancel-reason">Причина (по желание)</FieldLabel><Input id="cancel-reason" name="reason" maxLength={500} placeholder="Напр. клиентът се отказа по телефона" /></Field>
            <div className="flex justify-end gap-2"><DialogClose>Отказ</DialogClose><ActionSubmit variant="destructive">{cancel.partial ? "Оттегли" : "Анулирай"}</ActionSubmit></div>
          </ActionForm>
        </Dialog>
      ) : null}
    </>
  );
}

function SaveTemplateDialog({ open, onOpenChange, changeOrderId, defaultName }: { open: boolean; onOpenChange: (open: boolean) => void; changeOrderId: string; defaultName: string }) {
  const [saving, setSaving] = useState(false);
  async function submit(formData: FormData) {
    setSaving(true);
    const result = await saveTemplateFromOfferAction({}, formData);
    setSaving(false);
    if (result.error) return void toast.error(result.error);
    toast.success("Шаблонът е запазен. Ще го видиш при „Нова оферта“.");
    onOpenChange(false);
  }
  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Запази като шаблон</DialogTitle>
        <DialogDescription>Заглавието, обхватът, услугите и материалите и ДДС стават начало за следващи оферти. Цените могат да се сменят всеки път.</DialogDescription>
      </DialogHeader>
      <form action={submit} className="flex flex-col gap-3">
        <input type="hidden" name="changeOrderId" value={changeOrderId} />
        <label className="text-sm font-medium">Име на шаблона
          <Input name="name" required minLength={2} maxLength={120} defaultValue={defaultName} autoFocus className="mt-1.5 h-11 text-base sm:text-sm" />
        </label>
        <Button type="submit" isDisabled={saving} className="h-11">{saving ? "Запазване…" : "Запази шаблона"}</Button>
      </form>
    </Dialog>
  );
}
