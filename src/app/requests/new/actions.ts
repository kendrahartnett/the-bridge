"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { db } from "@/db"
import { requireUser } from "@/lib/current-user"
import { createRequest } from "@/lib/request-rules"
import type { NewRequestInput } from "@/lib/validation"

export type CreateRequestResult = {
  error?: string
  fieldErrors?: Partial<Record<keyof NewRequestInput, string[]>>
}

export async function createRequestAction(
  input: NewRequestInput
): Promise<CreateRequestResult> {
  const user = await requireUser()
  // Role check and server-side validation happen in createRequest.
  const result = await createRequest(db, { id: user.id, role: user.role }, input)
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  revalidatePath("/dashboard")
  redirect("/dashboard")
}
