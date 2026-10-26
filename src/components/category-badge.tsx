import { Badge } from "@/components/ui/badge"
import type { Category } from "@/lib/labels"
import { getCopy } from "@/lib/i18n-server"

// Type of support on a request card. Outline style in the blue text token, so it reads
// as a label rather than competing with the filled status badge.
export async function CategoryBadge({ category }: { category: Category }) {
  const c = await getCopy()
  return (
    <Badge variant="outline" className="border-primary/40 text-sm text-primary-text">
      {c.LABELS.category[category]}
    </Badge>
  )
}
