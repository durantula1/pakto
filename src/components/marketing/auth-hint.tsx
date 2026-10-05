"use client";

import { useLayoutEffect } from "react";

import { applyAuthHint, verifyAuthHint } from "@/lib/auth/session-hint";

/**
 * Refreshes <html data-auth> when a marketing page is reached by client navigation (say, after
 * signing in). The first paint is covered by the inline script in the root layout; an inline
 * script in a page would never run on client navigation, and React warns about it.
 */
export function AuthHint() {
  useLayoutEffect(() => {
    applyAuthHint();
    verifyAuthHint();
  }, []);
  return null;
}
