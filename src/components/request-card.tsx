import { CircleCheck, Clock, Mail, MapPin, Users } from "lucide-react"

import { CategoryBadge } from "@/components/category-badge"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { FoodRequest } from "@/db/schema"
import { formatWindow } from "@/lib/chicago-time"
import { CONTACT_COPY, REQUEST_COPY } from "@/lib/copy"
import { neighborhoodLabel } from "@/lib/neighborhoods"
import { cn } from "@/lib/utils"

// The request card and the parts it shares with RequestDetailLayout (badges, key facts,
// notes, contact block), so the Needs Board and a future detail page never drift apart.

/** The other side of an offer: who they are and, when allowed, their account email. */
export type RequestContact = {
  label: typeof CONTACT_COPY.supportedBy | typeof CONTACT_COPY.postedBy
  name: string
  /** Only set by the server for the poster and the supporting organization. */
  email: string | null
}

/** "10 winter coats for 40 people": the request's title everywhere it appears. */
export function requestTitle(request: Pick<FoodRequest, "items" | "peopleCount">) {
  return `${request.items} for ${request.peopleCount} ${request.peopleCount === 1 ? REQUEST_COPY.person : REQUEST_COPY.people}`
}

/** Type of support and status, side by side (they wrap on a narrow card). */
export function RequestBadges({ request }: { request: FoodRequest }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <CategoryBadge category={request.category} />
      <StatusBadge status={request.status} />
    </div>
  )
}

/**
 * Where and when, with icons. People is already in the card's title; the detail layout
 * passes `withPeople` to list it as a fact too.
 */
export function RequestFacts({
  request,
  withPeople = false,
  className,
}: {
  request: FoodRequest
  withPeople?: boolean
  className?: string
}) {
  const facts = [
    ...(withPeople ? [{ Icon: Users, label: REQUEST_COPY.peopleLabel, value: `${request.peopleCount} ${request.peopleCount === 1 ? REQUEST_COPY.person : REQUEST_COPY.people}` }] : []),
    { Icon: MapPin, label: REQUEST_COPY.where, value: neighborhoodLabel(request.neighborhood) },
    { Icon: Clock, label: REQUEST_COPY.when, value: formatWindow(request.windowStart, request.windowEnd) },
  ]
  return (
    <dl className={cn("grid gap-2", className)}>
      {facts.map(({ Icon, label, value }) => (
        <div key={label} className="flex items-start gap-2.5">
          <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-text" />
          <dt className="sr-only">{label}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function RequestNotes({ notes }: { notes: string }) {
  return (
    <p className="text-muted-foreground [overflow-wrap:anywhere]">
      <span className="font-medium text-foreground">{REQUEST_COPY.notes}: </span>
      {notes}
    </p>
  )
}

/**
 * Who is on the other side of the handoff, with their email when the server allowed it,
 * on a quiet panel so it reads as the next step.
 */
export function RequestContactBlock({ contact }: { contact: RequestContact }) {
  return (
    <div data-contact className="flex flex-col gap-1 rounded-lg bg-muted/60 p-3">
      <p>
        <span className="font-medium">{contact.label} </span>
        {contact.name}
      </p>
      {contact.email && (
        <>
          <a
            href={`mailto:${contact.email}`}
            aria-label={`${CONTACT_COPY.emailLabel} ${contact.name}: ${contact.email}`}
            className="inline-flex min-h-tap items-center gap-2 self-start rounded-md font-medium text-primary-text underline underline-offset-4 outline-none [overflow-wrap:anywhere] hover:no-underline focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <Mail aria-hidden="true" className="size-4 shrink-0" />
            {/* Wrap after the @ on narrow screens; break anywhere only if still too long. */}
            <span>
              {contact.email.split("@")[0]}@<wbr />
              {contact.email.split("@").slice(1).join("@")}
            </span>
          </a>
          <p className="text-sm text-muted-foreground">{CONTACT_COPY.note}</p>
        </>
      )}
    </div>
  )
}

/** The contact block shows on In Progress and Fulfilled requests, to the two people involved. */
export const showsContact = (request: FoodRequest, contact?: RequestContact): contact is RequestContact =>
  !!contact && (request.status === "claimed" || request.status === "delivered")

/** A card footer that isn't an action: "Your post", "Available after approval". */
export function RequestCardNote({ children }: { children: React.ReactNode }) {
  return <p className="flex min-h-tap items-center font-medium text-muted-foreground">{children}</p>
}

/** The card footer on a request this organization is supporting. */
export function RequestCardSupporting({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex min-h-tap items-center gap-2 font-medium text-primary-text">
      <CircleCheck aria-hidden="true" className="size-5" />
      {children}
    </p>
  )
}

/**
 * A request as a compact card: badges, the items and people as the title, where and when,
 * notes, the contact block when allowed, and a footer for an action or a state note. The
 * Needs Board's states (claimable, your post, available after approval, supporting) are
 * footers, so every card keeps the same shape.
 */
export function RequestCard({
  request,
  contact,
  footer,
}: {
  request: FoodRequest
  /** Shown on In Progress and Fulfilled requests to the two people involved. */
  contact?: RequestContact
  footer?: React.ReactNode
}) {
  return (
    <Card className="h-full gap-4">
      <CardHeader className="gap-3">
        <RequestBadges request={request} />
        <CardTitle className="font-heading text-h3 leading-snug [overflow-wrap:anywhere]">{requestTitle(request)}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-base">
        <RequestFacts request={request} />
        {request.dietaryNotes && <RequestNotes notes={request.dietaryNotes} />}
        {showsContact(request, contact) && <RequestContactBlock contact={contact} />}
      </CardContent>
      {footer && <CardFooter className="mt-auto border-t border-border pt-4">{footer}</CardFooter>}
    </Card>
  )
}
