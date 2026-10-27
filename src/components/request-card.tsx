import { CircleCheck, Clock, Mail, MapPin, Users } from "lucide-react"

import { CategoryBadge } from "@/components/category-badge"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { FoodRequest } from "@/db/schema"
import { formatWindow } from "@/lib/chicago-time"
import { copyFor, fill, type Copy } from "@/lib/copy"
import { currentLang, getCopy } from "@/lib/i18n-server"
import { neighborhoodLabel } from "@/lib/neighborhoods"
import { cn } from "@/lib/utils"

// The request card and the parts it shares with RequestDetailLayout (badges, key facts,
// notes, contact block), so the Needs Board and a future detail page never drift apart.

/** The other side of an offer: who they are and, when allowed, their account email. */
export type RequestContact = {
  /** "Supported by" or "Posted by", in the page's language. */
  label: string
  name: string
  /** Only set by the server for the poster and the supporting organization. */
  email: string | null
}

/** "40 people", in the page's language. */
export const peopleText = (count: number, c: Copy) =>
  `${count} ${count === 1 ? c.REQUEST_COPY.person : c.REQUEST_COPY.people}`

/** "10 winter coats for 40 people": the request's title everywhere it appears. */
export function requestTitle(request: Pick<FoodRequest, "items" | "peopleCount">, c: Copy) {
  return fill(c.REQUEST_COPY.title, { items: request.items, people: peopleText(request.peopleCount, c) })
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
export async function RequestFacts({
  request,
  withPeople = false,
  className,
}: {
  request: FoodRequest
  withPeople?: boolean
  className?: string
}) {
  const lang = await currentLang()
  const c = copyFor(lang)
  const facts = [
    ...(withPeople ? [{ Icon: Users, label: c.REQUEST_COPY.peopleLabel, value: peopleText(request.peopleCount, c) }] : []),
    { Icon: MapPin, label: c.REQUEST_COPY.where, value: neighborhoodLabel(request.neighborhood) },
    { Icon: Clock, label: c.REQUEST_COPY.when, value: formatWindow(request.windowStart, request.windowEnd, lang) },
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

export async function RequestNotes({ notes }: { notes: string }) {
  const c = await getCopy()
  return (
    <p className="text-muted-foreground [overflow-wrap:anywhere]">
      <span className="font-medium text-foreground">{c.REQUEST_COPY.notes}: </span>
      {notes}
    </p>
  )
}

/**
 * Who is on the other side of the handoff, with their email when the server allowed it,
 * on a quiet panel so it reads as the next step.
 */
export async function RequestContactBlock({ contact }: { contact: RequestContact }) {
  const c = await getCopy()
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
            aria-label={`${c.CONTACT_COPY.emailLabel} ${contact.name}: ${contact.email}`}
            className="inline-flex min-h-tap items-center gap-2 self-start rounded-md font-medium text-primary-text underline underline-offset-4 outline-none [overflow-wrap:anywhere] hover:no-underline focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <Mail aria-hidden="true" className="size-4 shrink-0" />
            {/* Wrap after the @ on narrow screens; break anywhere only if still too long. */}
            <span>
              {contact.email.split("@")[0]}@<wbr />
              {contact.email.split("@").slice(1).join("@")}
            </span>
          </a>
          <p className="text-sm text-muted-foreground">{c.CONTACT_COPY.note}</p>
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
export async function RequestCard({
  request,
  contact,
  footer,
  className,
}: {
  request: FoodRequest
  /** Shown on In Progress and Fulfilled requests to the two people involved. */
  contact?: RequestContact
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("h-full gap-4", className)}>
      <CardHeader className="gap-3">
        <RequestBadges request={request} />
        <CardTitle className="font-heading text-h3 leading-snug [overflow-wrap:anywhere]">{requestTitle(request, await getCopy())}</CardTitle>
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
