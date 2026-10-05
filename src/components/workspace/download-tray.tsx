"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Check, FileDown, RotateCcw, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Downloads with feedback. PDFs and exports are generated on the server and take a few seconds;
 * a plain `<a download>` shows nothing until the browser has the file, so people click again.
 * `startDownload` fetches the file itself, reports progress to the tray, then saves it.
 */

type Download = {
  id: number;
  href: string;
  label: string;
  state: "preparing" | "downloading" | "done" | "error";
  /** 0–1 while downloading, when the server sent a Content-Length. */
  progress: number | null;
  objectUrl?: string;
};

let downloads: Download[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const empty: Download[] = [];

function emit() {
  for (const listener of listeners) listener();
}

function update(id: number, patch: Partial<Download>) {
  downloads = downloads.map((item) => (item.id === id ? { ...item, ...patch } : item));
  emit();
}

function dismiss(id: number) {
  const item = downloads.find((download) => download.id === id);
  if (item?.objectUrl) URL.revokeObjectURL(item.objectUrl);
  downloads = downloads.filter((download) => download.id !== id);
  emit();
}

/** `filename*=UTF-8''…` wins over `filename="…"`, as in browsers. */
function filenameFrom(header: string | null) {
  if (!header) return null;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) return decodeURIComponent(encoded[1]!);
  return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? null;
}

async function run(id: number) {
  const item = downloads.find((download) => download.id === id);
  if (!item) return;
  update(id, { state: "preparing", progress: null });
  try {
    const response = await fetch(item.href, { credentials: "same-origin" });
    if (!response.ok || !response.body) throw new Error(String(response.status));
    const total = Number(response.headers.get("Content-Length")) || 0;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    update(id, { state: "downloading", progress: total ? 0 : null });
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (total) update(id, { progress: Math.min(1, received / total) });
    }
    const blob = new Blob(chunks as BlobPart[], { type: response.headers.get("Content-Type") ?? "application/octet-stream" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filenameFrom(response.headers.get("Content-Disposition")) ?? item.label;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    update(id, { state: "done", progress: 1, objectUrl });
  } catch {
    update(id, { state: "error", progress: null });
  }
}

/** Starts a download unless the same file is already on its way (a second click does nothing). */
export function startDownload({ href, label }: { href: string; label: string }) {
  const running = downloads.find((download) => download.href === href && (download.state === "preparing" || download.state === "downloading"));
  if (running) return;
  const id = nextId++;
  downloads = [...downloads.filter((download) => download.href !== href), { id, href, label, state: "preparing", progress: null }];
  emit();
  void run(id);
}

function useDownloads() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => downloads,
    () => empty,
  );
}

/** Whether `href` is being fetched right now, for a spinner on the button that started it. */
export function useDownloading(href: string) {
  return useDownloads().some((download) => download.href === href && (download.state === "preparing" || download.state === "downloading"));
}

/**
 * A normal download link (works without JavaScript), which with JavaScript goes through the tray.
 * Modifier clicks keep the browser's own behaviour (open in a new tab and so on).
 */
export function DownloadLink({ href, label, className, children }: { href: string; label: string; className?: string; children: ReactNode }) {
  const busy = useDownloading(href);
  return (
    <a
      href={href}
      download
      aria-busy={busy || undefined}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        startDownload({ href, label });
      }}
      className={cn(busy && "pointer-events-none opacity-70", className)}
    >
      {children}
    </a>
  );
}

const statusText: Record<Download["state"], string> = {
  preparing: "Подготвя се…",
  downloading: "Изтегля се",
  done: "Изтеглено",
  error: "Не се изтегли. Опитай пак.",
};

/**
 * The navy pill with a light-blue bar (--brand-blue) at the bottom of the screen. Mounted once per layout;
 * `aboveMobileNav` lifts it over the workspace's bottom tab bar on phones.
 */
export function DownloadTray({ aboveMobileNav = false }: { aboveMobileNav?: boolean }) {
  const items = useDownloads();

  // Finished downloads stay (with "Отвори") until the user closes them; their object URLs go with them.
  useEffect(() => () => { for (const item of downloads) if (item.objectUrl) URL.revokeObjectURL(item.objectUrl); }, []);

  if (!items.length) return null;
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end sm:px-0",
        aboveMobileNav ? "bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-4" : "bottom-[max(1rem,env(safe-area-inset-bottom))]",
      )}
    >
      {items.map((item) => {
        const percent = item.progress !== null ? Math.round(item.progress * 100) : null;
        return (
          <div
            key={item.id}
            role="status"
            aria-live="polite"
            className="pointer-events-auto relative w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground shadow-xl ring-1 ring-white/10 animate-in fade-in-0 slide-in-from-bottom-2"
          >
            <div className="flex items-center gap-3 py-3 pr-2 pl-3.5">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", item.state === "error" ? "bg-red-500/15 text-red-300" : "bg-brand-blue/15 text-brand-blue")}>
                {item.state === "done" ? <Check className="size-5" /> : item.state === "error" ? <TriangleAlert className="size-5" /> : <FileDown className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.label}</p>
                <p className="text-xs text-sidebar-foreground/65">
                  {statusText[item.state]}
                  {item.state === "downloading" && percent !== null ? ` · ${percent}%` : ""}
                </p>
              </div>
              {item.state === "done" && item.objectUrl ? (
                <a href={item.objectUrl} target="_blank" rel="noreferrer" className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-blue transition hover:bg-white/5">Отвори</a>
              ) : null}
              {item.state === "error" ? (
                <button type="button" onClick={() => void run(item.id)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-blue transition hover:bg-white/5">
                  <RotateCcw className="size-3.5" /> Опитай пак
                </button>
              ) : null}
              {item.state === "done" || item.state === "error" ? (
                <button type="button" onClick={() => dismiss(item.id)} aria-label="Скрий" className="grid size-8 place-items-center rounded-lg text-sidebar-foreground/60 transition hover:bg-white/5 hover:text-sidebar-foreground">
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            {/* Light-blue bar: a running stripe while the server prepares the file, real progress when the size is known. */}
            <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-white/10" aria-hidden>
              {item.state === "done" ? (
                <div className="h-full w-full bg-brand-blue" />
              ) : item.state === "error" ? null : percent !== null ? (
                <div className="h-full bg-brand-blue transition-[width] duration-150" style={{ width: `${percent}%` }} />
              ) : (
                <div className="download-indeterminate h-full w-2/5 rounded-full bg-brand-blue" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
