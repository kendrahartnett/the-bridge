import { z } from "zod"

import { COMMUNITY_AREAS } from "@/lib/neighborhoods"

// Shared by the browser (instant feedback) and server actions (the real check).
// No database imports here, so it is safe to bundle for the client.

export const roleSchema = z.enum(["outreach", "donor"], {
  error: "Choose how you'll use The Bridge.",
})

export const signInSchema = z
  .object({
    mode: z.enum(["sign-in", "sign-up"]),
    role: roleSchema,
    email: z.email("Enter a valid email address.").trim().toLowerCase(),
    password: z.string().min(8, "Use at least 8 characters."),
    displayName: z.string().trim().max(80).optional(),
    organizationName: z.string().trim().max(120).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.mode !== "sign-up") return
    if (!v.displayName) {
      ctx.addIssue({ code: "custom", path: ["displayName"], message: "Tell us your name." })
    }
    if (!v.organizationName) {
      ctx.addIssue({
        code: "custom",
        path: ["organizationName"],
        message: "Tell us your organization.",
      })
    }
  })

export type SignInInput = z.input<typeof signInSchema>

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
