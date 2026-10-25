// The request rules, separate from the session so they can be tested directly.
// The server actions (src/app/**/actions.ts) look up the signed-in user and call these;
// scripts/test-claim-rules.ts calls them with real users from the database.
// Relative .ts imports keep this loadable by Node outside Next.js.

import { and, asc, desc, eq, inArray, ne, sql, type AnyColumn } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import type { NeonHttpDatabase } from "drizzle-orm/neon-http"
import { z } from "zod"

import { foodRequests, users, type FoodRequest, type User } from "../db/schema.ts"
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
  outreach: "Only the person who posted this request can change it.",
  notApproved: "Your organization is still under review, so you can't do this yet.",
  rejected: "Your organization wasn't approved, so you can't do this.",
  poster: "Only outreach accounts and approved organizations can post needs.",
  admin: "Only admins can review organizations.",
} as const

/** The acting account as the database has it right now (never what the browser says). */
type Standing = Pick<User, "id" | "role" | "verificationStatus" | "isAdmin">

async function standing(db: Db, actorId: string): Promise<Standing | null> {
  const [row] = await db
    .select({
      id: users.id,
      role: users.role,
      verificationStatus: users.verificationStatus,
      isAdmin: users.isAdmin,
    })
    .from(users)
    .where(eq(users.id, actorId))
  return row ?? null
}

const isApprovedOrg = (s: Standing | null) =>
  s?.role === "donor" && s.verificationStatus === "approved"

/** Posting needs: outreach accounts, and organizations that are currently approved. */
const canPost = (s: Standing | null) => s?.role === "outreach" || isApprovedOrg(s)

// The same checks, for deciding what a page shows. The rules above enforce them again
// whenever someone acts, so a page can never grant anything by showing a button.
type Account = Pick<User, "role" | "verificationStatus">
export const canPostNeeds = (a: Account) =>
  a.role === "outreach" || (a.role === "donor" && a.verificationStatus === "approved")
export const canClaimNeeds = (a: Account) => a.role === "donor" && a.verificationStatus === "approved"

function orgBlockedError(s: Standing | null) {
  return s?.verificationStatus === "rejected" ? ROLE_ERRORS.rejected : ROLE_ERRORS.notApproved
}

// SQL check, evaluated inside the same statement as the change, that the actor is an
// approved organization. Closes the gap between reading their status and acting on it.
// The need's poster can still post: an outreach account, or an organization that is
// approved right now. Open needs from a revoked or rejected organization are hidden from the
// Needs Board and can't be claimed; they come back if the organization is approved again.
const posterCanStillPost = sql`exists (select 1 from ${users} as poster_check where poster_check.id = ${foodRequests.createdBy} and (poster_check.role = 'outreach' or poster_check.verification_status = 'approved'))`

const actorIsApprovedOrg = (actorId: string) =>
  sql`exists (select 1 from ${users} where ${users.id} = ${actorId} and ${users.role} = 'donor' and ${users.verificationStatus} = 'approved')`

/**
 * Claim a need: approved organizations only, never their own post. The checks are repeated
 * inside the UPDATE, so a revoked approval or a second organization can't slip through.
 */
export async function claimRequest(db: Db, actor: Actor, id: unknown): Promise<RequestActionResult> {
  const me = await standing(db, actor.id)
  if (me?.role !== "donor") return { ok: false, error: ROLE_ERRORS.donor }
  if (!isApprovedOrg(me)) return { ok: false, error: orgBlockedError(me) }
  const parsed = requestId.safeParse(id)
  if (!parsed.success) return { ok: false, error: "We couldn't find that request." }

  // One conditional UPDATE: Postgres row locking means only one organization can win.
  const updated = await db
    .update(foodRequests)
    .set({ status: "claimed", claimedBy: actor.id })
    .where(
      and(
        eq(foodRequests.id, parsed.data),
        eq(foodRequests.status, "open"),
        ne(foodRequests.createdBy, actor.id),
        actorIsApprovedOrg(actor.id),
        posterCanStillPost
      )
    )
    .returning({ id: foodRequests.id })

  if (updated.length === 0) {
    const [row] = await db
      .select({ status: foodRequests.status, createdBy: foodRequests.createdBy })
      .from(foodRequests)
      .where(eq(foodRequests.id, parsed.data))
    if (row?.createdBy === actor.id) {
      return { ok: false, error: "This is your own post, so you can't offer support on it." }
    }
    const now = await standing(db, actor.id)
    if (!isApprovedOrg(now)) return { ok: false, error: orgBlockedError(now) }
    const status = row?.status ?? null
    return {
      ok: false,
      error:
        status === "claimed" || status === "delivered"
          ? "Someone else just offered support for this request."
          : status === "cancelled"
            ? "This request was cancelled."
            : status === "open"
              ? "This request isn't available right now."
              : "We couldn't find that request.",
    }
  }
  return { ok: true, message: "You offered support for this request. Thank you!" }
}

