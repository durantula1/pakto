"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";
import { z } from "zod";
import "@/lib/zod-messages";

import { createClient } from "@/lib/supabase/server";
import { bootstrapOrganization } from "@/modules/organizations/mutations";
import { getDatabase } from "@/db";
import { changeOrderRevisions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole, requireTenantContext } from "@/lib/authz/tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LOGO_BUCKET, LOGO_MAX_BYTES, LOGO_TYPES, logoPathFor, logoPublicUrl, optimizeLogo, sniffLogoType, type LogoMimeType,
} from "@/modules/organizations/logo";
import { isLogoSize } from "@/modules/organizations/logo-box";

export type OnboardingState = { error?: string };

const onboardingSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  organizationName: z.string().trim().min(2).max(120),
  currency: z.literal("EUR").default("EUR"),
});

export async function completeOnboardingAction(
  _state: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) {
    return { error: "Сесията е изтекла. Влез отново." };
  }

  try {
    await bootstrapOrganization({ userId, ...parsed.data });
  } catch {
    return { error: "Фирмата не беше създадена. Опитай отново." };
  }

  redirect("/app");
}

export async function updateOrganizationAction(formData: FormData) {
  const name = z.string().trim().min(2, "Името трябва да е поне 2 символа.").max(120).safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0]?.message };
  const context = await requireTenantContext();
  requireRole(context, ["owner"]);
  await getDatabase().update(organizations).set({ name: name.data, updatedAt: new Date() }).where(eq(organizations.id, context.organizationId));
  revalidatePath("/app", "layout");
}

export async function updateOrganizationPhoneAction(formData: FormData) {
  const phone = z.string().trim().max(30, "Най-много 30 символа.")
    .refine((value) => !value || (value.match(/\d/g)?.length ?? 0) >= 6, "Въведи телефон с поне 6 цифри.")
    .safeParse(formData.get("phone") ?? "");
  if (!phone.success) return { error: phone.error.issues[0]?.message };
  const context = await requireTenantContext();
  requireRole(context, ["owner"]);
  await getDatabase().update(organizations).set({ phone: phone.data || null, updatedAt: new Date() }).where(eq(organizations.id, context.organizationId));
  revalidatePath("/app", "layout");
  // The portal reads the phone with the client's session.
  revalidatePath("/portal", "layout");
}

export async function updateDefaultTaxRateAction(formData: FormData) {
  const rate = z.enum(["20", "9", "0"], { error: "Избери ставка." }).safeParse(formData.get("taxRate"));
  if (!rate.success) return { error: rate.error.issues[0]?.message };
  const context = await requireTenantContext();
  requireRole(context, ["owner"]);
  await getDatabase().update(organizations).set({ defaultTaxRate: Number(rate.data).toFixed(2), updatedAt: new Date() }).where(eq(organizations.id, context.organizationId));
  revalidatePath("/app", "layout");
}

export async function updateOfferValidityAction(formData: FormData) {
  const days = z.coerce.number().int("Въведи цял брой дни.").min(1, "Поне 1 ден.").max(180, "Най-много 180 дни.").safeParse(formData.get("offerValidityDays"));
  if (!days.success) return { error: days.error.issues[0]?.message };
  const context = await requireTenantContext();
  requireRole(context, ["owner"]);
  await getDatabase().update(organizations).set({ offerValidityDays: days.data, updatedAt: new Date() }).where(eq(organizations.id, context.organizationId));
  revalidatePath("/app", "layout");
}

