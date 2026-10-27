import { NextResponse, type NextRequest } from "next/server"

import { db } from "@/db"
import { logAdminLookupFailure } from "@/lib/auth/failure-code"
import { auth } from "@/lib/auth/server"
import { lookUpUser } from "@/lib/current-user"
import { isLang, LANG_COOKIE, LANG_COOKIE_MAX_AGE, langFromAcceptLanguage, type Lang } from "@/lib/i18n"
import { canViewBoard, getRequestForViewer, isAdminAccount } from "@/lib/request-rules"

// Next.js 16 renamed middleware.ts to proxy.ts. It runs on every page request and:
// 1. Picks the language: the "lang" cookie, or on a first visit (no cookie) the browser's
//    language (Spanish if it prefers Spanish, otherwise English), saved as the cookie.
//    Every page lives under app/[lang]; the request is rewritten internally to /en/… or
//    /es/…, so the address never changes and there are no /es URLs.
// 2. Answers addresses that aren't pages, and pages only some accounts may see, with the
//    not-found page and a real 404.
// 3. Sends signed-out visitors to the dashboard and Post a Need to /sign-in.
// Pages and actions still check the session themselves.
const requireSignIn = auth.middleware({ loginUrl: "/sign-in" })

// A need's own page: /requests/<id> (not /requests/new).
const REQUEST_PAGE = /^\/requests\/(?!new\/?$)([^/]+)\/?$/
// Every page there is. Any other address gets the not-found page with a 404.
const PAGES = /^\/(|sign-in|dashboard|inbox|board|admin|admin\/privacy|requests\/new|requests\/[^/]+)\/?$/

export default async function proxy(request: NextRequest) {
  const cookieLang = request.cookies.get(LANG_COOKIE)?.value
  const lang = isLang(cookieLang) ? cookieLang : langFromAcceptLanguage(request.headers.get("accept-language"))
  const response = await route(request, lang)
  if (!isLang(cookieLang)) {
    response.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: LANG_COOKIE_MAX_AGE, sameSite: "lax" })
  }
  return response
}

async function route(request: NextRequest, lang: Lang): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  if (!PAGES.test(pathname)) return notFound(request, lang)
  // Pages that only some accounts may see. Anyone else, signed in or not, gets the standard
  // not-found page with a real 404, so the page doesn't even reveal that it exists (or, for a
  // need, whether that need exists). Checked here, before the page starts streaming (after
  // that the status can't change); each page checks again.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (await allowed("admin", (id) => isAdminAccount(db, id))) ? inLang(request, lang) : notFound(request, lang)
  }
  if (pathname === "/board" || pathname === "/board/") {
    return (await allowed("board", (id) => canViewBoard(db, id))) ? inLang(request, lang) : notFound(request, lang)
  }
  const need = pathname.match(REQUEST_PAGE)
  if (need) {
    const ok = await allowed("request", async (id) => !!(await getRequestForViewer(db, id, need[1])))
    return ok ? inLang(request, lang) : notFound(request, lang)
  }
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/inbox" || pathname === "/inbox/" || pathname.startsWith("/requests/")) {
    const signedIn = await requireSignIn(request)
    // A redirect to /sign-in goes out as it is; otherwise keep what the auth check added
    // (a refreshed session cookie, request headers) on the rewrite.
    if (signedIn.headers.has("location")) return signedIn
    return inLang(request, lang, signedIn)
  }
  return inLang(request, lang)
}

/** The same address, served from the /en or /es pages. */
function inLang(request: NextRequest, lang: Lang, from?: NextResponse, init?: ResponseInit) {
  const url = request.nextUrl.clone()
  url.pathname = `/${lang}${url.pathname === "/" ? "" : url.pathname}`
  const response = NextResponse.rewrite(url, init)
  if (from) {
    for (const cookie of from.headers.getSetCookie()) response.headers.append("set-cookie", cookie)
    from.headers.forEach((value, key) => {
      if (key !== "set-cookie" && key !== "x-middleware-next") response.headers.set(key, value)
    })
  }
  return response
}

/**
 * The not-found page in the reader's language, with a real 404: an address that isn't a
 * page, which Next.js answers with app/global-not-found.tsx.
 */
function notFound(request: NextRequest, lang: Lang) {
  const url = request.nextUrl.clone()
  url.pathname = `/${lang}/not-found`
  url.search = ""
  // That page reads the language from the "lang" cookie. On a first visit the cookie is
  // only being set now, so pass the chosen language along on this request too.
  const headers = new Headers(request.headers)
  if (request.cookies.get(LANG_COOKIE)?.value !== lang) {
    const others = request.cookies.getAll().filter((c) => c.name !== LANG_COOKIE).map((c) => `${c.name}=${c.value}`)
    headers.set("cookie", [...others, `${LANG_COOKIE}=${lang}`].join("; "))
  }
  return NextResponse.rewrite(url, { status: 404, request: { headers } })
}

/**
 * Whether the visitor is signed in and passes `check`. A lookup that fails counts as "no"
 * (so the visitor still gets the not-found page); for /admin it logs its failure code, so a
 * real admin who gets a 404 can be told apart from someone who isn't one.
 */
async function allowed(page: "admin" | "board" | "request", check: (userId: string) => Promise<boolean>) {
  try {
    const { user, sessionError } = await lookUpUser()
    if (sessionError && page === "admin") logAdminLookupFailure("session", sessionError)
    return !!user && (await check(user.id))
  } catch (error) {
    if (page === "admin") logAdminLookupFailure("account", error)
    else console.error(`Couldn't check access to the ${page} page.`)
    return false
  }
}

export const config = {
  // Every page; not the API routes, Next.js's own files, or files with an extension
  // (images, icons).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
}
