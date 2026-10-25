import { CircleCheck } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { ImpactStat } from "@/components/impact-stat"
import { RequestCard, type RequestContact } from "@/components/request-card"
import { SiteHeader } from "@/components/site-header"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { db } from "@/db"
import type { FoodRequest } from "@/db/schema"
import { CONTACT_COPY } from "@/lib/copy"
import { requireUser } from "@/lib/current-user"
import { ROLE_LABELS } from "@/lib/labels"
import { listMyPosts, listMySupported, listOpen, type RequestWithContact } from "@/lib/request-rules"

import { RequestActionButton } from "./request-action-button"

export const metadata: Metadata = { title: "Dashboard · The Bridge" }

export default function DashboardPage() {
  // Header is static; everything that reads the session streams in behind Suspense
  // (required with cacheComponents).
  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Suspense fallback={<p className="text-muted-foreground">Loading your dashboard…</p>}>
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
        <p className="text-sm break-words text-muted-foreground">
          {user.organizationName ? `${user.organizationName} · ` : ""}
          {ROLE_LABELS[user.role]}
        </p>
        <h1 className="font-heading mt-1 text-3xl font-bold tracking-tight [overflow-wrap:anywhere]">Hi, {greeting}</h1>
      </BlurFade>
      {user.role === "outreach" ? (
        <OutreachDashboard userId={user.id} />
      ) : (
        <DonorDashboard userId={user.id} />
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

  return (
    <>
      <section aria-label="Your impact" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ImpactStat value={peopleFed} label="People helped through your requests" />
        <ImpactStat value={delivered.length} label="Requests fulfilled" />
        <ImpactStat value={open} label="Requests waiting for support" />
      </section>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-bold">Your requests</h2>
        <Button asChild size="lg">
          <Link href="/requests/new">New request</Link>
        </Button>
      </div>

      {requests.length === 0 ? (
        <EmptyState>
          You haven&apos;t posted a need yet. Start a request and organizations nearby will see it.
        </EmptyState>
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

async function DonorDashboard({ userId }: { userId: string }) {
  const [open, mine] = await Promise.all([
    listOpen(db),
    listMySupported(db, userId).then((rows) => rows.map((r) => withLabel(r, CONTACT_COPY.postedBy))),
  ])

  const waiting = open.reduce((n, r) => n + r.peopleCount, 0)

  return (
    <>
      <section aria-label="Right now" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ImpactStat value={open.length} label="Open requests" />
        <ImpactStat value={waiting} label="People who need support" />
      </section>

      <h2 className="font-heading mt-12 text-xl font-bold">Open requests</h2>
      <p className="mt-1 text-muted-foreground">
        Each request shows the neighborhood and time window. After you offer support, you&apos;ll
        see the poster&apos;s contact email so you can arrange the handoff.
      </p>

      {open.length === 0 ? (
        <EmptyState>No open requests right now. Check back soon.</EmptyState>
      ) : (
        <RequestGrid
          requests={open}
          footer={(r) => <RequestActionButton kind="claim" requestId={r.id} />}
        />
      )}

      {mine.length > 0 && (
        <>
          <h2 className="font-heading mt-12 text-xl font-bold">Requests you&apos;re supporting</h2>
          <RequestGrid requests={mine} footer={() => <ClaimedByYou />} />
        </>
      )}
    </>
  )
}

function ClaimedByYou() {
  return (
    <p className="flex min-h-tap items-center gap-2 font-medium text-primary-text">
      <CircleCheck aria-hidden="true" className="size-5" />
      You&apos;re supporting this
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

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-10 text-center text-muted-foreground shadow-sm">
      {children}
    </div>
  )
}
