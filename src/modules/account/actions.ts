"use server";

import { isAPIError } from "better-auth/api";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { organizationMembers, organizations, profiles, projectMembers, projects, staffNotifications } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { escapeHtml, sendEmail } from "@/lib/email/send";
import { getPublicEnvironment } from "@/lib/env/public";
import { accountDeletionDate } from "@/lib/legal";
import { auth, getSessionUser, signOutEverywhere, userHasPassword, verifyUserPassword } from "@/lib/auth/server";
import { recordLegalConsent } from "@/modules/account/mutations";
import { getAccountDeletionPlan, getLeaveBlocker } from "@/modules/account/queries";

type ActionResult = { error?: string } | void;

async function currentUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("Сесията е изтекла. Влез отново.");
  return { user: { id: user.id, email: user.email, displayName: user.name || user.email.split("@")[0]! } };
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

const welcomeTargets = ["/app", "/app/projects/new", "/app/offers/new", "/app/guide"] as const;

/** Marks the welcome screens as seen (finished or skipped) and opens where the user chose. */
export async function finishWelcomeAction(formData: FormData) {
  const next = z.enum(welcomeTargets).catch("/app").parse(formData.get("next"));
  const { user } = await currentUser();
  await getDatabase().update(profiles)
    .set({ welcomeSeenAt: new Date(), updatedAt: new Date() })
    .where(and(eq(profiles.id, user.id), isNull(profiles.welcomeSeenAt)));
  revalidatePath("/app", "layout");
  redirect(next);
}

export async function changeEmailAction(formData: FormData): Promise<ActionResult> {
  const email = z.email("Въведи валиден имейл адрес.").safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: email.error.issues[0]?.message };
  const { user } = await currentUser();
  if (email.data === user.email.toLowerCase()) return { error: "Това е текущият ти имейл." };
  // The address changes only after the link sent to the new address is opened.
  try {
    await auth.api.changeEmail({
      body: { newEmail: email.data, callbackURL: `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/auth/callback?next=/app/settings` },
      headers: await headers(),
    });
  } catch {
    return { error: "Имейлът не беше сменен. Може вече да се използва от друг профил." };
  }
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Въведи текущата парола."),
  password: z.string().min(8, "Новата парола трябва да е поне 8 символа."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { message: "Новите пароли не съвпадат." });

export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  await currentUser();
  if (parsed.data.password === parsed.data.currentPassword) return { error: "Новата парола трябва да е различна от старата." };
  if (parsed.data.password.length > 72) return { error: "Паролата може да е до 72 символа." };
  try {
    // Other devices are signed out; this one keeps a fresh session.
    await auth.api.changePassword({
      body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.password, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (error) {
    if (isAPIError(error) && error.body?.code === "INVALID_PASSWORD") return { error: "Текущата парола не е правилна." };
    return { error: "Паролата не беше сменена. Опитай отново." };
  }
}

export async function signOutEverywhereAction() {
  await signOutEverywhere();
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
  password: z.string().optional(),
  confirmation: z.string().trim(),
  organizationName: z.string().trim().optional(),
});

export async function requestAccountDeletionAction(formData: FormData): Promise<ActionResult> {
  const parsed = deletionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (parsed.data.confirmation.toUpperCase() !== "ИЗТРИЙ") return { error: "Напиши ИЗТРИЙ, за да потвърдиш." };
  const { user } = await currentUser();
  const plan = await getAccountDeletionPlan(user.id);
  if (plan.kind === "blocked") return { error: plan.message };
  if (plan.kind === "account_and_company" && parsed.data.organizationName?.toLocaleLowerCase("bg") !== plan.organizationName.trim().toLocaleLowerCase("bg")) {
    return { error: "Напиши точното име на фирмата, за да потвърдиш закриването ѝ." };
  }
  // An account made with Google has no password; the open session and typing ИЗТРИЙ confirm it.
  if (await userHasPassword(user.id)) {
    if (!parsed.data.password) return { error: "Въведи паролата си." };
    if (!(await verifyUserPassword(user.id, parsed.data.password))) return { error: "Паролата не е правилна." };
  }
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
  await signOutEverywhere();
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
  revalidatePath("/app", "layout");
}

async function sendDeletionScheduledEmail(to: string, deleteOn: Date, companyName: string | null) {
  const date = deleteOn.toLocaleDateString("bg-BG", { timeZone: "Europe/Sofia" }).replace(/\.$/, "");
  const link = `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/sign-in`;
  const what = companyName ? `Профилът ти и фирмата „${companyName}“ с всички обекти, оферти и плащания ще бъдат изтрити` : "Профилът ще бъде изтрит";
  await sendEmail({
    kind: "account_deletion",
    to,
    subject: "Профилът ти в Pakto ще бъде изтрит",
    text: `Получихме заявка за изтриване на профила ти в Pakto.\n\n${what} окончателно на ${date}. Ако заявката не е от теб или си промениш решението, влез до тази дата и натисни „Отмени изтриването“: ${link}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px;color:#102b38"><p>Получихме заявка за изтриване на профила ти в Pakto.</p><p>${escapeHtml(what)} окончателно на <strong>${escapeHtml(date)}</strong>.</p><p style="color:#5b6b70;font-size:14px">Ако заявката не е от теб или си промениш решението, <a href="${link}">влез</a> до тази дата и натисни „Отмени изтриването“.</p></div>`,
  });
}
