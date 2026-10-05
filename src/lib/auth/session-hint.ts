/**
 * A non-secret flag cookie the proxy keeps in step with the session (src/proxy.ts). The session cookie
 * itself is HttpOnly, so the landing page's script cannot see it.
 */
export const AUTH_HINT_COOKIE = "pakto-signed-in";
const authCookieName = AUTH_HINT_COOKIE;

/**
 * Marks <html data-auth="in|out"> from the session cookie. Only a hint for the static
 * landing page (which buttons to show); it proves nothing, and /app still checks the session on
 * the server. Self-contained, because it also runs as an inline script before the first paint.
 */
function markAuth(cookieName: string) {
  const signedIn = document.cookie
    .split("; ")
    .some((pair) => pair.startsWith(cookieName + "="));
  document.documentElement.dataset.auth = signedIn ? "in" : "out";
}

export function applyAuthHint() {
  markAuth(authCookieName);
}

export const authHintScript = `(${markAuth.toString()})(${JSON.stringify(authCookieName)})`;

/**
 * A cookie can outlive its session (expired, revoked, or a sign-out that failed half way). When the
 * hint says "in", ask the server once and fall back to the visitor buttons if the session is gone.
 */
export function verifyAuthHint() {
  if (document.documentElement.dataset.auth !== "in") return;
  fetch("/auth/session", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((result: { signedIn?: boolean } | null) => {
      if (result && !result.signedIn) document.documentElement.dataset.auth = "out";
    })
    .catch(() => {});
}
