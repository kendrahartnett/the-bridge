import { Mail } from "lucide-react"

import { CategoryBadge } from "@/components/category-badge"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { FoodRequest } from "@/db/schema"
import { formatWindow } from "@/lib/chicago-time"
import { CONTACT_COPY } from "@/lib/copy"
import { neighborhoodLabel } from "@/lib/neighborhoods"

/** The other side of an offer: who they are and, when allowed, their account email. */
export type RequestContact = {
  label: typeof CONTACT_COPY.supportedBy | typeof CONTACT_COPY.postedBy
  name: string
  /** Only set by the server for the poster and the supporting organization. */
  email: string | null
}

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
  const showContact = contact && (request.status === "claimed" || request.status === "delivered")

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <CardTitle className="text-lg leading-snug">
          {request.items} for {request.peopleCount}{" "}
          {request.peopleCount === 1 ? "person" : "people"}
        </CardTitle>
        <StatusBadge status={request.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-base">
        <CategoryBadge category={request.category} />
        <p>
          <span className="font-medium">Where: </span>
          {neighborhoodLabel(request.neighborhood)}
        </p>
        <p>
          <span className="font-medium">When: </span>
          {formatWindow(request.windowStart, request.windowEnd)}
        </p>
        {showContact && (
          <div data-contact className="flex flex-col gap-1">
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
        )}
        {request.dietaryNotes && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Notes: </span>
            {request.dietaryNotes}
          </p>
        )}
      </CardContent>
      {footer && <CardFooter className="mt-auto">{footer}</CardFooter>}
    </Card>
  )
}
