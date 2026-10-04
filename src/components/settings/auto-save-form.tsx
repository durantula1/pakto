"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

type Status = { state: "idle" | "saving" | "saved" } | { state: "error"; message: string };
const StatusContext = createContext<Status>({ state: "idle" });
const SaveContext = createContext<() => void>(() => {});

/** For fields that are not native inputs (the select): ask the surrounding form to save after their value is in the DOM. */
export function useAutoSave() {
  return useContext(SaveContext);
}

const serialize = (form: HTMLFormElement) => new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString();
const savesOnChange = (target: EventTarget) =>
  target instanceof HTMLInputElement ? target.type === "checkbox" || target.type === "radio" : target instanceof HTMLSelectElement;

/**
 * A settings form without a save button: switches, radios and selects save as soon as they
 * change, text fields when they lose focus or on Enter. Only a real change reaches the server,
 * and a change made while saving is sent right after.
 */
export function AutoSaveForm({ action, children, className }: {
  action: (formData: FormData) => Promise<unknown>;
  children: ReactNode;
  className?: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const lastSaved = useRef<string | null>(null);
  const running = useRef(false);
  const again = useRef(false);
  const [status, setStatus] = useState<Status>({ state: "idle" });

  useEffect(() => {
    if (form.current) lastSaved.current = serialize(form.current);
  }, []);

  useEffect(() => {
    if (status.state !== "saved") return;
    const timer = setTimeout(() => setStatus({ state: "idle" }), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  async function save() {
    const element = form.current;
    if (!element) return;
    if (running.current) return void (again.current = true);
    const snapshot = serialize(element);
    if (snapshot === lastSaved.current) return;
    if (!element.checkValidity()) return void element.reportValidity();
    running.current = true;
    setStatus({ state: "saving" });
    try {
      const result = await action(new FormData(element));
      if (result && typeof result === "object" && "error" in result && typeof result.error === "string") {
        setStatus({ state: "error", message: result.error });
        toast.error(result.error);
      } else {
        lastSaved.current = snapshot;
        setStatus({ state: "saved" });
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Не беше запазено. Опитай отново.";
      setStatus({ state: "error", message });
      toast.error(message);
    } finally {
      running.current = false;
      if (again.current) {
        again.current = false;
        void save();
      }
    }
  }

  return (
    <StatusContext.Provider value={status}>
      <SaveContext.Provider value={() => void save()}>
      <form
        ref={form}
        className={className}
        onChange={(event) => { if (savesOnChange(event.target)) void save(); }}
        onBlur={(event) => { if (!savesOnChange(event.target)) void save(); }}
        onKeyDown={(event) => {
          // A form with two text fields and no submit button never submits on Enter by itself.
          if (event.key === "Enter" && event.target instanceof HTMLInputElement && !savesOnChange(event.target)) { event.preventDefault(); void save(); }
        }}
        onSubmit={(event) => { event.preventDefault(); void save(); }}
      >
        {children}
      </form>
      </SaveContext.Provider>
    </StatusContext.Provider>
  );
}

/** "Запазва…" / "Запазено" next to the fields of the surrounding AutoSaveForm; empty when idle. */
export function AutoSaveStatus({ className }: { className?: string }) {
  const status = useContext(StatusContext);
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex min-h-5 items-center gap-1 text-xs", status.state === "error" ? "text-destructive" : "text-muted-foreground", className)}>
      {status.state === "saving" ? <><LoaderCircle className="size-3.5 animate-spin" /> Запазва…</> : null}
      {status.state === "saved" ? <><Check className="size-4 rounded-full bg-brand-green p-0.5 text-[#102b38]" /> Запазено</> : null}
      {status.state === "error" ? status.message : null}
    </span>
  );
}

/** A native checkbox drawn as a switch, so it posts with the form like any checkbox. */
export function SettingsSwitch({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      role="switch"
      className={cn(
        "relative h-6 w-10 shrink-0 cursor-pointer appearance-none rounded-full bg-input transition-colors outline-none",
        "before:absolute before:top-0.5 before:left-0.5 before:size-5 before:rounded-full before:bg-white before:shadow-sm before:transition-transform",
        "checked:bg-primary checked:before:translate-x-4 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
