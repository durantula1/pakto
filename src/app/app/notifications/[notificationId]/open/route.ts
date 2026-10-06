import { NextResponse } from "next/server";
import { z } from "zod";
import "@/lib/zod-messages";

import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { openNotification } from "@/modules/notifications/queries";
import { appUrl } from "@/lib/env/public";

/**
 * A click on a notice: marks it read and goes where it points, in one step. Links to it are plain
 * anchors, never prefetched, so only a real click marks anything.
 */
export async function GET(request: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const { notificationId } = await params;
  const inbox = appUrl("/app/notifications");
  const context = await getOptionalTenantContext();
  if (!context) return NextResponse.redirect(appUrl("/sign-in"));
  if (!z.uuid().safeParse(notificationId).success) return NextResponse.redirect(inbox);
  const notice = await openNotification(context, notificationId);
  const target = notice?.href && notice.href.startsWith("/app/") && !notice.href.startsWith("//") ? appUrl(notice.href) : inbox;
  return NextResponse.redirect(target, 303);
}
