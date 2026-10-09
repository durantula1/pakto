"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ATTACHMENT_ACCEPT, MAX_BYTES, formatFileSize, uploadAttachment } from "@/components/change-orders/attachment-upload";
import { startNavigationProgress } from "@/components/workspace/navigation-progress";
import { cn } from "@/lib/utils";

/**
 * Photos and PDFs picked while the document does not exist yet. Nothing is uploaded here:
 * the form creates the draft first, then `useUploadStagedFiles` attaches the files to it.
 */
export function StagedAttachments({ files, onChange, className }: {
  files: File[];
  onChange: (files: File[]) => void;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const previews = useMemo(() => files.map((file) => (file.type.startsWith("image/") ? URL.createObjectURL(file) : null)), [files]);
  useEffect(() => () => previews.forEach((url) => url && URL.revokeObjectURL(url)), [previews]);

  function add(list: FileList | null) {
    if (!list?.length) return;
    const typed = Array.from(list).filter((file) => file.type.startsWith("image/") || file.type === "application/pdf");
    if (typed.length < list.length) toast.error("Позволени са само снимки и PDF.");
    // A PDF is uploaded as it is, so the limit applies at once; photos are shrunk before upload.
    const accepted = typed.filter((file) => {
      const tooBig = file.type === "application/pdf" && file.size > MAX_BYTES;
      if (tooBig) toast.error(`„${file.name}“ е ${formatFileSize(file.size)}. Максимумът е 15 MB.`);
      return !tooBig;
    });
    onChange([...files, ...accepted]);
  }

  return (
    <section className={cn("rounded-2xl border bg-card p-4", className)}>
      <p className="text-sm font-semibold">Снимки и файлове</p>
      <p className="mt-1 text-sm text-muted-foreground">По желание. Клиентът ги вижда в портала, а снимките влизат и в PDF-а.</p>
      {files.length ? (
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="relative overflow-hidden rounded-xl border bg-muted/40">
              {previews[index] ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img src={previews[index]!} alt={file.name} className="aspect-square w-full object-cover" />
              ) : (
                <span className="grid aspect-square place-items-center"><FileText className="size-8 text-muted-foreground" /></span>
              )}
              <span className="block truncate px-2 py-1.5 text-2xs text-muted-foreground">{formatFileSize(file.size)}</span>
              <Button
                type="button"
                size="icon-xs"
                variant="secondary"
                aria-label={`Махни ${file.name}`}
                onPress={() => onChange(files.filter((_, position) => position !== index))}
                className="absolute top-1.5 right-1.5 shadow-sm"
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); add(event.dataTransfer.files); }}
        className={cn("mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center transition", dragging && "border-primary bg-primary/5")}
      >
        <ImagePlus className="size-5 text-muted-foreground" />
        <Button type="button" variant="outline" className="h-10" onPress={() => input.current?.click()}>Добави снимка или файл</Button>
        <p className="text-xs text-muted-foreground">или ги плъзни тук · JPG, PNG, WebP, PDF до 15 MB</p>
        <input
          ref={input}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => { add(event.target.files); event.target.value = ""; }}
        />
      </div>
    </section>
  );
}

/**
 * After the create action returns the new document id: upload the staged files one by one,
 * then open the document. A failed file does not block the rest; it can be added again there.
 */
export function useUploadStagedFiles(createdId: string | undefined, files: File[], notice: string) {
  const router = useRouter();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (!createdId || started.current === createdId) return;
    started.current = createdId;
    void (async () => {
      let failed = 0;
      for (const [index, file] of files.entries()) {
        setProgress({ done: index, total: files.length });
        try {
          await uploadAttachment(createdId, file);
        } catch (error) {
          failed += 1;
          toast.error(error instanceof Error ? error.message : `„${file.name}“ не беше качен.`);
        }
      }
      if (failed) toast.error(`${failed} от ${files.length} файла не се качиха. Добави ги отново от страницата на офертата.`);
      const href = `/app/offers/${createdId}?notice=${notice}`;
      startNavigationProgress(href);
      router.push(href);
    })();
  }, [createdId, files, notice, router]);

  return progress;
}
