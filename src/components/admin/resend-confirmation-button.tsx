"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { resendConfirmationToUserAction, type ResendState } from "@/modules/platform-admin/actions";

const initial: ResendState = {};

export function ResendConfirmationButton({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendConfirmationToUserAction, initial);
  return <form action={action} className="flex flex-col items-end gap-1">
    <input type="hidden" name="email" value={email} />
    <Button type="submit" size="sm" variant="outline" isDisabled={pending}>{pending ? "Изпращане…" : state.ok ? "Изпрати пак" : "Изпрати линк"}</Button>
    {state.ok ? <p className="text-xs text-muted-foreground">{state.ok}</p> : null}
    {state.error ? <p role="alert" className="text-xs text-destructive">{state.error}</p> : null}
  </form>;
}
