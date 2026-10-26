import { Badge } from "@/components/ui/badge"
import type { FoodRequest } from "@/db/schema"
import { getCopy } from "@/lib/i18n-server"
import { cn } from "@/lib/utils"

const STYLES: Record<FoodRequest["status"], string> = {
  open: "bg-status-open text-status-open-foreground",
  claimed: "bg-status-claimed text-status-claimed-foreground",
  delivered: "bg-status-delivered text-status-delivered-foreground",
  cancelled: "bg-status-cancelled text-status-cancelled-foreground",
}

export async function StatusBadge({ status }: { status: FoodRequest["status"] }) {
  const c = await getCopy()
  return (
    <Badge variant="outline" className={cn("border-transparent text-sm", STYLES[status])}>
      {c.LABELS.status[status]}
    </Badge>
  )
}
