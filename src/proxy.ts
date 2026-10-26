import { NextResponse, type NextRequest } from "next/server"

import { db } from "@/db"
import { logAdminLookupFailure } from "@/lib/auth/failure-code"
import { auth } from "@/lib/auth/server"
import { lookUpUser } from "@/lib/current-user"
import { canViewBoard, getRequestForViewer, isAdminAccount } from "@/lib/request-rules"

// Next.js 16 renamed middleware.ts to proxy.ts. Signed-out visitors to the dashboard and
// Post a Need are sent to /sign-in. Pages and actions still check the session themselves.
const requireSignIn = auth.middleware({ loginUrl: "/sign-in" })

// A need's own page: /requests/<id> (not /requests/new).
const REQUEST_PAGE = /^\/requests\/(?!new\/?$)([^/]+)\/?$/

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Pages that only some accounts may see. Anyone else, signed in or not, gets the standard
  // not-found page with a real 404, so the page doesn't even reveal that it exists (or, for a
  // need, whether that need exists). Checked here, before the page starts streaming (after
  // that the status can't change); each page checks again.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (await allowed("admin", (id) => isAdminAccount(db, id))) ? NextResponse.next() : notFound(request)
  }
  if (pathname === "/board" || pathname === "/board/") {
    return (await allowed("board", (id) => canViewBoard(db, id))) ? NextResponse.next() : notFound(request)
  }
  const need = pathname.match(REQUEST_PAGE)
  if (need) {
    const ok = await allowed("request", async (id) => !!(await getRequestForViewer(db, id, need[1])))
    return ok ? NextResponse.next() : notFound(request)
  }
  return requireSignIn(request)
}

const notFound = (request: NextRequest) =>
  NextResponse.rewrite(new URL("/not-found", request.url), { status: 404 })

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
  matcher: ["/dashboard/:path*", "/requests/:path*", "/board", "/board/:path*", "/admin", "/admin/:path*"],
}
