import Link from "next/link"

import { signOutAction } from "@/app/sign-in/actions"
import { AssistantChat } from "@/components/assistant/assistant-chat"
import { ArchedWordmark } from "@/components/brand/arched-wordmark"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

// Every page with this header (the landing page and the signed-in pages) also gets the
// assistant chat button. It renders beside the header, not inside it: the header's
// backdrop blur would otherwise become the containing block for the fixed-position button.
export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <>
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link
            href={signedIn ? "/dashboard" : "/"}
            aria-label={signedIn ? "The Bridge, dashboard" : "The Bridge, home"}
            className="inline-flex min-h-tap items-center rounded-md px-1 text-primary-text outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <ArchedWordmark />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {signedIn ? (
              <form action={signOutAction}>
                <Button type="submit" variant="ghost">
                  Sign out
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
