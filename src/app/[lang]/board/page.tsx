import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { VerificationBanner } from "@/components/verification-banner"
import { EmptyState } from "@/components/empty-state"
import { LoadingState } from "@/components/loading-state"
import { PageHeader } from "@/components/page-header"
import { PostNeedButton } from "@/components/post-need-button"
import { SiteHeader } from "@/components/site-header"
import { StickyNote, StickyNoteGrid } from "@/components/sticky-note"
import { db } from "@/db"
import { getCopy } from "@/lib/i18n-server"
import { requireUser } from "@/lib/current-user"
import { canClaimNeeds, canPostNeeds, listBoard } from "@/lib/request-rules"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getCopy()).META.board }
}

// For organization accounts only (approved, pending, and rejected). proxy.ts answers anyone
// else with the standard not-found page and a real 404 before this page starts; listBoard
// checks again and returns nothing for anyone who isn't an organization.
export default async function BoardPage() {
  const { BOARD_COPY } = await getCopy()
  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Suspense fallback={<LoadingState>{BOARD_COPY.loading}</LoadingState>}>
          <Board />
        </Suspense>
      </main>
    </>
  )
}

async function Board() {
  const { BOARD_COPY } = await getCopy()
  const user = await requireUser()
  const needs = await listBoard(db, user.id)
  if (!needs) notFound()
  const approved = canClaimNeeds(user)

  return (
    <>
      <PageHeader
        title={BOARD_COPY.title}
        intro={BOARD_COPY.intro}
        actions={canPostNeeds(user) && <PostNeedButton />}
      />
      {!approved && <VerificationBanner status={user.verificationStatus} />}
      {needs.length === 0 ? (
        <EmptyState className="mt-8">{BOARD_COPY.empty}</EmptyState>
      ) : (
        <StickyNoteGrid className="mt-8">
          {needs.map((r) => (
            <li key={r.id} className="min-w-0">
              <StickyNote request={r} own={approved && r.createdBy === user.id} href={`/requests/${r.id}?from=board`} />
            </li>
          ))}
        </StickyNoteGrid>
      )}
    </>
  )
}
