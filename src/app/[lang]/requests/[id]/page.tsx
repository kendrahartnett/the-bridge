import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { RequestActionButton } from "@/app/[lang]/dashboard/request-action-button"
import { LoadingState } from "@/components/loading-state"
import { RequestCardNote, RequestCardSupporting } from "@/components/request-card"
import { RequestDetailLayout } from "@/components/request-detail-layout"
import { SiteHeader } from "@/components/site-header"
import { db } from "@/db"
import { getCopy } from "@/lib/i18n-server"
import { requireUser } from "@/lib/current-user"
import { canClaimNeeds, canPostNeeds, getRequestForViewer, type RequestDetail } from "@/lib/request-rules"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getCopy()).META.need }
}

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Who may see a need is decided by getRequestForViewer (src/lib/request-rules.ts). proxy.ts
// asks the same question first and answers anyone who may not see it (including signed-out
// visitors, and needs that don't exist) with the standard not-found page and a real 404,
// before this page starts; the page asks again here.
export default async function RequestPage({ params, searchParams }: Props) {
  const { DETAIL_COPY } = await getCopy()
  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Suspense fallback={<LoadingState>{DETAIL_COPY.loading}</LoadingState>}>
          <RequestView params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  )
}

async function RequestView({ params, searchParams }: Props) {
  const { CONTACT_COPY, DETAIL_COPY } = await getCopy()
  const user = await requireUser()
  const { id } = await params
  const detail = await getRequestForViewer(db, user.id, id)
  if (!detail) notFound()

  // Back to the Needs Board when the viewer came from it (organizations only), otherwise
  // to the dashboard.
  const fromBoard = (await searchParams).from === "board" && user.role === "donor"
  const back = fromBoard
    ? { href: "/board", label: DETAIL_COPY.backToBoard }
    : { href: "/dashboard", label: DETAIL_COPY.backToDashboard }

  const { request, relation, contact } = detail
  return (
    <RequestDetailLayout
      request={request}
      back={
        <Link
          href={back.href}
          className="inline-flex min-h-tap items-center self-start text-sm font-medium text-primary-text underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          {back.label}
        </Link>
      }
      contact={
        contact
          ? { label: relation === "poster" ? CONTACT_COPY.supportedBy : CONTACT_COPY.postedBy, ...contact }
          : undefined
      }
      actions={<Actions detail={detail} canPost={canPostNeeds(user)} approved={canClaimNeeds(user)} />}
    />
  )
}

/**
 * What the viewer can do here. Only shows what the rules allow; every action is checked
 * again on the server when it runs.
 */
async function Actions({ detail, canPost, approved }: { detail: RequestDetail; canPost: boolean; approved: boolean }) {
  const { DETAIL_COPY, VERIFICATION_COPY } = await getCopy()
  const { request, relation } = detail
  if (relation === "poster") {
    if (!canPost) return null
    if (request.status === "open") return <RequestActionButton kind="cancel" requestId={request.id} />
    if (request.status === "claimed") return <RequestActionButton kind="deliver" requestId={request.id} />
    return null
  }
  if (relation === "claimer") return <RequestCardSupporting>{DETAIL_COPY.youClaimed}</RequestCardSupporting>
  if (request.status === "claimed") return <RequestCardNote>{DETAIL_COPY.claimedByOther}</RequestCardNote>
  if (!approved) return <RequestCardNote>{VERIFICATION_COPY.availableAfterApproval}</RequestCardNote>
  return (
    <>
      {/* Above the button: the button's reflection would cover text below it. */}
      <p className="text-sm text-muted-foreground">{DETAIL_COPY.contactAfterClaim}</p>
      <RequestActionButton kind="claim" requestId={request.id} />
    </>
  )
}