// Marking fulfilled and cancelling are for the person who posted the need, as long as they
// can still post (outreach, or an organization that is currently approved).
export async function confirmDelivery(db: Db, actor: Actor, id: unknown): Promise<RequestActionResult> {
  if (!canPost(await standing(db, actor.id))) return { ok: false, error: ROLE_ERRORS.outreach }
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
  if (!canPost(await standing(db, actor.id))) return { ok: false, error: ROLE_ERRORS.outreach }
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
  if (!row || row.createdBy !== userId) return ROLE_ERRORS.outreach
  if (needed === "claimed") {
    return row.status === "open"
      ? "No organization has offered support for this request yet."
      : `This request is already ${STATUS_LABELS[row.status].toLowerCase()}.`
  }
  return row.status === "claimed"
    ? "An organization is already supporting this request, so it can't be cancelled here."
    : `This request is already ${STATUS_LABELS[row.status].toLowerCase()}.`
}

/** Post a need: outreach accounts, and organizations that are currently approved. */
export async function createRequest(db: Db, actor: Actor, input: unknown): Promise<CreateRequestResult> {
  const me = await standing(db, actor.id)
  if (!canPost(me)) {
    return { ok: false, error: me?.role === "donor" ? orgBlockedError(me) : ROLE_ERRORS.poster }
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

// ---------------------------------------------------------------------------------------
// Contact details

// The other side's email on a request: only for the poster or the supporting organization
// (the queries below already limit rows to those two), only once the request is In Progress
// or Fulfilled, and only while the viewer can see contacts: an outreach account, or an
// organization that is approved right now. Decided in SQL, so a hidden email is never
// sent to the page at all.
const viewerCanSeeContacts = (viewerId: string) =>
  sql`exists (select 1 from ${users} where ${users.id} = ${viewerId} and (${users.role} = 'outreach' or ${users.verificationStatus} = 'approved'))`
const contactEmail = (viewerId: string, email: AnyColumn) =>
  sql<string | null>`case when ${foodRequests.status} in ('claimed', 'delivered') and ${viewerCanSeeContacts(viewerId)} then ${email} end`

const claimer = alias(users, "claimer")
const poster = alias(users, "poster")

export type RequestWithContact = FoodRequest & {
  contact: { name: string; email: string | null } | null
}

/** Needs this account posted, with the supporting organization once someone offers support. */
export async function listMyPosts(db: Db, viewerId: string): Promise<RequestWithContact[]> {
  const rows = await db
    .select({
      request: foodRequests,
      name: sql<string | null>`coalesce(${claimer.organizationName}, ${claimer.displayName})`,
      email: contactEmail(viewerId, claimer.email),
    })
    .from(foodRequests)
    .leftJoin(claimer, eq(claimer.id, foodRequests.claimedBy))
    .where(eq(foodRequests.createdBy, viewerId))
    .orderBy(desc(foodRequests.windowStart))
  return rows.map((r) => ({
    ...r.request,
    contact: r.request.claimedBy ? { name: r.name ?? "an organization", email: r.email } : null,
  }))
}

/** Needs this organization supports (In Progress or Fulfilled), with the poster. */
export async function listMySupported(db: Db, viewerId: string): Promise<RequestWithContact[]> {
  const rows = await db
    .select({
      request: foodRequests,
      name: sql<string | null>`coalesce(${poster.organizationName}, ${poster.displayName})`,
      email: contactEmail(viewerId, poster.email),
    })
    .from(foodRequests)
    .innerJoin(poster, eq(poster.id, foodRequests.createdBy))
    .where(
      and(
        eq(foodRequests.claimedBy, viewerId),
        inArray(foodRequests.status, ["claimed", "delivered"])
      )
    )
    .orderBy(desc(foodRequests.windowStart))
  return rows.map((r) => ({
    ...r.request,
    contact: { name: r.name ?? "an outreach worker", email: r.email },
  }))
}

/**
 * Open needs (the Needs Board). Request columns only: the poster is never joined, only
 * checked, so needs from a revoked or rejected organization are left out.
 */
export async function listOpen(db: Db): Promise<FoodRequest[]> {
  return db
    .select()
    .from(foodRequests)
    .where(and(eq(foodRequests.status, "open"), posterCanStillPost))
    .orderBy(asc(foodRequests.windowStart))
}

// ---------------------------------------------------------------------------------------
// Organization review (admins only)

const reviewInput = z.object({
  organizationId: z.uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(300, "Keep the note under 300 characters.").optional(),
})

/**
 * Approve or reject an organization (rejecting an approved one revokes it). Admins only,
 * checked again inside the UPDATE. Records who reviewed it and when; the note is internal.
 */
export async function reviewOrganization(
  db: Db,
  actor: Actor,
  input: unknown
): Promise<RequestActionResult> {
  const me = await standing(db, actor.id)
  if (!me?.isAdmin) return { ok: false, error: ROLE_ERRORS.admin }
  const parsed = reviewInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Something's wrong with that review." }
  }
  const { organizationId, decision, note } = parsed.data

  const updated = await db
    .update(users)
    .set({
      verificationStatus: decision,
      reviewedAt: new Date(),
      reviewedBy: actor.id,
      reviewNote: note || null,
    })
    .where(
      and(
        eq(users.id, organizationId),
        eq(users.role, "donor"),
        sql`exists (select 1 from ${users} as reviewer where reviewer.id = ${actor.id} and reviewer.is_admin)`
      )
    )
    .returning({ id: users.id })
  if (updated.length === 0) return { ok: false, error: "We couldn't find that organization." }
  return {
    ok: true,
    message: decision === "approved" ? "Organization approved." : "Organization rejected.",
  }
}
