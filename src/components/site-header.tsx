import { LogOut } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { signOutAction } from "@/app/[lang]/sign-in/actions"
import { AssistantChat } from "@/components/assistant/assistant-chat"
import { Logo } from "@/components/brand/logo"
import { HeaderNav, HeaderNavPlaceholder } from "@/components/header-nav"
import { LangSwitch } from "@/components/lang-switch"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { db } from "@/db"
import { getCurrentUser } from "@/lib/current-user"
import { getCopy } from "@/lib/i18n-server"
import { countUnread } from "@/lib/request-rules"

// Every page with this header (the landing page and the signed-in pages) also gets the
// assistant chat button. It renders beside the header, not inside it: the header's
// backdrop blur would otherwise become the containing block for the fixed-position button.
//
// The language switch sits beside the theme toggle from 640px; on phones it's in the menu
// (signed-out visitors get a menu holding just the switch), so the header fits on one row
// at 320px in both languages.
export async function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  const c = await getCopy()
  return (
    <>
      {/* z-30: the glass blur makes the header its own stacking layer, so without a z-index
          later page content (animated sections) would paint over the phone menu. Below the
          chat button (z-40) and panel (z-50). */}
      <header className="glass relative z-30 border-b border-border">
        <div className="relative mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6">
          <Link
            href={signedIn ? "/dashboard" : "/"}
            aria-label={signedIn ? c.UI.dashboardHomeLabel : c.UI.homeLabel}
            className="inline-flex min-h-tap items-center rounded-md px-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <Logo />
          </Link>
          <div className="flex items-center sm:gap-1">
            {signedIn ? (
              // Reads the session, so it streams in behind Suspense (cacheComponents). Until
              // then everyone gets Dashboard; the Needs Board is added for organizations and
              // Admin for admins.
              <Suspense fallback={<HeaderNavPlaceholder signedIn isAdmin={false} isOrganization={false} unread={null} />}>
                <SignedInNav />
              </Suspense>
            ) : (
              <HeaderNavPlaceholder signedIn={false} isAdmin={false} isOrganization={false} unread={null} />
            )}
            <LangSwitch className="hidden sm:inline-flex" />
            <ThemeToggle />
            {signedIn ? (
              <form action={signOutAction}>
                {/* Below 360px an icon (named "Sign out" for screen readers) leaves room for a
                    readable logo beside the menu button; the label shows from 360px. Narrower
                    side padding on phones. Always at least 44px. */}
                <Button type="submit" variant="ghost" className="min-w-tap px-2 sm:px-5">
                  <LogOut aria-hidden="true" className="min-[360px]:hidden" />
                  <span className="sr-only min-[360px]:not-sr-only">{c.UI.signOut}</span>
                </Button>
              </form>
            ) : (
              // Narrower side padding on phones, where the language menu shares the row.
              <Button asChild variant="ghost" className="px-3 sm:px-4">
                <Link href="/sign-in">{c.UI.signIn}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <AssistantChat />
    </>
  )
}

/**
 * Dashboard for everyone signed in; the Needs Board for organization accounts and Admin for
 * admins (checked again at /board and /admin); the inbox bell with the unread count, read
 * on each page load.
 */
async function SignedInNav() {
  const user = await getCurrentUser()
  const unread = user ? await countUnread(db, user.id) : 0
  return <HeaderNav signedIn isAdmin={!!user?.isAdmin} isOrganization={user?.role === "donor"} unread={unread} />
}
