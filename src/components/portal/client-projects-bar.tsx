"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Building2, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { startNavigationProgress } from "@/components/workspace/navigation-progress";
import { OtpInput } from "@/components/portal/otp-input";
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
        <Link href="/portal" className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-sidebar px-3.5 font-semibold text-white hover:bg-sidebar/90"><ArrowLeft className="size-4" /> Вашите обекти</Link>
        {navigation.unlocked && navigation.projects.length > 1 ? (
          <DropdownMenuTrigger>
            <Button type="button" variant="outline" className="h-11 gap-1.5 rounded-xl bg-card px-3.5 text-sm"><ArrowLeftRight className="size-4" /> Смени обект</Button>
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
        {confirmState.done ? <span role="status" className="text-muted-foreground">Готово. Вече виждате всичките си обекти.</span> : null}
      </div>
    );
  }
  // Any code the client enters (a decision, too) opens all projects; this is only for looking without deciding.
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        <Building2 className="size-4" /> Покажи всичките ми обекти
      </button>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-xl bg-sidebar px-4 py-3 text-sm text-sidebar-foreground">
      <Building2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p>Ще изпратим код на имейла ви. След него тук виждате всичките си обекти при {organizationName}.</p>
        <UnlockCodeForms projectPublicId={projectPublicId} maskedEmail={navigation.maskedEmail} request={request} requestState={requestState} requesting={requesting} confirm={confirm} confirmState={confirmState} confirming={confirming} />
      </div>
      <button type="button" onClick={() => setOpen(false)} aria-label="Затвори" className="-m-2 grid size-11 place-items-center rounded text-sidebar-foreground/50 hover:text-white"><X className="size-4" /></button>
    </div>
  );
}

function UnlockCodeForms({ projectPublicId, maskedEmail, request, requestState, requesting, confirm, confirmState, confirming }: {
  projectPublicId: string;
  maskedEmail: string;
  request: (formData: FormData) => void;
  requestState: UnlockState;
  requesting: boolean;
  confirm: (formData: FormData) => void;
  confirmState: UnlockState;
  confirming: boolean;
}) {
  const otpId = confirmState.otpId ?? requestState.otpId;
  const error = confirmState.error ?? requestState.error;
  return (
    <>
      {otpId ? (
        <form action={confirm} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="projectPublicId" value={projectPublicId} />
          <input type="hidden" name="otpId" value={otpId} />
          <span className="text-sidebar-foreground/70">Изпратихме код на {requestState.sentTo ?? maskedEmail}</span>
          <OtpInput label="Код от имейла" autoFocus disabled={confirming} className="text-foreground" />
          <Button type="submit" isDisabled={confirming} className="h-11 self-start px-5 text-sm">{confirming ? "Проверка…" : "Потвърди"}</Button>
        </form>
      ) : (
        <form action={request} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="projectPublicId" value={projectPublicId} />
          <Button type="submit" isDisabled={requesting} className="h-11 px-5 text-sm">{requesting ? "Изпращане…" : "Изпрати код"}</Button>
          <span className="text-sidebar-foreground/60">{maskedEmail}</span>
        </form>
      )}
      {error ? <p role="alert" className="mt-2 text-primary">{error}</p> : null}
    </>
  );
}

/**
 * On the dashboard of a locked session: the other projects stay hidden until the client enters a code
 * sent to their confirmed email. Without a confirmed email it only says where to confirm it.
 */
export function UnlockProjectsCard({ projectPublicId, hidden, maskedEmail }: { projectPublicId: string; hidden: number; maskedEmail: string | null }) {
  const [requestState, request, requesting] = useActionState<UnlockState, FormData>(requestUnlockCodeAction, {});
  const [confirmState, confirm, confirming] = useActionState<UnlockState, FormData>(confirmUnlockCodeAction, {});
  const router = useRouter();
  useEffect(() => {
    if (confirmState.done || requestState.done) router.refresh();
  }, [confirmState.done, requestState.done, router]);

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-sidebar px-4 py-4 text-sm text-sidebar-foreground">
      <Building2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">{hidden === 1 ? "Имате още 1 обект" : `Имате още ${hidden} обекта`}</p>
        {confirmState.done || requestState.done ? (
          <p role="status" className="mt-1">Готово. Зареждаме всичките ви обекти…</p>
        ) : maskedEmail ? (
          <>
            <p className="mt-1">За да ги видите тук, въведете код, който ще изпратим на имейла ви.</p>
            <UnlockCodeForms projectPublicId={projectPublicId} maskedEmail={maskedEmail} request={request} requestState={requestState} requesting={requesting} confirm={confirm} confirmState={confirmState} confirming={confirming} />
          </>
        ) : (
          <p className="mt-1">Ще ги видите тук, след като потвърдите имейла си в някой обект.</p>
        )}
      </div>
    </div>
  );
}
