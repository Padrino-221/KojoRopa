/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Works well for a single Node.js instance (dev, self-hosted). On serverless
 * platforms each cold instance keeps its own buckets, so this is a best-effort
 * guard, not a hard guarantee — for stricter limits use a shared store (Redis).
 *
 * rateLimit() scopes buckets to a key (usually a client IP). Because IP keys
 * can be spoofed through X-Forwarded-For on self-hosted deploys, use
 * rateLimitGlobal() alongside it — it caps the total rate across all keys, so
 * a distributed/spoofed flood still hits a hard ceiling.
 */
const buckets = new Map<string, number[]>();
const globalBuckets = new Map<string, number[]>();

function allow(bucket: Map<string, number[]>, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const times = (bucket.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= limit) {
    bucket.set(key, times);
    return false;
  }
  times.push(now);
  bucket.set(key, times);
  return true;
}

/** Per-key sliding window. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  return allow(buckets, key, limit, windowMs);
}

/** Global sliding window, shared across every key — immune to IP spoofing. */
export function rateLimitGlobal(scope: string, limit: number, windowMs: number): boolean {
  return allow(globalBuckets, `global:${scope}`, limit, windowMs);
}
