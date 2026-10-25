"use server"

import { sql } from "drizzle-orm"
import { redirect } from "next/navigation"
import { z } from "zod"

import { db } from "@/db"
import { users } from "@/db/schema"
import { auth } from "@/lib/auth/server"
import { AUTH_ERRORS } from "@/lib/copy"
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
    const code = failureCode(error)
    // The code only (for example INVALID_ORIGIN): never the email, password, or form values.
    console.error(`[auth] ${mode} failed: ${code} (HTTP ${error.status ?? "?"})`)
    return { error: friendlyError(mode, error, code), values }
  }

  // Link the login to our app record. The role chosen here is stored the first
  // time; after that the saved role stays, so one sign-in can't flip someone's access.
  await db
    .insert(users)
    // New organizations wait for review; outreach accounts don't need it.
    .values({
      email,
      role,
      displayName,
      organizationName,
      verificationStatus: role === "donor" ? "pending" : "not_required",
    })
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

type AuthFailure = { message?: string; status?: number; code?: string }

/**
 * A short, log-safe name for an auth failure. The auth SDK replaces many of Neon Auth's own
 * codes with generic ones (INVALID_ORIGIN arrives as "feature_not_supported"), but keeps
 * Neon Auth's fixed message, so the message's first sentence becomes the code: "Invalid
 * origin" → INVALID_ORIGIN, "User already exists. Use another email." → USER_ALREADY_EXISTS.
 * Only messages made of letters, spaces, and . , ' qualify (no @ or digits), so an email
 * address can never reach the log.
 */
function failureCode({ message, code }: AuthFailure) {
  if (message && /^[A-Za-z .,']{1,120}$/.test(message)) {
    const first = message.split(".")[0].replace(/[,']/g, "").trim()
    if (first) return first.toUpperCase().replaceAll(" ", "_")
  }
  return code?.toUpperCase() ?? "UNKNOWN"
}

// Picks the message people see from the SDK's normalized code, the HTTP status, and the
// log-safe code above.
function friendlyError(mode: "sign-in" | "sign-up", { code, status }: AuthFailure, logCode: string) {
  if (status === 429 || code?.startsWith("over_")) return AUTH_ERRORS.tooManyAttempts
  if (mode === "sign-in") {
    return status === 401 || code === "invalid_credentials"
      ? AUTH_ERRORS.wrongPassword
      : AUTH_ERRORS.signInUnavailable
  }
  if (
    status === 409 ||
    code === "user_already_exists" ||
    code === "email_exists" ||
    logCode.includes("ALREADY_EXISTS")
  ) {
    return AUTH_ERRORS.accountExists
  }
  if (code === "weak_password" || logCode.startsWith("PASSWORD_TOO")) return AUTH_ERRORS.weakPassword
  return AUTH_ERRORS.signUpUnavailable
}

export async function signOutAction() {
  await auth.signOut()
  redirect("/")
}
