import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { InvoiceEditor } from "@/components/invoices/invoice-editor";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { PageShell } from "@/components/workspace/page/page-shell";
import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { orForbidden } from "@/lib/authz/page-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { deleteDraftAction, issueInvoiceAction, markPaidAction, voidInvoiceAction } from "@/modules/invoices/actions";
import { getInvoice, getTemplate } from "@/modules/invoices/queries";
import { requireModule } from "@/modules/platform/modules";
import { logoPublicUrl } from "@/modules/organizations/logo";

export const metadata: Metadata = { title: "Фактура" };

const statusLabels = { draft: "Чернова", issued: "Издадена", paid: "Платена", void: "Анулирана" } as const;

export default async function InvoicePage({ params }: PageProps<"/app/invoices/[invoiceId]">) {
  const [{ invoiceId }, context] = await Promise.all([params, requireTenantContext()]);
  await orForbidden(requireModule(context, "invoices"));
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) notFound();
  const [found, template, [organization]] = await Promise.all([
    getInvoice(context.organizationId, invoiceId),
    getTemplate(context.organizationId),
    getDatabase().select().from(organizations).where(eq(organizations.id, context.organizationId)).limit(1),
  ]);
  if (!found || !organization) notFound();
  const { invoice, lines } = found;
  const draft = invoice.status === "draft";
  const seller = invoice.seller ?? { name: organization.legalName ?? organization.name, vatId: organization.vatId, companyIdNumber: organization.companyIdNumber, address: organization.legalAddress, email: organization.contactEmail, phone: organization.phone };
  const logo = template?.showLogo === false || !organization.logoStoragePath ? null : logoPublicUrl(organization.logoStoragePath);
  return (
    <PageShell width="wide">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link href="/app/invoices" className="self-start text-sm text-muted-foreground hover:text-foreground">← Фактури</Link>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">{invoice.number ? `Фактура № ${invoice.number}` : "Нова фактура"} <Badge variant={invoice.status === "paid" ? "success-soft" : invoice.status === "void" ? "danger-soft" : "secondary"}>{statusLabels[invoice.status]}</Badge></h1>
          <p className="text-sm text-muted-foreground">{draft ? "Редактираш направо върху фактурата: промените се запазват сами." : "Издадената фактура е заключена: номерът, страните, редовете и сумите не се променят. При грешка я анулирай и направи нова."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted">Свали PDF</a>
          {draft ? <ActionForm action={deleteDraftAction} success="Черновата е изтрита" redirects><input type="hidden" name="invoiceId" value={invoice.id} /><ActionSubmit variant="outline">Изтрий</ActionSubmit></ActionForm> : null}
          {draft ? <ActionForm action={issueInvoiceAction} success="Фактурата е издадена"><input type="hidden" name="invoiceId" value={invoice.id} /><ActionSubmit>Издай фактурата</ActionSubmit></ActionForm> : null}
          {invoice.status === "issued" ? <ActionForm action={markPaidAction} success="Отбелязана като платена"><input type="hidden" name="invoiceId" value={invoice.id} /><ActionSubmit variant="outline">Платена</ActionSubmit></ActionForm> : null}
          {invoice.status === "issued" || invoice.status === "paid" ? <ActionForm action={voidInvoiceAction} success="Фактурата е анулирана"><input type="hidden" name="invoiceId" value={invoice.id} /><ActionSubmit variant="destructive">Анулирай</ActionSubmit></ActionForm> : null}
        </div>
      </div>
      <InvoiceEditor
        readOnly={!draft}
        invoice={{
          id: invoice.id, title: template?.title ?? "Фактура", accent: template?.accent ?? "#102b38", number: invoice.number, status: invoice.status, currency: invoice.currency, logoUrl: logo,
          seller: { name: seller.name, address: seller.address ?? null, companyIdNumber: seller.companyIdNumber ?? null, vatId: seller.vatId ?? null, email: seller.email ?? null },
          buyerName: invoice.buyerName, buyerVat: invoice.buyerVat ?? "", buyerAddress: invoice.buyerAddress ?? "",
          issueDate: invoice.issueDate ?? "", supplyDate: invoice.supplyDate ?? "", dueDate: invoice.dueDate ?? "", note: invoice.note ?? "",
          headerNote: template?.headerNote ?? null, footerNote: template?.footerNote ?? null, paymentNote: template?.paymentNote ?? null,
          lines: lines.map((line) => ({ description: line.description, quantity: String(Number(line.quantity)), unit: line.unit ?? "", unitPrice: line.unitPrice, taxRate: String(Number(line.taxRate)) })),
        }}
      />
    </PageShell>
  );
}
