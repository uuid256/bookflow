/**
 * Simple in-memory rate limiter.
 * Works for single-instance deployments. For multi-instance / serverless,
 * replace the Map with a Redis/Upstash store.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Periodically prune expired entries to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store) {
    if (now > win.resetAt) store.delete(key);
  }
}, 60_000);

/**
 * Returns true if the request should be allowed, false if rate-limited.
 *
 * @param key        Unique identifier for the caller (e.g. IP address)
 * @param limit      Maximum requests allowed per window
 * @param windowMs   Window duration in milliseconds
 */
export function isAllowed(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const win = store.get(key);

  if (!win || now > win.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (win.count >= limit) return false;
  win.count++;
  return true;
}

/** Extract the best available client IP from a Next.js request. */
export function getClientIp(request: Request): string {
  const forwarded = (request.headers as Headers).get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
