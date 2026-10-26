import "server-only"

import { cookies } from "next/headers"
import { lang as langParam } from "next/root-params"

import { copyFor, type Copy } from "@/lib/copy"
import { DEFAULT_LANG, isLang, LANG_COOKIE, type Lang } from "@/lib/i18n"

/**
 * The page's language (Server Components only): the root [lang] segment, or, on the one page
 * outside it (app/global-not-found.tsx, the 404 page), the "lang" cookie.
 */
export async function currentLang(): Promise<Lang> {
  let lang: string | undefined
  try {
    lang = await langParam()
  } catch {
    // Not under app/[lang]: the global not-found page.
  }
  return isLang(lang) ? lang : requestLang()
}

/** The page's copy, in its language (Server Components only). */
export async function getCopy(): Promise<Copy> {
  return copyFor(await currentLang())
}

/**
 * The reader's language in a Server Action or Route Handler, where the [lang] segment
 * isn't available: the "lang" cookie that proxy.ts set or the switch saved.
 */
export async function requestLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value
  return isLang(value) ? value : DEFAULT_LANG
}
