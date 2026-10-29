import { timingSafeEqual } from "node:crypto"

export type ChatCleanupStore = {
  deleteExpiredSessions(now: Date): Promise<number>
  deleteExpiredRateLimits(now: Date): Promise<number>
}

export function cronAuthorized(authorization: string | null, secret: string | undefined) {
  if (!secret || secret.length < 32 || !authorization?.startsWith("Bearer ")) return false
  const provided = Buffer.from(authorization.slice(7))
  const expected = Buffer.from(secret)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

/** Shared operation for the authenticated endpoint and offline behavior tests. */
export async function cleanupExpiredChatMetadata(store: ChatCleanupStore, now = new Date()) {
  const [sessions, rateLimits] = await Promise.all([
    store.deleteExpiredSessions(now),
    store.deleteExpiredRateLimits(now),
  ])
  return { sessions, rateLimits }
}
