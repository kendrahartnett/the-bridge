"use server"

import { redirect } from "next/navigation"

import { db } from "@/db"
import { revalidatePages } from "@/lib/action-helpers"
import { getCurrentUser } from "@/lib/current-user"
import { markAllNotificationsRead, openNotification } from "@/lib/request-rules"

// Who is acting comes from the session; the rules only touch that person's own
// notifications. The browser sends only which notification it means.

/** Marks a notification read and goes where it leads (a need's page, or the dashboard). */
export async function openNotificationAction(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  const target = await openNotification(db, { id: user.id, role: user.role }, formData.get("id"))
  revalidatePages("/dashboard", "/inbox")
  redirect(target?.href ?? "/inbox")
}

export async function markAllReadAction() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  await markAllNotificationsRead(db, { id: user.id, role: user.role })
  revalidatePages("/dashboard", "/inbox")
}
