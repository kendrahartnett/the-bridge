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
import { cn } from "@/lib/utils"

/**
 * The layout pattern for a single request's page (not routed yet; the upcoming Needs Board
 * will link to it). Built from the same parts as RequestCard: a header with the badges and
 * the items as the page's h1, a key-facts grid (people, neighborhood, time window), notes,
 * the contact block when allowed, and an action area. Two columns from 768px: the details,
 * and a sticky-free side column for the contact and actions.
 */
export function RequestDetailLayout({
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
        <h1 className="font-heading text-h1 font-bold [overflow-wrap:anywhere]">{requestTitle(request)}</h1>
      </header>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
          <RequestFacts request={request} withPeople className="gap-3 sm:grid-cols-2" />
          {request.dietaryNotes && <RequestNotes notes={request.dietaryNotes} />}
        </section>
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
