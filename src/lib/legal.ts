/**
 * Versions of the legal documents a user accepts at sign-up. Bump a version when its text
 * changes materially; `user_consents` keeps which version each user accepted and when.
 */
export const LEGAL_DOCUMENTS = {
  terms: { version: "2026-09-29", href: "/terms", label: "Условия за ползване" },
  privacy: { version: "2026-09-29", href: "/privacy", label: "Политика за поверителност" },
} as const;

export type LegalDocument = keyof typeof LEGAL_DOCUMENTS;

/** Days between a deletion request and the purge. Signing in during this window lets the user cancel. */
export const ACCOUNT_DELETION_GRACE_DAYS = 30;

export function accountDeletionDate(requestedAt: Date) {
  return new Date(requestedAt.getTime() + ACCOUNT_DELETION_GRACE_DAYS * 86400000);
}
