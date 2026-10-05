"use server";

import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import {
  organizationMembers, ownerRoleRequests, profiles, projectMembers,
  projects, staffNotifications, teamInvites,
} from "@/db/schema";
import { PERMISSION_KEYS, PRESETS, presetOf, sortPermissions } from "@/lib/authz/permissions";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { createPortalToken, hashPortalToken } from "@/lib/crypto/portal-token";
import { escapeHtml, maskEmail, sendEmail } from "@/lib/email/send";
import { getPublicEnvironment } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";

export type InviteState = { error?: string; link?: string; sentTo?: string; emailError?: string };
export type MemberAccessState = { error?: string; savedAt?: number };

async function checkedProjectIds(organizationId: string, values: FormDataEntryValue[]) {
  const ids = z.array(z.uuid()).parse(values.map(String));
  if (!ids.length) return ids;
  const rows = await getDatabase().select({ id: projects.id }).from(projects)
    .where(and(eq(projects.organizationId, organizationId), inArray(projects.id, ids)));
  if (rows.length !== new Set(ids).size) throw new Error("Един от обектите вече не е наличен. Презареди страницата.");
  return [...new Set(ids)];
}

async function projectScope(organizationId: string, formData: FormData) {
  const allProjects = formData.get("scope") === "all";
  return { allProjects, projectIds: allProjects ? [] : await checkedProjectIds(organizationId, formData.getAll("projectIds")) };
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return "Провери въведените данни.";
  return error instanceof Error ? error.message : "Действието не беше завършено.";
}

export async function createTeamInviteAction(_: InviteState, formData: FormData): Promise<InviteState> {
  try {
    const context = await requireTenantContext();
    await requireOwner(context);
    const email = z.email("Провери имейла, нещо в него не е наред.").parse(String(formData.get("email") ?? "").trim().toLowerCase());
    const preset = z.enum(["field", "office", "owner"]).parse(formData.get("preset"));
    const scope = preset === "owner" ? { allProjects: false, projectIds: [] } : await projectScope(context.organizationId, formData);
    if (preset !== "owner" && !scope.allProjects && !scope.projectIds.length) return { error: "Избери поне един обект или „Всички обекти“." };
    const db = getDatabase();
    if (preset === "owner") {
      const owners = await db.select({ userId: organizationMembers.userId }).from(organizationMembers)
        .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.role, "owner"), eq(organizationMembers.status, "active")));
      if (owners.length !== 1) return { error: "Нов собственик се добавя чрез предложение и потвърждение от втори собственик." };
    }
    const [existing] = await db.select({ userId: organizationMembers.userId }).from(organizationMembers)
      .innerJoin(profiles, eq(profiles.id, organizationMembers.userId))
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.status, "active"), eq(profiles.email, email))).limit(1);
    if (existing) return { error: "Този човек вече е в екипа." };
    const [inviter] = await db.select({ displayName: profiles.displayName }).from(profiles).where(eq(profiles.id, context.userId)).limit(1);
    const token = createPortalToken();
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    await db.transaction(async (tx) => {
      await tx.update(teamInvites).set({ revokedAt: new Date() })
        .where(and(eq(teamInvites.organizationId, context.organizationId), eq(teamInvites.email, email), isNull(teamInvites.acceptedAt), isNull(teamInvites.revokedAt)));
      await tx.insert(teamInvites).values({
        organizationId: context.organizationId, email, role: preset,
        permissions: preset === "owner" ? [] : [...PRESETS[preset].permissions],
        allProjects: scope.allProjects, projectIds: scope.projectIds,
        tokenHash: token.tokenHash, createdBy: context.userId, expiresAt,
      });
    });
    revalidatePath("/app/team");
    const link = `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/join/${token.token}`;
    try {
      await sendInviteEmail({ to: email, link, organizationName: context.organizationName, inviterName: inviter?.displayName ?? null, roleLabel: preset === "owner" ? "Собственик" : PRESETS[preset].label, expiresAt });
      return { link, sentTo: maskEmail(email) };
    } catch (error) {
      return { link, emailError: errorMessage(error) };
    }
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

