"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_MS = 15_000;

/**
 * Clients have no Supabase account, so no realtime channel like the workspace. While the portal is on
 * screen it re-reads the page every few seconds, and at once when the tab comes back: new answers,
 * the unread badge and new offers show up without a reload. Typed input survives a refresh.
 */
export function PortalLiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [router]);
  return null;
}
