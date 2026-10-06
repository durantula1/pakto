import { randomBytes } from "node:crypto";

import { and, eq, gt, isNotNull, isNull, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { getDatabase } from "@/db";
import {
  organizations,
  portalGrants,
  portalSessions,
  projectContacts,
  projects,
  timelineEvents,
} from "@/db/schema";
import { hashPortalToken } from "@/lib/crypto/portal-token";
import { clientIp } from "@/lib/http/client-ip";
import { CLIENT_IDLE_MS, PORTAL_COOKIE, clientCookieName } from "@/modules/change-portal/session";
import { appUrl } from "@/lib/env/public";
import { allowHit } from "@/modules/support/limits";

/** New portal sessions per IP: plenty for a family on one Wi-Fi, little for a script replaying a link. */
const NEW_SESSIONS_PER_IP = 20;
const NEW_SESSIONS_WINDOW_MS = 10 * 60_000;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  context: RouteContext<"/access/[token]">,
) {
  const { token } = await context.params;
  const database = getDatabase();
  const [grant] = await database
    .select({
      id: portalGrants.id,
      projectId: projects.id,
      publicId: projects.publicId,
      organizationId: projects.organizationId,
      portalSessionDays: organizations.portalSessionDays,
      clientId: projectContacts.clientId,
    })
    .from(portalGrants)
    .innerJoin(projects, eq(projects.id, portalGrants.projectId))
    .innerJoin(projectContacts, and(eq(projectContacts.id, portalGrants.projectContactId), isNull(projectContacts.removedAt)))
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(
      and(
        eq(portalGrants.tokenHash, hashPortalToken(token)),
        isNull(portalGrants.revokedAt),
        or(isNull(portalGrants.expiresAt), gt(portalGrants.expiresAt, new Date())),
      ),
    )
    .limit(1);
  if (!grant)
    return NextResponse.redirect(appUrl("/portal/invalid"));

  const cookieName = grant.clientId ? clientCookieName(grant.organizationId) : `${PORTAL_COOKIE}_${grant.publicId}`;
  // "?offer=<id>" (e.g. from an answer email) lands on that offer; the offer page checks it belongs here.
  const offer = request.nextUrl.searchParams.get("offer");
  const target = appUrl(offer && uuidPattern.test(offer) ? `/portal/${grant.publicId}/changes/${offer}` : `/portal/${grant.publicId}`);

  const reuse = async () => {
    await database.update(portalGrants).set({ lastExchangedAt: new Date() }).where(eq(portalGrants.id, grant.id));
    const response = NextResponse.redirect(target);
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };

  // Reopening a link on the same device keeps its session instead of starting another one.
  const existing = request.cookies.get(cookieName)?.value;
  if (existing && !grant.clientId) {
    const [open] = await database.select({ id: portalSessions.id }).from(portalSessions)
      .where(and(
        eq(portalSessions.sessionHash, hashPortalToken(existing)),
        eq(portalSessions.portalGrantId, grant.id),
        isNull(portalSessions.revokedAt),
        gt(portalSessions.expiresAt, new Date()),
      ))
      .limit(1);
    if (open) return reuse();
  }
  // Another link of the same client on this device joins the session already open here, so a
  // confirmed code keeps the client's other projects open.
  if (existing && grant.clientId) {
    // An unconfirmed session only covers its own project; a link to another one starts afresh.
    const [open] = await database.select({ id: portalSessions.id }).from(portalSessions)
      .innerJoin(portalGrants, eq(portalGrants.id, portalSessions.portalGrantId))
      .where(and(
        eq(portalSessions.sessionHash, hashPortalToken(existing)),
        eq(portalSessions.clientId, grant.clientId),
        isNull(portalGrants.revokedAt),
        or(isNotNull(portalSessions.verifiedAt), eq(portalGrants.projectId, grant.projectId)),
        isNull(portalSessions.revokedAt),
        gt(portalSessions.expiresAt, new Date()),
        gt(portalSessions.lastSeenAt, new Date(Date.now() - CLIENT_IDLE_MS)),
      ))
      .limit(1);
    if (open) return reuse();
  }

  // Every new session is a few rows; one IP opening links in a loop is stopped here.
  const ip = clientIp(request.headers);
  if (!allowHit(`portal-access:${ip ?? "unknown"}`, NEW_SESSIONS_PER_IP, NEW_SESSIONS_WINDOW_MS)) {
    return new NextResponse("Твърде много отваряния за кратко време. Опитайте отново след няколко минути.", {
      status: 429,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "600", "Cache-Control": "no-store" },
    });
  }

  const sessionSecret = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + grant.portalSessionDays * 24 * 60 * 60 * 1000,
  );
  await database.transaction(async (transaction) => {
    await transaction.insert(portalSessions).values({
      portalGrantId: grant.id,
      clientId: grant.clientId,
      sessionHash: hashPortalToken(sessionSecret),
      expiresAt,
      createdIp: ip,
      userAgent: request.headers.get("user-agent"),
    });
    await transaction
      .update(portalGrants)
      .set({ lastExchangedAt: new Date() })
      .where(eq(portalGrants.id, grant.id));
    await transaction.insert(timelineEvents).values({
      organizationId: grant.organizationId,
      projectId: grant.projectId,
      actorType: "portal_contact",
      eventType: "portal_session_created",
      visibility: "client",
      metadata: {},
    });
  });
  const response = NextResponse.redirect(target);
  // The client session replaces a one-project cookie of this project from before.
  if (grant.clientId) response.cookies.delete(`${PORTAL_COOKIE}_${grant.publicId}`);
  response.cookies.set(cookieName, sessionSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
