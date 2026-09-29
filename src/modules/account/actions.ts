"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db";
import { organizationMembers, organizations, profiles, projectMembers, projects, staffNotifications } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { escapeHtml, sendEmail } from "@/lib/email/send";
import { getPublicEnvironment } from "@/lib/env/public";
import { accountDeletionDate } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";
import { recordLegalConsent } from "@/modules/account/mutations";
import { getAccountDeletionPlan, getLeaveBlocker } from "@/modules/account/queries";

type ActionResult = { error?: string } | void;

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Сесията е изтекла. Влез отново.");
  const displayName = String(user.user_metadata?.display_name ?? user.email.split("@")[0]);
  return { supabase, user: { id: user.id, email: user.email, displayName } };
}

/** Checks the password without touching the browser session: the throwaway session is revoked at once. */
async function passwordMatches(email: string, password: string) {
  const environment = getPublicEnvironment();
  const client = createStatelessClient(environment.NEXT_PUBLIC_SUPABASE_URL, environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return false;
  await client.auth.signOut({ scope: "local" });
  return true;
}

const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Името трябва да е поне 2 символа.").max(100),
  phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/, "Телефонът съдържа невалидни символи."),
});

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { userId } = await requireTenantContext();
  await getDatabase().update(profiles)
    .set({ displayName: parsed.data.displayName, phone: parsed.data.phone || null, updatedAt: new Date() })
    .where(eq(profiles.id, userId));
  revalidatePath("/app", "layout");
}

export async function changeEmailAction(formData: FormData): Promise<ActionResult> {
  const email = z.email("Въведи валиден имейл адрес.").safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: email.error.issues[0]?.message };
  const { supabase, user } = await currentUser();
  if (email.data === user.email.toLowerCase()) return { error: "Това е текущият ти имейл." };
  const { error } = await supabase.auth.updateUser(
    { email: email.data },
    { emailRedirectTo: `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/auth/callback?next=/app/settings` },
  );
  if (error) return { error: "Имейлът не беше сменен. Може вече да се използва от друг профил." };
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Въведи текущата парола."),
  password: z.string().min(8, "Новата парола трябва да е поне 8 символа."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { message: "Новите пароли не съвпадат." });

export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { supabase, user } = await currentUser();
  if (!(await passwordMatches(user.email, parsed.data.currentPassword))) return { error: "Текущата парола не е правилна." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.code === "same_password" ? "Новата парола трябва да е различна от старата." : "Паролата не беше сменена. Опитай отново." };
}

export async function signOutEverywhereAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/sign-in");
}

export async function leaveOrganizationAction(): Promise<ActionResult> {
  const context = await requireTenantContext();
  const blocker = await getLeaveBlocker(context.userId);
  if (blocker) return { error: blocker.message };
  await getDatabase().transaction(async (tx) => {
    // Same lock as owner role changes, so the last two owners cannot leave at the same time.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${context.organizationId}))`);
    const owners = await tx.select({ userId: organizationMembers.userId }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.role, "owner"), eq(organizationMembers.status, "active")));
    const remainingOwners = owners.filter((owner) => owner.userId !== context.userId);
    if (!remainingOwners.length) throw new Error("Фирмата трябва да има поне един собственик.");
    await tx.update(organizationMembers).set({ status: "disabled", permissions: [], allProjects: false })
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, context.userId)));
    const orgProjects = await tx.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, context.organizationId));
    if (orgProjects.length) await tx.delete(projectMembers).where(and(eq(projectMembers.userId, context.userId), inArray(projectMembers.projectId, orgProjects.map((item) => item.id))));
    const [me] = await tx.select({ displayName: profiles.displayName }).from(profiles).where(eq(profiles.id, context.userId)).limit(1);
    await tx.insert(staffNotifications).values(remainingOwners.map((owner) => ({
      organizationId: context.organizationId, userId: owner.userId, eventType: "member_left",
      title: `${me?.displayName ?? "Член на екипа"} напусна фирмата`, href: "/app/team",
    })));
  });
  revalidatePath("/app", "layout");
  redirect("/onboarding");
}

