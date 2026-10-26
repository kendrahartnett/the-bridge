import { Lock } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { LoadingState } from "@/components/loading-state"
import { Notice } from "@/components/notice"
import { PageHeader } from "@/components/page-header"
import { SiteHeader } from "@/components/site-header"
import { NEW_REQUEST_COPY, ROLE_CTAS } from "@/lib/copy"
import { requireUser } from "@/lib/current-user"
import { canPostNeeds } from "@/lib/request-rules"

import { NewRequestForm } from "./new-request-form"

export const metadata: Metadata = { title: `${ROLE_CTAS.outreach.label} · The Bridge` }

export default function NewRequestPage() {
  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <PageHeader
          back={{ href: "/dashboard", label: NEW_REQUEST_COPY.back }}
          title={NEW_REQUEST_COPY.title}
          intro={NEW_REQUEST_COPY.intro}
        />
        <Notice as="aside" icon={Lock} label={NEW_REQUEST_COPY.privacyLabel} className="mt-6 text-sm">
          <p>{NEW_REQUEST_COPY.privacy}</p>
        </Notice>
        <Suspense fallback={<LoadingState className="mt-8">{NEW_REQUEST_COPY.loading}</LoadingState>}>
          <PosterOnlyForm />
        </Suspense>
      </main>
    </>
  )
}

// Outreach accounts and approved organizations. Everyone else goes back to the dashboard;
// the create-request rule checks this again when the form is sent.
async function PosterOnlyForm() {
  const user = await requireUser()
  if (!canPostNeeds(user)) redirect("/dashboard")
  return <NewRequestForm />
}
