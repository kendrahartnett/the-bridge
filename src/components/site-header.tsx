import { LogOut } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { signOutAction } from "@/app/sign-in/actions"
import { AssistantChat } from "@/components/assistant/assistant-chat"
import { Logo } from "@/components/brand/logo"
import { HeaderNav } from "@/components/header-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/current-user"

// Every page with this header (the landing page and the signed-in pages) also gets the
// assistant chat button. It renders beside the header, not inside it: the header's
// backdrop blur would otherwise become the containing block for the fixed-position button.
export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <>
      <header className="glass border-b border-border">
        <div className="relative mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          <Link
            href={signedIn ? "/dashboard" : "/"}
            aria-label={signedIn ? "The Bridge, dashboard" : "The Bridge, home"}
            className="inline-flex min-h-tap items-center rounded-md px-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <Logo />
          </Link>
          <div className="flex items-center sm:gap-1">
            {signedIn && (
              // Reads the session, so it streams in behind Suspense (cacheComponents). Until
              // then everyone gets Dashboard; Admin is added for admins.
              <Suspense fallback={<HeaderNav isAdmin={false} />}>
                <SignedInNav />
              </Suspense>
            )}
            <ThemeToggle />
            {signedIn ? (
              <form action={signOutAction}>
                {/* Below 360px an icon (named "Sign out" for screen readers) leaves room for a
                    readable logo beside the menu button; the label shows from 360px. Narrower
                    side padding on phones. Always at least 44px. */}
                <Button type="submit" variant="ghost" className="min-w-tap px-2 sm:px-5">
                  <LogOut aria-hidden="true" className="min-[360px]:hidden" />
                  <span className="sr-only min-[360px]:not-sr-only">Sign out</span>
                </Button>
              </form>
            ) : (
              <Button asChild variant="ghost">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <AssistantChat />
    </>
  )
}

/** Dashboard for everyone signed in; Admin too for admins (checked again at /admin). */
async function SignedInNav() {
  const user = await getCurrentUser()
  return <HeaderNav isAdmin={!!user?.isAdmin} />
}
