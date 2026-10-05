import "server-only";

import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { LEGAL_DOCUMENTS } from "@/lib/legal";
import { organizationMembers, organizations, profiles, userConsents } from "@/db/schema";

export async function getAccountProfile(userId: string) {
  const [profile] = await getDatabase()
    .select({
      displayName: profiles.displayName,
      email: profiles.email,
      phone: profiles.phone,
      deletionRequestedAt: profiles.deletionRequestedAt,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return profile ?? null;
}

/** Name, login email and pending deletion for the user menu and the deletion banner on every workspace page. */
export async function getAccountSummary(userId: string) {
  const [row] = await getDatabase()
    .select({
      displayName: profiles.displayName,
      email: profiles.email,
      deletionRequestedAt: profiles.deletionRequestedAt,
      welcomeSeen: sql<boolean>`${profiles.welcomeSeenAt} is not null`,
      /** True when the current version of the terms or the privacy policy has no recorded acceptance. */
      consentMissing: sql<boolean>`(
        select count(distinct c.document) from ${userConsents} c
        where c.user_id = ${userId}
          and ((c.document = 'terms' and c.version = ${LEGAL_DOCUMENTS.terms.version}) or (c.document = 'privacy' and c.version = ${LEGAL_DOCUMENTS.privacy.version}))
      ) < 2`,
      closureRequested: sql<boolean>`exists (
        select 1 from ${organizationMembers} m join ${organizations} o on o.id = m.organization_id
        where m.user_id = ${profiles.id} and m.status = 'active' and o.closure_requested_at is not null
      )`,
    })
    .from(profiles)
    .where(and(eq(profiles.id, userId), isNull(profiles.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function listUserConsents(userId: string) {
  return getDatabase()
    .select({ document: userConsents.document, version: userConsents.version, acceptedAt: userConsents.acceptedAt })
    .from(userConsents)
    .where(eq(userConsents.userId, userId))
    .orderBy(userConsents.acceptedAt);
}

export type Blocker = { message: string; href?: string; cta?: string };

export type AccountDeletionPlan =
  | { kind: "account" }
  /** The user is the only member of their company, so deleting the account closes the company too. */
  | { kind: "account_and_company"; organizationId: string; organizationName: string }
  | ({ kind: "blocked" } & Blocker);

/**
 * What deleting this account would do. A company must keep an owner while it has a team:
 * the last owner of a team hands ownership over first; a sole member closes the company instead.
 */
export async function getAccountDeletionPlan(userId: string): Promise<AccountDeletionPlan> {
  const db = getDatabase();
  const owned = await db
    .select({ organizationId: organizationMembers.organizationId, name: organizations.name })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.role, "owner"), eq(organizationMembers.status, "active")));
  if (!owned.length) return { kind: "account" };
  const members = await db
    .select({ organizationId: organizationMembers.organizationId, role: organizationMembers.role, total: count() })
    .from(organizationMembers)
    .where(and(inArray(organizationMembers.organizationId, owned.map((item) => item.organizationId)), eq(organizationMembers.status, "active")))
    .groupBy(organizationMembers.organizationId, organizationMembers.role);
  let soleCompany: { organizationId: string; organizationName: string } | null = null;
  for (const item of owned) {
    const rows = members.filter((row) => row.organizationId === item.organizationId);
    if ((rows.find((row) => row.role === "owner")?.total ?? 0) >= 2) continue;
    const othersCount = rows.reduce((sum, row) => sum + row.total, 0) - 1;
    if (othersCount > 0) {
      return { kind: "blocked", message: `Ти си единственият собственик на „${item.name}“, а в екипа има и други хора. Първо направи някой от тях собственик.`, href: "/app/team", cta: "Към Екип" };
    }
    soleCompany = { organizationId: item.organizationId, organizationName: item.name };
  }
  return soleCompany ? { kind: "account_and_company", ...soleCompany } : { kind: "account" };
}

/** Why the user cannot leave their company right now, or null. */
export async function getLeaveBlocker(userId: string): Promise<Blocker | null> {
  const plan = await getAccountDeletionPlan(userId);
  if (plan.kind === "blocked") return plan;
  if (plan.kind === "account_and_company") return { message: `Ти си единственият член на „${plan.organizationName}“ и няма на кого да я оставиш. Ако искаш да спреш, изтрий профила заедно с фирмата отдолу.` };
  return null;
}
