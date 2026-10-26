import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { Logo } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { AUTH_COPY } from "@/lib/copy"

import { AuthTabs } from "./auth-tabs"

export const metadata: Metadata = { title: "Sign in · The Bridge" }

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    // Calm and branded: the deeper page color, the logo, and one solid card holding the
    // forms. No site header on this page, so the theme toggle sits beside the back link.
    <div className="flex flex-1 flex-col bg-background-deep">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-tap items-center text-sm font-medium text-primary-text underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            {AUTH_COPY.backHome}
          </Link>
          <ThemeToggle />
        </div>
        <Link
          href="/"
          aria-label="The Bridge, home"
          className="mb-6 self-center rounded-md p-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <Logo className="w-[168px] min-[360px]:w-[168px] sm:w-[184px]" sizes="(min-width: 640px) 184px, 168px" />
        </Link>
        <div className="card-glow rounded-2xl border border-primary/45 bg-card p-5 text-card-foreground shadow-lg sm:p-8">
          <h1 className="font-heading text-h1 font-bold">{AUTH_COPY.heading}</h1>
          <p className="mt-2 text-muted-foreground">{AUTH_COPY.intro}</p>
          {/* searchParams is request data, so it is read behind Suspense (cacheComponents). */}
          <Suspense fallback={<AuthTabs />}>
            <AuthTabsFromLink searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

// The landing page buttons link here with ?role=: "Post a Need" (outreach) opens Create
// account with "I'm posting needs" selected, "Offer Support" (donor) with "I'm an
// organization". ?tab=create opens Create account. Anything else opens Sign in.
async function AuthTabsFromLink({
  searchParams,
}: {
  searchParams: PageProps<"/sign-in">["searchParams"]
}) {
  const { role, tab } = await searchParams
  if (role === "outreach") return <AuthTabs initialTab="create" initialType="poster" />
  if (role === "donor") return <AuthTabs initialTab="create" initialType="organization" />
  return <AuthTabs initialTab={tab === "create" ? "create" : "sign-in"} />
}
