import { Lock } from "lucide-react"
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
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:py-14">
        <Link
          href="/dashboard"
          className="inline-flex min-h-tap items-center text-sm font-medium text-primary-text underline-offset-4 hover:underline"
        >
          ← Back to dashboard
        </Link>
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-tight">Post a need</h1>
        <p className="mt-2 text-muted-foreground">
          Tell organizations what&apos;s needed, for how many people, and when. Only the
          neighborhood is shared. Please don&apos;t include names, addresses, or camp locations.
        </p>
        <PrivacyNotice />
        <Suspense fallback={<p className="mt-8 text-muted-foreground">Loading…</p>}>
          <OutreachOnlyForm />
        </Suspense>
      </main>
    </>
  )
}

// Exact wording; do not edit without sign-off. No database fields back this notice.
function PrivacyNotice() {
  return (
    <aside
      aria-label="Privacy"
      className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-sm"
    >
      <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-text" />
      <p>
        The Bridge stores only the neighborhood, the number of people, the type of support, the
        items needed, notes, and the time window. We never store names, addresses, or locations
        of the people being served.
      </p>
    </aside>
  )
}

async function OutreachOnlyForm() {
  const user = await requireUser()
  if (user.role !== "outreach") redirect("/dashboard")
  return <NewRequestForm />
}
