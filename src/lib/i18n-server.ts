import "server-only"

import { cookies } from "next/headers"
import { lang as langParam } from "next/root-params"

import { copyFor, type Copy } from "@/lib/copy"
import { DEFAULT_LANG, isLang, LANG_COOKIE, type Lang } from "@/lib/i18n"

/** The page's language, from the root [lang] segment (Server Components only). */
export async function currentLang(): Promise<Lang> {
  const lang = await langParam()
  return isLang(lang) ? lang : DEFAULT_LANG
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
