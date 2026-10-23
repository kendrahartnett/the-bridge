import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { FoodRequest } from "@/db/schema"
import { formatWindow } from "@/lib/chicago-time"
import { neighborhoodLabel } from "@/lib/neighborhoods"

export function RequestCard({
  request,
  footer,
}: {
  request: FoodRequest
  footer?: React.ReactNode
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <CardTitle className="text-lg leading-snug">
          {request.foodType} for {request.peopleCount}{" "}
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
