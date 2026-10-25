import { NextResponse, type NextRequest } from "next/server"

import { db } from "@/db"
import { auth } from "@/lib/auth/server"
import { getCurrentUser } from "@/lib/current-user"
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
    const user = await getCurrentUser().catch(() => null)
    if (!user || !(await isAdminAccount(db, user.id))) {
      return NextResponse.rewrite(new URL("/not-found", request.url), { status: 404 })
    }
    return NextResponse.next()
  }
  return requireSignIn(request)
}

export const config = {
  matcher: ["/dashboard/:path*", "/requests/:path*", "/admin", "/admin/:path*"],
}
