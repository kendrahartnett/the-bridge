import { CircleCheck, Clock } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { ImpactStat } from "@/components/impact-stat"
import { Notice } from "@/components/notice"
import { PageHeader } from "@/components/page-header"
import { RequestCard, type RequestContact } from "@/components/request-card"
import { SectionHeader } from "@/components/section-header"
import { SiteHeader } from "@/components/site-header"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { db } from "@/db"
import type { FoodRequest, User } from "@/db/schema"
import { CONTACT_COPY, DASHBOARD_COPY, ROLE_CTAS, VERIFICATION_COPY } from "@/lib/copy"
import { requireUser } from "@/lib/current-user"
import { ROLE_LABELS } from "@/lib/labels"
import {
  canClaimNeeds,
  canPostNeeds,
  listMyPosts,
  listMySupported,
  listOpen,
  type RequestWithContact,
} from "@/lib/request-rules"

import { RequestActionButton } from "./request-action-button"

export const metadata: Metadata = { title: "Dashboard · The Bridge" }

export default function DashboardPage() {
  // Header is static; everything that reads the session streams in behind Suspense
  // (required with cacheComponents).
  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Suspense fallback={<p className="text-muted-foreground">{DASHBOARD_COPY.loading}</p>}>
          <DashboardContent />
        </Suspense>
      </main>
    </>
  )
}

async function DashboardContent() {
  const user = await requireUser()
  const greeting = user.displayName ?? user.email

  return (
    <>
      <BlurFade>
        <PageHeader
          eyebrow={`${user.organizationName ? `${user.organizationName} · ` : ""}${ROLE_LABELS[user.role]}`}
          title={DASHBOARD_COPY.greeting.replace("{name}", greeting)}
        />
      </BlurFade>
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
  const approved = canClaimNeeds(user)
  const [open, supporting, posts] = await Promise.all([
    listOpen(db),
    listMySupported(db, user.id).then((rows) => rows.map((r) => withLabel(r, CONTACT_COPY.postedBy))),
    listMyPosts(db, user.id).then((rows) => rows.map((r) => withLabel(r, CONTACT_COPY.supportedBy))),
  ])
  const waiting = open.reduce((n, r) => n + r.peopleCount, 0)
  const t = DASHBOARD_COPY.organization

  // On the Needs Board: your own post can't be claimed by you; otherwise only an approved
  // organization gets the button (the claim rule checks this again on the server).
  const boardFooter = (r: FoodRequest) =>
    r.createdBy === user.id ? (
      <CardNote>{VERIFICATION_COPY.yourPost}</CardNote>
    ) : approved ? (
      <RequestActionButton kind="claim" requestId={r.id} />
    ) : (
      <CardNote>{VERIFICATION_COPY.availableAfterApproval}</CardNote>
    )

  return (
    <>
      {!approved && <VerificationBanner status={user.verificationStatus} />}

      <section aria-label={t.statsLabel} className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ImpactStat value={open.length} label={t.openCount} />
        <ImpactStat value={waiting} label={t.peopleWaiting} />
      </section>

      <SectionHeader
        className="mt-12"
        title={t.boardHeading}
        description={t.boardIntro}
        actions={canPostNeeds(user) && <PostNeedButton />}
      />

      {open.length === 0 ? (
        <EmptyState className="mt-6">{t.boardEmpty}</EmptyState>
      ) : (
        <RequestGrid requests={open} footer={boardFooter} />
      )}

      {supporting.length > 0 && (
        <>
          <SectionHeader className="mt-12" title={t.supportingHeading} />
          <RequestGrid requests={supporting} footer={() => <ClaimedByYou />} />
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

/** Shown to organizations that aren't approved (yet). */
function VerificationBanner({ status }: { status: User["verificationStatus"] }) {
  const rejected = status === "rejected"
  const adminEmail = process.env.ADMIN_CONTACT_EMAIL
  let message: React.ReactNode = VERIFICATION_COPY.pendingBanner
  if (rejected) {
    const [before, after] = VERIFICATION_COPY.rejectedBanner.split("{email}")
    message = adminEmail ? (
      <>
        {before}
        <a
          href={`mailto:${adminEmail}`}
          className="font-semibold break-all underline underline-offset-4 hover:no-underline"
        >
          {adminEmail}
        </a>
        {after}
      </>
    ) : (
      VERIFICATION_COPY.rejectedBannerNoEmail
    )
  }
  return (
    <Notice
      tone={rejected ? "error" : "info"}
      icon={rejected ? undefined : Clock}
      label={DASHBOARD_COPY.organization.accountStatusLabel}
      className="mt-6"
    >
      <p>{message}</p>
    </Notice>
  )
}

function CardNote({ children }: { children: React.ReactNode }) {
  return <p className="flex min-h-tap items-center font-medium text-muted-foreground">{children}</p>
}

function ClaimedByYou() {
  return (
    <p className="flex min-h-tap items-center gap-2 font-medium text-primary-text">
      <CircleCheck aria-hidden="true" className="size-5" />
      {DASHBOARD_COPY.organization.supportingThis}
    </p>
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

function PostNeedButton() {
  return (
    <Button asChild size="lg">
      <Link href="/requests/new">{ROLE_CTAS.outreach.label}</Link>
    </Button>
  )
}
