import { cn } from "@/lib/utils"

/** Shown where a list has nothing in it yet: a small gold arch, the message, and an optional action. */
export function EmptyState({
  children,
  action,
  className,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-10 text-center text-muted-foreground shadow-sm",
        className
      )}
    >
      <ArchMark />
      <p className="max-w-md">{children}</p>
      {action}
    </div>
  )
}

/**
 * The brand arch as a small static mark (decorative). A single gold rather than the logo's
 * gradient: at this size the gradient doesn't show, and several empty states can share a page
 * without duplicate gradient ids.
 */
function ArchMark() {
  return (
    <svg viewBox="0 0 64 16" aria-hidden="true" focusable="false" className="h-4 w-16">
      <path d="M 2 14 Q 32 -2 62 14" fill="none" stroke="var(--arch-3)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
