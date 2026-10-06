import "server-only";

import { headers } from "next/headers";

import { clientIp } from "@/lib/http/client-ip";

/**
 * Attempt limits for sign-in, sign-up and password reset. Kept in memory: the app runs as one process, and a restart only forgives a few failed attempts.
 */
const store = globalThis as unknown as { paktoAuthLimitsV1?: Map<string, number[]> };
const buckets = (store.paktoAuthLimitsV1 ??= new Map<string, number[]>());

const RULES = {
  "sign-in": [{ by: "ip", max: 30, minutes: 5 }, { by: "email", max: 10, minutes: 15 }],
  "sign-up": [{ by: "ip", max: 10, minutes: 15 }, { by: "email", max: 3, minutes: 15 }],
  email: [{ by: "ip", max: 10, minutes: 15 }, { by: "email", max: 3, minutes: 15 }],
} as const;

/** Records an attempt; false when this IP or email has used up its attempts for the window. */
export async function allowAuthAttempt(action: keyof typeof RULES, email: string) {
  const ip = clientIp(await headers()) ?? "unknown";
  const now = Date.now();
  let allowed = true;
  for (const rule of RULES[action]) {
    const key = `${action}:${rule.by}:${rule.by === "ip" ? ip : email.toLowerCase()}`;
    const recent = (buckets.get(key) ?? []).filter((time) => time > now - rule.minutes * 60_000);
    if (recent.length >= rule.max) allowed = false;
    else recent.push(now);
    buckets.set(key, recent);
  }
  // Drop idle keys now and then so the map does not grow without end.
  if (buckets.size > 5000) for (const [key, times] of buckets) if (!times.some((time) => time > now - 15 * 60_000)) buckets.delete(key);
  return allowed;
}
