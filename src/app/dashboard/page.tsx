import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { CircleCheck } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { ImpactStat } from "@/components/impact-stat"
import { RequestCard } from "@/components/request-card"
import { SiteHeader } from "@/components/site-header"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { db } from "@/db"
import { foodRequests, users, type FoodRequest } from "@/db/schema"
import { requireUser } from "@/lib/current-user"
import { ROLE_LABELS } from "@/lib/labels"

import { RequestActionButton } from "./request-action-button"

export const metadata: Metadata = { title: "Dashboard · The Bridge" }

export default function DashboardPage() {
  // Header is static; everything that reads the session streams in behind Suspense
  // (required with cacheComponents).
  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-14">
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
        <p className="text-sm text-muted-foreground">
          {user.organizationName ? `${user.organizationName} · ` : ""}
          {ROLE_LABELS[user.role]}
        </p>
        <h1 className="font-heading mt-1 text-3xl font-bold tracking-tight">Hi, {greeting}</h1>
      </BlurFade>
      {user.role === "outreach" ? (
        <OutreachDashboard userId={user.id} />
      ) : (
        <DonorDashboard userId={user.id} />
      )}
    </>
  )
}

// The donor who claimed a request. Only their organization or display name is
// selected; email and user ID are never read for this view.
const claimer = alias(users, "claimer")

async function OutreachDashboard({ userId }: { userId: string }) {
  const rows = await db
    .select({
      request: foodRequests,
      claimerOrg: claimer.organizationName,
      claimerName: claimer.displayName,
    })
    .from(foodRequests)
    .leftJoin(claimer, eq(claimer.id, foodRequests.claimedBy))
    .where(eq(foodRequests.createdBy, userId))
    .orderBy(desc(foodRequests.windowStart))
  const requests = rows.map((r) => ({
    ...r.request,
    claimedByName: r.claimerOrg ?? r.claimerName ?? "an organization",
  }))

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
    db
      .select()
      .from(foodRequests)
      .where(eq(foodRequests.status, "open"))
      .orderBy(asc(foodRequests.windowStart)),
    db
      .select()
      .from(foodRequests)
      .where(
        and(
          eq(foodRequests.claimedBy, userId),
          inArray(foodRequests.status, ["claimed", "delivered"])
        )
      )
      .orderBy(desc(foodRequests.windowStart)),
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
        coordinate with the person who posted it.
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

type CardRequest = FoodRequest & { claimedByName?: string }

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
        <li key={r.id}>
          <RequestCard request={r} claimedByName={r.claimedByName} footer={footer?.(r)} />
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
