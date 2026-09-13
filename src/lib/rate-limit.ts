/**
 * Simple in-memory rate limiter (per process).
 * Suitable for single-instance / demo; use Redis in multi-instance prod.
 */

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  return { ok: true };
}

/** Client IP helper for NextRequest-like objects */
export function clientIp(req: { headers: Headers }): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

/** 10 requests / minute — auth login, register, tips */
export function authRateLimit(req: { headers: Headers }, route: string) {
  return rateLimit(`auth:${route}:${clientIp(req)}`, 10, 60_000);
}
