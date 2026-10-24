import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { FoodRequest } from "@/db/schema"
import { formatWindow } from "@/lib/chicago-time"
import { neighborhoodLabel } from "@/lib/neighborhoods"

export function RequestCard({
  request,
  claimedByName,
  footer,
}: {
  request: FoodRequest
  /** Shown to outreach workers on claimed and delivered requests. */
  claimedByName?: string
  footer?: React.ReactNode
}) {
  const showClaimer =
    claimedByName && (request.status === "claimed" || request.status === "delivered")

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
        <p>
          <span className="font-medium">Where: </span>
          {neighborhoodLabel(request.neighborhood)}
        </p>
        <p>
          <span className="font-medium">When: </span>
          {formatWindow(request.windowStart, request.windowEnd)}
        </p>
        {showClaimer && (
          <p>
            <span className="font-medium">Claimed by </span>
            {claimedByName}
          </p>
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
