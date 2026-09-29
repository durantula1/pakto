"use server";

import { and, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";

import { getDatabase } from "@/db";
import { organizations, portalGrants, projectContacts, projects, timelineEvents } from "@/db/schema";
import { escapeHtml, sendEmail } from "@/lib/email/send";
import { portalLinkFor } from "@/modules/change-portal/links";

export type LinkRequestState = { error?: string; sent?: boolean };

const RESEND_WINDOW_MS = 15 * 60 * 1000;

/**
 * "Изпрати ми нов линк": only to an email a client already confirmed, with the live links of the
 * projects they are invited to, one email per company. The answer is the same whether or not the
 * email is known, and each contact gets at most one such email per 15 minutes.
 */
export async function requestNewLinksAction(_: LinkRequestState, formData: FormData): Promise<LinkRequestState> {
  const parsed = z.object({ email: z.email("Въведете валиден имейл.") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Въведете валиден имейл." };
  const email = parsed.data.email.trim().toLowerCase();

  // The lookup and the emails run after the answer, so its timing does not tell a known email apart.
  after(() => sendNewLinks(email).catch((cause) => console.error("[portal] new links", cause)));
  return { sent: true };
}

async function sendNewLinks(email: string) {
  const db = getDatabase();
  const rows = await db
    .select({
      contactId: projectContacts.id,
      projectId: projects.id,
      projectName: projects.name,
      organizationId: organizations.id,
      organizationName: organizations.name,
      grantId: portalGrants.id,
      tokenHash: portalGrants.tokenHash,
    })
    .from(projectContacts)
    .innerJoin(projects, and(eq(projects.id, projectContacts.projectId), isNull(projects.archivedAt)))
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .innerJoin(portalGrants, and(
      eq(portalGrants.projectContactId, projectContacts.id),
      isNull(portalGrants.revokedAt),
      isNull(portalGrants.expiresAt),
      eq(portalGrants.tokenCiphertext, "derived-v1"),
    ))
    .where(and(
      sql`lower(${projectContacts.email}) = ${email}`,
      isNotNull(projectContacts.emailVerifiedAt),
      isNull(projectContacts.removedAt),
    ))
    .limit(50);
  if (!rows.length) return;

  const recent = await db.select({ contactId: sql<string>`${timelineEvents.metadata}->>'contactId'` }).from(timelineEvents)
    .where(and(
      eq(timelineEvents.eventType, "portal_links_resent"),
      inArray(timelineEvents.projectId, [...new Set(rows.map((row) => row.projectId))]),
      gt(timelineEvents.createdAt, new Date(Date.now() - RESEND_WINDOW_MS)),
    ));
  const throttled = new Set(recent.map((row) => row.contactId));
  const fresh = rows.filter((row) => !throttled.has(row.contactId));

  const byOrganization = new Map<string, { name: string; links: { contactId: string; projectId: string; projectName: string; url: string }[] }>();
  for (const row of fresh) {
    const url = portalLinkFor({ id: row.grantId, tokenHash: row.tokenHash });
    if (!url) continue;
    const entry = byOrganization.get(row.organizationId) ?? { name: row.organizationName, links: [] };
    if (!entry.links.some((link) => link.projectId === row.projectId)) entry.links.push({ contactId: row.contactId, projectId: row.projectId, projectName: row.projectName, url });
    byOrganization.set(row.organizationId, entry);
  }

  for (const [organizationId, entry] of byOrganization) {
    if (!entry.links.length) continue;
    const list = entry.links.map((link) => `<li style="margin:8px 0"><a href="${escapeHtml(link.url)}">${escapeHtml(link.projectName)}</a></li>`).join("");
    await sendEmail({
      to: email,
      subject: `Вашите линкове към ${entry.name}`,
      text: `Поискахте нови линкове към проектите си при ${entry.name}:\n\n${entry.links.map((link) => `${link.projectName}: ${link.url}`).join("\n")}\n\nАко не сте ги поискали вие, не препращайте този имейл.`,
      html: `<p>Поискахте нови линкове към проектите си при ${escapeHtml(entry.name)}:</p><ul>${list}</ul><p style="color:#71717a">Ако не сте ги поискали вие, не препращайте този имейл.</p>`,
    });
    await db.insert(timelineEvents).values(entry.links.map((link) => ({
      organizationId, projectId: link.projectId, actorType: "portal_contact" as const,
      eventType: "portal_links_resent", visibility: "internal" as const, metadata: { contactId: link.contactId },
    })));
  }
}
