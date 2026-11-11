import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/db";
import { invoices } from "@/db/schema";
import { can } from "@/lib/authz/permissions";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { getEnabledModules } from "@/modules/platform/modules";

export const runtime = "nodejs";

const cell = (value: string | number | null) => {
  const text = value === null ? "" : String(value);
  // A leading = + - @ would run as a formula when the file opens in a spreadsheet.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

/** Issued, paid and void invoices as CSV for the accountant (UTF-8 with a BOM so Excel reads Cyrillic). */
export async function GET() {
  const context = await getOptionalTenantContext();
  if (!context || !can(context, "invoices.manage") || !(await getEnabledModules(context.organizationId)).has("invoices")) return NextResponse.json({ error: "Не е намерено." }, { status: 404 });
  const rows = await getDatabase()
    .select()
    .from(invoices)
    .where(and(eq(invoices.organizationId, context.organizationId), inArray(invoices.status, ["issued", "paid", "void"])))
    .orderBy(desc(invoices.number));
  const header = ["Номер", "Статус", "Дата на издаване", "Дата на доставка", "Падеж", "Получател", "ЕИК/ИН по ЗДДС", "Валута", "Данъчна основа", "ДДС", "Общо"];
  const body = rows.map((row) => [row.number, row.status, row.issueDate, row.supplyDate, row.dueDate, row.buyerName, row.buyerVat, row.currency, row.subtotal, row.taxTotal, row.total].map(cell).join(","));
  return new NextResponse(`﻿${[header.map(cell).join(","), ...body].join("\r\n")}\r\n`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="fakturi.csv"', "Cache-Control": "private, no-store" },
  });
}
