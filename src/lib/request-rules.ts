// The request rules, separate from the session so they can be tested directly.
// The server actions (src/app/**/actions.ts) look up the signed-in user and call these;
// scripts/test-claim-rules.ts calls them with real users from the database.
// Relative .ts imports keep this loadable by Node outside Next.js.

import { and, eq } from "drizzle-orm"
import type { NeonHttpDatabase } from "drizzle-orm/neon-http"
import { z } from "zod"

import { foodRequests, type FoodRequest } from "../db/schema.ts"
import type * as schema from "../db/schema.ts"
import { chicagoLocalToDate } from "./chicago-time.ts"
import { STATUS_LABELS } from "./labels.ts"
import { newRequestSchema, type NewRequestInput } from "./validation.ts"

export type Db = NeonHttpDatabase<typeof schema>

/** Who is acting. Always taken from the session (or the database in tests), never the browser. */
export type Actor = { id: string; role: "outreach" | "donor" | null }

export type RequestActionResult = { ok: true; message: string } | { ok: false; error: string }

export type CreateRequestResult =
  | { ok: true; id: string }
  | { ok: false; error?: string; fieldErrors?: Partial<Record<keyof NewRequestInput, string[]>> }

const requestId = z.uuid()

const ROLE_ERRORS = {
  donor: "Only organization accounts can offer support.",
  outreach: "Only the outreach worker who made this request can change it.",
} as const

async function currentStatus(db: Db, id: string): Promise<FoodRequest["status"] | null> {
  const [row] = await db
    .select({ status: foodRequests.status })
    .from(foodRequests)
    .where(eq(foodRequests.id, id))
  return row?.status ?? null
}

export async function claimRequest(db: Db, actor: Actor, id: unknown): Promise<RequestActionResult> {
  if (actor.role !== "donor") return { ok: false, error: ROLE_ERRORS.donor }
  const parsed = requestId.safeParse(id)
  if (!parsed.success) return { ok: false, error: "We couldn't find that request." }

  // One conditional UPDATE: Postgres row locking means only one organization can win.
  const updated = await db
    .update(foodRequests)
    .set({ status: "claimed", claimedBy: actor.id })
    .where(and(eq(foodRequests.id, parsed.data), eq(foodRequests.status, "open")))
    .returning({ id: foodRequests.id })

  if (updated.length === 0) {
    const status = await currentStatus(db, parsed.data)
    return {
      ok: false,
      error:
        status === "claimed" || status === "delivered"
          ? "Someone else just offered support for this request."
          : status === "cancelled"
            ? "This request was cancelled."
            : "We couldn't find that request.",
    }
  }
  return { ok: true, message: "You offered support for this request. Thank you!" }
}

export async function confirmDelivery(db: Db, actor: Actor, id: unknown): Promise<RequestActionResult> {
  if (actor.role !== "outreach") return { ok: false, error: ROLE_ERRORS.outreach }
  const parsed = requestId.safeParse(id)
  if (!parsed.success) return { ok: false, error: "We couldn't find that request." }

  const updated = await db
    .update(foodRequests)
    .set({ status: "delivered" })
    .where(
      and(
        eq(foodRequests.id, parsed.data),
        eq(foodRequests.createdBy, actor.id),
        eq(foodRequests.status, "claimed")
      )
    )
    .returning({ id: foodRequests.id })

  if (updated.length === 0) {
    return { ok: false, error: await explainNoChange(db, parsed.data, actor.id, "claimed") }
  }
  return { ok: true, message: "Marked as fulfilled." }
}

export async function cancelRequest(db: Db, actor: Actor, id: unknown): Promise<RequestActionResult> {
  if (actor.role !== "outreach") return { ok: false, error: ROLE_ERRORS.outreach }
  const parsed = requestId.safeParse(id)
  if (!parsed.success) return { ok: false, error: "We couldn't find that request." }

  const updated = await db
    .update(foodRequests)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(foodRequests.id, parsed.data),
        eq(foodRequests.createdBy, actor.id),
        eq(foodRequests.status, "open")
      )
    )
    .returning({ id: foodRequests.id })

  if (updated.length === 0) {
    return { ok: false, error: await explainNoChange(db, parsed.data, actor.id, "open") }
  }
  return { ok: true, message: "Request cancelled." }
}

/** Why a creator-only update matched no rows. Doesn't reveal other people's requests. */
async function explainNoChange(
  db: Db,
  id: string,
  userId: string,
  needed: "open" | "claimed"
): Promise<string> {
  const [row] = await db
    .select({ status: foodRequests.status, createdBy: foodRequests.createdBy })
    .from(foodRequests)
    .where(eq(foodRequests.id, id))
  if (!row || row.createdBy !== userId) {
    return "Only the outreach worker who made this request can change it."
  }
  if (needed === "claimed") {
    return row.status === "open"
      ? "No organization has offered support for this request yet."
      : `This request is already ${STATUS_LABELS[row.status].toLowerCase()}.`
  }
  return row.status === "claimed"
    ? "An organization is already supporting this request, so it can't be cancelled here."
    : `This request is already ${STATUS_LABELS[row.status].toLowerCase()}.`
}

export async function createRequest(db: Db, actor: Actor, input: unknown): Promise<CreateRequestResult> {
  if (actor.role !== "outreach") {
    return { ok: false, error: "Only outreach worker or community member accounts can post needs." }
  }

  // Never trust the browser's check; validate again here.
  const parsed = newRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }
  const v = parsed.data

  try {
    const [row] = await db
      .insert(foodRequests)
      .values({
        createdBy: actor.id,
        peopleCount: v.peopleCount,
        category: v.category,
        items: v.items,
        dietaryNotes: v.dietaryNotes,
        neighborhood: v.neighborhood,
        windowStart: chicagoLocalToDate(v.windowStart),
        windowEnd: chicagoLocalToDate(v.windowEnd),
      })
      .returning({ id: foodRequests.id })
    return { ok: true, id: row.id }
  } catch (err) {
    console.error("createRequest insert failed", err)
    return { ok: false, error: "We couldn't save your request. Please try again." }
  }
}
