"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, LoaderCircle, Maximize2, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { formatFileSize } from "@/components/change-orders/attachment-upload";
import { DemoOfferDialog } from "@/components/settings/demo-offer-dialog";
import { prepareLogoPreview, type LogoPreview } from "@/components/settings/logo-preview";
import { Button } from "@/components/ui/button";
import { uploadWithTicket } from "@/lib/storage/upload-client";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { cn } from "@/lib/utils";
import { confirmLogoAction, createLogoUploadAction, removeLogoAction, updateLogoSizeAction } from "@/modules/organizations/actions";
import { LOGO_SIZES, logoBox, logoSizeLabels, ptToRem, type DocumentLogo, type LogoDimensions, type LogoSize } from "@/modules/organizations/logo-box";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml"> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml",
};
const ACCEPT = ".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp";
/** Below this width a raster logo looks soft in the header on retina screens and in print. */
const MIN_SHARP_WIDTH = 240;
/** The page miniature in the row is roughly this fraction of a real A4 page. */
const MINI_SCALE = 0.6;

type Pending = { file: File; mimeType: (typeof TYPES)[string]; preview: LogoPreview };
type Saved = { originalBytes: number; optimizedBytes: number; width: number; height: number };

function mimeTypeOf(file: File) {
  const byType = Object.values(TYPES).find((type) => type === file.type);
  return byType ?? TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? null;
}

/**
 * Company logo as one settings row. Picking a file opens the sample offer with it right away,
 * so the owner decides with the result in front of them; nothing reaches clients until "Запази".
 */
