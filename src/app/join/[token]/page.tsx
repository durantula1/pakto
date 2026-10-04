import Link from "next/link";
import { Check } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { PERMISSION_GROUPS, can, roleLabel } from "@/lib/authz/permissions";
import { hashPortalToken } from "@/lib/crypto/portal-token";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { acceptTeamInviteAction } from "@/modules/team/actions";
import { getTeamInvite } from "@/modules/team/queries";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Покана в екип" };

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-dvh place-items-center bg-background p-4">
    <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="bg-sidebar px-6 py-5"><Wordmark inverse href={null} /></div>
      <div className="flex flex-col gap-5 p-6">{children}</div>
    </div>
  </main>;
}

const buttonClass = "inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold";

export default async function JoinTeamPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const invite = await getTeamInvite(hashPortalToken(token));
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) {
    return <Shell><h1 className="text-2xl font-semibold tracking-tight">Поканата не е активна</h1><p className="text-muted-foreground">Линкът е използван, отменен или изтекъл. Поискай нова покана от фирмата.</p></Shell>;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const next = encodeURIComponent(`/join/${token}`);
  const granted = PERMISSION_GROUPS.flatMap((group) => group.items).filter((item) => can(invite, item.key));

  const summary = <>
    <div>
      <p className="text-sm font-semibold text-primary">Покана за екипа</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{invite.organizationName}</h1>
      <p className="mt-2 text-muted-foreground">{invite.inviterName ? `${invite.inviterName} те кани` : "Поканен си"} като <strong className="text-foreground">{roleLabel(invite)}</strong>.</p>
    </div>
    <div className="rounded-xl bg-secondary p-4 text-sm">
      <p className="font-medium">Обекти: {invite.role === "owner" || invite.allProjects ? "всички" : invite.projectIds.length ? `${invite.projectIds.length} избрани` : "ще бъдат добавени"}</p>
      <ul className="mt-2 grid gap-1">
        {granted.map((item) => <li key={item.key} className="flex items-center gap-2"><Check className="size-4 text-primary" />{item.label}</li>)}
      </ul>
    </div>
  </>;

  if (!user) {
    return <Shell>
      {summary}
      <p className="text-sm text-muted-foreground">Влез или се регистрирай с <strong className="text-foreground">{invite.email}</strong>.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link className={`${buttonClass} bg-primary text-primary-foreground`} href={`/sign-up?next=${next}`}>Регистрация</Link>
        <Link className={`${buttonClass} border bg-card`} href={`/sign-in?next=${next}`}>Вход</Link>
      </div>
    </Shell>;
  }
  if (user.email?.toLowerCase() !== invite.email) {
    return <Shell>
      {summary}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-semibold">Влязъл си като {user.email}</p>
        <p className="mt-1 text-muted-foreground">Поканата е за {invite.email}. Излез и влез с този имейл.</p>
      </div>
    </Shell>;
  }
  return <Shell>
    {summary}
    <ActionForm action={acceptTeamInviteAction} success="Поканата е приета" redirects className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <ActionSubmit className="w-full">Приеми поканата</ActionSubmit>
    </ActionForm>
  </Shell>;
}
