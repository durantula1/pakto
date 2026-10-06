"use client";

import { CheckCircle2, TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";

import { ProjectScope } from "@/components/team/project-scope";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CopyLink } from "@/components/workspace/copy-link";
import type { ProjectOption } from "@/components/workspace/project-combobox";
import { PRESETS, type PresetKey } from "@/lib/authz/permissions";
import { cn } from "@/lib/utils";
import { createTeamInviteAction, type InviteState } from "@/modules/team/actions";
import { useKeepFormValues } from "@/lib/use-keep-form-values";

export function InviteForm({ allowOwnerInvite }: { allowOwnerInvite: boolean }) {
  const [round, setRound] = useState(0);
  return <InviteFormInner key={round} allowOwnerInvite={allowOwnerInvite} onReset={() => setRound((value) => value + 1)} />;
}

function InviteFormInner({ allowOwnerInvite, onReset }: { allowOwnerInvite: boolean; onReset: () => void }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(createTeamInviteAction, {});
  const formRef = useKeepFormValues(state);
  const [email, setEmail] = useState("");
  const [preset, setPreset] = useState<PresetKey | "owner">("field");
  const [allProjects, setAllProjects] = useState(false);
  const [selected, setSelected] = useState<ProjectOption[]>([]);

  if (state.link) {
    return <div className="flex flex-col gap-4 px-4 pb-8">
      {state.sentTo ? (
        <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary-ink" />
          <div><p className="font-semibold">Поканата е изпратена</p><p className="text-sm text-muted-foreground">Имейл до {state.sentTo}. Линкът работи само с този имейл и е валиден 7 дни.</p></div>
        </div>
      ) : (
        <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div><p className="font-semibold">Поканата е създадена, но имейлът не тръгна</p><p className="text-sm text-muted-foreground">{state.emailError} Копирай линка и го изпрати сам.</p></div>
        </div>
      )}
      <div className="flex flex-col gap-1.5"><p className="text-sm font-medium">Резервен линк</p><CopyLink url={state.link} /></div>
      <Button type="button" variant="outline" onPress={onReset}>Покани още някой</Button>
    </div>;
  }

  const options: { key: PresetKey | "owner"; label: string; description: string }[] = [
    { key: "field", ...PRESETS.field },
    { key: "office", ...PRESETS.office },
    ...(allowOwnerInvite ? [{ key: "owner" as const, label: "Собственик", description: "Пълен достъп, включително екип и настройки." }] : []),
  ];

  return <form noValidate ref={formRef} action={action} className="flex flex-col gap-5 px-4 pb-8">
    <Field><FieldLabel htmlFor="invite-email">Имейл</FieldLabel><Input id="invite-email" type="email" name="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ivan@firma.bg" /></Field>
    <input type="hidden" name="preset" value={preset} />
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Роля</p>
      <div role="radiogroup" aria-label="Роля" className="grid gap-2">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={preset === option.key}
            onClick={() => setPreset(option.key)}
            className={cn("flex flex-col items-start rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/50", preset === option.key && "border-primary bg-primary/5 ring-2 ring-primary/30")}
          >
            <span className="font-semibold">{option.label}</span>
            <span className="text-sm text-muted-foreground">{option.description}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Детайлните права се настройват след като човекът приеме.</p>
    </div>
    {preset !== "owner" ? <div className="flex flex-col gap-2"><p className="text-sm font-medium">Обекти</p><ProjectScope allProjects={allProjects} selected={selected} onAllProjectsChange={setAllProjects} onSelectedChange={setSelected} /></div> : null}
    {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
    <Button type="submit" className="w-full" isDisabled={pending}>{pending ? "Изпращане…" : "Изпрати поканата"}</Button>
  </form>;
}
