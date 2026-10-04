"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** How often the page asks whether anything changed, by minutes since the person last touched it. */
function delayFor(idleMs: number) {
  if (idleMs < 2 * 60_000) return 15_000;
  if (idleMs < 10 * 60_000) return 60_000;
  return null; // left open and untouched: stop until they come back
}

/**
 * Clients have no Supabase account, so no realtime channel like the workspace. While the portal is on
 * screen it asks a small endpoint for a stamp of what the client sees, and re-reads the page only when
 * the stamp moved: new answers, the unread badge and new offers show up without a reload, and a quiet
 * page costs one tiny query instead of a full render. Typed input survives a refresh. The rhythm slows
 * down, then stops, for a page nobody touches, so forgotten tabs do not keep hitting the server.
 */
export function PortalLiveRefresh() {
  const router = useRouter();
  // "/portal/<publicId>/…" checks that project; the portal home and its lists check all of the client's.
  const segment = usePathname().split("/")[2] ?? "";
  useEffect(() => {
    let lastTouch = Date.now();
    let timer: number | undefined;
    let known: string | null | undefined;
    let checking = false;
    const check = async () => {
      if (document.visibilityState !== "visible" || checking) return;
      checking = true;
      try {
        const response = await fetch(`/api/portal/pulse?page=${encodeURIComponent(segment)}`, { cache: "no-store" });
        if (!response.ok) return;
        const { stamp } = (await response.json()) as { stamp: string | null };
        if (known !== undefined && stamp !== known) router.refresh();
        known = stamp;
      } catch {
        // Offline for a moment: the next check catches up.
      } finally {
        checking = false;
      }
    };
    const schedule = () => {
      window.clearTimeout(timer);
      const delay = delayFor(Date.now() - lastTouch);
      if (delay === null) return;
      timer = window.setTimeout(() => { void check(); schedule(); }, delay);
    };
    const touched = () => {
      const wasStopped = delayFor(Date.now() - lastTouch) === null;
      lastTouch = Date.now();
      if (wasStopped) { void check(); schedule(); }
    };
    const visible = () => { if (document.visibilityState === "visible") { touched(); void check(); } };
    // The first answer is the baseline for the page as it was just rendered.
    void check();
    schedule();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("pointerdown", touched);
    window.addEventListener("keydown", touched);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("pointerdown", touched);
      window.removeEventListener("keydown", touched);
    };
  }, [router, segment]);
  return null;
}
