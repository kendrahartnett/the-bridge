// The two languages and how one is chosen. No database or server imports, so the browser
// (the language switch) and proxy.ts can both use it.
//
// The choice lives in a "lang" cookie ("en" or "es", one year, SameSite=Lax, nothing
// personal). proxy.ts reads it on every page request and rewrites the URL internally to
// /en/… or /es/… (app/[lang]), so the first render is already in the right language and
// the address bar never changes. With no cookie yet, a browser that prefers Spanish gets
// Spanish (and the cookie is set, so this only happens on the first visit); everyone else
// gets English.

export const LANGS = ["en", "es"] as const
export type Lang = (typeof LANGS)[number]
export const DEFAULT_LANG: Lang = "en"

export const LANG_COOKIE = "lang"
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // one year, in seconds

export const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang)

/**
 * The first visit's language from the browser's Accept-Language header: Spanish if Spanish
 * is the browser's top choice among the two we have, otherwise English.
 */
export function langFromAcceptLanguage(header: string | null): Lang {
  if (!header) return DEFAULT_LANG
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";")
      const q = params.find((p) => p.trim().startsWith("q="))
      return { base: tag.split("-")[0], q: q ? Number(q.split("=")[1]) || 0 : 1 }
    })
    .filter((l) => l.base === "en" || l.base === "es")
    .sort((a, b) => b.q - a.q)
  return ranked[0]?.base === "es" ? "es" : DEFAULT_LANG
}

/** Saves someone's choice from the switch (browser only). */
export function saveLangChoice(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax`
}

/** Dates and times in Chicago time, in the reader's language. */
export const DATE_LOCALE: Record<Lang, string> = { en: "en-US", es: "es-US" }
