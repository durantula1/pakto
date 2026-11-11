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
import { ensureDefaultPipeline } from "@/modules/crm/pipeline";
import { emitEvent } from "@/modules/platform/events";
import { setModule } from "@/modules/platform/modules";
import { MODULE_KEYS } from "@/modules/platform/registry";

export async function setModuleAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ key: z.enum(MODULE_KEYS), on: z.enum(["1", "0"]) }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireOwner(context);
    const on = data.on === "1";
    await setModule(context.organizationId, context.userId, data.key, on);
    if (on && data.key === "crm") await ensureDefaultPipeline(context.organizationId);
    await emitEvent({ organizationId: context.organizationId, kind: on ? "module.enabled" : "module.disabled", subjectType: "module", subjectId: null, actorId: context.userId, payload: { module: data.key } });
    revalidatePath("/app", "layout");
  }, "Модулът не беше променен.");
}

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
