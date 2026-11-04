/**
 * First and last marketing touch for a signup. Pure (no DOM) so the cookie written in the browser
 * and the row stored at registration share one set of rules. Ad click ids are kept only when the
 * visitor has accepted the banner; until then they sit in the pending object (session storage).
 */
export type AttributionTouch = {
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_path?: string;
  seen_at?: string;
};

export type StoredAttribution = {
  first: AttributionTouch;
  last: AttributionTouch;
};

export type ConsentChoice = "granted" | "denied" | null;

export const CLICK_PARAMS = ["gclid", "gbraid", "wbraid"] as const;
export const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export const CONSENT_KEY = "pakto-consent";
export const ATTRIBUTION_STORAGE_KEY = "pakto-attr";
export const ATTRIBUTION_COOKIE = "pakto_attr";
export const ATTRIBUTION_PENDING_KEY = "pakto-attr-pending";
/** 90 days, first-party. */
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 90;

type MergeInput = {
  consent: ConsentChoice;
  url: AttributionTouch;
  pending: AttributionTouch | null;
  stored: StoredAttribution | null;
  landingPath: string;
  now: string;
};

/**
 * Self-contained on purpose: the public pages run `mergeAttribution.toString()` before React
 * hydrates, so this function must not call anything defined outside it.
 */
