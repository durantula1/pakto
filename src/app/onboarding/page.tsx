import { redirect } from "next/navigation";
import { Building2, Check } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { DeleteAccountDialog, DeletionPendingBanner } from "@/components/settings/account-dialogs";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { ACCOUNT_DELETION_GRACE_DAYS, accountDeletionDate } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";
import { getAccountSummary } from "@/modules/account/queries";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/sign-in");
  if (await getOptionalTenantContext()) redirect("/app");
  const pendingDeletion = (await getAccountSummary(data.claims.sub))?.deletionRequestedAt ?? null;
  const name = typeof data.claims.user_metadata === "object" && data.claims.user_metadata && "display_name" in data.claims.user_metadata ? String(data.claims.user_metadata.display_name ?? "") : "";
  return <main className="min-h-screen px-5 py-6"><div className="mx-auto max-w-5xl"><Wordmark /><div className="mt-12 grid overflow-hidden rounded-[2rem] border bg-card shadow-xl shadow-stone-900/5 lg:grid-cols-2"><section className="p-7 sm:p-10"><p className="text-sm font-semibold text-primary">Последна стъпка</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Настрой фирмата</h1><p className="mt-3 text-muted-foreground">Тук ще са клиентите, обектите, офертите и историята на всяко решение.</p><OnboardingForm defaultName={name} />{pendingDeletion ? <div className="mt-8"><DeletionPendingBanner deleteOn={new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeZone: "Europe/Sofia" }).format(accountDeletionDate(pendingDeletion))} /></div> : <div className="mt-10 flex flex-col gap-3 border-t pt-6"><p className="text-sm text-muted-foreground">Не искаш да продължиш с Pakto? Можеш да изтриеш профила си.</p><DeleteAccountDialog plan={{ kind: "account" }} graceDays={ACCOUNT_DELETION_GRACE_DAYS} /></div>}</section><aside className="bg-sidebar p-8 text-stone-100 sm:p-10"><Building2 className="size-10 text-[#ff765f]" /><h2 className="mt-8 text-2xl font-semibold">Какво получаваш веднага</h2><ul className="mt-6 space-y-4 text-sm text-stone-300">{["Оферти, а след одобрение — промени по тях","Поредни номера на офертите и промените","Личен линк за всеки клиент, без регистрация","Всяка версия и всяко „да“ остават записани"].map(item => <li key={item} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-[#ff765f]" />{item}</li>)}</ul></aside></div></div></main>;
}
