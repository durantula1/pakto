import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { getSessionUser } from "@/lib/auth/server";
import { getServerEnvironment } from "@/lib/env/server";

/** The operators from `PLATFORM_ADMIN_EMAILS`, lower-cased. Empty means nobody sees /app/admin. */
export function platformAdminEmails(): string[] {
  return getServerEnvironment().PLATFORM_ADMIN_EMAILS
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** A verified session whose email is on the list. Checked on the server for every admin render. */
export const isPlatformAdmin = cache(async (): Promise<boolean> => {
  const user = await getSessionUser();
  if (!user?.emailVerified) return false;
  return platformAdminEmails().includes(user.email.trim().toLowerCase());
});

/** Anyone else gets the 404 page, so the section does not reveal that it exists. */
export async function requirePlatformAdmin() {
  if (!(await isPlatformAdmin())) notFound();
}
