"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { attempt } from "@/lib/action-result";

const optional = (max: number) => z.string().trim().max(max).optional();

export async function saveCompanyProfileAction(formData: FormData) {
  return attempt(async () => {
    const data = z
      .object({
        kind: optional(40),
        country: z.string().trim().length(2, "Държавата е с 2 букви, например BG.").transform((value) => value.toUpperCase()),
        timezone: z.string().trim().min(3).max(60),
        legalName: optional(160),
        vatId: optional(30),
        companyIdNumber: optional(30),
        legalAddress: optional(300),
        contactEmail: z.union([z.literal(""), z.email("Провери имейла, нещо в него не е наред.")]).optional(),
      })
      .parse(Object.fromEntries(formData));
    try {
      new Intl.DateTimeFormat("bg-BG", { timeZone: data.timezone });
    } catch {
      throw new Error("Часовата зона не е позната, например Europe/Sofia.");
    }
    const context = await requireTenantContext();
    await requireOwner(context);
    await getDatabase()
      .update(organizations)
      .set({
        kind: data.kind || null,
        country: data.country,
        timezone: data.timezone,
        legalName: data.legalName || null,
        vatId: data.vatId || null,
        companyIdNumber: data.companyIdNumber || null,
        legalAddress: data.legalAddress || null,
        contactEmail: data.contactEmail || null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, context.organizationId));
    revalidatePath("/app/settings/modules");
  }, "Данните не бяха запазени.");
}
