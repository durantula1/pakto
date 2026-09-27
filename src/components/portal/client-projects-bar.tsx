"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Building2, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { startNavigationProgress } from "@/components/workspace/navigation-progress";
import { Input } from "@/components/ui/input";
import { confirmUnlockCodeAction, requestUnlockCodeAction, type UnlockState } from "@/modules/change-portal/client-session-actions";

/**
 * In the project header: "← Вашите обекти" once the session is unlocked, else one quiet row that
 * sends a code to the confirmed email (docs/clients-plan.md, 6.3). It never names the other projects.
 */
export function ClientProjectsBar({ projectPublicId, organizationName, navigation }: {
  projectPublicId: string;
  organizationName: string;
  navigation: { unlocked: true; others: number; projects: { publicId: string; name: string; current: boolean }[] } | { unlocked: false; others: number; maskedEmail: string };
}) {
  const [requestState, request, requesting] = useActionState<UnlockState, FormData>(requestUnlockCodeAction, {});
  const [confirmState, confirm, confirming] = useActionState<UnlockState, FormData>(confirmUnlockCodeAction, {});
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (navigation.unlocked || confirmState.done || requestState.done) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/portal" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 font-semibold text-white hover:bg-white/15"><ArrowLeft className="size-4" /> Вашите обекти</Link>
        {navigation.unlocked && navigation.projects.length > 1 ? (
          <DropdownMenuTrigger>
            <Button type="button" variant="ghost" className="h-8 gap-1.5 rounded-lg px-2.5 text-sidebar-foreground hover:bg-white/10 hover:text-white"><ArrowLeftRight className="size-4" /> Смени обект</Button>
            <DropdownMenu
              placement="bottom start"
              className="min-w-64"
              onAction={(key) => {
                const href = `/portal/${String(key)}`;
                startNavigationProgress(href);
                router.push(href);
              }}
            >
              {navigation.projects.map((project) => (
                <DropdownMenuItem key={project.publicId} id={project.publicId} textValue={project.name} isDisabled={project.current} className="min-h-11 gap-2">
                  {project.current ? <Check className="size-4" /> : <span className="size-4" />} {project.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenu>
          </DropdownMenuTrigger>
        ) : null}
        {confirmState.done ? <span role="status" className="text-sidebar-foreground/70">Готово. Вече виждате всичките си обекти.</span> : null}
      </div>
    );
  }
  // Any code the client enters (a decision, too) opens all projects; this is only for looking without deciding.
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-sidebar-foreground/70 underline-offset-4 hover:text-white hover:underline">
        <Building2 className="size-4" /> Покажи всичките ми обекти
      </button>
    );
  }

  const otpId = confirmState.otpId ?? requestState.otpId;
  const error = confirmState.error ?? requestState.error;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Building2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p>Ще изпратим код на имейла ви. След него тук виждате всичките си обекти при {organizationName}.</p>
        {otpId ? (
          <form action={confirm} className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="projectPublicId" value={projectPublicId} />
            <input type="hidden" name="otpId" value={otpId} />
            <Input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required placeholder="6 цифри" aria-label="Код от имейла" className="h-9 w-28 bg-white text-foreground" />
            <Button type="submit" isDisabled={confirming} className="h-9">{confirming ? "Проверка…" : "Потвърди"}</Button>
            <span className="text-sidebar-foreground/60">Изпратихме код на {requestState.sentTo ?? navigation.maskedEmail}</span>
          </form>
        ) : (
          <form action={request} className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="projectPublicId" value={projectPublicId} />
            <Button type="submit" isDisabled={requesting} className="h-9">{requesting ? "Изпращане…" : "Изпрати код"}</Button>
            <span className="text-sidebar-foreground/60">{navigation.maskedEmail}</span>
          </form>
        )}
        {error ? <p role="alert" className="mt-2 text-primary">{error}</p> : null}
      </div>
      <button type="button" onClick={() => setOpen(false)} aria-label="Затвори" className="rounded p-1 text-sidebar-foreground/50 hover:text-white"><X className="size-4" /></button>
    </div>
  );
}
