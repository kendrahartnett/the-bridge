"use server"

import { db } from "@/db"
import { inLang, revalidatePages } from "@/lib/action-helpers"
import { copyFor } from "@/lib/copy"
import { getCurrentUser } from "@/lib/current-user"
import { requestLang } from "@/lib/i18n-server"
import { reviewOrganization, type RequestActionResult } from "@/lib/request-rules"

// Who is acting comes from the session; reviewOrganization checks again that they're an
// admin (inside the update itself). The browser only says which organization and what.
export async function reviewOrganizationAction(input: unknown): Promise<RequestActionResult> {
  const user = await getCurrentUser()
  const lang = await requestLang()
  if (!user) return { ok: false, error: copyFor(lang).AUTH_ERRORS.signInAgain }
  const result = await reviewOrganization(db, { id: user.id, role: user.role }, input)
  if (result.ok) revalidatePages("/admin", "/dashboard", "/board")
  return inLang(result, lang)
}
