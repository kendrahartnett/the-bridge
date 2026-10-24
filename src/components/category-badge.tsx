import { Badge } from "@/components/ui/badge"
import { CATEGORY_LABELS, type Category } from "@/lib/labels"

// Type of support on a request card. Outline style in the blue text token, so it reads
// as a label rather than competing with the filled status badge.
export function CategoryBadge({ category }: { category: Category }) {
  return (
    <Badge variant="outline" className="border-primary/40 text-sm text-primary-text">
      {CATEGORY_LABELS[category]}
    </Badge>
  )
}
