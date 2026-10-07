"use client";

import { startTransition, useActionState, useOptimistic, useState, type ReactNode } from "react";
import Link from "next/link";
import { Lock, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { addNoteAction, deleteNoteAction, togglePinAction, updateNoteAction, type NoteState } from "@/modules/notes/actions";
import { documentCode } from "@/modules/change-orders/labels";
import { cn } from "@/lib/utils";
import { EmptyResult } from "@/components/workspace/page/empty-result";

type Note = {
  id: string; body: string; pinned: boolean; createdAt: Date; updatedAt: Date;
  authorId: string; authorName: string | null; changeOrderId: string | null; documentKind: "offer" | "change" | null; sequenceNumber: number | null;
  /** Shown before the server confirms it; the refreshed list replaces it. */
  pending?: boolean;
};

type NotesChange = { add: Note } | { remove: string };

/** A new note goes after the pinned ones, where the server will list it. */
function applyChange(list: Note[], change: NotesChange) {
  if ("remove" in change) return list.filter((note) => note.id !== change.remove);
  const firstUnpinned = list.findIndex((note) => !note.pinned);
  const at = firstUnpinned === -1 ? list.length : firstUnpinned;
  return [...list.slice(0, at), change.add, ...list.slice(at)];
}

const dateTime = new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Sofia" });

/** Team-only notes. `changeOrderId` scopes new notes to one document; without it they belong to the whole project. */
export function NotesPanel({ projectId, changeOrderId, notes, legacy = [], currentUserId, isOwner, pagination }: {
  projectId: string;
  changeOrderId?: string;
  notes: Note[];
  /** The old single "internal note" per version, shown read-only. */
  legacy?: Array<{ revisionNumber: number; text: string }>;
  currentUserId: string;
  isOwner: boolean;
  /** Pages through older notes; the list shows one page at a time. */
  pagination?: ReactNode;
}) {
  // The page refresh after a save takes a moment; the list changes right away instead.
  const [shown, changeShown] = useOptimistic(notes, applyChange);
  const placeholder = changeOrderId ? "Напр. „Клиентът иска плочките да са от Баумакс“" : "Напр. „Звъни след 17:00“";
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-semibold"><Lock className="size-4 text-muted-foreground" aria-hidden="true" />Вътрешни бележки</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Само за екипа. Клиентът не ги вижда нито в портала, нито в PDF-а.</p>
        </div>
        <AddNoteDialog projectId={projectId} changeOrderId={changeOrderId} placeholder={placeholder} onAdd={(body) => {
          const now = new Date();
          changeShown({ add: { id: `pending-${now.getTime()}`, body, pinned: false, createdAt: now, updatedAt: now, authorId: currentUserId, authorName: null, changeOrderId: changeOrderId ?? null, documentKind: null, sequenceNumber: null, pending: true } });
        }} />
      </div>

      {shown.length || legacy.length ? (
        <ul className="flex flex-col gap-2">
          {shown.map((note) => <NoteRow key={note.id} note={note} showDocument={!changeOrderId} canEdit={note.authorId === currentUserId} canDelete={note.authorId === currentUserId || isOwner} onRemove={() => changeShown({ remove: note.id })} />)}
          {legacy.map((item) => (
            <li key={`legacy-${item.revisionNumber}`} className="rounded-xl bg-muted/50 p-3 text-sm">
              <p className="whitespace-pre-line">{item.text}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">Бележка към версия {item.revisionNumber}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyResult className="rounded-xl border border-dashed" title="Още няма бележки." description={changeOrderId ? "Запиши какво екипът трябва да помни за тази оферта." : "Запиши неща, които екипът трябва да помни за този обект. Бележките към оферти са в самите оферти и се виждат и тук."} />
      )}
      {pagination}
    </section>
  );
}

function AddNoteDialog({ projectId, changeOrderId, placeholder, onAdd }: { projectId: string; changeOrderId?: string; placeholder: string; onAdd: (body: string) => void }) {
  const [open, setOpen] = useState(false);
  const [, add, adding] = useActionState<NoteState, FormData>(async (previous, formData) => {
    const body = String(formData.get("body") ?? "").trim();
    if (body) onAdd(body);
    const result = await addNoteAction(previous, formData);
    if (result.error) toast.error(result.error);
    if (result.ok) {
      toast.success("Бележката е добавена");
      setOpen(false);
    }
    return result;
  }, {});

  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Button type="button"><Plus data-icon="inline-start" />Добави бележка</Button>
      <Dialog className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Нова бележка</DialogTitle>
          <DialogDescription>Вижда я само екипът.</DialogDescription>
        </DialogHeader>
        <form action={add} className="flex flex-col gap-3">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="changeOrderId" value={changeOrderId ?? ""} />
          <Textarea name="body" aria-label="Бележка" required maxLength={4000} autoFocus placeholder={placeholder} className="min-h-28 text-base sm:text-sm" />
          <div className="flex justify-end gap-2">
            <DialogClose>Отказ</DialogClose>
            <Button type="submit" isDisabled={adding}>{adding ? "Запазване…" : "Запази"}</Button>
          </div>
        </form>
      </Dialog>
    </DialogTrigger>
  );
}

function NoteRow({ note, showDocument, canEdit, canDelete, onRemove }: { note: Note; showDocument: boolean; canEdit: boolean; canDelete: boolean; onRemove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [, save, saving] = useActionState<NoteState, FormData>(async (previous, formData) => {
    const result = await updateNoteAction(previous, formData);
    if (result.error) toast.error(result.error);
    if (result.ok) setEditing(false);
    return result;
  }, {});

  async function run(action: (formData: FormData) => Promise<{ error?: string } | void>, success?: string) {
    const formData = new FormData();
    formData.set("noteId", note.id);
    const result = await action(formData);
    if (result?.error) { toast.error(result.error); return false; }
    if (success) toast.success(success);
  }

  return (
    <li aria-busy={note.pending || undefined} className={cn("rounded-xl border bg-card p-4 text-sm", note.pinned && "border-primary/40 bg-primary/5", note.pending && "opacity-60")}>
      {editing ? (
        <form action={save} className="flex flex-col gap-2">
          <input type="hidden" name="noteId" value={note.id} />
          <Textarea name="body" defaultValue={note.body} required maxLength={4000} autoFocus className="min-h-20 text-base sm:text-sm" />
          <div className="flex gap-2 sm:justify-end">
            <Button type="button" variant="outline" className="h-10 flex-1 sm:h-8 sm:flex-none" onPress={() => setEditing(false)}>Отказ</Button>
            <Button type="submit" isDisabled={saving} className="h-10 flex-1 sm:h-8 sm:flex-none">Запази</Button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-line break-words">{note.body}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {note.pinned ? <span className="font-medium text-primary-ink">Закачена · </span> : null}
          {note.pending ? "Записва се…" : <>{note.authorName ?? "Служител"} · {dateTime.format(note.createdAt)}</>}
          {note.updatedAt.getTime() - note.createdAt.getTime() > 1000 ? " · редактирана" : ""}
          {showDocument && note.changeOrderId && note.documentKind && note.sequenceNumber ? <> · <Link href={`/app/offers/${note.changeOrderId}`} className="font-mono underline">{documentCode(note.documentKind, note.sequenceNumber)}</Link></> : null}
        </p>
        {!editing && !note.pending ? (
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={note.pinned ? "Откачи" : "Закачи най-горе"} onPress={() => run(togglePinAction)}>{note.pinned ? <PinOff /> : <Pin />}</Button>
            {canEdit ? <Button type="button" variant="ghost" size="icon" className="size-9" aria-label="Редактирай" onPress={() => setEditing(true)}><Pencil /></Button> : null}
            {canDelete ? <ConfirmDialog
              trigger={<Button type="button" variant="ghost" size="icon" className="size-9 text-destructive" aria-label="Изтрий"><Trash2 /></Button>}
              title="Да изтрия ли бележката?"
              description="Бележката изчезва за целия екип. Това не може да се върне."
              confirmLabel="Изтрий"
              // Hidden at once; it comes back if the delete fails.
              onConfirm={() => new Promise<boolean | void>((resolve) => startTransition(async () => {
                onRemove();
                resolve(await run(deleteNoteAction, "Бележката е изтрита"));
              }))}
            /> : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
