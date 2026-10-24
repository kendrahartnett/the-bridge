import { Badge } from "@/components/ui/badge"
import type { FoodRequest } from "@/db/schema"
import { STATUS_LABELS } from "@/lib/labels"
import { cn } from "@/lib/utils"

const STYLES: Record<FoodRequest["status"], { label: string; className: string }> = {
  open: { label: STATUS_LABELS.open, className: "bg-status-open text-status-open-foreground" },
  claimed: {
    label: STATUS_LABELS.claimed,
    className: "bg-status-claimed text-status-claimed-foreground",
  },
  delivered: {
    label: STATUS_LABELS.delivered,
    className: "bg-status-delivered text-status-delivered-foreground",
  },
  cancelled: {
    label: STATUS_LABELS.cancelled,
    className: "bg-status-cancelled text-status-cancelled-foreground",
  },
}

export function StatusBadge({ status }: { status: FoodRequest["status"] }) {
  const s = STYLES[status]
  return (
    <Badge variant="outline" className={cn("border-transparent text-sm", s.className)}>
      {s.label}
    </Badge>
  )
}
