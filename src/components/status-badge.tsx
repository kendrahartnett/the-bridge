import { Badge } from "@/components/ui/badge"
import type { FoodRequest } from "@/db/schema"
import { cn } from "@/lib/utils"

const STYLES: Record<FoodRequest["status"], { label: string; className: string }> = {
  open: { label: "Open", className: "bg-status-open text-status-open-foreground" },
  claimed: {
    label: "Claimed",
    className: "bg-status-claimed text-status-claimed-foreground",
  },
  delivered: {
    label: "Delivered",
    className: "bg-status-delivered text-status-delivered-foreground",
  },
  cancelled: {
    label: "Cancelled",
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
