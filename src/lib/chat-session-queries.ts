import { sql } from "drizzle-orm"

export function readActiveSessionQuery(cookieHash: string) {
  return sql`
    SELECT id, turn_count, transcript_hmac, reservation_id, reservation_expires_at, expires_at
    FROM chat_sessions WHERE cookie_hash = ${cookieHash} AND expires_at > now()
  `
}

export function readSessionStatusQuery(cookieHash: string) {
  return sql`
    SELECT id, turn_count, transcript_hmac, reservation_id, reservation_expires_at, expires_at,
      expires_at > now() AS is_active,
      reservation_expires_at IS NOT NULL AND reservation_expires_at <= now() AS reservation_expired
    FROM chat_sessions WHERE cookie_hash = ${cookieHash}
  `
}

export function expireAbandonedReservationQuery(id: string, reservationId: string) {
  return sql`
    UPDATE chat_sessions SET expires_at = now()
    WHERE id = ${id} AND reservation_id = ${reservationId}
      AND reservation_expires_at <= now() AND expires_at > now()
  `
}

/** One conditional UPDATE is the reservation's compare-and-set; concurrent losers update 0 rows. */
export function reserveTurnQuery(cookieHash: string, expectedTurn: number, digest: string, reservationId: string) {
  return sql`
    UPDATE chat_sessions
    SET reservation_id = ${reservationId}, reservation_expires_at = now() + interval '45 seconds'
    WHERE cookie_hash = ${cookieHash} AND expires_at > now()
      AND turn_count = ${expectedTurn} AND transcript_hmac = ${digest}
      AND reservation_id IS NULL
    RETURNING id, turn_count, transcript_hmac, reservation_id, reservation_expires_at, expires_at
  `
}

/** A single ON CONFLICT statement serializes admissions for a pseudonymous IP key. */
export function rateAdmissionQuery(keyHash: string, limit: number) {
  return sql`
    INSERT INTO chat_rate_limits (key_hash, hits, expires_at)
    VALUES (${keyHash}, ARRAY[now()], now() + interval '1 hour')
    ON CONFLICT (key_hash) DO UPDATE
    SET hits = array_append(
          ARRAY(SELECT hit FROM unnest(chat_rate_limits.hits) AS hit WHERE hit > now() - interval '1 hour'),
          now()
        ),
        expires_at = now() + interval '1 hour'
    WHERE (
      SELECT count(*) FROM unnest(chat_rate_limits.hits) AS hit
      WHERE hit > now() - interval '1 hour'
    ) < ${limit}
    RETURNING key_hash
  `
}

export function finalizeTurnQuery(cookieHash: string, reservationId: string, expectedTurn: number, digest: string) {
  return sql`
    UPDATE chat_sessions
    SET turn_count = turn_count + 1, transcript_hmac = ${digest},
        reservation_id = NULL, reservation_expires_at = NULL
    WHERE cookie_hash = ${cookieHash} AND reservation_id = ${reservationId}
      AND reservation_expires_at > now() AND expires_at > now() AND turn_count = ${expectedTurn}
    RETURNING id
  `
}

export function deleteExpiredSessionsQuery() {
  return sql`DELETE FROM chat_sessions WHERE expires_at <= now() RETURNING id`
}

export function deleteExpiredRateLimitsQuery() {
  return sql`DELETE FROM chat_rate_limits WHERE expires_at <= now() RETURNING key_hash`
}
