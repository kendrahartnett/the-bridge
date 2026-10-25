import { cn } from "@/lib/utils"

/** A section title (h2) with an optional description and actions area. */
export function SectionHeader({
  id,
  title,
  description,
  actions,
  className,
}: {
  id?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="font-heading text-h2 font-bold">
          {title}
        </h2>
        {actions}
      </div>
      {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
    </div>
  )
}
