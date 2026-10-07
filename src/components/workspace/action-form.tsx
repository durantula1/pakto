"use client";

import { startTransition, useContext, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { OverlayTriggerStateContext } from "react-aria-components";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useKeepFormValues } from "@/lib/use-keep-form-values";

export function ActionForm({ action, success, children, className, redirects = false, onSuccess }: {
  action: (formData: FormData) => Promise<unknown>;
  success: string;
  /** Runs after a successful action, e.g. to close the dialog around the form. */
  onSuccess?: () => void;
  children: React.ReactNode;
  className?: string;
  redirects?: boolean;
}) {
  // One object per failure, so the typed values come back once per failed submit and not on every render.
  const [failure, setFailure] = useState<{ error: string } | null>(null);
  const error = failure?.error ?? null;
  const setError = (message: string | null) => setFailure(message ? { error: message } : null);
  const formRef = useKeepFormValues(failure);
  // Set inside the form's transition, so it commits together with the refreshed page: the toast and
  // the closing dialog appear when the new row is already on screen, not seconds before it.
  const [succeeded, setSucceeded] = useState(0);
  // Set when the form sits inside a DialogTrigger, so a success closes that dialog.
  const overlay = useContext(OverlayTriggerStateContext);

  async function submit(formData: FormData) {
    setError(null);
    try {
      const result = await action(formData);
      // Expected failures come back as `{ error }`: production builds hide thrown messages.
      // Shown next to the submit button only: a toast on top of it doubled every failure.
      if (result && typeof result === "object" && "error" in result && typeof result.error === "string") {
        setError(result.error);
        return;
      }
      startTransition(() => setSucceeded((count) => count + 1));
    } catch (cause) {
      if (cause instanceof Error && cause.message.includes("NEXT_REDIRECT")) throw cause;
      const message = cause instanceof Error ? cause.message : "Действието не беше завършено. Опитай отново.";
      setError(message);
    }
  }

  useEffect(() => {
    if (!succeeded) return;
    if (!redirects) toast.success(success);
    onSuccess?.();
    overlay?.close();
    // Runs once per success; the callbacks are read fresh each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [succeeded]);

  // Required and malformed fields are caught here, before the round trip: each `Field` shows its own
  // message and the first visible one gets the focus. Hidden controls never block (the server still checks).
  function check(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    if (form.checkValidity()) return;
    const invalid = [...form.querySelectorAll<HTMLElement>(":is(input, textarea, select):invalid")]
      .filter((control) => control.getClientRects().length > 0);
    if (!invalid.length) return;
    event.preventDefault();
    setError(null);
    invalid[0]!.focus({ preventScroll: true });
    invalid[0]!.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  return <form noValidate ref={formRef} action={submit} onSubmit={check} className={className}>
    {children}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </form>;
}

export function ActionSubmit({ children, variant = "default", className }: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "destructive";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant={variant} className={className} isDisabled={pending}>
    {pending ? "Моля, изчакай…" : children}
  </Button>;
}
