"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { getCurrentUser } from "@/lib/current-user"
import { reviewOrganization, type RequestActionResult } from "@/lib/request-rules"

// Who is acting comes from the session; reviewOrganization checks again that they're an
// admin (inside the update itself). The browser only says which organization and what.
export async function reviewOrganizationAction(input: unknown): Promise<RequestActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Please sign in again." }
  const result = await reviewOrganization(db, { id: user.id, role: user.role }, input)
  if (result.ok) {
    revalidatePath("/admin")
    revalidatePath("/dashboard")
  }
  return result
}
