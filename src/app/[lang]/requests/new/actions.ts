"use server"

import { redirect } from "next/navigation"

import { db } from "@/db"
import { revalidatePages } from "@/lib/action-helpers"
import { translateMessage } from "@/lib/copy"
import { requireUser } from "@/lib/current-user"
import { requestLang } from "@/lib/i18n-server"
import { createRequest } from "@/lib/request-rules"
import type { NewRequestInput } from "@/lib/validation"
import type { PrivacyCategory } from "@/lib/privacy-screening-core"

export type CreateRequestResult = {
  error?: string
  fieldErrors?: Partial<Record<keyof NewRequestInput, string[]>>
  privacy?: { kind: "blocked" | "unavailable"; categories?: PrivacyCategory[]; suggestion?: string }
}

export async function createRequestAction(
  input: NewRequestInput,
  revisionOf?: string
): Promise<CreateRequestResult> {
  const user = await requireUser()
  // Role check and server-side validation happen in createRequest.
  const result = await createRequest(db, { id: user.id, role: user.role }, input, undefined, revisionOf)
  if (!result.ok) {
    // Messages come from the shared rules and validation in English; show them in the
    // reader's language.
    const lang = await requestLang()
    const fieldErrors = Object.fromEntries(
      Object.entries(result.fieldErrors ?? {}).map(([k, v]) => [k, v?.map((m) => translateMessage(m, lang))])
    ) as CreateRequestResult["fieldErrors"]
    return { error: result.error && translateMessage(result.error, lang), fieldErrors, privacy: result.privacy }
  }

  revalidatePages("/dashboard")
  redirect("/dashboard")
}
