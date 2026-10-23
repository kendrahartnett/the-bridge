import { auth } from "@/lib/auth/server"

// Next.js 16 renamed middleware.ts to proxy.ts. Signed-out visitors to these
// routes are sent to /sign-in. Pages and actions still check the session themselves.
export default auth.middleware({ loginUrl: "/sign-in" })

export const config = {
  matcher: ["/dashboard/:path*", "/requests/:path*"],
}
