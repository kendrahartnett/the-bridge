import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { SiteHeader } from "@/components/site-header"
import { requireUser } from "@/lib/current-user"

import { NewRequestForm } from "./new-request-form"

export const metadata: Metadata = { title: "New request · The Bridge" }

export default function NewRequestPage() {
  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex min-h-tap items-center text-sm font-medium text-primary-text underline-offset-4 hover:underline"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ask for food</h1>
        <p className="mt-2 text-muted-foreground">
          Tell donors how many people you&apos;re serving and when. Only the neighborhood is
          shared. Please don&apos;t include names, addresses, or camp locations.
        </p>
        <Suspense fallback={<p className="mt-8 text-muted-foreground">Loading…</p>}>
          <OutreachOnlyForm />
        </Suspense>
      </main>
    </>
  )
}

async function OutreachOnlyForm() {
  const user = await requireUser()
  if (user.role !== "outreach") redirect("/dashboard")
  return <NewRequestForm />
}
