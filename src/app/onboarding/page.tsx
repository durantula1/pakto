import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { organizationMembers, organizations } from "@/db/schema";
import { Building2, Check } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { DeleteAccountDialog, DeletionPendingBanner } from "@/components/settings/account-dialogs";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { ACCOUNT_DELETION_GRACE_DAYS, accountDeletionDate } from "@/lib/legal";
import { getSessionUser, userHasPassword } from "@/lib/auth/server";
import { getAccountSummary } from "@/modules/account/queries";
import type { Metadata } from "next";
import { dateOnly } from "@/lib/dates";

export const metadata: Metadata = { title: "Настрой фирмата" };

const FEATURES = [
  "Оферти с редове, ДДС, отстъпка, срок, график и условия за плащане",
  "Каталог с услуги и материали и шаблони за бързо попълване",
  "Промени след одобрение: допълнителна работа, намаление или само срок",
  "Личен линк за всеки клиент, без регистрация и парола",
  "Одобрение с код от имейла, разписка с PDF и право на оспорване",
  "Въпроси на клиента по офертата на едно място",
  "Версии и история, PDF с логото на фирмата",
  "Вноски, „Платих“ от клиента и потвърждение от теб",
  "Етапи на работата и приемане в края",
  "Клиенти с няколко обекта",
  "Екип с роли и права по обекти",
  "Известия и автоматични напомняния към клиента",
  "Изтегляне на данните по всяко време",
];

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (await getOptionalTenantContext()) redirect("/app");
  const account = await getAccountSummary(user.id);
  // A session that outlived its purged profile: sign it out instead of offering to set up a firm.
  if (!account) redirect("/auth/signed-out");
  const pendingDeletion = account.deletionRequestedAt ?? null;
  const [suspended] = await getDatabase()
    .select({ name: organizations.name })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.status, "disabled")))
    .limit(1);
  const name = user.name;
  return <main className="min-h-screen px-5 py-6"><div className="mx-auto max-w-5xl"><Wordmark /><div className="mt-12 grid overflow-hidden rounded-[2rem] border bg-card shadow-xl shadow-stone-900/5 lg:grid-cols-2"><section className="p-7 sm:p-10"><p className="text-sm font-semibold text-primary-ink">Последна стъпка</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Настрой фирмата</h1><p className="mt-3 text-muted-foreground">Тук ще са клиентите, обектите, офертите и историята на всяко решение.</p>{suspended ? <p role="status" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">Достъпът ти до „{suspended.name}“ е спрян. Свържи се със собственика на фирмата или настрой своя собствена фирма.</p> : null}<OnboardingForm defaultName={name} />{pendingDeletion ? <div className="mt-8"><DeletionPendingBanner deleteOn={dateOnly.format(accountDeletionDate(pendingDeletion))} /></div> : <div className="mt-10 flex flex-col gap-3 border-t pt-6"><p className="text-sm text-muted-foreground">Не искаш да продължиш с Pakto? Можеш да изтриеш профила си.</p><DeleteAccountDialog plan={{ kind: "account" }} graceDays={ACCOUNT_DELETION_GRACE_DAYS} hasPassword={await userHasPassword(user.id)} /></div>}</section><aside className="bg-sidebar p-8 text-stone-100 sm:p-10"><Building2 className="size-10 text-[#ff765f]" /><h2 className="mt-8 text-2xl font-semibold">Какво получаваш веднага</h2><ul className="mt-6 space-y-3 text-sm text-stone-300">{FEATURES.map(item => <li key={item} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-[#ff765f]" />{item}</li>)}</ul></aside></div></div></main>;
}
