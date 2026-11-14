import { isIP } from "node:net";

export function readTrustedIp(headers: Pick<Headers, "get">, header?: string): string {
  if (!header) return "";
  const value = headers.get(header)?.split(",")[0].trim() ?? "";
  return isIP(value) ? value : "";
}

export function hasRecentMfa(methods: { method: string; timestamp: number }[] = [], now = Date.now() / 1000): boolean {
  const verified = Math.max(0, ...methods.filter((m) => m.method === "totp" || m.method === "mfa/totp").map((m) => m.timestamp));
  const age = now - verified;
  return age >= 0 && age <= 15 * 60;
}

const buckets = new Map<string, { n: number; reset: number }>();

/** True while `key` has made at most `max` calls in the current window. A fixed window kept in this server instance's memory:
 *  shortcut: each serverless instance counts on its own, so the real ceiling is `max` times the instances running; move it into a shared store (Redis, or the database) if a flood ever gets through. */
export function withinLimit(key: string, max: number, windowMs = 60_000, now = Date.now()): boolean {
  if (buckets.size > 20_000) buckets.clear(); // a flood of distinct addresses must not grow memory without bound
  else if (buckets.size > 5_000) for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.reset <= now) { buckets.set(key, { n: 1, reset: now + windowMs }); return true; }
  return ++b.n <= max;
}
