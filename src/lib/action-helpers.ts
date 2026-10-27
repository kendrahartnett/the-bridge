import "server-only"

import { revalidatePath } from "next/cache"

import { translateMessage } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import type { RequestActionResult } from "@/lib/request-rules"

/**
 * Refreshes pages after a change. Every page lives under app/[lang] (proxy.ts picks the
 * language without changing the address), so this names the real routes, for both
 * languages.
 */
export function revalidatePages(...pages: ("/dashboard" | "/inbox" | "/board" | "/requests/[id]" | "/admin" | "/admin/privacy")[]) {
  for (const page of pages) revalidatePath(`/[lang]${page}`, "page")
}

/** A rule's result, with its message in the reader's language. */
export function inLang(result: RequestActionResult, lang: Lang): RequestActionResult {
  return result.ok
    ? { ok: true, message: translateMessage(result.message, lang) }
    : { ok: false, error: translateMessage(result.error, lang) }
}
