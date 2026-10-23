import type { Metadata } from "next"
import Link from "next/link"

import { SignInForm } from "./sign-in-form"

export const metadata: Metadata = { title: "Sign in · The Bridge" }

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { role } = await searchParams
  const initialRole = role === "outreach" || role === "donor" ? role : undefined

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-tap items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        ← Back to home
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Welcome to The Bridge</h1>
      <p className="mt-2 text-muted-foreground">
        Sign in or create an account. It takes about a minute.
      </p>
      <SignInForm initialRole={initialRole} />
    </main>
  )
}
