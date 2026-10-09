"use client";

import { useEffect } from "react";
import { I18nProvider } from "react-aria-components";

import { invalidMessage } from "@/components/ui/field";

/** React Aria reads the browser's language by default; the product is Bulgarian whatever the browser says. */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // The browser's own bubble speaks the browser's language. Any required or typed control outside a
    // `Field` still gets one, so it is given the Bulgarian message; typing clears it for the next check.
    const isControl = (target: EventTarget | null) =>
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    const onInvalid = (event: Event) => {
      if (isControl(event.target)) event.target.setCustomValidity(invalidMessage(event.target));
    };
    const onInput = (event: Event) => {
      if (isControl(event.target)) event.target.setCustomValidity("");
    };
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
    };
  }, []);
  return <I18nProvider locale="bg-BG">{children}</I18nProvider>;
}
