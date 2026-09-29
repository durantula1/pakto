import "server-only";

import { and, eq, isNull, lte, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { notificationPreferences, organizationMembers, organizations, profiles, projectMembers, staffNotifications, teamInvites, userConsents } from "@/db/schema";
import { ACCOUNT_DELETION_GRACE_DAYS } from "@/lib/legal";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccountDeletionPlan } from "@/modules/account/queries";

const DELETED_USER_NAME = "Изтрит потребител";

/**
 * Deletes accounts whose grace period is over. The profile row stays, anonymized, because
 * documents, decisions and payments keep the company's audit trail and point to it by id.
 * Safe to re-run: the auth user goes first and a missing one counts as already deleted.
 * Handles at most 50 accounts per run; the rest wait for the next daily run.
 */
export async function purgeDueAccounts(now = new Date()) {
  const db = getDatabase();
  const cutoff = new Date(now.getTime() - ACCOUNT_DELETION_GRACE_DAYS * 86400000);
  const due = await db.select({ id: profiles.id, email: profiles.email }).from(profiles)
    .where(and(lte(profiles.deletionRequestedAt, cutoff), isNull(profiles.deletedAt)))
    .limit(50);
  const admin = createAdminClient();
  const result = { purged: 0, skipped: [] as { userId: string; reason: string }[] };

  for (const account of due) {
    // Someone may have become the last owner of a team during the grace period; never orphan a company.
    const plan = await getAccountDeletionPlan(account.id);
    if (plan.kind === "blocked") {
      result.skipped.push({ userId: account.id, reason: plan.message });
      continue;
    }
    if (plan.kind === "account_and_company") {
      const [company] = await db.select({ closureRequestedAt: organizations.closureRequestedAt }).from(organizations)
        .where(eq(organizations.id, plan.organizationId)).limit(1);
      if (!company?.closureRequestedAt) {
        result.skipped.push({ userId: account.id, reason: "Фирмата не е заявена за закриване." });
        continue;
      }
      await removeCompanyFiles(admin, plan.organizationId);
      await db.execute(sql`select app.purge_organization(${plan.organizationId}::uuid)`);
    }
    const { error } = await admin.auth.admin.deleteUser(account.id);
    if (error && error.status !== 404) {
      result.skipped.push({ userId: account.id, reason: error.message });
      continue;
    }
    await db.transaction(async (tx) => {
      await tx.update(profiles)
        .set({ displayName: DELETED_USER_NAME, email: null, phone: null, deletedAt: now, updatedAt: now })
        .where(eq(profiles.id, account.id));
      await tx.update(organizationMembers).set({ status: "disabled", permissions: [], allProjects: false })
        .where(eq(organizationMembers.userId, account.id));
      await tx.delete(projectMembers).where(eq(projectMembers.userId, account.id));
      await tx.delete(staffNotifications).where(eq(staffNotifications.userId, account.id));
      await tx.delete(notificationPreferences).where(eq(notificationPreferences.userId, account.id));
      await tx.delete(userConsents).where(eq(userConsents.userId, account.id));
      if (account.email) {
        await tx.update(teamInvites).set({ revokedAt: now })
          .where(and(eq(teamInvites.email, account.email), isNull(teamInvites.acceptedAt), isNull(teamInvites.revokedAt)));
      }
    });
    result.purged += 1;
  }

  return result;
}

const COMPANY_BUCKETS = ["order-files", "change-attachments", "decision-signatures", "organization-logos"];

/** Storage has no recursive delete: list each folder under `<orgId>/` and remove what is in it. */
async function removeCompanyFiles(admin: ReturnType<typeof createAdminClient>, organizationId: string) {
  for (const bucket of COMPANY_BUCKETS) {
    const folders = [organizationId];
    while (folders.length) {
      const folder = folders.pop()!;
      const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
      if (error) {
        if (/not found/i.test(error.message)) break;
        throw error;
      }
      const files = data.filter((item) => item.id).map((item) => `${folder}/${item.name}`);
      folders.push(...data.filter((item) => !item.id).map((item) => `${folder}/${item.name}`));
      if (files.length) {
        const { error: removeError } = await admin.storage.from(bucket).remove(files);
        if (removeError) throw removeError;
      }
    }
  }
}
