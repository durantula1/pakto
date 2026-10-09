import { renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { demoOffer } from "@/modules/organizations/demo-offer";
import { loadLogo } from "@/modules/organizations/logo";
import { ChangePdfDocument } from "@/modules/pdf/change-document";

export const runtime = "nodejs";

/** The sample offer as the real PDF, with the company's saved logo, so the owner sees exactly what clients get. */
export async function GET() {
  const context = await getOptionalTenantContext();
  if (!context || context.role !== "owner") return NextResponse.json({ error: "Не е намерено." }, { status: 404 });
  const [organization] = await getDatabase().select({ name: organizations.name, logoStoragePath: organizations.logoStoragePath, logoSize: organizations.logoSize })
    .from(organizations).where(eq(organizations.id, context.organizationId)).limit(1);
  if (!organization) return NextResponse.json({ error: "Не е намерено." }, { status: 404 });

  const logo = await loadLogo(organization.logoStoragePath).catch(() => null);
  const now = new Date();
  const { document } = demoOffer;
  const buffer = await renderToBuffer(ChangePdfDocument({
    organization: organization.name,
    logo: logo ? { ...logo, size: organization.logoSize } : null,
    project: demoOffer.project,
    siteAddress: demoOffer.siteAddress,
    contact: demoOffer.contact,
    kind: "offer",
    code: demoOffer.code,
    revision: {
      ...document, title: demoOffer.title, revisionNumber: 1, changeKind: "addition", agreedDeadline: demoOffer.agreedDeadline,
      contentHash: "demo", frozenAt: now, responseDueAt: new Date(now.getTime() + 14 * 86_400_000),
    },
    lines: document.lineItems,
    decision: null,
  }));
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="demo-oferta.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
