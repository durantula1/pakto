import "server-only";

import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  organizationMembers,
  organizations,
  profiles,
  signupAttributions,
  type WorkProfile,
} from "@/db/schema";

/**
 * Where each sign-up profile starts; every switch stays in Settings → Модули.
 * Самостоятелна дейност: one person, clients approve with a link, no Задачи or Каталог.
 * Екип с онлайн одобрение: everything on.
 * Работа по договор: agreed on paper, the team records it; the client portal is for viewing.
 */
const workProfilePresets = {
  solo: { approvalMode: "client", portalMode: "full", tasksEnabled: false, catalogEnabled: false, financeEnabled: true },
  team: { approvalMode: "client", portalMode: "full", tasksEnabled: true, catalogEnabled: true, financeEnabled: true },
  contract: { approvalMode: "staff", portalMode: "view_only", tasksEnabled: true, catalogEnabled: true, financeEnabled: true },
} as const satisfies Record<WorkProfile, Partial<typeof organizations.$inferInsert>>;

function slugify(value: string) {
  const base = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 40);
  return `${base || "workspace"}-${randomBytes(3).toString("hex")}`;
}

export async function bootstrapOrganization(input: {
  userId: string;
  displayName: string;
  organizationName: string;
  currency: string;
  profile?: WorkProfile;
}) {
  const database = getDatabase();

  return database.transaction(async (transaction) => {
    const [existing] = await transaction
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, input.userId),
          eq(organizationMembers.status, "active"),
        ),
      )
      .limit(1);

    if (existing) {
      await linkSignupOrganization(transaction, input.userId, existing.organizationId);
      return existing.organizationId;
    }

    await transaction
      .insert(profiles)
      .values({ id: input.userId, displayName: input.displayName })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { displayName: input.displayName },
      });

    const [organization] = await transaction
      .insert(organizations)
      .values({
        name: input.organizationName,
        slug: slugify(input.organizationName),
        defaultCurrency: input.currency,
        ...(input.profile ? { workProfile: input.profile, ...workProfilePresets[input.profile] } : {}),
      })
      .returning({ id: organizations.id });

    if (!organization) {
      throw new Error("Фирмата не беше създадена.");
    }

    await transaction.insert(organizationMembers).values({
      organizationId: organization.id,
      userId: input.userId,
      role: "owner",
      status: "active",
    });

    await linkSignupOrganization(transaction, input.userId, organization.id);
    return organization.id;
  });
}

/** The signup row is written before a company exists. Filled in when this user gets one. */
function linkSignupOrganization(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  userId: string,
  organizationId: string,
) {
  return transaction
    .update(signupAttributions)
    .set({ organizationId })
    .where(and(eq(signupAttributions.userId, userId), isNull(signupAttributions.organizationId)));
}

