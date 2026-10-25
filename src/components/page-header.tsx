import Link from "next/link"

import { cn } from "@/lib/utils"

/**
 * The top of an app page: an optional back link, an optional eyebrow, the page title (the
 * only h1), an optional intro, and an optional actions area that wraps below on phones.
 */
export function PageHeader({
  back,
  eyebrow,
  title,
  intro,
  actions,
  className,
}: {
  back?: { href: string; label: string }
  eyebrow?: React.ReactNode
  title: React.ReactNode
  intro?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn("flex flex-col gap-2", className)}>
      {back && (
        <Link
          href={back.href}
          className="inline-flex min-h-tap items-center self-start text-sm font-medium text-primary-text underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow && <p className="eyebrow break-words text-muted-foreground">{eyebrow}</p>}
          <h1 className="font-heading text-h1 font-bold [overflow-wrap:anywhere]">{title}</h1>
          {intro && <p className="max-w-2xl text-muted-foreground">{intro}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  )
}
