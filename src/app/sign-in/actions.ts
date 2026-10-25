"use server"

import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { z } from "zod"

import { db } from "@/db"
import { users } from "@/db/schema"
import { auth } from "@/lib/auth/server"
import { AUTH_ERRORS } from "@/lib/copy"
import { organizationSignUpSchema, posterSignUpSchema, signInSchema } from "@/lib/validation"

export type AuthFormState = {
  error?: string
  fieldErrors?: Partial<Record<string, string[]>>
  // Echoed back so React's post-action form reset doesn't wipe what was typed. Never passwords.
  values?: Record<string, string>
} | null

function echo(raw: Record<string, FormDataEntryValue>, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, typeof raw[k] === "string" ? raw[k] : ""]))
}

function logFailure(mode: "sign-in" | "sign-up", error: AuthFailure) {
  const code = failureCode(error)
  // The code only (for example INVALID_ORIGIN): never the email, password, or form values.
  console.error(`[auth] ${mode} failed: ${code} (HTTP ${error.status ?? "?"})`)
  return code
}

/** Sign in with email and password. The role and review status come from the database. */
export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData)
  const values = echo(raw, ["email"])
  const parsed = signInSchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values }
  const { email, password } = parsed.data

  const { error } = await auth.signIn.email({ email, password })
  if (error) {
    const code = logFailure("sign-in", error)
    return { error: friendlyError("sign-in", error, code), values }
  }

  // A login without an account record can't be used: there's no role to act with.
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.email, email))
  if (!user?.role) {
    console.error("[auth] sign-in failed: NO_ACCOUNT_RECORD")
    await auth.signOut()
    return { error: AUTH_ERRORS.noAppAccount, values }
  }
  redirect("/dashboard")
}

const POSTER_FIELDS = ["accountType", "displayName", "email", "organizationName", "pledge"]
const ORGANIZATION_FIELDS = ["accountType", "organizationName", "website", "ein", "contactName", "email", "pledge"]

/**
 * Create an account. Someone posting needs gets an outreach account right away; an
 * organization starts as pending until an admin reviews it.
 */
export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData)
  const isOrganization = raw.accountType === "organization"
  const values = echo(raw, isOrganization ? ORGANIZATION_FIELDS : POSTER_FIELDS)

  // Validate everything (including what the database checks) before creating the login, so
  // a login is never created without its account record.
  let record: typeof users.$inferInsert
  let password: string
  if (isOrganization) {
    const parsed = organizationSignUpSchema.safeParse(raw)
    if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values }
    const v = parsed.data
    password = v.password
    record = {
      email: v.email,
      role: "donor",
      verificationStatus: "pending",
      displayName: v.contactName,
      contactName: v.contactName,
      organizationName: v.organizationName,
      organizationWebsite: v.website,
      organizationEin: v.ein ?? null,
    }
  } else {
    const parsed = posterSignUpSchema.safeParse(raw)
    if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values }
    const v = parsed.data
    password = v.password
    record = {
      email: v.email,
      role: "outreach",
      verificationStatus: "not_required",
      displayName: v.displayName,
      organizationName: v.organizationName || null,
    }
  }

  const { error } = await auth.signUp.email({
    email: record.email,
    password,
    name: record.displayName ?? record.email,
  })
  if (error) {
    const code = logFailure("sign-up", error)
    return { error: friendlyError("sign-up", error, code), values }
  }

  // An existing record is left exactly as it is: signing up again can't change a role or
  // reset a review.
  await db.insert(users).values(record).onConflictDoNothing({ target: users.email })
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
