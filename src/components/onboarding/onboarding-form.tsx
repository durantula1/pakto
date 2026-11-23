"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { completeOnboardingAction } from "@/modules/organizations/actions";
import { useKeepFormValues } from "@/lib/use-keep-form-values";

/** The three ways of working offered at sign-up, with firms a visitor can recognise themselves in. */
const profiles = [
  {
    value: "solo",
    title: "Самостоятелна дейност",
    text: "Работиш сам. Клиентът одобрява офертата с линк.",
    examples: "Електротехник на свободна практика, интериорен дизайнер, фотограф, уеб дизайнер, майстор на бани",
  },
  {
    value: "team",
    title: "Екип с онлайн одобрение",
    text: "Имате екип и задачи. Клиентът одобрява онлайн.",
    examples: "Фирма за ремонт на жилища, ателие за мебели по поръчка, монтаж на соларни системи, рекламна агенция, сватбен организатор",
  },
  {
    value: "contract",
    title: "Работа по договор",
    text: "Договаряте се на хартия. Вие отбелязвате, че е договорено, клиентът само следи.",
    examples: "Подизпълнител, абонаментна поддръжка (климатици, асансьори, IT), почистване на офиси, обществени поръчки",
  },
] as const;

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(completeOnboardingAction, {});
  const formRef = useKeepFormValues(state);
  const router = useRouter();
  // The Ads conversion already fired when this account was created. Creating the company only opens the app.
  useEffect(() => {
    if (state.ok) router.replace("/app");
  }, [state.ok, router]);
  const busy = pending || state.ok;
  return <form noValidate ref={formRef} action={action} className="mt-8 space-y-5">
    <label className="block text-sm font-medium">Твоето име<input name="displayName" required defaultValue={defaultName} className="mt-1.5 h-10 w-full border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15" /></label>
    <label className="block text-sm font-medium">Име на фирмата<input name="organizationName" required placeholder="Напр. Строй Дизайн ООД" className="mt-1.5 h-10 w-full border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15" /></label>
    <fieldset>
      <legend className="text-sm font-medium">Как работи фирмата?</legend>
      <div className="mt-1.5 grid gap-2">
        {profiles.map((profile) => (
          <label key={profile.value} className="block cursor-pointer border bg-background px-3.5 py-3 transition has-checked:border-ink has-checked:bg-ink/[0.03] has-checked:ring-1 has-checked:ring-ink has-focus-visible:ring-3 has-focus-visible:ring-primary/15">
            <span className="flex items-start gap-3">
              <input type="radio" name="profile" value={profile.value} required className="mt-1 size-4 shrink-0 accent-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{profile.title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{profile.text}</span>
                <span className="mt-1.5 block text-xs text-muted-foreground">Например: {profile.examples}</span>
              </span>
            </span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Не си сигурен? Избери най-близкото, по-късно можеш да го смениш в настройките.</p>
    </fieldset>
    {state.error && <p role="alert" className="bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{state.error}</p>}
    <button disabled={busy} className="inline-flex h-10 w-full items-center justify-center gap-2 bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy && <LoaderCircle className="size-4 animate-spin" />}Създай фирмата</button>
  </form>;
}
