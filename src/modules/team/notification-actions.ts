"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDatabase } from "@/db";
import { staffNotifications } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";

/** Flips one notice between read and unread from the inbox row. */
export async function toggleNotificationReadAction(formData: FormData) {
  const input = z.object({ notificationId: z.uuid(), read: z.enum(["1", "0"]) }).parse(Object.fromEntries(formData));
  const context = await requireTenantContext();
  await getDatabase().update(staffNotifications).set({ readAt: input.read === "1" ? new Date() : null })
    .where(and(eq(staffNotifications.id, input.notificationId), eq(staffNotifications.organizationId, context.organizationId), eq(staffNotifications.userId, context.userId)));
  revalidatePath("/app", "layout");
}

export async function markAllNotificationsReadAction() {
  const context = await requireTenantContext();
  await getDatabase().update(staffNotifications).set({ readAt: new Date() })
    .where(and(eq(staffNotifications.organizationId, context.organizationId), eq(staffNotifications.userId, context.userId), isNull(staffNotifications.readAt)));
  revalidatePath("/app", "layout");
}
