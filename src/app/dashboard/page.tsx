import { asc, desc, eq } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { ImpactStat } from "@/components/impact-stat"
import { RequestCard } from "@/components/request-card"
import { SiteHeader } from "@/components/site-header"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { db } from "@/db"
import { foodRequests, type FoodRequest } from "@/db/schema"
import { requireUser } from "@/lib/current-user"

import { ClaimButton } from "./claim-button"

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
          {user.role === "outreach" ? "Outreach" : "Food donor"}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Hi, {greeting}</h1>
      </BlurFade>
      {user.role === "outreach" ? <OutreachDashboard userId={user.id} /> : <DonorDashboard />}
    </>
  )
}

async function OutreachDashboard({ userId }: { userId: string }) {
  const requests = await db
    .select()
    .from(foodRequests)
    .where(eq(foodRequests.createdBy, userId))
    .orderBy(desc(foodRequests.windowStart))

  const delivered = requests.filter((r) => r.status === "delivered")
  const peopleFed = delivered.reduce((n, r) => n + r.peopleCount, 0)
  const open = requests.filter((r) => r.status === "open").length

  return (
    <>
      <section aria-label="Your impact" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ImpactStat value={peopleFed} label="People fed through your requests" />
        <ImpactStat value={delivered.length} label="Deliveries completed" />
        <ImpactStat value={open} label="Requests waiting for a donor" />
      </section>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Your requests</h2>
        <Button asChild size="lg">
          <Link href="/requests/new">New request</Link>
        </Button>
      </div>

      {requests.length === 0 ? (
        <EmptyState>
          You haven&apos;t asked for food yet. Start a request and nearby donors will see it.
        </EmptyState>
      ) : (
        <RequestGrid requests={requests} />
      )}
    </>
  )
}

async function DonorDashboard() {
  const open = await db
    .select()
    .from(foodRequests)
    .where(eq(foodRequests.status, "open"))
    .orderBy(asc(foodRequests.windowStart))

  const waiting = open.reduce((n, r) => n + r.peopleCount, 0)

  return (
    <>
      <section aria-label="Right now" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ImpactStat value={open.length} label="Open requests" />
        <ImpactStat value={waiting} label="People who could use a meal" />
      </section>

      <h2 className="mt-12 text-xl font-semibold">Open requests</h2>
      <p className="mt-1 text-muted-foreground">
        Each request shows the neighborhood and time window. The outreach team shares the exact
        drop-off spot after you claim it.
      </p>

      {open.length === 0 ? (
        <EmptyState>No open requests right now. Check back soon.</EmptyState>
      ) : (
        <RequestGrid
          requests={open}
          footer={() => <ClaimButton />}
        />
      )}
    </>
  )
}

function RequestGrid({
  requests,
  footer,
}: {
  requests: FoodRequest[]
  footer?: (r: FoodRequest) => React.ReactNode
}) {
  return (
    <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {requests.map((r) => (
        <li key={r.id}>
          <RequestCard request={r} footer={footer?.(r)} />
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
