import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
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

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  role: userRole("role"),
  organizationName: text("organization_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

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
    neighborhood: text("neighborhood").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    status: requestStatus("status").notNull().default("open"),
    claimedBy: uuid("claimed_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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

export type User = typeof users.$inferSelect
export type FoodRequest = typeof foodRequests.$inferSelect
export type NewFoodRequest = typeof foodRequests.$inferInsert