export function LogoUploader({ organizationName, initialUrl, initialDimensions, initialSize }: {
  organizationName: string;
  initialUrl: string | null;
  initialDimensions: LogoDimensions | null;
  initialSize: LogoSize;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(initialUrl ? { url: initialUrl, dimensions: initialDimensions } : null);
  const [size, setSize] = useState(initialSize);
  const [pending, setPending] = useState<Pending | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [busy, startBusy] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  // Object URLs hold the whole image in memory until revoked.
  useEffect(() => () => { if (pending) URL.revokeObjectURL(pending.preview.url); }, [pending]);

  async function choose(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const mimeType = mimeTypeOf(file);
    if (!mimeType) return toast.error("Позволени са SVG, PNG, JPG и WebP.");
    if (file.size > MAX_BYTES) return toast.error(`Файлът е ${formatFileSize(file.size)}. Максимумът е 5 MB.`);
    setPreparing(true);
    try {
      const preview = await prepareLogoPreview(file, mimeType === "image/svg+xml");
      setSaved(null);
      setPending({ file, mimeType, preview });
    } catch (error) {
      // Only our own (Bulgarian) messages reach the toast; a browser's English error gets the generic one.
      toast.error(error instanceof Error && /[а-я]/i.test(error.message) ? error.message : "Изображението не може да се отвори. Опитай с друг файл.");
    } finally {
      setPreparing(false);
    }
  }

  function save() {
    if (!pending) return;
    startBusy(async () => {
      const ticket = await createLogoUploadAction({ mimeType: pending.mimeType, byteSize: pending.file.size });
      if (!ticket.ok) return void toast.error(ticket.error);
      if (!await uploadWithTicket(ticket.token, pending.file, pending.mimeType)) return void toast.error("Логото не беше качено. Провери връзката и опитай пак.");
      const result = await confirmLogoAction({ path: ticket.path });
      if (!result.ok) return void toast.error(result.error);
      setCurrent({ url: result.url, dimensions: { width: result.width, height: result.height } });
      setSaved(result);
      setPending(null);
      setDemoOpen(false);
      toast.success("Логото е запазено. Новите оферти ще са с него.");
      router.refresh();
    });
  }

  function remove() {
    startBusy(async () => {
      const result = await removeLogoAction();
      if (!result.ok) return void toast.error(result.error);
      setCurrent(null);
      setSaved(null);
      toast.success("Логото е премахнато");
      router.refresh();
    });
  }

  const shownLogo: DocumentLogo | null = pending
    ? { url: pending.preview.url, dimensions: { width: pending.preview.trimmedWidth, height: pending.preview.trimmedHeight }, size }
    : current ? { ...current, size } : null;
  const shown = shownLogo?.url ?? null;
  // The miniature page is about 60% of a real one, so the logo shrinks with it and keeps its proportion.
  const miniBox = shownLogo?.dimensions ? logoBox(shownLogo.dimensions, size) : null;

  function changeSize(next: LogoSize) {
    const previous = size;
    setSize(next);
    const data = new FormData();
    data.set("logoSize", next);
    void updateLogoSizeAction(data).then((result) => {
      if (result?.error) {
        setSize(previous);
        toast.error(result.error);
      } else router.refresh();
    });
  }
  const warnings = pending ? [
    pending.mimeType !== "image/svg+xml" && pending.preview.trimmedWidth < MIN_SHARP_WIDTH
      ? `Логото е само ${pending.preview.trimmedWidth} px широко и може да изглежда размазано. Ако имаш SVG или по-голям PNG, качи него.` : null,
    pending.preview.trimmedHeight > pending.preview.trimmedWidth * 1.5
      ? "Логото е по-високо, отколкото е широко, и в заглавката ще е дребно. Хоризонтален вариант се чете по-добре." : null,
  ].filter((warning): warning is string => !!warning) : [];
  const details = saved
    // A vector file grows when it becomes a PNG; the size only matters when it went down.
    ? saved.optimizedBytes < saved.originalBytes
      ? `Оптимизирано: ${formatFileSize(saved.originalBytes)} → ${formatFileSize(saved.optimizedBytes)}`
      : `PNG ${saved.width}×${saved.height} px · ${formatFileSize(saved.optimizedBytes)}`
    : "Показва се в новите оферти";

  const pick = () => input.current?.click();

  return (
    <div className="grid gap-3 px-4 py-4 sm:px-5 @xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] @xl:gap-8">
      <div className="min-w-0">
        <p className="font-medium">Лого</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          Горе вляво на всяка оферта, в портала и в PDF. Появява се и във вече изпратените оферти без лого. Ако после го смениш, изпратените с лого запазват своето.
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">SVG, PNG, JPG или WebP до 5 MB. Най-добре хоризонтално, с прозрачен фон.</p>
      </div>

      <div className="grid min-w-0 gap-2.5 @xl:max-w-md @xl:justify-self-end @xl:w-full">
        <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(event) => { void choose(event.target.files); event.target.value = ""; }} />

        {/*
          The top of an offer page, with the logo where clients will see it. Empty, the logo spot is the
          drop zone; with a logo, the page opens the full-size sample offer.
        */}
        <button
          type="button"
          onClick={shown ? () => setDemoOpen(true) : pick}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); void choose(event.dataTransfer.files); }}
          disabled={busy || preparing}
          aria-label={shown ? "Виж цялата примерна оферта" : "Добави лого"}
          className={cn(
            "group relative overflow-hidden rounded-xl bg-neutral-100 p-3 pb-0 text-left ring-1 ring-foreground/10 transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-neutral-800",
            dragging && "ring-2 ring-primary",
          )}
        >
          <div className="rounded-t-md bg-white px-5 pt-4 pb-3 text-neutral-900 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b-2 border-neutral-900 pb-3">
              <div className="min-w-0">
                <div
                  style={miniBox ? { width: ptToRem(miniBox.width * MINI_SCALE), height: ptToRem(miniBox.height * MINI_SCALE) } : undefined}
                  className={cn("mb-1.5 flex items-center transition-[width,height]", !miniBox && "h-10 w-36", !shown && "justify-center rounded-md border-2 border-dashed border-primary/40 bg-primary/5 text-primary-ink transition group-hover:border-primary group-hover:bg-primary/10", dragging && "border-primary bg-primary/10")}>
                  {preparing ? (
                    <LoaderCircle className="size-4 animate-spin text-neutral-400" aria-hidden />
                  ) : shown ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local object URL or the stored PNG
                    <img src={shown} alt="" className="size-full object-contain object-left" />
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold"><ImagePlus className="size-4" aria-hidden /> Добави лого</span>
                  )}
                </div>
                <p className="truncate text-sm font-semibold">{organizationName}</p>
                <p className="text-[0.625rem] text-neutral-500">Създадено с Pakto</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[0.625rem] tracking-wide text-neutral-500 uppercase">Оферта · версия 1</p>
                <p className="text-sm font-semibold">ОФ-0001</p>
              </div>
            </div>
            <div className="mt-3 grid gap-1.5" aria-hidden>
              <span className="h-2 w-2/5 rounded-full bg-neutral-200" />
              <span className="h-1.5 w-4/5 rounded-full bg-neutral-100" />
            </div>
          </div>
          {shown ? (
            <span className="absolute inset-0 flex items-center justify-center bg-neutral-950/0 opacity-0 transition group-hover:bg-neutral-950/45 group-hover:opacity-100 group-focus-visible:bg-neutral-950/45 group-focus-visible:opacity-100">
              <span className="flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-neutral-900 shadow"><Maximize2 className="size-4" /> Виж цялата оферта</span>
            </span>
          ) : null}
        </button>

        {warnings.map((warning) => (
          <p key={warning} className="flex gap-1.5 text-xs leading-5 text-amber-700 dark:text-amber-400"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" />{warning}</p>
        ))}

        {shown ? (
          <fieldset className="flex flex-wrap items-center justify-between gap-2">
            <legend className="sr-only">Размер на логото в офертите</legend>
            <span aria-hidden className="text-xs text-muted-foreground">Размер в офертите</span>
            <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-muted p-0.5">
              {LOGO_SIZES.map((option) => (
                <label key={option} className="flex h-7 cursor-pointer items-center justify-center rounded-md px-2.5 text-xs font-medium text-muted-foreground transition has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
                  <input type="radio" name="logoSize" value={option} aria-label={logoSizeLabels[option]} checked={size === option} onChange={() => changeSize(option)} className="sr-only" />
                  {logoSizeLabels[option]}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {pending ? (
            <>
              <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                <span className="truncate">Не е запазено · {pending.file.name}</span>
              </p>
              <div className="flex gap-1.5">
                <Button variant="ghost" onPress={() => setPending(null)} isDisabled={busy} className="h-9 px-3">Отказ</Button>
                <Button onPress={save} isDisabled={busy} className="h-9 px-4">
                  {busy ? <LoaderCircle className="animate-spin" /> : null} Запази логото
                </Button>
              </div>
            </>
          ) : current ? (
            <>
              <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="size-4 shrink-0 rounded-full bg-brand-green p-0.5 text-[#102b38]" aria-hidden />
                <span className="truncate">{details}</span>
              </p>
              <div className="flex gap-1.5">
                <Button variant="outline" onPress={pick} isDisabled={busy || preparing} className="h-9 px-3">Смени</Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" isDisabled={busy} aria-label="Премахни логото" className="h-9 px-2 text-muted-foreground hover:text-destructive">
                      {busy ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                    </Button>
                  }
                  title="Да премахна ли логото?"
                  description="Новите оферти, порталът и PDF-ите ще са без лого. Изпратените версии пазят логото, с което са изпратени."
                  confirmLabel="Премахни"
                  onConfirm={remove}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Или плъзни файла тук.</p>
              <Button variant="outline" onPress={pick} isDisabled={preparing} className="h-9 px-3">Избери файл</Button>
            </>
          )}
        </div>
      </div>

      <DemoOfferDialog
        isOpen={demoOpen}
        onOpenChange={setDemoOpen}
        organizationName={organizationName}
        logo={shownLogo}
        canOpenPdf={!pending && !!current}
        footer={pending ? (
          <>
            {warnings.length ? <p className="mr-auto flex max-w-xl gap-1.5 text-xs text-amber-700 dark:text-amber-400"><TriangleAlert className="size-3.5 shrink-0" />{warnings[0]}</p> : null}
            <Button variant="ghost" onPress={pick} isDisabled={busy || preparing} className="h-9 px-3">Избери друг файл</Button>
            <Button onPress={save} isDisabled={busy} className="h-9 px-4">
              {busy ? <LoaderCircle className="animate-spin" /> : null} Запази логото
            </Button>
          </>
        ) : null}
      />
    </div>
  );
}
