import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { ImpactStat } from "@/components/impact-stat"
import { LoadingState } from "@/components/loading-state"
import { PageHeader } from "@/components/page-header"
import { PostNeedButton } from "@/components/post-need-button"
import { RequestCard, RequestCardSupporting, type RequestContact } from "@/components/request-card"
import { SectionHeader } from "@/components/section-header"
import { SiteHeader } from "@/components/site-header"
import { StickyNote, StickyNoteGrid } from "@/components/sticky-note"
import { BlurFade } from "@/components/ui/blur-fade"
import { VerificationBanner } from "@/components/verification-banner"
import { db } from "@/db"
import type { FoodRequest, User } from "@/db/schema"
import { getCopy } from "@/lib/i18n-server"
import { requireUser } from "@/lib/current-user"
import {
  canClaimNeeds,
  canPostNeeds,
  listLatestOpen,
  listMyPosts,
  listMySupported,
  listOpen,
  type RequestWithContact,
} from "@/lib/request-rules"

import { Inbox } from "./inbox"
import { RequestActionButton } from "./request-action-button"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getCopy()).META.dashboard }
}

export default async function DashboardPage() {
  const { DASHBOARD_COPY } = await getCopy()
  // Header is static; everything that reads the session streams in behind Suspense
  // (required with cacheComponents).
  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Suspense fallback={<LoadingState>{DASHBOARD_COPY.loading}</LoadingState>}>
          <DashboardContent />
        </Suspense>
      </main>
    </>
  )
}

async function DashboardContent() {
  const { DASHBOARD_COPY, LABELS } = await getCopy()
  const user = await requireUser()
  const greeting = user.displayName ?? user.email

  return (
    <>
      <BlurFade>
        <PageHeader
          eyebrow={`${user.organizationName ? `${user.organizationName} · ` : ""}${LABELS.role[user.role]}`}
          title={DASHBOARD_COPY.greeting.replace("{name}", greeting)}
        />
      </BlurFade>
      <Inbox userId={user.id} />
      {user.role === "outreach" ? (
        <OutreachDashboard userId={user.id} />
      ) : (
        <DonorDashboard user={user} />
      )}
    </>
  )
}

// Who can see which contact email is decided in the queries (src/lib/request-rules.ts):
// a hidden email is never sent to the page. These only add the label for each side.
const withLabel = (r: RequestWithContact, label: RequestContact["label"]) => ({
  ...r,
  contact: r.contact ? { label, ...r.contact } : undefined,
})

async function OutreachDashboard({ userId }: { userId: string }) {
  const { CONTACT_COPY, DASHBOARD_COPY } = await getCopy()
  const requests = (await listMyPosts(db, userId)).map((r) => withLabel(r, CONTACT_COPY.supportedBy))

  const delivered = requests.filter((r) => r.status === "delivered")
  const peopleFed = delivered.reduce((n, r) => n + r.peopleCount, 0)
  const open = requests.filter((r) => r.status === "open").length
  const t = DASHBOARD_COPY.outreach

  return (
    <>
      <section aria-label={t.statsLabel} className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ImpactStat value={peopleFed} label={t.peopleHelped} />
        <ImpactStat value={delivered.length} label={t.fulfilled} />
        <ImpactStat value={open} label={t.waiting} />
      </section>

      <SectionHeader className="mt-12" title={t.heading} actions={<PostNeedButton />} />

      {requests.length === 0 ? (
        <EmptyState className="mt-6">{t.empty}</EmptyState>
      ) : (
        <RequestGrid requests={requests} footer={outreachFooter} />
      )}
    </>
  )
}

function outreachFooter(r: FoodRequest) {
  if (r.status === "open") return <RequestActionButton kind="cancel" requestId={r.id} />
  if (r.status === "claimed") return <RequestActionButton kind="deliver" requestId={r.id} />
  return null
}

async function DonorDashboard({ user }: { user: User }) {
  const { BOARD_COPY, CONTACT_COPY, DASHBOARD_COPY } = await getCopy()
  const approved = canClaimNeeds(user)
  const [open, latest, supporting, posts] = await Promise.all([
    listOpen(db),
    listLatestOpen(db, user.id),
    listMySupported(db, user.id).then((rows) => rows.map((r) => withLabel(r, CONTACT_COPY.postedBy))),
    listMyPosts(db, user.id).then((rows) => rows.map((r) => withLabel(r, CONTACT_COPY.supportedBy))),
  ])
  const waiting = open.reduce((n, r) => n + r.peopleCount, 0)
  const t = DASHBOARD_COPY.organization

  return (
    <>
      {!approved && <VerificationBanner status={user.verificationStatus} />}

      <section aria-label={t.statsLabel} className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ImpactStat value={open.length} label={t.openCount} />
        <ImpactStat value={waiting} label={t.peopleWaiting} />
      </section>

      {/* A short preview of the Needs Board: the 3 newest open needs, each linking to its
          page, where an approved organization can claim it. */}
      <SectionHeader
        className="mt-12"
        title={t.latestHeading}
        description={t.latestIntro}
        actions={canPostNeeds(user) && <PostNeedButton />}
      />
      {!latest || latest.length === 0 ? (
        <EmptyState className="mt-6">{BOARD_COPY.empty}</EmptyState>
      ) : (
        <StickyNoteGrid className="mt-6">
          {latest.map((r) => (
            <li key={r.id} className="min-w-0">
              <StickyNote request={r} own={approved && r.createdBy === user.id} href={`/requests/${r.id}`} />
            </li>
          ))}
        </StickyNoteGrid>
      )}
      {/* Room below for the button's reflection before the next section. */}
      <Link href="/board" className="glow-button mt-8 mb-8">
        {t.viewBoard}
      </Link>

      {supporting.length > 0 && (
        <>
          <SectionHeader className="mt-12" title={t.supportingHeading} />
          <RequestGrid
            requests={supporting}
            footer={() => <RequestCardSupporting>{t.supportingThis}</RequestCardSupporting>}
          />
        </>
      )}

      {/* Approved organizations can post needs too. Shown whenever there are posts, so an
          organization whose approval was revoked still sees what it posted (read-only). */}
      {(approved || posts.length > 0) && (
        <>
          <SectionHeader className="mt-12" title={t.postsHeading} />
          {posts.length === 0 ? (
            <EmptyState className="mt-6">{t.postsEmpty}</EmptyState>
          ) : (
            <RequestGrid requests={posts} footer={approved ? outreachFooter : undefined} />
          )}
        </>
      )}
    </>
  )
}

type CardRequest = FoodRequest & { contact?: RequestContact }

function RequestGrid({
  requests,
  footer,
}: {
  requests: CardRequest[]
  footer?: (r: CardRequest) => React.ReactNode
}) {
  return (
    <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {requests.map((r) => (
        // min-w-0: a grid item otherwise grows to fit long unbroken text.
        <li key={r.id} className="min-w-0">
          <RequestCard request={r} contact={r.contact} footer={footer?.(r)} />
        </li>
      ))}
    </ul>
  )
}
