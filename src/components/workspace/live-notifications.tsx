"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** Listens to /api/live (server-sent events) and refreshes the page when a notification arrives for this user. */
export function LiveNotifications() {
  const router = useRouter();
  useEffect(() => {
    const source = new EventSource("/api/live");
    source.addEventListener("refresh", (message) => {
      let payload: { event_type?: string; title?: string } = {};
      try { payload = JSON.parse((message as MessageEvent<string>).data); } catch { /* refresh anyway */ }
      if (payload.event_type === "permissions_changed") toast("Правата ти са променени");
      else if (payload.event_type === "owner_role_changed" || payload.event_type === "owner_promoted" || payload.event_type === "membership_disabled") {
        toast(payload.title || "Правата ти са променени");
      }
      router.refresh();
    });
    // Events sent while the stream was down are lost, so catch up once it reconnects (EventSource retries by itself).
    let openedBefore = false;
    source.addEventListener("open", () => {
      if (openedBefore) router.refresh();
      openedBefore = true;
    });
    // A background tab may have been throttled or asleep; catch up when it comes back after a while.
    let hiddenAt = 0;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 30000) router.refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { source.close(); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, [router]);
  return null;
}
