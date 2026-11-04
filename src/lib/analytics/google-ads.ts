import {
  primeAdClickParams,
  syncAttribution,
} from "@/lib/analytics/attribution";
import { CONSENT_KEY } from "@/lib/analytics/touch";

/**
 * Google Ads tag and the "Submit lead form" conversion (account 857-106-4693, action 7854317017).
 * The ids are public — they ship in the page — so they live here, not in the environment.
 *
 * Consent Mode v2 (advanced): every public page loads gtag.js with ads storage denied, then a
 * `consent update` when the visitor uses the banner. Tag Assistant can see the tag before a
 * choice, and a refusal still allows a cookieless ping. Ad cookies exist only after „Приемам“.
 * `/app`, the portal and `/access` never load the tag (their CSP does not allow Google).
 *
 * Why Ads had the tag "sending data" and zero conversions: `trackSignUp` ran only from the
 * company form, returned immediately unless consent was already "granted", and then
 * `router.replace("/app")` left a document whose CSP drops Google. Registration itself never
 * called it. The hit now goes out once, on the first signed-in page, with the tag already loaded.
 */
export const GOOGLE_ADS_ID = "AW-18520453989";

/** The only conversion we send. `gtag('event','conversion',{send_to: SIGN_UP_SEND_TO, value: 1, currency: 'EUR', transaction_id})`. */
export const SIGN_UP_SEND_TO = `${GOOGLE_ADS_ID}/OfQjCNm7naEdEOXmnv9E`;

export type Consent = "granted" | "denied";

export const CONSENT_CHANGE_EVENT = "pakto:consent-change";
export const CONSENT_OPEN_EVENT = "pakto:consent-open";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __paktoGoogleTag?: number;
  }
}

export function isPrivatePath(pathname: string) {
  return /^\/(app|portal|access|api|welcome)(\/|$)/.test(pathname);
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
  // The choice is already in localStorage, so the touch cookie picks up or drops click ids now.
  syncAttribution();
  if (value === "granted") primeAdClickParams();
  pushConsent(value);
  if (value === "denied") clearGclCookies();
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/** Opens the banner again (the „Бисквитки“ link in the footer), so the visitor can change the choice. */
export function openConsentSettings() {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

function pushConsent(value: Consent) {
  const ads = value === "granted" ? "granted" : "denied";
  window.gtag?.("consent", "update", {
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
}

/** After „Отказ“: removes the ad cookies the tag set on this domain. */
function clearGclCookies() {
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (!name?.startsWith("_gcl")) continue;
    for (const domain of [
      "",
      `; domain=.${location.hostname.replace(/^www\./, "")}`,
    ]) {
      document.cookie = `${name}=; max-age=0; path=/${domain}`;
    }
  }
}

/**
 * Installs gtag.js once. The default is the choice already saved, or denied when there is none,
 * and it is pushed before the script loads so the first hit matches it.
 */
function installGoogleTag(adsId: string, consentKey: string) {
  if (window.__paktoGoogleTag) return;
  window.__paktoGoogleTag = 1;
  const queue = window.dataLayer ?? [];
  window.dataLayer = queue;
  window.gtag = function gtag() {
    // gtag.js reads the Arguments object itself, not an array copy.
    // eslint-disable-next-line prefer-rest-params
    queue.push(arguments);
  };
  let granted = false;
  try {
    granted = localStorage.getItem(consentKey) === "granted";
  } catch {
    granted = false;
  }
  const ads = granted ? "granted" : "denied";
  window.gtag("consent", "default", {
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted",
  });
  window.gtag("set", "ads_data_redaction", true);
  window.gtag("set", "url_passthrough", true);
  window.gtag("js", new Date());
  window.gtag("config", adsId);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${adsId}`;
  document.head.appendChild(script);
}

/** Adds the Google tag once per page. Public pages do this on load; the signup hit does it if that page skipped it. */
export function loadGoogleTag() {
  installGoogleTag(GOOGLE_ADS_ID, CONSENT_KEY);
}

/** Skips the workspace, the portal and /access. /welcome is skipped too; the signup hit loads the tag itself. */
export const googleTagBootstrapScript = `(function(){var priv=${isPrivatePath.toString()};if(priv(location.pathname))return;(${installGoogleTag.toString()})(${JSON.stringify(GOOGLE_ADS_ID)},${JSON.stringify(CONSENT_KEY)})})()`;

/**
 * One "Submit lead form" hit. Resolves true when Google took the event. Consent Mode decides
 * whether that ping may carry a click id; this does not skip the call when the visitor refused.
 */
export function trackSignUp(transactionId: string): Promise<boolean> {
  loadGoogleTag();
  primeAdClickParams();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (sent: boolean) => {
      if (settled) return;
      settled = true;
      resolve(sent);
    };
    window.setTimeout(() => finish(false), 2000);
    window.gtag?.("event", "conversion", {
      send_to: SIGN_UP_SEND_TO,
      value: 1.0,
      currency: "EUR",
      transaction_id: transactionId,
      transport_type: "beacon",
      event_callback: () => finish(true),
    });
  });
}
