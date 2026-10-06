import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ChangeEmailDialog, ChangePasswordDialog, SignOutEverywhereDialog } from "@/components/settings/account-dialogs";
import { AutoSaveForm, AutoSaveStatus } from "@/components/settings/auto-save-form";
import { SettingsGroup, SettingsRow } from "@/components/settings/settings-group";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { roleLabel } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { getSessionUser, userHasPassword } from "@/lib/auth/server";
import { updateProfileAction } from "@/modules/account/actions";
import { syncProfileEmail } from "@/modules/account/mutations";
import { getAccountProfile } from "@/modules/account/queries";

export const metadata: Metadata = { title: "Профил и вход · Настройки" };

const since = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric", timeZone: "Europe/Sofia" });

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]![0] : "")).toUpperCase() || "?";
}

export default async function ProfileSettingsPage({ searchParams }: PageProps<"/app/settings">) {
  const query = await searchParams;
  if (typeof query.invite === "string") redirect(`/app/team?invite=${encodeURIComponent(query.invite)}`);
  const context = await requireTenantContext();
  const [user, profile, hasPassword] = await Promise.all([getSessionUser(), getAccountProfile(context.userId), userHasPassword(context.userId)]);
  const email = user?.email?.toLowerCase() ?? profile?.email ?? "";
  // A confirmed email change lands here; keep the copy the team sees in sync with Auth.
  if (profile && email && profile.email !== email) await syncProfileEmail(context.userId, email);
  const name = profile?.displayName ?? email;

  return <>
    {/* Who you are, before any field: the same name and role the team sees. */}
    <div className="flex items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-lg font-semibold text-primary-ink">{initials(name)}</span>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold">{name}</p>
        <p className="truncate text-sm text-muted-foreground">{email}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{roleLabel(context)}</Badge>
          <Badge variant="outline">{context.organizationName}</Badge>
          {profile?.createdAt ? <Badge variant="outline" className="text-muted-foreground">В Pakto от {since.format(profile.createdAt)}</Badge> : null}
        </div>
      </div>
    </div>

    <AutoSaveForm action={updateProfileAction}>
      <SettingsGroup title="Лични данни" description="Така те виждат колегите в екипа и в историята на офертите. Промените се запазват автоматично." action={<AutoSaveStatus />}>
        <SettingsRow label="Име" htmlFor="profile-name">
          <Input id="profile-name" name="displayName" defaultValue={profile?.displayName ?? ""} required minLength={2} maxLength={100} autoComplete="name" className="h-9 @xl:max-w-sm" />
        </SettingsRow>
        <SettingsRow label="Телефон" description="По желание. Вижда се само от екипа." htmlFor="profile-phone">
          <Input id="profile-phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} maxLength={30} autoComplete="tel" placeholder="+359 …" className="h-9 @xl:max-w-sm" />
        </SettingsRow>
      </SettingsGroup>
    </AutoSaveForm>

    <SettingsGroup id="sign-in" title="Вход и сигурност">
      <SettingsRow
        label="Имейл за вход"
        align="end"
      >
        <span className="min-w-0 truncate text-muted-foreground">{email}</span>
        <ChangeEmailDialog />
      </SettingsRow>
      {hasPassword ? (
        <SettingsRow label="Парола" description="Поне 8 символа." align="end">
          <span aria-label="Скрита парола" className="tracking-widest text-muted-foreground">••••••••</span>
          <ChangePasswordDialog />
        </SettingsRow>
      ) : (
        <SettingsRow label="Парола" description="Влизаш с Google. Ако искаш и парола, ще ти изпратим линк, с който да я зададеш." align="end">
          <Link href="/forgot-password" className="inline-flex h-9 items-center rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted">Задай парола</Link>
        </SettingsRow>
      )}
      <SettingsRow label="Всички устройства" description="Влизал ли си от чуждо устройство? Излез навсякъде наведнъж." align="end">
        <SignOutEverywhereDialog />
      </SettingsRow>
    </SettingsGroup>
  </>;
}
