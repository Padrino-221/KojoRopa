import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting and audit logs.
 *
 * Prefers the real client socket IP when the server exposes it, then falls
 * back to the first hop of x-forwarded-for (which is only trustworthy when
 * the platform/proxy overwrites it, e.g. on Vercel). Because spoofed
 * per-IP limits are still an issue on plain self-hosted setups, callers also
 * apply a global (IP-independent) cap — see rateLimitGlobal.
 */
export async function getClientIp(): Promise<string> {
  const store = await headers();
  const xRealIp = store.get("x-real-ip");
  if (xRealIp) return xRealIp.trim().split(",")[0].trim();
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