/** Which automatic emails the company's clients get (0 turns a reminder off). */
export async function updateClientRemindersAction(formData: FormData) {
  const parsed = z.object({
    nudge: z.coerce.number().int().min(0, "Избери от списъка.").max(14, "Най-много 14 дни."),
    warning: z.coerce.number().int().min(0, "Избери от списъка.").max(7, "Най-много 7 дни."),
    digest: z.enum(["on", "off"], "Избери от списъка."),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const context = await requireTenantContext();
  requireRole(context, ["owner"]);
  await getDatabase().update(organizations).set({
    clientNudgeAfterDays: parsed.data.nudge, clientExpiryWarningDays: parsed.data.warning,
    clientScheduleDigestEnabled: parsed.data.digest === "on", updatedAt: new Date(),
  }).where(eq(organizations.id, context.organizationId));
  revalidatePath("/app/settings/organization");
}

/** How many days ahead a stage counts as "coming up" on the dashboard and in the stages list. */
export async function updateStageWarningAction(formData: FormData) {
  const parsed = z.object({
    days: z.coerce.number().int().min(1, "Избери от списъка.").max(30, "Най-много 30 дни."),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const context = await requireTenantContext();
  requireRole(context, ["owner"]);
  await getDatabase().update(organizations).set({ stageWarningDays: parsed.data.days, updatedAt: new Date() }).where(eq(organizations.id, context.organizationId));
  revalidatePath("/app/settings/organization");
  revalidatePath("/app");
  revalidatePath("/app/work");
}

type LogoResult<T> = ({ ok: true } & T) | { ok: false; error: string };

function logoFailure(error: unknown): { ok: false; error: string } {
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Файлът не може да се отвори." };
  return { ok: false, error: error instanceof Error ? error.message : "Логото не беше запазено. Опитай отново." };
}

const logoUploadSchema = z.object({
  mimeType: z.enum(Object.keys(LOGO_TYPES) as [LogoMimeType, ...LogoMimeType[]], { error: "Позволени са SVG, PNG, JPG и WebP." }),
  byteSize: z.number().int().positive().max(LOGO_MAX_BYTES, "Файлът е над 5 MB."),
});

/** Step 1: a one-time signed URL; the browser uploads the original straight to storage. */
export async function createLogoUploadAction(input: z.input<typeof logoUploadSchema>): Promise<LogoResult<{ path: string; token: string }>> {
  try {
    const data = logoUploadSchema.parse(input);
    const context = await requireTenantContext();
    requireRole(context, ["owner"]);
    const path = `${context.organizationId}/incoming/${randomUUID()}.${LOGO_TYPES[data.mimeType]}`;
    const { data: signed, error } = await createAdminClient().storage.from(LOGO_BUCKET).createSignedUploadUrl(path);
    if (error || !signed) throw new Error("Качването не можа да започне. Опитай отново.");
    return { ok: true, path: signed.path, token: signed.token };
  } catch (error) {
    return logoFailure(error);
  }
}

/** Step 2: optimize what landed in storage into one PNG, keep that, and drop the original. */
export async function confirmLogoAction(input: { path: string }): Promise<LogoResult<{ url: string; originalBytes: number; optimizedBytes: number; width: number; height: number }>> {
  const admin = createAdminClient();
  let incoming: string | null = null;
  try {
    const { path } = z.object({ path: z.string().min(1).max(300) }).parse(input);
    const context = await requireTenantContext();
    requireRole(context, ["owner"]);
    if (!path.startsWith(`${context.organizationId}/incoming/`)) throw new Error("Файлът не може да се отвори.");
    incoming = path;
    const { data: blob, error } = await admin.storage.from(LOGO_BUCKET).download(path);
    if (error || !blob) throw new Error("Файлът не е качен докрай. Опитай отново.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.byteLength > LOGO_MAX_BYTES) throw new Error("Файлът е над 5 MB.");
    const mimeType = sniffLogoType(bytes);
    if (!mimeType) throw new Error("Позволени са SVG, PNG, JPG и WebP.");
    const logo = await optimizeLogo(bytes, mimeType);
    const storagePath = logoPathFor(context.organizationId, logo);
    const { error: uploadError } = await admin.storage.from(LOGO_BUCKET)
      .upload(storagePath, logo.png, { contentType: "image/png", cacheControl: "31536000", upsert: true });
    if (uploadError) throw new Error("Логото не беше запазено. Опитай отново.");
    const [previous] = await getDatabase().select({ path: organizations.logoStoragePath }).from(organizations)
      .where(eq(organizations.id, context.organizationId)).limit(1);
    await getDatabase().update(organizations).set({ logoStoragePath: storagePath, updatedAt: new Date() })
      .where(eq(organizations.id, context.organizationId));
    if (previous?.path && previous.path !== storagePath) await removeUnusedLogo(context.organizationId, previous.path);
    revalidatePath("/app", "layout");
    revalidatePath("/portal", "layout");
    return { ok: true, url: logoPublicUrl(storagePath)!, originalBytes: bytes.byteLength, optimizedBytes: logo.png.byteLength, width: logo.width, height: logo.height };
  } catch (error) {
    return logoFailure(error);
  } finally {
    if (incoming) await admin.storage.from(LOGO_BUCKET).remove([incoming]).catch(() => undefined);
  }
}

export async function removeLogoAction(): Promise<LogoResult<object>> {
  try {
    const context = await requireTenantContext();
    requireRole(context, ["owner"]);
    const [previous] = await getDatabase().select({ path: organizations.logoStoragePath }).from(organizations)
      .where(eq(organizations.id, context.organizationId)).limit(1);
    await getDatabase().update(organizations).set({ logoStoragePath: null, updatedAt: new Date() })
      .where(eq(organizations.id, context.organizationId));
    if (previous?.path) await removeUnusedLogo(context.organizationId, previous.path);
    revalidatePath("/app", "layout");
    revalidatePath("/portal", "layout");
    return { ok: true };
  } catch (error) {
    return logoFailure(error);
  }
}

/** Sent versions keep the logo they were sent with, so a file is deleted only when none of them points to it. */
async function removeUnusedLogo(organizationId: string, path: string) {
  if (!path.startsWith(`${organizationId}/`)) return;
  // The path already carries the organization id, so it identifies this company's file on its own.
  const [used] = await getDatabase().select({ id: changeOrderRevisions.id }).from(changeOrderRevisions)
    .where(eq(changeOrderRevisions.logoStoragePath, path)).limit(1);
  if (!used) await createAdminClient().storage.from(LOGO_BUCKET).remove([path]).catch(() => undefined);
}

export async function updateLogoSizeAction(formData: FormData) {
  const size = formData.get("logoSize");
  if (!isLogoSize(size)) return { error: "Избери размер." };
  const context = await requireTenantContext();
  requireRole(context, ["owner"]);
  await getDatabase().update(organizations).set({ logoSize: size, updatedAt: new Date() }).where(eq(organizations.id, context.organizationId));
  revalidatePath("/app", "layout");
  revalidatePath("/portal", "layout");
}
