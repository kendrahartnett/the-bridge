"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { foodRequests, type FoodRequest, type User } from "@/db/schema"
import { getCurrentUser } from "@/lib/current-user"

// Identity and role always come from the session on the server. The only thing
// the browser sends is which request it means, and that is validated as a UUID.

export type RequestActionResult = { ok: true; message: string } | { ok: false; error: string }

const requestId = z.uuid()

async function signedInAs(
  role: "donor" | "outreach"
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Please sign in again." }
  if (user.role !== role) {
    return {
      ok: false,
      error:
        role === "donor"
          ? "Only donor accounts can claim requests."
          : "Only the outreach worker who made this request can change it.",
    }
  }
  return { ok: true, user }
}

async function currentStatus(id: string): Promise<FoodRequest["status"] | null> {
  const [row] = await db
    .select({ status: foodRequests.status })
    .from(foodRequests)
    .where(eq(foodRequests.id, id))
  return row?.status ?? null
}

export async function claimRequestAction(id: unknown): Promise<RequestActionResult> {
  const auth = await signedInAs("donor")
  if (!auth.ok) return auth
  const parsed = requestId.safeParse(id)
  if (!parsed.success) return { ok: false, error: "We couldn't find that request." }

  // One conditional UPDATE: Postgres row locking means only one donor can win.
  const updated = await db
    .update(foodRequests)
    .set({ status: "claimed", claimedBy: auth.user.id })
    .where(and(eq(foodRequests.id, parsed.data), eq(foodRequests.status, "open")))
    .returning({ id: foodRequests.id })

  if (updated.length === 0) {
    const status = await currentStatus(parsed.data)
    return {
      ok: false,
      error:
        status === "claimed" || status === "delivered"
          ? "This request was just claimed by someone else."
          : status === "cancelled"
            ? "This request was cancelled."
            : "We couldn't find that request.",
    }
  }

  revalidatePath("/dashboard")
  return { ok: true, message: "You claimed this request. Thank you!" }
}

export async function confirmDeliveryAction(id: unknown): Promise<RequestActionResult> {
  const auth = await signedInAs("outreach")
  if (!auth.ok) return auth
  const parsed = requestId.safeParse(id)
  if (!parsed.success) return { ok: false, error: "We couldn't find that request." }

  const updated = await db
    .update(foodRequests)
    .set({ status: "delivered" })
    .where(
      and(
        eq(foodRequests.id, parsed.data),
        eq(foodRequests.createdBy, auth.user.id),
        eq(foodRequests.status, "claimed")
      )
    )
    .returning({ id: foodRequests.id })

  if (updated.length === 0) {
    return { ok: false, error: await explainNoChange(parsed.data, auth.user.id, "claimed") }
  }

  revalidatePath("/dashboard")
  return { ok: true, message: "Marked as delivered." }
}

export async function cancelRequestAction(id: unknown): Promise<RequestActionResult> {
  const auth = await signedInAs("outreach")
  if (!auth.ok) return auth
  const parsed = requestId.safeParse(id)
  if (!parsed.success) return { ok: false, error: "We couldn't find that request." }

  const updated = await db
    .update(foodRequests)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(foodRequests.id, parsed.data),
        eq(foodRequests.createdBy, auth.user.id),
        eq(foodRequests.status, "open")
      )
    )
    .returning({ id: foodRequests.id })

  if (updated.length === 0) {
    return { ok: false, error: await explainNoChange(parsed.data, auth.user.id, "open") }
  }

  revalidatePath("/dashboard")
  return { ok: true, message: "Request cancelled." }
}

/** Why a creator-only update matched no rows. Doesn't reveal other people's requests. */
async function explainNoChange(
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
      ? "No donor has claimed this request yet."
      : `This request is already ${row.status}.`
  }
  return row.status === "claimed"
    ? "A donor already claimed this request, so it can't be cancelled here."
    : `This request is already ${row.status}.`
}
