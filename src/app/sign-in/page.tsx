import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { ThemeToggle } from "@/components/theme-toggle"
import { AUTH_COPY } from "@/lib/copy"

import { AuthTabs } from "./auth-tabs"

export const metadata: Metadata = { title: "Sign in · The Bridge" }

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6">
      {/* No site header on this page, so the theme toggle sits beside the back link. */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex min-h-tap items-center text-sm font-medium text-primary-text underline-offset-4 hover:underline"
        >
          ← Back to home
        </Link>
        <ThemeToggle />
      </div>
      <h1 className="font-heading text-3xl font-bold tracking-tight">{AUTH_COPY.heading}</h1>
      <p className="mt-2 text-muted-foreground">{AUTH_COPY.intro}</p>
      {/* searchParams is request data, so it is read behind Suspense (cacheComponents). */}
      <Suspense fallback={<AuthTabs />}>
        <AuthTabsFromLink searchParams={searchParams} />
      </Suspense>
    </main>
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
