"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { getCurrentUser } from "@/lib/current-user"
import {
  cancelRequest,
  claimRequest,
  confirmDelivery,
  type RequestActionResult,
} from "@/lib/request-rules"

// Identity and role always come from the session on the server. The only thing
// the browser sends is which request it means; the rules themselves live in
// src/lib/request-rules.ts so they can be tested without a browser session.

export type { RequestActionResult }

type Rule = typeof claimRequest

async function run(rule: Rule, id: unknown): Promise<RequestActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Please sign in again." }
  const result = await rule(db, { id: user.id, role: user.role }, id)
  if (result.ok) revalidatePath("/dashboard")
  return result
}

export async function claimRequestAction(id: unknown): Promise<RequestActionResult> {
  return run(claimRequest, id)
}

export async function confirmDeliveryAction(id: unknown): Promise<RequestActionResult> {
  return run(confirmDelivery, id)
}

export async function cancelRequestAction(id: unknown): Promise<RequestActionResult> {
  return run(cancelRequest, id)
}
