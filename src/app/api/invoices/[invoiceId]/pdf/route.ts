import { renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { can } from "@/lib/authz/permissions";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { isUuid } from "@/lib/uuid";
import { getInvoice, getTemplate } from "@/modules/invoices/queries";
import { InvoiceDocument } from "@/modules/invoices/pdf";
import { getEnabledModules } from "@/modules/platform/modules";
import { loadLogo } from "@/modules/organizations/logo";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const [{ invoiceId }, context] = await Promise.all([params, getOptionalTenantContext()]);
  const notFound = NextResponse.json({ error: "Не е намерено." }, { status: 404 });
  if (!context || !isUuid(invoiceId) || !can(context, "invoices.manage")) return notFound;
  if (!(await getEnabledModules(context.organizationId)).has("invoices")) return notFound;
  const found = await getInvoice(context.organizationId, invoiceId);
  if (!found) return notFound;
  const { invoice, lines } = found;
  const [template, [organization]] = await Promise.all([
    getTemplate(context.organizationId),
    getDatabase().select().from(organizations).where(eq(organizations.id, context.organizationId)).limit(1),
  ]);
  if (!organization) return notFound;
  const logo = template?.showLogo === false ? null : await loadLogo(organization.logoStoragePath).catch(() => null);
  // An issued invoice shows the seller as it was when issued; a draft shows the current company details.
  const seller = invoice.seller ?? { name: organization.legalName ?? organization.name, vatId: organization.vatId, companyIdNumber: organization.companyIdNumber, address: organization.legalAddress, email: organization.contactEmail, phone: organization.phone };
  const buffer = await renderToBuffer(
    InvoiceDocument({
      title: template?.title ?? "Фактура", accent: template?.accent ?? "#102b38", number: invoice.number, status: invoice.status,
      logo: logo ? { ...logo, size: organization.logoSize } : null, seller,
      buyer: { name: invoice.buyerName, vat: invoice.buyerVat, address: invoice.buyerAddress },
      issueDate: invoice.issueDate, supplyDate: invoice.supplyDate, dueDate: invoice.dueDate, currency: invoice.currency,
      lines: lines.map((line) => ({ description: line.description, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice, taxRate: line.taxRate })),
      subtotal: invoice.subtotal, taxTotal: invoice.taxTotal, total: invoice.total, note: invoice.note,
      headerNote: template?.headerNote ?? null, footerNote: template?.footerNote ?? null, paymentNote: template?.paymentNote ?? null,
    }),
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="faktura-${invoice.number ?? "chernova"}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