const deletionSchema = z.object({
  password: z.string().min(1, "Въведи паролата си."),
  confirmation: z.string().trim(),
  organizationName: z.string().trim().optional(),
});

export async function requestAccountDeletionAction(formData: FormData): Promise<ActionResult> {
  const parsed = deletionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (parsed.data.confirmation.toUpperCase() !== "ИЗТРИЙ") return { error: "Напиши ИЗТРИЙ, за да потвърдиш." };
  const { supabase, user } = await currentUser();
  const plan = await getAccountDeletionPlan(user.id);
  if (plan.kind === "blocked") return { error: plan.message };
  if (plan.kind === "account_and_company" && parsed.data.organizationName?.toLocaleLowerCase("bg") !== plan.organizationName.trim().toLocaleLowerCase("bg")) {
    return { error: "Напиши точното име на фирмата, за да потвърдиш закриването ѝ." };
  }
  if (!(await passwordMatches(user.email, parsed.data.password))) return { error: "Паролата не е правилна." };
  const requestedAt = new Date();
  await getDatabase().transaction(async (tx) => {
    // A user who never finished onboarding has no profile row yet; the purge job still needs one.
    await tx.insert(profiles)
      .values({ id: user.id, displayName: user.displayName, email: user.email.toLowerCase(), deletionRequestedAt: requestedAt })
      .onConflictDoUpdate({ target: profiles.id, set: { deletionRequestedAt: requestedAt, updatedAt: requestedAt } });
    if (plan.kind === "account_and_company") {
      await tx.update(organizations).set({ closureRequestedAt: requestedAt, updatedAt: requestedAt }).where(eq(organizations.id, plan.organizationId));
    }
  });
  const companyName = plan.kind === "account_and_company" ? plan.organizationName : null;
  await sendDeletionScheduledEmail(user.email, accountDeletionDate(requestedAt), companyName).catch(() => undefined);
  await supabase.auth.signOut({ scope: "global" });
  redirect("/sign-in?account=deletion-scheduled");
}

export async function cancelAccountDeletionAction(): Promise<ActionResult> {
  const { user } = await currentUser();
  const now = new Date();
  await getDatabase().transaction(async (tx) => {
    await tx.update(profiles).set({ deletionRequestedAt: null, updatedAt: now })
      .where(and(eq(profiles.id, user.id), sql`${profiles.deletedAt} is null`));
    // Reopen any company this user's request was going to close.
    const owned = tx.select({ id: organizationMembers.organizationId }).from(organizationMembers)
      .where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.role, "owner"), eq(organizationMembers.status, "active")));
    await tx.update(organizations).set({ closureRequestedAt: null, updatedAt: now })
      .where(and(inArray(organizations.id, owned), sql`${organizations.closureRequestedAt} is not null`));
  });
  revalidatePath("/app", "layout");
  revalidatePath("/onboarding");
}

/** For accounts created before consents were recorded, or after a new document version. */
export async function acceptLegalDocumentsAction(): Promise<ActionResult> {
  const { user } = await currentUser();
  await recordLegalConsent(user.id);
  revalidatePath("/app/settings/privacy");
}

async function sendDeletionScheduledEmail(to: string, deleteOn: Date, companyName: string | null) {
  const date = deleteOn.toLocaleDateString("bg-BG", { timeZone: "Europe/Sofia" });
  const link = `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/sign-in`;
  const what = companyName ? `Профилът ти и фирмата „${companyName}“ с всички обекти, оферти и плащания ще бъдат изтрити` : "Профилът ще бъде изтрит";
  await sendEmail({
    to,
    subject: "Профилът ти в Pakto ще бъде изтрит",
    text: `Получихме заявка за изтриване на профила ти в Pakto.\n\n${what} окончателно на ${date}. Ако заявката не е от теб или си промениш решението, влез до тази дата и натисни „Отмени изтриването“: ${link}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px;color:#102b38"><p>Получихме заявка за изтриване на профила ти в Pakto.</p><p>${escapeHtml(what)} окончателно на <strong>${escapeHtml(date)}</strong>.</p><p style="color:#5b6b70;font-size:14px">Ако заявката не е от теб или си промениш решението, <a href="${link}">влез</a> до тази дата и натисни „Отмени изтриването“.</p></div>`,
  });
}
