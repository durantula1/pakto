import { NextResponse } from "next/server";

import { can } from "@/lib/authz/permissions";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { readFile } from "@/lib/storage";
import { ATTACHMENT_BUCKET, getAttachmentAccess } from "@/modules/change-orders/attachment-data";
import { getPortalSession } from "@/modules/change-portal/session";

export const runtime = "nodejs";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

/**
 * Streams an attachment from private storage. Staff need view access to the project
 * (and to the draft, like the document page); the client portal sees files of sent versions only.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/attachments/[attachmentId]">) {
  const { attachmentId } = await params;
  if (!/^[1-9]\d{0,14}$/.test(attachmentId)) return notFound();
  const attachment = await getAttachmentAccess(Number(attachmentId));
  if (!attachment) return notFound();

  let authorized = false;
  const context = await getOptionalTenantContext();
  if (context?.organizationId === attachment.organizationId) {
    try {
      const member = await requireProjectCapability(context, attachment.projectId, "view");
      authorized = !!attachment.frozenAt || can(member, "drafts.view_all") || attachment.revisionCreatedBy === context.userId;
    } catch { /* portal access may still apply */ }
  }
  if (!authorized && attachment.frozenAt) {
    const portal = await getPortalSession(attachment.projectPublicId);
    authorized = !!portal && portal.projectId === attachment.projectId;
  }
  if (!authorized) return notFound();

  const bytes = await readFile(ATTACHMENT_BUCKET, attachment.storagePath).catch(() => null);
  if (!bytes) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const disposition = new URL(request.url).searchParams.has("download") ? "attachment" : "inline";
  // RFC 6266: an ASCII fallback plus the real (Cyrillic) name.
  const asciiName = attachment.originalName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
