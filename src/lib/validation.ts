import { z } from "zod"

import { CATEGORIES } from "./labels.ts"
import { COMMUNITY_AREAS } from "./neighborhoods.ts"

// Shared by the browser (instant feedback) and server actions (the real check).
// No database imports here, so it is safe to bundle for the client.

// Trim and lowercase first: autofill often adds a trailing space.
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."))
const newPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use 128 characters or fewer.")
// Checkboxes submit "on" when checked and nothing when not.
const pledge = (message: string) => z.literal("on", { error: message })

/** Sign in: email and password only. The role comes from the database. */
export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
})

const passwordsMatch = (v: { password: string; confirmPassword: string }) =>
  v.password === v.confirmPassword

/** Create account: someone posting needs (an outreach account). */
export const posterSignUpSchema = z
  .object({
    displayName: z.string().trim().min(1, "Tell us your name.").max(80, "Use 80 characters or fewer."),
    email,
    password: newPassword,
    confirmPassword: z.string(),
    organizationName: z.string().trim().max(120, "Use 120 characters or fewer.").optional(),
    pledge: pledge("Please confirm you'll describe needs, not people."),
  })
  .refine(passwordsMatch, { path: ["confirmPassword"], message: "The passwords don't match." })

/** Create account: an organization (reviewed before it can claim needs). */
export const organizationSignUpSchema = z
  .object({
    organizationName: z
      .string()
      .trim()
      .min(1, "Enter your organization's name.")
      .max(120, "Use 120 characters or fewer."),
    website: z
      .string()
      .trim()
      .max(200, "Use 200 characters or fewer.")
      .pipe(
        z.url({
          protocol: /^https$/,
          hostname: z.regexes.domain,
          error: "Enter your website's full address, starting with https://",
        })
      ),
    // Optional; empty means not provided. Same format the database enforces.
    ein: z
      .string()
      .trim()
      .regex(/^(\d{2}-\d{7})?$/, "Use the format 12-3456789.")
      .optional()
      .transform((v) => v || undefined),
    contactName: z
      .string()
      .trim()
      .min(1, "Tell us who we can contact.")
      .max(80, "Use 80 characters or fewer."),
    email,
    password: newPassword,
    confirmPassword: z.string(),
    pledge: pledge("Please confirm you can represent this organization."),
  })
  .refine(passwordsMatch, { path: ["confirmPassword"], message: "The passwords don't match." })

export type PosterSignUpInput = z.input<typeof posterSignUpSchema>
export type OrganizationSignUpInput = z.input<typeof organizationSignUpSchema>

// datetime-local inputs produce "YYYY-MM-DDTHH:mm"; the server reads it as Chicago time.
const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick a date and time.")

export const newRequestSchema = z
  .object({
    peopleCount: z
      .string()
      .trim()
      .regex(/^\d+$/, "Enter a whole number.")
      .transform(Number)
      .pipe(
        z
          .number()
          .min(1, "At least 1 person.")
          .max(500, "500 people is the most for one request.")
      ),
    category: z.enum(CATEGORIES, { error: "Choose the type of support." }),
    items: z
      .string()
      .trim()
      .min(2, "Describe what's needed.")
      .max(200, "Keep this under 200 characters."),
    dietaryNotes: z
      .string()
      .trim()
      .max(300, "Keep notes under 300 characters.")
      .transform((v) => (v === "" ? null : v)),
    neighborhood: z.enum(COMMUNITY_AREAS, { error: "Choose a neighborhood." }),
    windowStart: localDateTime,
    windowEnd: localDateTime,
  })
  .refine((v) => v.windowEnd > v.windowStart, {
    path: ["windowEnd"],
    message: "The end time must be after the start time.",
  })

export type NewRequestInput = z.input<typeof newRequestSchema>
export type NewRequestOutput = z.output<typeof newRequestSchema>
