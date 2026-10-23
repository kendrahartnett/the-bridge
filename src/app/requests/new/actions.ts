"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { db } from "@/db"
import { foodRequests } from "@/db/schema"
import { chicagoLocalToDate } from "@/lib/chicago-time"
import { requireUser } from "@/lib/current-user"
import { newRequestSchema, type NewRequestInput } from "@/lib/validation"

export type CreateRequestResult = {
  error?: string
  fieldErrors?: Partial<Record<keyof NewRequestInput, string[]>>
}

export async function createRequestAction(
  input: NewRequestInput
): Promise<CreateRequestResult> {
  const user = await requireUser()
  if (user.role !== "outreach") {
    return { error: "Only outreach accounts can ask for food." }
  }

  // Never trust the browser's check; validate again here.
  const parsed = newRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }
  const v = parsed.data

  try {
    await db.insert(foodRequests).values({
      createdBy: user.id,
      peopleCount: v.peopleCount,
      foodType: v.foodType,
      dietaryNotes: v.dietaryNotes,
      neighborhood: v.neighborhood,
      windowStart: chicagoLocalToDate(v.windowStart),
      windowEnd: chicagoLocalToDate(v.windowEnd),
    })
  } catch (err) {
    console.error("createRequestAction insert failed", err)
    return { error: "We couldn't save your request. Please try again." }
  }

  revalidatePath("/dashboard")
  redirect("/dashboard")
}
