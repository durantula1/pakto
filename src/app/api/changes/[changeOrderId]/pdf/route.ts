import { NextResponse } from "next/server";

import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { getPortalSession } from "@/modules/change-portal/session";
import { getPdfDocumentMeta, renderChangePdf } from "@/modules/pdf/render";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: RouteContext<"/api/changes/[changeOrderId]/pdf">) {
  const { changeOrderId } = await params;
  const document = await getPdfDocumentMeta(changeOrderId);
  if (!document) return NextResponse.json({ error: "Не е намерено." }, { status: 404 });
  const context = await getOptionalTenantContext();
  let authorized = false;
  if (context?.organizationId === document.organizationId) {
    try { await requireProjectCapability(context, document.projectId, "view"); authorized = true; } catch { /* portal access may still apply */ }
  }
  if (!authorized) {
    const portal = await getPortalSession(document.publicId);
    authorized = !!portal && portal.projectId === document.projectId;
  }
  if (!authorized) return NextResponse.json({ error: "Не е намерено." }, { status: 404 });
  const requested = new URL(request.url).searchParams.get("revision");
  const revisionId = requested && /^\d+$/.test(requested) ? Number(requested) : document.currentRevisionId;
  const pdf = revisionId ? await renderChangePdf(document, revisionId) : null;
  if (!pdf) return NextResponse.json({ error: "Документът още не е изпратен." }, { status: 409 });
  return new Response(new Uint8Array(pdf.buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${pdf.asciiFilename}"; filename*=UTF-8''${encodeURIComponent(pdf.filename)}`, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
