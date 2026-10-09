const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ids in URLs are uuids. Anything else (`/portal/1`, `/app/offers/abc`) is "not found": passed to Postgres
 * it failed the uuid cast and surfaced as a 500 or "Нещо се обърка".
 */
export function isUuid(value: string) {
  return uuidPattern.test(value);
}
