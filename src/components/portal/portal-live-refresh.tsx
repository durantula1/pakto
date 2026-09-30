"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** How often the page re-reads itself, by minutes since the person last touched it. */
function delayFor(idleMs: number) {
  if (idleMs < 2 * 60_000) return 15_000;
  if (idleMs < 10 * 60_000) return 60_000;
  return null; // left open and untouched: stop until they come back
}

/**
 * Clients have no Supabase account, so no realtime channel like the workspace. While the portal is on
 * screen it re-reads the page, at once when the tab comes back: new answers, the unread badge and new
 * offers show up without a reload. Typed input survives a refresh. The rhythm slows down, then stops,
 * for a page nobody touches, so forgotten tabs do not keep hitting the server.
 */
export function PortalLiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    let lastTouch = Date.now();
    let timer: number | undefined;
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const schedule = () => {
      window.clearTimeout(timer);
      const delay = delayFor(Date.now() - lastTouch);
      if (delay === null) return;
      timer = window.setTimeout(() => { refresh(); schedule(); }, delay);
    };
    const touched = () => {
      const wasStopped = delayFor(Date.now() - lastTouch) === null;
      lastTouch = Date.now();
      if (wasStopped) { refresh(); schedule(); }
    };
    const visible = () => { if (document.visibilityState === "visible") { touched(); refresh(); } };
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
  }, [router]);
  return null;
}
