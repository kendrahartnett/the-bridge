import "server-only"

import { createHash, randomBytes, randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"

import { db } from "@/db"
import { transcriptDigest, type ChatMessage } from "@/lib/chat-security-core"
import {
  deleteExpiredRateLimitsQuery,
  deleteExpiredSessionsQuery,
  expireAbandonedReservationQuery,
  finalizeTurnQuery,
  rateAdmissionQuery,
  readActiveSessionQuery,
  readSessionStatusQuery,
  reserveTurnQuery,
} from "@/lib/chat-session-queries"

export type SessionRow = {
  id: string
  turn_count: number
  transcript_hmac: string
  reservation_id: string | null
  reservation_expires_at: Date | string | null
  expires_at: Date | string
  is_active?: boolean
  reservation_expired?: boolean
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex")

export function chatSecret() {
  const value = process.env.CHAT_SESSION_SECRET
  if (!value || value.length < 32) throw new Error("chat_secret_unavailable")
  return value
}

export function newSessionToken() {
  return randomBytes(32).toString("base64url")
}

export async function createChatSession(token: string, secret: string) {
  const emptyDigest = transcriptDigest(secret, [])
  await db.execute(sql`
    INSERT INTO chat_sessions (cookie_hash, turn_count, transcript_hmac, expires_at)
    VALUES (${tokenHash(token)}, 0, ${emptyDigest}, now() + interval '24 hours')
  `)
}

export async function readChatSession(token: string): Promise<SessionRow | null> {
  const { rows } = await db.execute<SessionRow>(readActiveSessionQuery(tokenHash(token)))
  return rows[0] ?? null
}

export async function reserveChatTurn(token: string, expectedTurn: number, expectedDigest: string) {
  const reservationId = randomUUID()
  const { rows } = await db.execute<SessionRow>(reserveTurnQuery(tokenHash(token), expectedTurn, expectedDigest, reservationId))
  if (rows[0]) return { ok: true as const, reservationId, session: rows[0] }

  const current = await readSessionIncludingExpired(token)
  if (!current || !current.is_active) return { ok: false as const, reason: "expired" as const }
  if (current.reservation_id) {
    if (current.reservation_expired) {
      // An interrupted provider call may have completed remotely. Never reuse that turn.
      await db.execute(expireAbandonedReservationQuery(current.id, current.reservation_id))
      return { ok: false as const, reason: "expired" as const }
    }
    return { ok: false as const, reason: "busy" as const }
  }
  return { ok: false as const, reason: "replay" as const }
}

async function readSessionIncludingExpired(token: string): Promise<SessionRow | null> {
  const { rows } = await db.execute<SessionRow>(readSessionStatusQuery(tokenHash(token)))
  return rows[0] ?? null
}

export async function finalizeChatTurn(
  token: string,
  reservationId: string,
  expectedTurn: number,
  messages: ChatMessage[],
  reply: string,
  secret: string
) {
  const digest = transcriptDigest(secret, [...messages, { role: "assistant", content: reply }])
  const { rows } = await db.execute<{ id: string }>(finalizeTurnQuery(tokenHash(token), reservationId, expectedTurn, digest))
  return rows.length === 1
}

export async function admitChatRequest(keyHash: string, limit: number) {
  const { rows } = await db.execute<{ key_hash: string }>(rateAdmissionQuery(keyHash, limit))
  return rows.length === 1
}

export async function deleteExpiredSessions() {
  const { rows } = await db.execute<{ id: string }>(deleteExpiredSessionsQuery())
  return rows.length
}

export async function deleteExpiredRateLimits() {
  const { rows } = await db.execute<{ key_hash: string }>(deleteExpiredRateLimitsQuery())
  return rows.length
}