async function sendInviteEmail(input: { to: string; link: string; organizationName: string; inviterName: string | null; roleLabel: string; expiresAt: Date }) {
  const who = input.inviterName ? `${input.inviterName} от ${input.organizationName}` : input.organizationName;
  const until = input.expiresAt.toLocaleDateString("bg-BG", { timeZone: "Europe/Sofia" }).replace(/\.$/, "");
  await sendEmail({
    to: input.to,
    subject: `${input.organizationName} те кани в Pakto`,
    text: `Здравей!\n\n${who} те кани в екипа в Pakto като „${input.roleLabel}“.\n\nПриеми поканата: ${input.link}\n\nЛинкът е валиден до ${until} и работи само с профил на ${input.to}.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px;color:#102b38"><p>Здравей!</p><p>${escapeHtml(who)} те кани в екипа в Pakto като <strong>${escapeHtml(input.roleLabel)}</strong>.</p><p><a href="${input.link}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#ff765f;color:#102b38;text-decoration:none;font-weight:600">Приеми поканата</a></p><p style="color:#5b6b70;font-size:14px">Линкът е валиден до ${until} и работи само с профил на ${escapeHtml(input.to)}. Ако не очакваш тази покана, игнорирай имейла.</p></div>`,
  });
}

class InviteError extends Error {}

/** Expected failures come back as `{ error }`: a thrown message is hidden in production and the person sees an English error page. */
export async function acceptTeamInviteAction(formData: FormData): Promise<{ error: string } | undefined> {
  const token = z.string().min(20).parse(formData.get("token"));
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.id || !user.email || !user.email_confirmed_at) return { error: "Потвърди имейла си и влез отново." };
  const db = getDatabase();
  try {
  await db.transaction(async (tx) => {
    const [invite] = await tx.select().from(teamInvites)
      .where(and(eq(teamInvites.tokenHash, hashPortalToken(token)), isNull(teamInvites.acceptedAt), isNull(teamInvites.revokedAt), gt(teamInvites.expiresAt, new Date())))
      .for("update").limit(1);
    if (!invite || invite.email !== user.email!.toLowerCase()) throw new InviteError("Поканата е изтекла или е за друг имейл.");
    const [existing] = await tx.select({ organizationId: organizationMembers.organizationId }).from(organizationMembers)
      .where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.status, "active"))).limit(1);
    if (existing) throw new InviteError("Този профил вече е член на фирма.");
    if (invite.role === "owner") {
      const owners = await tx.select({ id: organizationMembers.userId }).from(organizationMembers)
        .where(and(eq(organizationMembers.organizationId, invite.organizationId), eq(organizationMembers.role, "owner"), eq(organizationMembers.status, "active")));
      if (owners.length !== 1) throw new InviteError("Поканата за собственик вече изисква потвърждение от втори собственик.");
    }
    const displayName = String(user.user_metadata?.display_name ?? user.email!.split("@")[0]);
    await tx.insert(profiles).values({ id: user.id, displayName, email: user.email!.toLowerCase() })
      .onConflictDoUpdate({ target: profiles.id, set: { email: user.email!.toLowerCase() } });
    const access = { role: invite.role, status: "active" as const, permissions: invite.permissions, allProjects: invite.allProjects };
    await tx.insert(organizationMembers).values({ organizationId: invite.organizationId, userId: user.id, ...access })
      .onConflictDoUpdate({ target: [organizationMembers.organizationId, organizationMembers.userId], set: access });
    if (invite.role !== "owner" && !invite.allProjects && invite.projectIds.length) {
      await tx.insert(projectMembers).values(invite.projectIds.map((projectId) => ({ projectId, userId: user.id, permission: "view" as const }))).onConflictDoNothing();
    }
    await tx.update(teamInvites).set({ acceptedAt: new Date() }).where(eq(teamInvites.id, invite.id));
    await tx.insert(staffNotifications).values({ organizationId: invite.organizationId, userId: user.id, eventType: "invitation_accepted", title: "Добре дошли в екипа", href: "/app" });
  });
  } catch (cause) {
    if (cause instanceof InviteError) return { error: cause.message };
    throw cause;
  }
  revalidatePath("/app", "layout");
  redirect("/app");
}

