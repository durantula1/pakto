"use client";

import { useEffect, useRef } from "react";

type Snapshot = Map<string, string[]>;

/**
 * React clears an uncontrolled form after every Server Action, even when the server answered with an
 * error, so the person would have to type everything again. Attach the returned ref to the `<form>`
 * and pass the action's state: the values sent are put back when the state carries an `error`.
 * Passwords and files are never kept.
 */
export function useKeepFormValues(state: { error?: string } | null | undefined) {
  const formRef = useRef<HTMLFormElement>(null);
  const sent = useRef<Snapshot | null>(null);

  useEffect(() => {
    // On the document: the form may not exist yet (a dialog mounts it only when opened).
    const capture = (event: Event) => {
      const form = formRef.current;
      if (!form || event.target !== form) return;
      const snapshot: Snapshot = new Map();
      for (const element of Array.from(form.elements)) {
        if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) continue;
        if (!element.name || element.name.startsWith("$ACTION") || (element instanceof HTMLInputElement && (element.type === "password" || element.type === "file" || element.type === "submit"))) continue;
        if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
          snapshot.set(`${element.name}\u0000${element.value}`, [element.checked ? "1" : "0"]);
        } else {
          snapshot.set(element.name, [...(snapshot.get(element.name) ?? []), element.value]);
        }
      }
      sent.current = snapshot;
    };
    document.addEventListener("submit", capture, true);
    return () => document.removeEventListener("submit", capture, true);
  }, []);

  useEffect(() => {
    const form = formRef.current;
    const snapshot = sent.current;
    if (!form || !snapshot || !state?.error) return;
    // React resets the form when the action settles, which can land after this effect: put the values back again a moment later.
    const restore = () => restoreValues(form, snapshot);
    restore();
    const later = window.setTimeout(restore, 60);
    return () => window.clearTimeout(later);
  }, [state]);

  return formRef;
}

function restoreValues(form: HTMLFormElement, snapshot: Snapshot) {
  {
    const seen = new Map<string, number>();
    for (const element of Array.from(form.elements)) {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) continue;
      if (!element.name || element.name.startsWith("$ACTION")) continue;
      if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
        const saved = snapshot.get(`${element.name}\u0000${element.value}`)?.[0];
        if (saved !== undefined && element.checked !== (saved === "1")) element.click();
        continue;
      }
      const values = snapshot.get(element.name);
      if (!values) continue;
      const index = seen.get(element.name) ?? 0;
      seen.set(element.name, index + 1);
      const value = values[index];
      if (value === undefined || element.value === value) continue;
      // The native setter plus an input event also updates React-controlled fields.
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}
