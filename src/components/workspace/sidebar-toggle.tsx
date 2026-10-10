"use client";

import { useCallback, useEffect } from "react";
import { PanelLeft } from "lucide-react";

import { SIDEBAR_COOKIE, WORKSPACE_SHELL_ID } from "@/components/workspace/sidebar-state";

/**
 * Collapses the desktop sidebar to icons, from the start of the header. The layout reads the cookie on the server, so a reload
 * renders the saved width with no flash; toggling only flips `data-sidebar` on the shell and the
 * CSS does the rest, so nothing re-renders.
 */
export function SidebarToggle() {
  const toggle = useCallback(() => {
    const shell = document.getElementById(WORKSPACE_SHELL_ID);
    if (!shell) return;
    const next = shell.dataset.sidebar === "collapsed" ? "expanded" : "collapsed";
    shell.dataset.sidebar = next;
    document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Autofill and some IME events fire keydown without a `key`.
      if (event.key?.toLowerCase() === "b" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Скрий или покажи страничното меню"
      title="Скрий или покажи менюто (⌘B)"
      className="hidden size-9 shrink-0 place-items-center rounded-lg border bg-card text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 lg:grid"
    >
      <PanelLeft className="size-4" aria-hidden="true" />
    </button>
  );
}
