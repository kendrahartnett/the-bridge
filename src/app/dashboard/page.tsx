import { asc, desc, eq } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"

import { ImpactStat } from "@/components/impact-stat"
import { RequestCard } from "@/components/request-card"
import { SiteHeader } from "@/components/site-header"
import { BlurFade } from "@/components/ui/blur-fade"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { db } from "@/db"
import { foodRequests, type FoodRequest } from "@/db/schema"
import { requireUser } from "@/lib/current-user"

import { ClaimButton } from "./claim-button"

export const metadata: Metadata = { title: "Dashboard · The Bridge" }

export default async function DashboardPage() {
  const user = await requireUser()
  const greeting = user.displayName ?? user.email

  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <BlurFade>
          <p className="text-sm text-muted-foreground">
            {user.organizationName ? `${user.organizationName} · ` : ""}
            {user.role === "outreach" ? "Outreach" : "Food donor"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Hi, {greeting}</h1>
        </BlurFade>
        {user.role === "outreach" ? (
          <OutreachDashboard userId={user.id} />
        ) : (
          <DonorDashboard />
        )}
      </main>
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
      <section aria-label="Your impact" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ImpactStat value={peopleFed} label="People fed through your requests" />
        <ImpactStat value={delivered.length} label="Deliveries completed" />
        <ImpactStat value={open} label="Requests waiting for a donor" />
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
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
      <section aria-label="Right now" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ImpactStat value={open.length} label="Open requests" />
        <ImpactStat value={waiting} label="People who could use a meal" />
      </section>

      <h2 className="mt-8 text-xl font-semibold">Open requests</h2>
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
    <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {requests.map((r, i) => (
        <li key={r.id}>
          <BlurFade delay={Math.min(i, 6) * 0.05} inView className="h-full">
            <RequestCard request={r} footer={footer?.(r)} />
          </BlurFade>
        </li>
      ))}
    </ul>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
      {children}
      <BorderBeam size={120} duration={10} colorFrom="var(--accent)" colorTo="var(--primary)" />
    </div>
  )
}
