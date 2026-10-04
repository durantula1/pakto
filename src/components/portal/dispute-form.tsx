"use client";

import { useActionState } from "react";
import { offlineSafe } from "@/lib/offline-safe";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { disputeDecisionAction, type DecisionState } from "@/modules/change-portal/actions";

export function PortalDisputeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<DecisionState, FormData>(offlineSafe(disputeDecisionAction), {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <Textarea name="reason" maxLength={1000} rows={2} aria-label="Какво се е случило?" placeholder="Какво се е случило? (по желание)" className="bg-background" />
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" variant="destructive" className="h-11 px-5" isDisabled={pending}>
        {pending ? "Моля, изчакайте…" : "Оспорвам това решение"}
      </Button>
    </form>
  );
}
