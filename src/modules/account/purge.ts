import "server-only";

import { and, eq, isNull, lte, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { authUsers, notificationPreferences, organizationMembers, organizations, profiles, projectMembers, staffNotifications, teamInvites, userConsents } from "@/db/schema";
import { ACCOUNT_DELETION_GRACE_DAYS } from "@/lib/legal";
import { removeFolder } from "@/lib/storage";
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
      await removeCompanyFiles(plan.organizationId);
      await db.execute(sql`select app.purge_organization(${plan.organizationId}::uuid)`);
    }
    // The login goes (its sessions and password with it, by cascade); the profile stays, anonymized below.
    await db.delete(authUsers).where(eq(authUsers.id, account.id));
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

const COMPANY_BUCKETS = ["change-attachments", "decision-signatures", "organization-logos"] as const;

/** Every bucket keeps a company's files under `<orgId>/`, so closing the company removes that folder in each. */
async function removeCompanyFiles(organizationId: string) {
  for (const bucket of COMPANY_BUCKETS) await removeFolder(bucket, organizationId);
}
