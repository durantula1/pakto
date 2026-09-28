import "server-only";

const hits = new Map<string, number[]>();

/**
 * A per-process sliding window: the app runs as one process on the VPS, so memory is enough and a
 * restart only forgets recent counts. Returns false once `key` has used `limit` hits in `windowMs`.
 */
export function allowHit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [entry, times] of hits) if (times.every((at) => now - at >= windowMs)) hits.delete(entry);
  }
  return true;
}
