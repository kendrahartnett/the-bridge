import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { LoadingState } from "@/components/loading-state"
import { PageHeader } from "@/components/page-header"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/db"
import type { PrivacyReview } from "@/db/schema"
import { formatDateTime, formatWindow } from "@/lib/chicago-time"
import { getCurrentUser } from "@/lib/current-user"
import { currentLang, getCopy } from "@/lib/i18n-server"
import { listPrivacyReviews } from "@/lib/privacy-review-rules"
import type { PrivacyCategory } from "@/lib/privacy-screening-core"

import { decidePrivacyReviewAction } from "./actions"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getCopy()).PRIVACY_COPY.reviewHeading, robots: { index: false, follow: false } }
}

type PrivacyPageProps = { searchParams: Promise<{ result?: string | string[] }> }

export default async function PrivacyReviewPage({ searchParams }: PrivacyPageProps) {
  const { ADMIN_COPY, PRIVACY_COPY } = await getCopy()
  return <>
    <SiteHeader signedIn />
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader back={{ href: "/admin", label: PRIVACY_COPY.backToAdmin }} title={PRIVACY_COPY.reviewHeading} intro={PRIVACY_COPY.reviewIntro} />
      <Suspense fallback={<LoadingState>{ADMIN_COPY.loading}</LoadingState>}>
        <ReviewContent searchParams={searchParams} />
      </Suspense>
    </main>
  </>
}

async function ReviewContent({ searchParams }: PrivacyPageProps) {
  const { PRIVACY_COPY: P, LABELS, NEW_REQUEST_FORM: F } = await getCopy()
  const lang = await currentLang()
  const user = await getCurrentUser()
  if (!user) notFound()
  const reviews = await listPrivacyReviews(db, user.id)
  if (!reviews) notFound()
  const pending = reviews.filter((r) => r.status === "pending_review")
  const params = await searchParams
  return <>
    <p className="mt-6 text-sm font-semibold text-primary-text">{P.pendingCount.replace("{n}", String(pending.length))}</p>
    {params.result === "error" && <p role="alert" className="mt-4 rounded-xl border border-border-strong p-4">{P.decisionError}</p>}
    {pending.length === 0 ? <EmptyState className="mt-6"><strong className="block text-foreground">{P.reviewEmptyTitle}</strong>{P.reviewEmpty}</EmptyState> :
      <ul className="mt-6 grid gap-5 lg:grid-cols-2">{pending.map((review) => <li key={review.id} className="min-w-0"><ReviewCard review={review} /></li>)}</ul>}
  </>

  async function ReviewCard({ review: r }: { review: PrivacyReview }) {
    return <Card className="h-full gap-4">
      <CardHeader><CardTitle className="font-heading text-h3 [overflow-wrap:anywhere]">{r.safeItems}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <h3 className="font-heading font-bold">{P.requestInfo}</h3>
        <dl className="grid gap-2 sm:grid-cols-[auto_1fr]">
          <dt>{P.created}</dt><dd>{formatDateTime(r.createdAt, lang)}</dd>
          <dt>{F.category}</dt><dd>{LABELS.category[r.category]}</dd>
          <dt>{F.peopleCount}</dt><dd>{r.peopleCount}</dd>
          <dt>{P.status}</dt><dd>{P.statusLabels.pending_review}</dd>
          <dt>{F.neighborhood}</dt><dd>{r.neighborhood}</dd>
          <dt>{F.window}</dt><dd>{formatWindow(r.windowStart, r.windowEnd, lang)}</dd>
        </dl>
        {r.safeNotes && <p>{r.safeNotes}</p>}
        <h3 className="font-heading font-bold">{P.screeningInfo}</h3>
        <p>{P.risk}: {P.medium}</p>
        <p>{P.categories}</p>
        <ul className="list-disc pl-5">{r.categories.map((c) => <li key={c}>{P.category[c as PrivacyCategory] ?? P.medium}</li>)}</ul>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4 border-t border-border pt-4">
        <form action={decidePrivacyReviewAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={r.id} />
          <Button type="submit" name="action" value="approve">{P.approve}</Button>
          <label className="text-sm font-semibold" htmlFor={`reason-${r.id}`}>{P.reasonLabel}</label>
          <select id={`reason-${r.id}`} name="reason" defaultValue="" className="min-h-tap rounded-xl border border-border-strong bg-background px-3 text-foreground">
            <option value="" disabled>{P.reasonPrompt}</option>
            {Object.entries(P.reasons).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" name="action" value="changes" variant="outline">{P.changes}</Button>
            <Button type="submit" name="action" value="reject" variant="outline">{P.reject}</Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  }
}
