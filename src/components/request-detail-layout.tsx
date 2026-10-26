import {
  RequestBadges,
  RequestContactBlock,
  RequestFacts,
  RequestNotes,
  requestTitle,
  showsContact,
  type RequestContact,
} from "@/components/request-card"
import type { FoodRequest } from "@/db/schema"
import { formatDateTime } from "@/lib/chicago-time"
import { copyFor } from "@/lib/copy"
import { currentLang, getCopy } from "@/lib/i18n-server"
import { cn } from "@/lib/utils"

/**
 * A single request's page (/requests/[id]). Built from the same parts as RequestCard: a
 * header with the badges and the items as the page's h1, a key-facts grid (people,
 * neighborhood, time window), notes, the status timeline, the contact block when allowed,
 * and an action area. Two columns from 768px: the details, and a side column for the
 * contact and actions.
 */
export async function RequestDetailLayout({
  request,
  contact,
  actions,
  back,
  className,
}: {
  request: FoodRequest
  /** Shown on In Progress and Fulfilled requests to the two people involved. */
  contact?: RequestContact
  /** The action area: an action button, a confirmation, or a state note. */
  actions?: React.ReactNode
  /** An optional back link, above the header. */
  back?: React.ReactNode
  className?: string
}) {
  return (
    <article className={cn("flex flex-col gap-6", className)}>
      {back}
      <header className="flex flex-col gap-3">
        <RequestBadges request={request} />
        <h1 className="font-heading text-h1 font-bold [overflow-wrap:anywhere]">{requestTitle(request, await getCopy())}</h1>
      </header>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
            <RequestFacts request={request} withPeople className="gap-3 sm:grid-cols-2" />
            {request.dietaryNotes && <RequestNotes notes={request.dietaryNotes} />}
          </section>
          <RequestTimeline request={request} />
        </div>
        {(showsContact(request, contact) || actions) && (
          <aside className="flex flex-col gap-4">
            {showsContact(request, contact) && <RequestContactBlock contact={contact} />}
            {actions && <div className="flex flex-col gap-3">{actions}</div>}
          </aside>
        )}
      </div>
    </article>
  )
}

/**
 * Posted → Claimed → Fulfilled (or Posted → Cancelled), each with when it happened in
 * Chicago time. Steps still ahead read "Not yet"; a step from before these times were
 * recorded reads "Time not recorded".
 */
export async function RequestTimeline({ request }: { request: FoodRequest }) {
  const lang = await currentLang()
  const DETAIL_COPY = copyFor(lang).DETAIL_COPY
  const t = DETAIL_COPY.timeline
  const reached = (s: FoodRequest["status"][]) => s.includes(request.status)
  const steps =
    request.status === "cancelled"
      ? [
          { label: t.posted, done: true, at: request.createdAt },
          { label: t.cancelled, done: true, at: request.cancelledAt },
        ]
      : [
          { label: t.posted, done: true, at: request.createdAt },
          { label: t.claimed, done: reached(["claimed", "delivered"]), at: request.claimedAt },
          { label: t.fulfilled, done: reached(["delivered"]), at: request.fulfilledAt },
        ]
  return (
    <section
      aria-labelledby="timeline-heading"
      className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm"
    >
      <h2 id="timeline-heading" className="font-heading text-h3 font-semibold">
        {DETAIL_COPY.timelineHeading}
      </h2>
      <ol className="mt-4 flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={s.label} data-step={s.done ? "done" : "ahead"} className="relative flex gap-3">
            {/* The dot, and a line down to the next step. */}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 mt-1 size-3.5 shrink-0 rounded-full border-2",
                s.done ? "border-primary bg-primary" : "border-muted-foreground bg-card"
              )}
            />
            {i < steps.length - 1 && (
              <span aria-hidden="true" className="absolute top-5 bottom-[-1rem] left-[0.4rem] w-0.5 bg-border" />
            )}
            <div className="flex min-w-0 flex-col">
              <span className={cn("font-medium", !s.done && "text-muted-foreground")}>{s.label}</span>
              <span className="text-sm text-muted-foreground">
                {!s.done ? (
                  DETAIL_COPY.notYet
                ) : s.at ? (
                  <time dateTime={s.at.toISOString()}>{formatDateTime(s.at, lang)}</time>
                ) : (
                  DETAIL_COPY.timeNotRecorded
                )}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
