import "server-only"

import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { db } from "@/db"
import { users, type User } from "@/db/schema"
import { auth } from "@/lib/auth/server"

/** The signed-in person's app record, or null if signed out or not set up yet. */
export async function getCurrentUser(): Promise<User | null> {
  // Touch cookies first: during a build prerender this never resolves, so the auth
  // SDK isn't called (and doesn't log a spurious "cookie validation error").
  await cookies()
  const { data: session } = await auth.getSession()
  const email = session?.user?.email?.toLowerCase()
  if (!email) return null

  const [user] = await db.select().from(users).where(eq(users.email, email))
  return user ?? null
}

/** Use in protected pages and actions. Sends people without a role back to sign-in. */
export async function requireUser(): Promise<User & { role: "outreach" | "donor" }> {
  const user = await getCurrentUser()
  if (!user || !user.role) redirect("/sign-in")
  return { ...user, role: user.role }
}
