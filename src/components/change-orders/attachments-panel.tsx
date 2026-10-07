"use client";

import { useRef, useState } from "react";
import { FileText, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { cn } from "@/lib/utils";
import { ATTACHMENT_ACCEPT, formatFileSize, uploadAttachment, type UploadedAttachment } from "@/components/change-orders/attachment-upload";
import { deleteAttachmentAction } from "@/modules/change-orders/attachment-actions";

type Attachment = UploadedAttachment;
type Pending = { key: string; name: string };

/** Photos and PDFs of the current revision. Editable only while the revision is a draft. */
export function AttachmentsPanel({ changeOrderId, initial, editable, description }: {
  changeOrderId: string;
  initial: Attachment[];
  editable: boolean;
  description?: string;
}) {
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    const key = `${file.name}-${file.size}-${Math.random()}`;
    setPending((list) => [...list, { key, name: file.name }]);
    try {
      const attachment = await uploadAttachment(changeOrderId, file);
      setItems((list) => [...list, attachment]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Файлът не беше качен.");
    } finally {
      setPending((list) => list.filter((item) => item.key !== key));
    }
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    // One at a time keeps a weak site connection from failing every file at once.
    void Array.from(files).reduce((chain, file) => chain.then(() => upload(file)), Promise.resolve());
  }

  async function remove(attachment: Attachment) {
    const result = await deleteAttachmentAction({ changeOrderId, attachmentId: attachment.id });
    if (!result.ok) { toast.error(result.error); return false; }
    setItems((list) => list.filter((item) => item.id !== attachment.id));
  }

  if (!editable && !items.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Снимки и файлове</CardTitle>
        <CardDescription>{description ?? (editable ? "Клиентът ги вижда в портала, а снимките влизат и в PDF-а. Замразяват се заедно с версията." : "Прикачени към тази версия.")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {items.length || pending.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <li key={item.id} className="group relative overflow-hidden rounded-xl border bg-muted/40">
                <a href={`/api/attachments/${item.id}`} target="_blank" rel="noreferrer" className="block">
                  {item.isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL behind a redirect; next/image cannot cache it
                    <img src={`/api/attachments/${item.id}`} alt={item.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <span className="grid aspect-[4/3] place-items-center"><FileText className="size-10 text-muted-foreground" /></span>
                  )}
                  <span className="block truncate px-2.5 pt-2 text-xs font-medium">{item.name}</span>
                  <span className="block px-2.5 pb-2 text-xs text-muted-foreground">{formatFileSize(item.byteSize)}</span>
                </a>
                {editable ? (
                  <ConfirmDialog
                    trigger={
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="secondary"
                        aria-label={`Премахни ${item.name}`}
                        className="absolute top-2 right-2 opacity-100 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      >
                        <Trash2 />
                      </Button>
                    }
                    title="Да премахна ли файла?"
                    description={`„${item.name}“ се маха от тази чернова. Изпратените версии го запазват.`}
                    confirmLabel="Премахни"
                    onConfirm={() => remove(item)}
                  />
                ) : null}
              </li>
            ))}
            {pending.map((item) => (
              <li key={item.key} className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                <span className="grid justify-items-center gap-2 px-2"><LoaderCircle className="size-5 animate-spin" /><span className="line-clamp-2">{item.name}</span></span>
              </li>
            ))}
          </ul>
        ) : null}

        {editable ? (
          <div
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
            className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-center transition", dragging && "border-primary bg-primary/5")}
          >
            <ImagePlus className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Плъзни снимки или PDF тук, или</p>
            <Button type="button" variant="outline" className="h-10" onPress={() => input.current?.click()}>Добави снимка или файл</Button>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP или PDF, до 15 MB. Снимките се смаляват автоматично.</p>
            <input
              ref={input}
              type="file"
              multiple
              accept={ATTACHMENT_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
