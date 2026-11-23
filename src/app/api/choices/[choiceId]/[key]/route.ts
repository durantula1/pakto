import { NextResponse } from "next/server";

import { requireProjectCapability } from "@/lib/authz/project-access";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { readFile } from "@/lib/storage";
import { sniffMimeType } from "@/modules/change-orders/attachment-data";
import {
  CHOICE_BUCKET,
  getChoiceImage,
} from "@/modules/client-choices/queries";
import { getPortalSession } from "@/modules/change-portal/session";

export const runtime = "nodejs";

const notFound = () =>
  NextResponse.json({ error: "Не е намерено." }, { status: 404 });

/** One option's photo. Staff need view access to the project; the client needs a portal session for it. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/choices/[choiceId]/[key]">,
) {
  const { choiceId, key } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(choiceId) || !/^[a-f]$/.test(key))
    return notFound();
  const image = await getChoiceImage(choiceId, key);
  if (!image) return notFound();

  let authorized = false;
  const context = await getOptionalTenantContext();
  if (context?.organizationId === image.organizationId) {
    try {
      await requireProjectCapability(context, image.projectId, "view");
      authorized = true;
    } catch {
      /* portal access may still apply */
    }
  }
  if (!authorized) {
    const portal = await getPortalSession(image.projectPublicId);
    authorized = !!portal && portal.projectId === image.projectId;
  }
  if (!authorized) return notFound();

  const bytes = await readFile(CHOICE_BUCKET, image.path).catch(() => null);
  if (!bytes)
    return NextResponse.json(
      { error: "Снимката не е достъпна." },
      { status: 503 },
    );
  const data = new Uint8Array(bytes);
  return new NextResponse(data, {
    headers: {
      "Content-Type": sniffMimeType(data) ?? "application/octet-stream",
      "Content-Length": String(data.byteLength),
      "Cache-Control": "private, max-age=3600",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
