"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { catalogItems, changeOrderLineItems, changeOrderRevisions, changeOrders, offerTemplates } from "@/db/schema";
import { requirePermission, requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { canonicalCategory, categoryKey } from "@/modules/catalog/categories";

export type CatalogState = { error?: string; ok?: number; imported?: number };

const price = z.coerce.number({ error: "Цената трябва да е число." }).min(0, "Цената не може да е отрицателна.").max(999999999);
const itemSchema = z.object({
  name: z.string().trim().min(2, "Името е твърде кратко.").max(300),
  unit: z.string().trim().max(20).optional(),
  unitPrice: z.preprocess((value) => typeof value === "string" ? value.replace(",", ".") : value, price),
  category: z.string().trim().max(80).optional(),
});

async function catalogEditor() {
  const context = await requireTenantContext();
  await requirePermission(context, "offers.edit");
  return context;
}

/** Category names in use, so saves and imports reuse their spelling. */
async function usedCategories(organizationId: string) {
  const rows = await getDatabase().selectDistinct({ category: catalogItems.category }).from(catalogItems)
    .where(and(eq(catalogItems.organizationId, organizationId), isNull(catalogItems.archivedAt)));
  return rows.map((row) => row.category);
}

function done() {
  revalidatePath("/app/catalog");
  revalidatePath("/app/offers/new");
}

export async function saveCatalogItemAction(_: CatalogState, formData: FormData): Promise<CatalogState> {
  const parsed = itemSchema.extend({ id: z.union([z.literal(""), z.uuid()]).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    const context = await catalogEditor();
    const values = { name: parsed.data.name, unit: parsed.data.unit || null, unitPrice: parsed.data.unitPrice.toFixed(2), category: canonicalCategory(parsed.data.category, await usedCategories(context.organizationId)) };
    if (parsed.data.id) {
      await getDatabase().update(catalogItems).set({ ...values, updatedAt: new Date() })
        .where(and(eq(catalogItems.id, parsed.data.id), eq(catalogItems.organizationId, context.organizationId)));
    } else {
      // Saving the same name again updates its price instead of creating a twin.
      const [existing] = await getDatabase().select({ id: catalogItems.id }).from(catalogItems)
        .where(and(eq(catalogItems.organizationId, context.organizationId), isNull(catalogItems.archivedAt), sql`lower(${catalogItems.name}) = lower(${values.name})`)).limit(1);
      if (existing) await getDatabase().update(catalogItems).set({ ...values, updatedAt: new Date() }).where(eq(catalogItems.id, existing.id));
      else await getDatabase().insert(catalogItems).values({ ...values, organizationId: context.organizationId, createdBy: context.userId });
    }
    done();
    return { ok: Date.now() };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Не беше запазено." };
  }
}

export async function archiveCatalogItemAction(formData: FormData) {
  const { id } = z.object({ id: z.uuid() }).parse(Object.fromEntries(formData));
  try {
    const context = await catalogEditor();
    await getDatabase().update(catalogItems).set({ archivedAt: new Date() }).where(and(eq(catalogItems.id, id), eq(catalogItems.organizationId, context.organizationId)));
    done();
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Не беше премахнато." };
  }
}

/** Renames a category on every active item; a name that already exists merges the two. */
export async function renameCatalogCategoryAction(formData: FormData): Promise<CatalogState & { merged?: boolean }> {
  const parsed = z.object({ from: z.string().trim().min(1), to: z.string().trim().min(1, "Въведи име на категорията.").max(80) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    const context = await catalogEditor();
    const fromKey = categoryKey(parsed.data.from);
    const rows = await getDatabase().select({ id: catalogItems.id, category: catalogItems.category }).from(catalogItems)
      .where(and(eq(catalogItems.organizationId, context.organizationId), isNull(catalogItems.archivedAt)));
    const ids = rows.filter((row) => categoryKey(row.category) === fromKey).map((row) => row.id);
    if (!ids.length) return { error: "Категорията вече я няма." };
    const others = rows.filter((row) => categoryKey(row.category) !== fromKey).map((row) => row.category);
    const to = canonicalCategory(parsed.data.to, others)!;
    await getDatabase().update(catalogItems).set({ category: to, updatedAt: new Date() })
      .where(and(eq(catalogItems.organizationId, context.organizationId), inArray(catalogItems.id, ids)));
    done();
    return { ok: Date.now(), merged: others.some((name) => categoryKey(name) === categoryKey(to)) };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Категорията не беше преименувана." };
  }
}

/** One item per line: `име; мярка; цена; категория`. Comma or tab also work as separators; a header row is skipped. */
export async function importCatalogAction(_: CatalogState, formData: FormData): Promise<CatalogState> {
  const text = String(formData.get("csv") ?? "");
  if (!text.trim()) return { error: "Постави редове или избери файл." };
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 500) return { error: "Най-много 500 реда наведнъж." };
  const separator = lines[0]!.includes(";") ? ";" : lines[0]!.includes("\t") ? "\t" : ",";
  const rows: Array<z.infer<typeof itemSchema>> = [];
  for (const [index, line] of lines.entries()) {
    const [name, unit, unitPrice, category] = line.split(separator).map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const parsed = itemSchema.safeParse({ name, unit, unitPrice, category });
    if (!parsed.success) {
      if (index === 0) continue; // header row
      return { error: `Ред ${index + 1}: ${parsed.error.issues[0]?.message}` };
    }
    rows.push(parsed.data);
  }
  if (!rows.length) return { error: "Няма валидни редове." };
  try {
    const context = await catalogEditor();
    const categories = await usedCategories(context.organizationId);
    await getDatabase().transaction(async (tx) => {
      for (const row of rows) {
        const category = canonicalCategory(row.category, categories);
        if (category) categories.push(category);
        const values = { name: row.name, unit: row.unit || null, unitPrice: row.unitPrice.toFixed(2), category };
        const [existing] = await tx.select({ id: catalogItems.id }).from(catalogItems)
          .where(and(eq(catalogItems.organizationId, context.organizationId), isNull(catalogItems.archivedAt), sql`lower(${catalogItems.name}) = lower(${row.name})`)).limit(1);
        if (existing) await tx.update(catalogItems).set({ ...values, updatedAt: new Date() }).where(eq(catalogItems.id, existing.id));
        else await tx.insert(catalogItems).values({ ...values, organizationId: context.organizationId, createdBy: context.userId });
      }
    });
    done();
    return { ok: Date.now(), imported: rows.length };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Импортът не беше завършен." };
  }
}

/** Saves the current version of an offer (scope, lines, VAT, client note) as a reusable template. */
export async function saveTemplateFromOfferAction(_: CatalogState, formData: FormData): Promise<CatalogState> {
  const parsed = z.object({ changeOrderId: z.uuid(), name: z.string().trim().min(2, "Дай име на шаблона.").max(120) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    const context = await requireTenantContext();
    const db = getDatabase();
    const [offer] = await db.select({ projectId: changeOrders.projectId, revisionId: changeOrderRevisions.id, title: changeOrderRevisions.title, description: changeOrderRevisions.description, clientNote: changeOrderRevisions.clientNote, taxRate: changeOrderRevisions.taxRate })
      .from(changeOrders).innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .where(and(eq(changeOrders.id, parsed.data.changeOrderId), eq(changeOrders.organizationId, context.organizationId), eq(changeOrders.documentKind, "offer"))).limit(1);
    if (!offer) return { error: "Офертата не е намерена." };
    await requireProjectCapability(context, offer.projectId, "offer");
    const lines = await db.select().from(changeOrderLineItems).where(eq(changeOrderLineItems.revisionId, offer.revisionId)).orderBy(changeOrderLineItems.position);
    await db.insert(offerTemplates).values({
      organizationId: context.organizationId, name: parsed.data.name, title: offer.title, description: offer.description, clientNote: offer.clientNote, taxRate: offer.taxRate,
      lines: lines.map((line) => ({ description: line.description, quantity: Number(line.quantity), unit: line.unit ?? "", unitPrice: Number(line.unitPrice) })),
      createdBy: context.userId,
    });
    done();
    return { ok: Date.now() };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Шаблонът не беше запазен." };
  }
}

export async function archiveTemplateAction(formData: FormData) {
  const { id } = z.object({ id: z.uuid() }).parse(Object.fromEntries(formData));
  try {
    const context = await catalogEditor();
    await getDatabase().update(offerTemplates).set({ archivedAt: new Date() }).where(and(eq(offerTemplates.id, id), eq(offerTemplates.organizationId, context.organizationId)));
    done();
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Шаблонът не беше премахнат." };
  }
}
