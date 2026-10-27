"use server"

import { redirect } from "next/navigation"

import { db } from "@/db"
import { revalidatePages } from "@/lib/action-helpers"
import { getCurrentUser } from "@/lib/current-user"
import { decidePrivacyReview } from "@/lib/privacy-review-rules"

export async function decidePrivacyReviewAction(form: FormData): Promise<void> {
  const user = await getCurrentUser()
  if (!user) redirect("/admin/privacy?result=error")
  const result = await decidePrivacyReview(db, user.id, {
    id: form.get("id"),
    action: form.get("action"),
    reason: form.get("reason") || undefined,
  })
  if (result.ok) revalidatePages("/admin/privacy", "/dashboard", "/board")
  redirect(`/admin/privacy?result=${result.ok ? "updated" : "error"}`)
}