export async function updateTeamMemberAction(_: MemberAccessState, formData: FormData): Promise<MemberAccessState> {
  try {
    const context = await requireTenantContext();
    await requireOwner(context);
    const userId = z.uuid().parse(formData.get("userId"));
    const permissions = sortPermissions(z.array(z.enum(PERMISSION_KEYS)).parse(formData.getAll("permissions").map(String)));
    const scope = await projectScope(context.organizationId, formData);
    const role = presetOf(permissions) === "field" ? "field" as const : "office" as const;
    await getDatabase().transaction(async (tx) => {
      const [target] = await tx.select({ role: organizationMembers.role }).from(organizationMembers)
        .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).for("update").limit(1);
      if (!target || target.role === "owner") throw new Error("Собственикът има пълен достъп. Ролята му се сменя с второ потвърждение.");
      await tx.update(organizationMembers).set({ role, permissions, allProjects: scope.allProjects })
        .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, userId)));
      const orgProjects = await tx.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, context.organizationId));
      if (orgProjects.length) await tx.delete(projectMembers).where(and(eq(projectMembers.userId, userId), inArray(projectMembers.projectId, orgProjects.map((item) => item.id))));
      if (scope.projectIds.length) await tx.insert(projectMembers).values(scope.projectIds.map((projectId) => ({ projectId, userId, permission: "view" as const })));
      await tx.insert(staffNotifications).values({ organizationId: context.organizationId, userId, eventType: "permissions_changed", title: "Правата ти са променени", href: "/app/projects" });
    });
    revalidatePath("/app/team");
    revalidatePath(`/app/team/${userId}`);
    return { savedAt: Date.now() };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function disableTeamMemberAction(formData: FormData) {
  const context = await requireTenantContext();
  await requireOwner(context);
  const userId = z.uuid().parse(formData.get("userId"));
  await getDatabase().transaction(async (tx) => {
    const [member] = await tx.select({ role: organizationMembers.role }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).for("update").limit(1);
    if (!member || member.role === "owner") throw new Error("Собственик се премахва с второ потвърждение.");
    await tx.update(organizationMembers).set({ status: "disabled", permissions: [], allProjects: false })
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, userId)));
    const assigned = await tx.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, context.organizationId));
    if (assigned.length) await tx.delete(projectMembers).where(and(eq(projectMembers.userId, userId), inArray(projectMembers.projectId, assigned.map((item) => item.id))));
    await tx.insert(staffNotifications).values({ organizationId: context.organizationId, userId, eventType: "membership_disabled", title: "Вече нямаш достъп до фирмата", href: "/app" });
  });
  revalidatePath("/app/team");
  revalidatePath(`/app/team/${userId}`);
}

export async function revokeTeamInviteAction(formData: FormData) {
  const context = await requireTenantContext();
  await requireOwner(context);
  const inviteId = z.uuid().parse(formData.get("inviteId"));
  await getDatabase().update(teamInvites).set({ revokedAt: new Date() })
    .where(and(eq(teamInvites.id, inviteId), eq(teamInvites.organizationId, context.organizationId), isNull(teamInvites.acceptedAt), isNull(teamInvites.revokedAt)));
  revalidatePath("/app/team");
}

