"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { SecretState } from "@/modules/integrations/actions";

/** A form whose action returns a secret that is shown once, right under the form. */
export function SecretForm({ action, submit, children }: {
  action: (state: SecretState, formData: FormData) => Promise<SecretState>;
  submit: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-3">
      {children}
      <div><Button type="submit" isDisabled={pending}>{submit}</Button></div>
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      {state.secret ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
          <p className="font-medium">{state.label} се показва само сега. Копирай го и го пази на сигурно място.</p>
          <code className="mt-2 block break-all rounded-lg bg-background p-2 select-all">{state.secret}</code>
        </div>
      ) : null}
    </form>
  );
}
