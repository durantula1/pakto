"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { completeOnboardingAction } from "@/modules/organizations/actions";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(completeOnboardingAction, {});
  return <form action={action} className="mt-8 space-y-5">
    <label className="block text-sm font-medium">Твоето име<input name="displayName" required defaultValue={defaultName} className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15" /></label>
    <label className="block text-sm font-medium">Име на фирмата / ателието<input name="organizationName" required placeholder="Напр. Atelier Forma" className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15" /></label>
    {state.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{state.error}</p>}
    <button disabled={pending} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{pending && <LoaderCircle className="size-4 animate-spin" />}Създай фирмата</button>
  </form>;
}