export async function requestOwnerChangeAction(formData: FormData) {
  const context = await requireTenantContext();
  await requireOwner(context);
  const targetUserId = z.uuid().parse(formData.get("targetUserId"));
  const requestedRole = z.enum(["owner", "office", "field"]).nullable().parse(formData.get("requestedRole") === "remove" ? null : formData.get("requestedRole"));
  const removeMember = requestedRole === null;
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${context.organizationId}))`);
    const [target] = await tx.select({ role: organizationMembers.role }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, targetUserId), eq(organizationMembers.status, "active"))).limit(1);
    if (!target) throw new Error("Членът не е намерен.");
    if (requestedRole === "owner" && target.role === "owner") throw new Error("Този човек вече е собственик.");
    if (requestedRole !== "owner" && target.role !== "owner") throw new Error("Тази промяна не изисква втори собственик.");
    const owners = await tx.select({ userId: organizationMembers.userId }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.role, "owner"), eq(organizationMembers.status, "active")));
    if (target.role === "owner" && owners.length < 2) throw new Error("Фирмата трябва да има поне един собственик.");
    if (requestedRole === "owner" && owners.length === 1) {
      await tx.update(organizationMembers).set({ role: "owner", permissions: [], allProjects: false }).where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, targetUserId)));
      await tx.insert(staffNotifications).values({ organizationId: context.organizationId, userId: targetUserId, eventType: "owner_promoted", title: "Вече си собственик", href: "/app/team" });
      return;
    }
    const [request] = await tx.insert(ownerRoleRequests).values({ organizationId: context.organizationId, targetUserId, requestedRole, targetRole: target.role, removeMember, requestedBy: context.userId, expiresAt: new Date(Date.now() + 7 * 86400000) }).returning({ id: ownerRoleRequests.id });
    const approvers = owners.filter((owner) => owner.userId !== context.userId);
    if (approvers.length && request) await tx.insert(staffNotifications).values(approvers.map((owner) => ({ organizationId: context.organizationId, userId: owner.userId, eventType: "owner_change_requested", title: "Потвърди промяна на собственик", href: "/app/team" })));
  });
  revalidatePath("/app/team");
}

export async function approveOwnerChangeAction(formData: FormData) {
  const context = await requireTenantContext();
  await requireOwner(context);
  const requestId = z.uuid().parse(formData.get("requestId"));
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${context.organizationId}))`);
    const [request] = await tx.select().from(ownerRoleRequests)
      .where(and(eq(ownerRoleRequests.id, requestId), eq(ownerRoleRequests.organizationId, context.organizationId), eq(ownerRoleRequests.status, "pending"), gt(ownerRoleRequests.expiresAt, new Date())))
      .for("update").limit(1);
    if (!request || request.requestedBy === context.userId) throw new Error("Това предложение не може да бъде потвърдено.");
    const [target] = await tx.select({ role: organizationMembers.role }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, request.targetUserId), eq(organizationMembers.status, "active"))).limit(1);
    if (!target || (request.targetRole && target.role !== request.targetRole) || (request.requestedRole === "owner" ? target.role === "owner" : target.role !== "owner")) throw new Error("Ролята се е променила. Създай ново предложение.");
    const owners = await tx.select({ userId: organizationMembers.userId }).from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.role, "owner"), eq(organizationMembers.status, "active")));
    if ((request.removeMember || request.requestedRole !== "owner") && owners.some((owner) => owner.userId === request.targetUserId) && owners.length < 2) throw new Error("Фирмата трябва да има собственик.");
    await tx.update(organizationMembers).set(request.removeMember ? { status: "disabled", permissions: [], allProjects: false } : request.requestedRole === "owner" ? { role: "owner", permissions: [], allProjects: false } : { role: request.requestedRole!, permissions: [...PRESETS[request.requestedRole === "field" ? "field" : "office"].permissions], allProjects: true })
      .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, request.targetUserId), eq(organizationMembers.status, "active")));
    await tx.update(ownerRoleRequests).set({ status: "approved", approvedBy: context.userId, resolvedAt: new Date() }).where(eq(ownerRoleRequests.id, request.id));
    await tx.insert(staffNotifications).values({ organizationId: context.organizationId, userId: request.targetUserId, eventType: "owner_role_changed", title: "Ролята ти е променена", href: "/app/team" });
  });
  revalidatePath("/app/team");
}
