import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"

import { COMMUNITY_AREAS } from "../lib/neighborhoods.ts"

// PRIVACY RULE: never add columns for names, addresses, camp locations, GPS
// coordinates, or any identifying details of the people being served.
// Location is the Chicago community area only.

export const userRole = pgEnum("user_role", ["outreach", "donor"])

export const requestStatus = pgEnum("request_status", [
  "open",
  "claimed",
  "delivered",
  "cancelled",
])

// What kind of support a request asks for. Display labels live in the UI.
export const requestCategory = pgEnum("request_category", [
  "food",
  "clothing",
  "hygiene",
  "other",
])

// Organizations are reviewed by a person before they can claim needs or see contact
// details. Outreach accounts don't need review.
export const verificationStatus = pgEnum("verification_status", [
  "not_required",
  "pending",
  "approved",
  "rejected",
])

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    displayName: text("display_name"),
    role: userRole("role"),
    organizationName: text("organization_name"),
    verificationStatus: verificationStatus("verification_status")
      .notNull()
      .default("not_required"),
    organizationWebsite: text("organization_website"),
    // US Employer Identification Number, NN-NNNNNNN. Optional; helps verification.
    organizationEin: text("organization_ein"),
    contactName: text("contact_name"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    // If the reviewing admin's account is deleted, keep the review but clear who did it.
    reviewedBy: uuid("reviewed_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
    // Internal note from the reviewing admin. Never shown to the organization.
    reviewNote: text("review_note"),
    // Granted only with `npm run admin:grant`, never through the app.
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "verification_matches_role",
      sql`(${t.role} = 'outreach' AND ${t.verificationStatus} = 'not_required')
        OR (${t.role} = 'donor' AND ${t.verificationStatus} IN ('pending', 'approved', 'rejected'))`
    ),
    check("organization_ein_format", sql`${t.organizationEin} IS NULL OR ${t.organizationEin} ~ '^[0-9]{2}-[0-9]{7}$'`),
    check("review_note_length", sql`${t.reviewNote} IS NULL OR char_length(${t.reviewNote}) <= 300`),
  ]
)

// DDL can't take bound parameters, so the list is inlined with quotes escaped.
const areaList = sql.raw(
  COMMUNITY_AREAS.map((a) => `'${a.replaceAll("'", "''")}'`).join(", ")
)

export const foodRequests = pgTable(
  "food_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    peopleCount: integer("people_count").notNull(),
    category: requestCategory("category").notNull().default("food"),
    items: text("items").notNull(),
    dietaryNotes: text("dietary_notes"),
    // Screening metadata only. Never store the model's response or rejected text.
    privacyFlagged: boolean("privacy_flagged").notNull().default(false),
    privacyCategories: text("privacy_categories").array().notNull().default(sql`'{}'::text[]`),
    neighborhood: text("neighborhood").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    status: requestStatus("status").notNull().default("open"),
    claimedBy: uuid("claimed_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // When the need moved to each status, for the timeline on its detail page. Set by the
    // rules in src/lib/request-rules.ts; null on needs that changed before these existed.
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "people_count_range",
      sql`${t.peopleCount} BETWEEN 1 AND 500`
    ),
    check("items_length", sql`char_length(${t.items}) <= 200`),
    check(
      "dietary_notes_length",
      sql`${t.dietaryNotes} IS NULL OR char_length(${t.dietaryNotes}) <= 300`
    ),
    check("neighborhood_community_area", sql`${t.neighborhood} IN (${areaList})`),
    check("window_order", sql`${t.windowEnd} > ${t.windowStart}`),
    // Open and cancelled requests have no donor; claimed and delivered ones always do.
    check(
      "claim_status_consistency",
      sql`(${t.status} = 'open' AND ${t.claimedBy} IS NULL)
        OR (${t.status} IN ('claimed', 'delivered') AND ${t.claimedBy} IS NOT NULL)
        OR (${t.status} = 'cancelled' AND ${t.claimedBy} IS NULL)`
    ),
    index("food_requests_created_by_idx").on(t.createdBy),
    index("food_requests_status_idx").on(t.status),
  ]
)

// What happened, for the inbox. The text is built when it's shown, from the request and the
// people involved: no free text is stored, and admin review notes are never used.
export const notificationType = pgEnum("notification_type", [
  "need_claimed",
  "need_fulfilled",
  "org_approved",
  "org_rejected",
  "privacy_pending",
  "privacy_approved",
  "privacy_changes",
  "privacy_rejected",
  "privacy_new_review",
])

// The queue stores only a separately screened safe candidate, never the original
// medium-risk text or an unvalidated model explanation.
export const privacyReviews = pgTable(
  "privacy_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submittedBy: uuid("submitted_by").notNull().references(() => users.id),
    status: text("status").notNull().default("pending_review"),
    riskLevel: text("risk_level").notNull().default("medium"),
    categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
    peopleCount: integer("people_count").notNull(),
    category: requestCategory("category").notNull(),
    safeItems: text("safe_items").notNull(),
    safeNotes: text("safe_notes"),
    neighborhood: text("neighborhood").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    decisionReason: text("decision_reason"),
    publishedRequestId: uuid("published_request_id").references(() => foodRequests.id),
    // Set only on a replacement review created from a changes-requested review.
    // The prior row remains as immutable history and moves to `superseded`.
    supersedesReviewId: uuid("supersedes_review_id").references((): AnyPgColumn => privacyReviews.id),
  },
  (t) => [
    check("privacy_review_status_valid", sql`${t.status} in ('pending_review', 'changes_requested', 'approved', 'rejected', 'superseded')`),
    check("privacy_review_risk_valid", sql`${t.riskLevel} = 'medium'`),
    check("privacy_review_people_count", sql`${t.peopleCount} between 1 and 500`),
    check("privacy_review_safe_items_length", sql`char_length(${t.safeItems}) between 1 and 200`),
    check("privacy_review_safe_notes_length", sql`${t.safeNotes} is null or char_length(${t.safeNotes}) <= 300`),
    check("privacy_review_window_order", sql`${t.windowEnd} > ${t.windowStart}`),
    check("privacy_review_decision_reason", sql`${t.decisionReason} is null or ${t.decisionReason} in ('privacy_detail', 'insufficient_detail', 'outside_scope')`),
    index("privacy_reviews_status_created_idx").on(t.status, t.createdAt),
    index("privacy_reviews_submitter_created_idx").on(t.submittedBy, t.createdAt),
    uniqueIndex("privacy_reviews_supersedes_review_idx").on(t.supersedesReviewId),
  ]
)

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").references(() => foodRequests.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [
    // Need notifications point at a need; account notifications don't.
    check(
      "notification_request_matches_type",
      sql`(${t.type} IN ('need_claimed', 'need_fulfilled')) = (${t.requestId} IS NOT NULL)`
    ),
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
  ]
)

export type User = typeof users.$inferSelect
export type FoodRequest = typeof foodRequests.$inferSelect
export type NewFoodRequest = typeof foodRequests.$inferInsert
export type PrivacyReview = typeof privacyReviews.$inferSelect
