import { NextResponse, type NextRequest } from "next/server"

import { db } from "@/db"
import { logAdminLookupFailure } from "@/lib/auth/failure-code"
import { auth } from "@/lib/auth/server"
import { lookUpUser } from "@/lib/current-user"
import { isAdminAccount } from "@/lib/request-rules"

// Next.js 16 renamed middleware.ts to proxy.ts. Signed-out visitors to the dashboard and
// request pages are sent to /sign-in. Pages and actions still check the session themselves.
const requireSignIn = auth.middleware({ loginUrl: "/sign-in" })

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Anyone who isn't an admin, signed in or not, gets the standard not-found page with a
    // real 404, so the page doesn't even reveal that it exists. Checked here, before the
    // page starts streaming (after that the status can't change); the page checks again.
    if (!(await isAdmin())) {
      return NextResponse.rewrite(new URL("/not-found", request.url), { status: 404 })
    }
    return NextResponse.next()
  }
  return requireSignIn(request)
}

/**
 * Whether the visitor is a signed-in admin. A lookup that fails counts as "no" (so the
 * visitor still gets the not-found page) and logs its failure code, so a real admin who
 * gets a 404 can be told apart from someone who isn't one.
 */
async function isAdmin() {
  try {
    const { user, sessionError } = await lookUpUser()
    if (sessionError) logAdminLookupFailure("session", sessionError)
    return !!user && (await isAdminAccount(db, user.id))
  } catch (error) {
    logAdminLookupFailure("account", error)
    return false
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/requests/:path*", "/admin", "/admin/:path*"],
}
