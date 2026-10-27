import { and, asc, desc, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { privacyReviews, users, type PrivacyReview } from "../db/schema.ts"
import type { Db } from "./request-rules.ts"
import type { ScreeningDecision } from "./privacy-screening-core.ts"
import type { ScreenableNeed } from "./privacy-screening.ts"

const reviewId = z.uuid()
const decisionInput = z.strictObject({
  id: reviewId,
  action: z.enum(["approve", "changes", "reject"]),
  reason: z.enum(["privacy_detail", "insufficient_detail", "outside_scope"]).optional(),
})

export async function listPrivacyReviews(db: Db, adminId: string): Promise<PrivacyReview[] | null> {
  const [admin] = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.id, adminId), eq(users.isAdmin, true)))
  if (!admin) return null
  return db.select().from(privacyReviews)
    .where(sql`exists (select 1 from ${users} where ${users.id} = ${adminId} and ${users.isAdmin} = true)`)
    .orderBy(asc(privacyReviews.createdAt))
}

export async function listMyPrivacyReviews(db: Db, userId: string): Promise<PrivacyReview[]> {
  return db.select().from(privacyReviews)
    .where(eq(privacyReviews.submittedBy, userId))
    .orderBy(desc(privacyReviews.createdAt))
}

export async function getRevisionDraft(db: Db, userId: string, id: unknown): Promise<PrivacyReview | null> {
  const parsed = reviewId.safeParse(id)
  if (!parsed.success) return null
  const [row] = await db.select().from(privacyReviews)
    .where(and(eq(privacyReviews.id, parsed.data), eq(privacyReviews.submittedBy, userId), eq(privacyReviews.status, "changes_requested")))
  return row ?? null
}

export type PrivacyReviewActionResult = { ok: true } | { ok: false; error: string }

export async function decidePrivacyReview(
  db: Db,
  adminId: string,
  raw: unknown,
  screen: (value: ScreenableNeed) => Promise<ScreeningDecision> = async (value) =>
    (await import("./privacy-screening.ts")).screenNeed(value)
): Promise<PrivacyReviewActionResult> {
  const parsed = decisionInput.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Choose a valid review action." }
  const { id, action, reason } = parsed.data
  const [admin] = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.id, adminId), eq(users.isAdmin, true)))
  if (!admin) return { ok: false, error: "Only admins can review requests." }
  const [row] = await db.select().from(privacyReviews)
    .where(and(eq(privacyReviews.id, id), eq(privacyReviews.status, "pending_review")))
  if (!row) return { ok: false, error: "This review is no longer pending." }

  if (action === "approve") {
    // The final check is on the exact safe candidate being published. A stale or
    // unavailable classification never authorizes publication.
    let result: ScreeningDecision
    try {
      result = await screen({ items: row.safeItems, dietaryNotes: row.safeNotes, neighborhood: row.neighborhood as ScreenableNeed["neighborhood"] })
    } catch {
      console.error("[privacy-review] code=approval_screen_failed")
      return { ok: false, error: "This version did not pass privacy screening. Request changes instead." }
    }
    if (result.kind !== "safe") return { ok: false, error: "This version did not pass privacy screening. Request changes instead." }
    let rows: Record<string, unknown>[]
    try {
      const result = await db.execute(sql`
      with eligible as materialized (
        select r.* from privacy_reviews r
        where r.id = ${id} and r.status = 'pending_review'
          and exists (select 1 from users a where a.id = ${adminId} and a.is_admin = true)
          and exists (select 1 from users p where p.id = r.submitted_by
            and (p.role = 'outreach' or (p.role = 'donor' and p.verification_status = 'approved')))
        for update of r
      ), published as (
        insert into food_requests (created_by, people_count, category, items, dietary_notes,
          neighborhood, window_start, window_end, privacy_flagged, privacy_categories)
        select submitted_by, people_count, category, safe_items, safe_notes,
          neighborhood, window_start, window_end, false, '{}'::text[] from eligible
        returning id
      ), finalized as (
        update privacy_reviews r set status = 'approved', reviewed_at = now(), reviewed_by = ${adminId},
          published_request_id = (select id from published)
        where r.id = (select id from eligible) and exists (select 1 from published)
        returning r.submitted_by
      ), notified as (
        insert into notifications (user_id, type)
        select submitted_by, 'privacy_approved'::notification_type from finalized returning id
      ) select id from published`)
      rows = result.rows
    } catch {
      console.error("[privacy-review] code=approval_write_failed")
      return { ok: false, error: "We couldn't complete this review. Please try again." }
    }
    return rows.length ? { ok: true } : { ok: false, error: "This review is no longer pending." }
  }

  if (!reason) return { ok: false, error: "Choose a reason." }
  const status = action === "changes" ? "changes_requested" : "rejected"
  const notification = action === "changes" ? "privacy_changes" : "privacy_rejected"
  let rows: Record<string, unknown>[]
  try {
    const result = await db.execute(sql`
    with decided as (
      update privacy_reviews set status = ${status}, decision_reason = ${reason},
        reviewed_at = now(), reviewed_by = ${adminId}
      where id = ${id} and status = 'pending_review'
        and exists (select 1 from users where id = ${adminId} and is_admin = true)
      returning submitted_by
    ), notified as (
      insert into notifications (user_id, type)
      select submitted_by, ${notification}::notification_type from decided returning id
    ) select submitted_by from decided`)
    rows = result.rows
  } catch {
    console.error("[privacy-review] code=decision_write_failed")
    return { ok: false, error: "We couldn't complete this review. Please try again." }
  }
  return rows.length ? { ok: true } : { ok: false, error: "This review is no longer pending." }
}
