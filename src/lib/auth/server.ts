import "server-only";

import { createHmac } from "node:crypto";

import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";

import { getDatabase } from "@/db";
import { authAccounts, authSessions, authUsers, authVerifications, profiles } from "@/db/schema";
import { escapeHtml, sendEmail } from "@/lib/email/send";
import { getPublicEnvironment } from "@/lib/env/public";

/** Session cookies are `pakto.session_token` (and `__Secure-pakto…` over https). */
export const AUTH_COOKIE_PREFIX = "pakto";

/**
 * BETTER_AUTH_SECRET signs the session cookies. Without it a key is derived from the portal link secret,
 * so a server needs one secret less; changing either signs everyone out (client links are separate).
 */
function authSecret() {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET;
  const base = process.env.PORTAL_LINK_SECRET ?? process.env.DATABASE_URL;
  if (!base) throw new Error("Липсва BETTER_AUTH_SECRET.");
  return createHmac("sha256", base).update("pakto:better-auth").digest("hex");
}

const appUrl = getPublicEnvironment().NEXT_PUBLIC_APP_URL;

function authEmail(title: string, intro: string, url: string, button: string, outro: string) {
  return {
    text: `Здравей!\n\n${intro}\n\n${button}: ${url}\n\n${outro}`,
    html: `<div style="max-width:600px"><p style="font-size:16px;font-weight:600">${escapeHtml(title)}</p><p>${escapeHtml(intro)}</p><p style="margin-top:20px"><a href="${url}" style="display:block;padding:14px 20px;border-radius:10px;background:#18181b;color:#fff;text-decoration:none;font-weight:600;text-align:center">${escapeHtml(button)}</a></p><p style="color:#71717a">${escapeHtml(outro)}</p></div>`,
  };
}

export const auth = betterAuth({
  appName: "Pakto",
  baseURL: appUrl,
  basePath: "/api/auth",
  secret: authSecret(),
  trustedOrigins: process.env.NODE_ENV === "production" ? [appUrl] : [appUrl, "http://localhost:3000", "http://127.0.0.1:3000"],
  database: drizzleAdapter(getDatabase(), {
    provider: "pg",
    schema: { user: authUsers, session: authSessions, account: authAccounts, verification: authVerifications },
  }),
  advanced: {
    cookiePrefix: AUTH_COOKIE_PREFIX,
    // UUIDs like the Supabase users they replace, so profiles.id and every user_id keep matching.
    database: { generateId: "uuid" },
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // Saves a session read per request; a revoked session still ends within a minute on other devices.
    cookieCache: { enabled: true, maxAge: 60 },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    // bcrypt reads only the first 72 bytes; a longer password would look accepted but count only in part.
    maxPasswordLength: 72,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    // Supabase stored bcrypt hashes; keeping bcrypt means every existing password still works.
    password: {
      hash: (password) => bcrypt.hash(password, 11),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
    // Not awaited: an answer that waits for SMTP only for existing accounts would tell who has one.
    // A failure still lands in email_outbox and the log.
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        kind: "auth_reset", to: user.email, subject: "Нова парола за Pakto",
        ...authEmail("Нова парола", "Получихме заявка за нова парола за профила ти в Pakto.", url, "Задай нова парола", "Линкът важи 1 час. Ако не си го поискал ти, игнорирай това писмо: паролата ти не е променена."),
      }).catch((cause) => console.error("[auth-email] reset", cause));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    // Also used for a new address after "Смени имейла": Better Auth passes the new address as user.email.
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        kind: "auth_verify", to: user.email, subject: "Потвърди имейла си в Pakto",
        ...authEmail("Потвърди имейла си", "Натисни бутона, за да потвърдиш този имейл за профила си в Pakto.", url, "Потвърди имейла", "Линкът важи 24 часа. Ако не си се регистрирал в Pakto, игнорирай това писмо."),
      }).catch((cause) => console.error("[auth-email] verify", cause));
    },
  },
  user: {
    changeEmail: { enabled: true },
  },
  databaseHooks: {
    user: {
      // Every account has a profile from the start: team lists, invites and onboarding read it.
      create: {
        after: async (user) => {
          await getDatabase().insert(profiles).values({ id: user.id, displayName: user.name, email: user.email.toLowerCase() })
            .onConflictDoNothing();
        },
      },
      // The profile keeps a copy of the sign-in email for team lists and invites.
      update: {
        after: async (user) => {
          await getDatabase().update(profiles).set({ email: user.email.toLowerCase(), updatedAt: new Date() }).where(eq(profiles.id, user.id));
        },
      },
    },
  },
  // Sign-in, sign-up and reset run through server actions, which have their own limits (src/lib/auth/limits.ts).
  rateLimit: { enabled: true, window: 60, max: 60 },
  plugins: [nextCookies()],
});

export type SessionUser = { id: string; email: string; name: string; emailVerified: boolean };

/** The signed-in staff member for this request, read once. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session) return null;
  const { id, email, name, emailVerified } = session.user;
  return { id, email, name, emailVerified };
});

/** Whether `password` is the account's current one (asked again before deleting the account). */
export async function verifyUserPassword(userId: string, password: string) {
  const [account] = await getDatabase().select({ hash: authAccounts.password }).from(authAccounts)
    .where(and(eq(authAccounts.userId, userId), eq(authAccounts.providerId, "credential"))).limit(1);
  return !!account?.hash && bcrypt.compare(password, account.hash);
}

/** Ends every session of the signed-in user, this browser's included. */
export async function signOutEverywhere() {
  const requestHeaders = await headers();
  await auth.api.revokeSessions({ headers: requestHeaders }).catch(() => undefined);
  await auth.api.signOut({ headers: requestHeaders }).catch(() => undefined);
}
