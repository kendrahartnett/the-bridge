import { useId } from "react"

import { ARCH_CENTERLINE, ARCH_CENTERLINE_VIEWBOX, ARCH_STOPS } from "@/components/brand/arch"
import { cn } from "@/lib/utils"

/** Shown where a list has nothing in it yet: the logo's arch, the message, and an optional action. */
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
 * The logo's arch as a small mark (decorative), in its gold gradient. It draws itself in
 * once when shown; with reduced motion it's simply there. Each instance gets its own
 * gradient id, so several empty states can share a page.
 */
export function ArchMark({ className }: { className?: string }) {
  const id = `arch-mark${useId().replace(/[^\w-]/g, "")}`
  return (
    <svg
      viewBox={ARCH_CENTERLINE_VIEWBOX}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn("h-4 w-16 overflow-visible", className)}
    >
      <defs>
        <linearGradient id={id} gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0">
          {ARCH_STOPS.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
      </defs>
      <path
        d={ARCH_CENTERLINE}
        pathLength={1}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={3}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="arch-draw [animation-delay:150ms]"
      />
    </svg>
  )
}
