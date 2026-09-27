"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestNewLinksAction, type LinkRequestState } from "@/modules/change-portal/link-request-actions";

export function RequestLinksForm() {
  const [state, submit, pending] = useActionState<LinkRequestState, FormData>(requestNewLinksAction, {});
  if (state.sent) {
    return <p role="status" className="rounded-xl bg-muted p-4 text-sm">Ако този имейл е потвърден при някоя фирма, ще получите линковете си до няколко минути.</p>;
  }
  return (
    <form action={submit} className="flex flex-col gap-2 text-left">
      <label htmlFor="link-email" className="text-sm font-medium">Изпрати ми нов линк</label>
      <div className="flex gap-2">
        <Input id="link-email" name="email" type="email" required autoComplete="email" placeholder="ime@primer.bg" className="h-11" />
        <Button type="submit" isDisabled={pending} className="h-11">{pending ? "Изпращане…" : "Изпрати"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Само за имейл, който вече сте потвърдили в портала.</p>
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
