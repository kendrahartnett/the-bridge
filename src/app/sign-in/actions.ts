"use server"

import { sql } from "drizzle-orm"
import { redirect } from "next/navigation"
import { z } from "zod"

import { db } from "@/db"
import { users } from "@/db/schema"
import { auth } from "@/lib/auth/server"
import { signInSchema } from "@/lib/validation"

export type SignInState = {
  error?: string
  fieldErrors?: Partial<Record<string, string[]>>
  // Echoed back so React's post-action form reset doesn't wipe what was typed. Never the password.
  values?: Record<"role" | "email" | "displayName" | "organizationName", string>
} | null

export async function signInAction(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const raw = Object.fromEntries(formData)
  const values = {
    role: String(raw.role ?? ""),
    email: String(raw.email ?? ""),
    displayName: String(raw.displayName ?? ""),
    organizationName: String(raw.organizationName ?? ""),
  }

  const parsed = signInSchema.safeParse(raw)
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values }
  }
  const { mode, role, email, password, displayName, organizationName } = parsed.data

  const { error } =
    mode === "sign-up"
      ? await auth.signUp.email({ email, password, name: displayName ?? email })
      : await auth.signIn.email({ email, password })

  if (error) {
    return {
      error:
        mode === "sign-up"
          ? error.message || "We couldn't create your account. Please try again."
          : "That email and password don't match. Please try again.",
      values,
    }
  }

  // Link the login to our app record. The role chosen here is stored the first
  // time; after that the saved role stays, so one sign-in can't flip someone's access.
  await db
    .insert(users)
    .values({ email, role, displayName, organizationName })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        role: sql`coalesce(${users.role}, excluded.role)`,
        displayName: sql`coalesce(${users.displayName}, excluded.display_name)`,
        organizationName: sql`coalesce(${users.organizationName}, excluded.organization_name)`,
      },
    })

  redirect("/dashboard")
}

export async function signOutAction() {
  await auth.signOut()
  redirect("/")
}
