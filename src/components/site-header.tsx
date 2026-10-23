import Link from "next/link"

import { signOutAction } from "@/app/sign-in/actions"
import { Button } from "@/components/ui/button"

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-2">
        <Link
          href={signedIn ? "/dashboard" : "/"}
          className="inline-flex min-h-tap items-center text-lg font-semibold text-primary-text"
        >
          The Bridge
        </Link>
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
    </header>
  )
}
