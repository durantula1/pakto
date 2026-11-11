"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { apiKeys, clients, webhookEndpoints } from "@/db/schema";
import { attempt } from "@/lib/action-result";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { normalizePhone } from "@/modules/clients/operations";
import { parseCsv } from "@/modules/integrations/csv";
import { assertPublicUrl } from "@/modules/integrations/deliver";
import { generateApiKey, generateWebhookSecret } from "@/modules/integrations/keys";
import { requireModule } from "@/modules/platform/modules";

export type SecretState = { error?: string; secret?: string; label?: string };

async function ownerContext() {
  const context = await requireTenantContext();
  await requireOwner(context);
  await requireModule(context, "api");
  return context;
}

function failure(cause: unknown, fallback: string): SecretState {
  unstable_rethrow(cause);
  if (cause instanceof z.ZodError) return { error: cause.issues[0]?.message ?? fallback };
  return { error: cause instanceof Error ? cause.message : fallback };
}

/** The key is shown once; only its hash is stored. */
export async function createApiKeyAction(_state: SecretState, formData: FormData): Promise<SecretState> {
  try {
    const { name } = z.object({ name: z.string().trim().min(1, "Дай име на ключа.").max(80) }).parse(Object.fromEntries(formData));
    const context = await ownerContext();
    const key = generateApiKey();
    await getDatabase().insert(apiKeys).values({ organizationId: context.organizationId, name, prefix: key.prefix, keyHash: key.hash, createdBy: context.userId });
    revalidatePath("/app/settings/integrations");
    return { secret: key.secret, label: "Ключът" };
  } catch (cause) {
    return failure(cause, "Ключът не беше създаден.");
  }
}

export async function revokeApiKeyAction(formData: FormData) {
  return attempt(async () => {
    const { id } = z.object({ id: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await ownerContext();
    await getDatabase().update(apiKeys).set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, context.organizationId), isNull(apiKeys.revokedAt)));
    revalidatePath("/app/settings/integrations");
  }, "Ключът не беше оттеглен.");
}

/** The signing secret is shown once, when the address is added. */
export async function createWebhookAction(_state: SecretState, formData: FormData): Promise<SecretState> {
  try {
    const { url } = z.object({ url: z.string().trim().min(1, "Въведи адрес.").max(500) }).parse(Object.fromEntries(formData));
    const context = await ownerContext();
    const checked = await assertPublicUrl(url);
    const [{ total } = { total: 0 }] = await getDatabase().select({ total: sql<number>`count(*)::int` }).from(webhookEndpoints).where(eq(webhookEndpoints.organizationId, context.organizationId));
    if (total >= 10) throw new Error("Може да имаш най-много 10 адреса.");
    const secret = generateWebhookSecret();
    await getDatabase().insert(webhookEndpoints).values({ organizationId: context.organizationId, url: checked.toString(), secret, createdBy: context.userId });
    revalidatePath("/app/settings/integrations");
    return { secret, label: "Тайната за подпис" };
  } catch (cause) {
    return failure(cause, "Адресът не беше добавен.");
  }
}

export async function deleteWebhookAction(formData: FormData) {
  return attempt(async () => {
    const { id } = z.object({ id: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await ownerContext();
    await getDatabase().delete(webhookEndpoints).where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, context.organizationId)));
    revalidatePath("/app/settings/integrations");
  }, "Адресът не беше изтрит.");
}

const MAX_IMPORT_ROWS = 2000;

/** Columns are found by header name (име/name, имейл/email, телефон/phone, адрес/address); duplicates by email are skipped. */
export async function importClientsAction(formData: FormData) {
  return attempt(async () => {
    const context = await ownerContext();
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("Избери CSV файл.");
    if (file.size > 1_000_000) throw new Error("Файлът е над 1 MB.");
    const rows = parseCsv(await file.text());
    const header = (rows.shift() ?? []).map((cell) => cell.trim().toLowerCase());
    const col = (...names: string[]) => header.findIndex((cell) => names.includes(cell));
    const nameCol = col("име", "name", "клиент"), emailCol = col("имейл", "email", "e-mail"), phoneCol = col("телефон", "phone"), addressCol = col("адрес", "address");
    if (nameCol < 0) throw new Error("В първия ред трябва да има колона „име“.");
    if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Най-много ${MAX_IMPORT_ROWS} реда наведнъж.`);
    const db = getDatabase();
    await db.transaction(async (tx) => {
      const existing = await tx.select({ email: clients.emailNormalized }).from(clients).where(eq(clients.organizationId, context.organizationId));
      const seen = new Set(existing.map((row) => row.email).filter(Boolean));
      const values = [];
      for (const row of rows) {
        const name = row[nameCol]?.trim().slice(0, 160);
        if (!name) continue;
        const email = emailCol >= 0 ? row[emailCol]?.trim().toLowerCase().slice(0, 200) || null : null;
        if (email) {
          if (!z.email().safeParse(email).success || seen.has(email)) continue;
          seen.add(email);
        }
        const phone = phoneCol >= 0 ? row[phoneCol]?.trim().slice(0, 40) || null : null;
        values.push({
          organizationId: context.organizationId, createdBy: context.userId, name, email, phone, phoneNormalized: normalizePhone(phone),
          address: addressCol >= 0 ? row[addressCol]?.trim().slice(0, 300) || null : null,
        });
      }
      if (!values.length) throw new Error("Няма нови клиенти за добавяне.");
      await tx.insert(clients).values(values);
    });
    revalidatePath("/app/clients");
  }, "Файлът не беше внесен.");
}
