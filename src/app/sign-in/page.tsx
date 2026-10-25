import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { ThemeToggle } from "@/components/theme-toggle"

import { SignInForm } from "./sign-in-form"

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
      <h1 className="font-heading text-3xl font-bold tracking-tight">Welcome to The Bridge</h1>
      <p className="mt-2 text-muted-foreground">
        Sign in or create an account. It takes about a minute.
      </p>
      {/* searchParams is request data, so it is read behind Suspense (cacheComponents). */}
      <Suspense fallback={<SignInForm />}>
        <SignInFormWithRole searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function SignInFormWithRole({
  searchParams,
}: {
  searchParams: PageProps<"/sign-in">["searchParams"]
}) {
  const { role } = await searchParams
  const initialRole = role === "outreach" || role === "donor" ? role : undefined
  return <SignInForm initialRole={initialRole} />
}