export function mergeAttribution(input: MergeInput): {
  stored: StoredAttribution | null;
  pending: AttributionTouch | null;
} {
  const clicks = ["gclid", "gbraid", "wbraid"] as const;
  const utms = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ] as const;

  const clean = (key: string, raw: unknown): string | undefined => {
    if (typeof raw !== "string") return;
    const value = raw.trim();
    if (!value || /[\u0000-\u001F]/.test(value)) return;
    if (key === "gclid" || key === "gbraid" || key === "wbraid") {
      return /^[A-Za-z0-9._~-]{1,200}$/.test(value) ? value : undefined;
    }
    return value.slice(0, 150);
  };

  const sanitize = (value: unknown): AttributionTouch => {
    if (!value || typeof value !== "object") return {};
    const source = value as Record<string, unknown>;
    const touch: AttributionTouch = {};
    for (const key of [...clicks, ...utms]) {
      const cleaned = clean(key, source[key]);
      if (cleaned) touch[key] = cleaned;
    }
    if (
      typeof source.landing_path === "string" &&
      /^\/\S{0,499}$/.test(source.landing_path)
    ) {
      touch.landing_path = source.landing_path;
    }
    if (
      typeof source.seen_at === "string" &&
      source.seen_at.length > 0 &&
      source.seen_at.length <= 40
    ) {
      touch.seen_at = source.seen_at;
    }
    return touch;
  };

  const pickClicks = (
    touch: AttributionTouch | null | undefined,
  ): AttributionTouch => {
    const next: AttributionTouch = {};
    if (!touch) return next;
    for (const key of clicks) if (touch[key]) next[key] = touch[key];
    return next;
  };

  const hasClicks = (touch: AttributionTouch | null | undefined) =>
    clicks.some((key) => !!touch?.[key]);
  const hasMarketing = (touch: AttributionTouch | null | undefined) =>
    !!touch &&
    (clicks.some((key) => !!touch[key]) || utms.some((key) => !!touch[key]));

  const dropAdParams = (path: string) => {
    const queryAt = path.indexOf("?");
    if (queryAt < 0) return path;
    const params = new URLSearchParams(path.slice(queryAt + 1));
    for (const key of clicks) params.delete(key);
    const search = params.toString();
    return path.slice(0, queryAt) + (search ? `?${search}` : "");
  };

  const strip = (touch: AttributionTouch): AttributionTouch => {
    const next: AttributionTouch = { ...touch };
    for (const key of clicks) delete next[key];
    if (
      next.landing_path &&
      clicks.some((key) => next.landing_path?.includes(`${key}=`))
    ) {
      next.landing_path = dropAdParams(next.landing_path).slice(0, 500);
    }
    return next;
  };

  const fill = (
    touch: AttributionTouch,
    ads: AttributionTouch,
  ): AttributionTouch => {
    const next: AttributionTouch = { ...touch };
    for (const key of clicks) if (ads[key] && !next[key]) next[key] = ads[key];
    return next;
  };

  const url = sanitize(input.url);
  const allowAds = input.consent === "granted";
  const urlAds = pickClicks(url);
  const urlCampaign: AttributionTouch = { ...url };
  for (const key of clicks) delete urlCampaign[key];
  delete urlCampaign.landing_path;
  delete urlCampaign.seen_at;

  let pending: AttributionTouch | null =
    input.consent === "denied" ? null : sanitize(input.pending);
  if (
    !allowAds &&
    input.consent !== "denied" &&
    hasClicks(urlAds) &&
    !hasClicks(pending)
  )
    pending = urlAds;
  const ads = allowAds ? { ...pickClicks(pending), ...urlAds } : {};
  const nextPending =
    allowAds || input.consent === "denied" || !hasClicks(pending)
      ? null
      : pickClicks(pending);

  const storedFirst = input.stored ? sanitize(input.stored.first) : undefined;
  const storedLast = input.stored ? sanitize(input.stored.last) : undefined;
  let first = hasMarketing(storedFirst) ? storedFirst : undefined;
  let last = hasMarketing(storedLast) ? storedLast : undefined;
  if (!allowAds) {
    if (first) first = strip(first);
    if (last) last = strip(last);
    if (!hasMarketing(first)) first = undefined;
    if (!hasMarketing(last)) last = undefined;
  }

  const landing =
    typeof input.landingPath === "string"
      ? input.landingPath.slice(0, 500)
      : "/";
  const now = typeof input.now === "string" ? input.now.slice(0, 40) : "";
  const stamped = (touch: AttributionTouch): AttributionTouch => {
    const next = { ...touch };
    if (landing) next.landing_path = landing;
    if (now) next.seen_at = now;
    return next;
  };

  const urlTouch = allowAds ? { ...urlCampaign, ...urlAds } : urlCampaign;
  if (hasMarketing(urlTouch)) {
    const touch = stamped(urlTouch);
    if (!hasMarketing(first)) first = touch;
    else if (allowAds && first) first = fill(first, urlAds);
    last = touch;
  }
  if (allowAds && hasClicks(ads)) {
    if (!hasMarketing(first)) first = stamped(ads);
    else if (first) first = fill(first, ads);
    if (!hasMarketing(last)) last = stamped(ads);
    else if (last) last = fill(last, ads);
  }

  if (!hasMarketing(first) && !hasMarketing(last))
    return { stored: null, pending: nextPending };
  const safeFirst = hasMarketing(first) ? first : last;
  const safeLast = hasMarketing(last) ? last : first;
  return {
    stored: { first: safeFirst ?? {}, last: safeLast ?? {} },
    pending: nextPending,
  };
}

/** What registration stores. Click ids already rejected by the banner never come back. */
export function attributionFromCookie(
  raw: string | undefined,
): StoredAttribution {
  if (!raw) return { first: {}, last: {} };
  try {
    const parsed = JSON.parse(raw) as StoredAttribution;
    const result = mergeAttribution({
      consent: "granted",
      url: {},
      pending: null,
      stored: parsed && typeof parsed === "object" ? parsed : null,
      landingPath: "/",
      now: "",
    });
    return result.stored ?? { first: {}, last: {} };
  } catch {
    return { first: {}, last: {} };
  }
}

/** Account purge: the campaign stays, the click id does not. */
export function withoutAdClickIds(
  stored: StoredAttribution,
): StoredAttribution {
  const result = mergeAttribution({
    consent: "denied",
    url: {},
    pending: null,
    stored,
    landingPath: "/",
    now: "",
  });
  return result.stored ?? { first: {}, last: {} };
}
