import { Lock } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { LoadingState } from "@/components/loading-state"
import { Notice } from "@/components/notice"
import { PageHeader } from "@/components/page-header"
import { SiteHeader } from "@/components/site-header"
import { getCopy } from "@/lib/i18n-server"
import { requireUser } from "@/lib/current-user"
import { db } from "@/db"
import { chicagoDateToLocal } from "@/lib/chicago-time"
import { getRevisionDraft } from "@/lib/privacy-review-rules"
import type { NewRequestInput } from "@/lib/validation"
import { canPostNeeds } from "@/lib/request-rules"

import { NewRequestForm } from "./new-request-form"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getCopy()).META.postNeed }
}

export default async function NewRequestPage({ searchParams }: PageProps<"/[lang]/requests/new">) {
  const { NEW_REQUEST_COPY } = await getCopy()
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
          <PosterOnlyForm searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  )
}

// Outreach accounts and approved organizations. Everyone else goes back to the dashboard;
// the create-request rule checks this again when the form is sent.
async function PosterOnlyForm({ searchParams }: { searchParams: PageProps<"/[lang]/requests/new">["searchParams"] }) {
  const user = await requireUser()
  if (!canPostNeeds(user)) redirect("/dashboard")
  const { review } = await searchParams
  const draft = review ? await getRevisionDraft(db, user.id, review) : null
  if (review && !draft) redirect("/dashboard")
  return <NewRequestForm revisionOf={draft?.id} initialValues={draft ? {
    peopleCount: String(draft.peopleCount),
    category: draft.category,
    items: draft.safeItems,
    dietaryNotes: draft.safeNotes ?? "",
    neighborhood: draft.neighborhood as NewRequestInput["neighborhood"],
    windowStart: chicagoDateToLocal(draft.windowStart),
    windowEnd: chicagoDateToLocal(draft.windowEnd),
  } : undefined} />
}
