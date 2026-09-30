/**
 * Where to go after signing in: a page inside the app (a link from an email or a notification)
 * or a team invitation. Anything else, including other sites (`//evil.com`, `/\evil.com`), falls
 * back, so `?next=` can never send someone off Pakto.
 */
const ALLOWED = /^\/(?:join\/[A-Za-z0-9._-]+|app(?:\/(?!\.\.?(?:[/?]|$))[A-Za-z0-9._~-]+)*\/?(?:\?[A-Za-z0-9._~=&%+-]*)?)$/;

export function safeNextPath(value: unknown, fallback = "/app") {
  return typeof value === "string" && ALLOWED.test(value) ? value : fallback;
}
