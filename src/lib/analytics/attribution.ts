import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE,
  ATTRIBUTION_PENDING_KEY,
  ATTRIBUTION_STORAGE_KEY,
  CLICK_PARAMS,
  CONSENT_KEY,
  mergeAttribution,
  type AttributionTouch,
  type ConsentChoice,
  type StoredAttribution,
} from "@/lib/analytics/touch";

/**
 * Writes the 90-day first-party cookie and its localStorage mirror. Nested so the copy in
 * `<head>` (before React) is this function plus `mergeAttribution`, with no free variables.
 */
function applyAttribution(
  merge: typeof mergeAttribution,
  consentKey: string,
  storageKey: string,
  cookieName: string,
  pendingKey: string,
  maxAge: number,
) {
  const clicks = ["gclid", "gbraid", "wbraid"];
  let consent: ConsentChoice = null;
  try {
    const value = localStorage.getItem(consentKey);
    if (value === "granted" || value === "denied") consent = value;
  } catch {
    consent = null;
  }
  const current = new URLSearchParams(location.search);
  const url: AttributionTouch = {};
  for (const key of [
    "gclid",
    "gbraid",
    "wbraid",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ]) {
    const value = current.get(key);
    if (value) url[key as keyof AttributionTouch] = value;
  }
  let pending: AttributionTouch | null = null;
  try {
    pending = JSON.parse(
      sessionStorage.getItem(pendingKey) || "null",
    ) as AttributionTouch | null;
  } catch {
    pending = null;
  }
  let stored: StoredAttribution | null = null;
  try {
    stored = JSON.parse(
      localStorage.getItem(storageKey) || "null",
    ) as StoredAttribution | null;
  } catch {
    stored = null;
  }
  if (!stored) {
    const parts = document.cookie.split(";");
    const prefix = `${cookieName}=`;
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed.startsWith(prefix)) continue;
      try {
        stored = JSON.parse(
          decodeURIComponent(trimmed.slice(prefix.length)),
        ) as StoredAttribution;
      } catch {
        stored = null;
      }
      break;
    }
  }
  const landingParams = new URLSearchParams(location.search);
  if (consent !== "granted")
    for (const key of clicks) landingParams.delete(key);
  const search = landingParams.toString();
  const result = merge({
    consent,
    url,
    pending,
    stored,
    landingPath: `${location.pathname}${search ? `?${search}` : ""}`,
    now: new Date().toISOString(),
  });
  try {
    if (result.pending)
      sessionStorage.setItem(pendingKey, JSON.stringify(result.pending));
    else sessionStorage.removeItem(pendingKey);
  } catch {
    // Private mode: the URL still carries the campaign until the next navigation.
  }
  if (!result.stored) {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore.
    }
    document.cookie = `${cookieName}=; Max-Age=0; Path=/`;
    return;
  }
  const payload = JSON.stringify(result.stored);
  try {
    localStorage.setItem(storageKey, payload);
  } catch {
    // The cookie below is what registration reads.
  }
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${cookieName}=${encodeURIComponent(payload)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

export function syncAttribution() {
  if (typeof window === "undefined") return;
  applyAttribution(
    mergeAttribution,
    CONSENT_KEY,
    ATTRIBUTION_STORAGE_KEY,
    ATTRIBUTION_COOKIE,
    ATTRIBUTION_PENDING_KEY,
    ATTRIBUTION_MAX_AGE,
  );
}

/**
 * The head script. Runs before the visitor can click through to /sign-up, so a client navigation
 * does not drop the landing query. Same function the banner calls again when the choice changes.
 */
export const attributionBootstrapScript = `(${applyAttribution.toString()})(${mergeAttribution.toString()},${JSON.stringify(CONSENT_KEY)},${JSON.stringify(ATTRIBUTION_STORAGE_KEY)},${JSON.stringify(ATTRIBUTION_COOKIE)},${JSON.stringify(ATTRIBUTION_PENDING_KEY)},${ATTRIBUTION_MAX_AGE})`;

/**
 * Google's tag reads gclid from the URL of the hit. After consent, put the stored click back on
 * this address if the visitor already left the landing page.
 */
export function primeAdClickParams() {
  if (typeof window === "undefined") return;
  let consent: string | null = null;
  try {
    consent = localStorage.getItem(CONSENT_KEY);
  } catch {
    return;
  }
  if (consent !== "granted") return;
  let stored: StoredAttribution | null = null;
  try {
    stored = JSON.parse(
      localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || "null",
    ) as StoredAttribution | null;
  } catch {
    return;
  }
  if (!stored?.first && !stored?.last) return;
  const url = new URL(location.href);
  let changed = false;
  for (const key of CLICK_PARAMS) {
    const value = stored.last?.[key] || stored.first?.[key];
    if (
      value &&
      /^[A-Za-z0-9._~-]{1,200}$/.test(value) &&
      !url.searchParams.has(key)
    ) {
      url.searchParams.set(key, value);
      changed = true;
    }
  }
  if (changed)
    history.replaceState(
      history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
}
