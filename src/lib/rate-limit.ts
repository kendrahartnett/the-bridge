import "server-only"

// Sliding-window rate limit kept in this server instance's memory.
// Limitation: on serverless hosting (Vercel) each instance has its own memory, so the
// limit applies per instance, not globally. A shared store (e.g. Redis) would make it exact.

const WINDOW_MS = 60 * 60 * 1000
const hits = new Map<string, number[]>()

export function rateLimit(key: string, limit: number): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return { ok: false, retryAfterSeconds: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) }
  }
  recent.push(now)
  hits.set(key, recent)
  // Keep memory bounded: occasionally drop keys with no recent hits.
  if (hits.size > 5_000) {
    for (const [k, times] of hits) if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k)
  }
  return { ok: true }
}

/** Best-effort client IP. Vercel sets x-forwarded-for / x-real-ip from the real connection. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  )
}
