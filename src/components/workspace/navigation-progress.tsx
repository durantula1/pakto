"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

/**
 * Top progress bar for every workspace navigation. It starts on the click itself, so the
 * user sees a reaction even when the target was not prefetched yet (slow network, first
 * visit, dev) and the router has to wait for the server before `loading.tsx` can paint.
 * It finishes when the URL commits: from then on the target's skeleton or content shows.
 */

/** Gives up after this long, so a navigation that never commits (e.g. a redirect back here) cannot leave the bar stuck. */
const TIMEOUT_MS = 15000;

/** `done` keeps the bar on screen for its fade-out after the navigation commits. */
let phase: "idle" | "loading" | "done" = "idle";
let timeout: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setPhase(next: typeof phase) {
  phase = next;
  emit();
}

function finish() {
  if (phase !== "loading") return;
  clearTimeout(timeout);
  timeout = setTimeout(() => setPhase("idle"), 300);
  document.documentElement.removeAttribute("data-navigating");
  setPhase("done");
}

/** Same URL minus the hash, so in-page anchors and clicks on the current page do not start the bar. */
function comparable(url: URL) {
  return url.pathname + url.search;
}

/**
 * Starts the bar for a navigation to `href`. `<Link>` clicks are picked up automatically;
 * call this before `router.push`/`router.replace` for navigations that start in code.
 */
export function startNavigationProgress(href: string) {
  const target = new URL(href, window.location.href);
  if (target.origin !== window.location.origin || comparable(target) === comparable(new URL(window.location.href))) return;
  clearTimeout(timeout);
  timeout = setTimeout(finish, TIMEOUT_MS);
  document.documentElement.setAttribute("data-navigating", "");
  if (phase !== "loading") setPhase("loading");
}

function onDocumentClick(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
  // Route handlers (PDF, exports) are file downloads, not page navigations.
  if (new URL(anchor.href).pathname.startsWith("/api/")) return;
  startNavigationProgress(anchor.href);
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = useSyncExternalStore(subscribe, () => phase, () => "idle" as const);

  useEffect(() => {
    // Capture phase: runs before `<Link>` handles the click, whatever stops propagation later.
    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("popstate", finish);
    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("popstate", finish);
      // Leaving the workspace (say, for the landing page) unmounts the bar before the URL commits,
      // so the finish effect never runs: clear the busy state here, or <html> keeps it for 15 s.
      clearTimeout(timeout);
      document.documentElement.removeAttribute("data-navigating");
      phase = "idle";
    };
  }, []);

  useEffect(finish, [pathname, searchParams]);

  if (current === "idle") return null;
  return (
    <div
      role="progressbar"
      aria-label="Зареждане на страницата"
      aria-busy={current === "loading"}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
    >
      <div
        className="nav-progress h-full origin-left bg-primary shadow-[0_0_8px] shadow-primary/60"
        data-state={current}
      />
    </div>
  );
}
