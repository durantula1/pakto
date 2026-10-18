/**
 * Google Ads conversion tracking, browser only. The Google tag loads only after the visitor accepts
 * cookies in the banner (`CookieConsent`); until then nothing is sent to Google. The ids are public
 * (they are in every page's source once the tag loads), so they live here and not in the env.
 */
export const GOOGLE_ADS_ID = "AW-18520453989";
const SIGN_UP_SEND_TO = `${GOOGLE_ADS_ID}/OfQjCNm7naEdEOXmnv9E`;

export type Consent = "granted" | "denied";

const CONSENT_KEY = "pakto-consent";
export const CONSENT_CHANGE_EVENT = "pakto:consent-change";
export const CONSENT_OPEN_EVENT = "pakto:consent-open";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function readConsent(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage blocked (private mode): the choice holds for this page only.
  }
  if (value === "denied") revokeGoogleTag();
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/** Opens the banner again (the „Бисквитки“ link in the footer), so the visitor can change the choice. */
export function openConsentSettings() {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

let loaded = false;

/** Adds the Google tag once per page load. Call only with consent granted. */
export function loadGoogleTag() {
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js reads the Arguments object itself, not an array copy.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  // Consent Mode v2: ad cookies for conversions only, no remarketing audiences and no analytics.
  window.gtag("consent", "default", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  document.head.appendChild(script);
}

/** After „Отказ“: stops the loaded tag and removes the cookies it set on this domain. */
function revokeGoogleTag() {
  window.gtag?.("consent", "update", { ad_storage: "denied", ad_user_data: "denied" });
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (!name?.startsWith("_gcl")) continue;
    for (const domain of ["", `; domain=.${location.hostname.replace(/^www\./, "")}`]) {
      document.cookie = `${name}=; max-age=0; path=/${domain}`;
    }
  }
}

/**
 * Reports a new company to Google Ads (the „Submit lead form“ conversion). Resolves when Google has
 * the event or after 1.5 s, so the caller can navigate right after; with no consent it resolves at once.
 */
export function trackSignUp(): Promise<void> {
  if (readConsent() !== "granted") return Promise.resolve();
  loadGoogleTag();
  return new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      resolve();
    };
    window.setTimeout(done, 1500);
    window.gtag!("event", "conversion", { send_to: SIGN_UP_SEND_TO, value: 1.0, currency: "EUR", event_callback: done });
  });
}
