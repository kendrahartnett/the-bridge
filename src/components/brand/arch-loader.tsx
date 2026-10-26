import { cn } from "@/lib/utils"

import { ARCH_CENTERLINE, ARCH_CENTERLINE_VIEWBOX, ARCH_STOPS } from "./arch"

/**
 * The brand's loading indicator: the logo's gold arch drawing itself across, over and over.
 * Decorative (aria-hidden): put it next to visible or screen-reader text in a role="status"
 * element. With reduced motion it's a still, complete arch.
 */
export function ArchLoader({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={ARCH_CENTERLINE_VIEWBOX}
      preserveAspectRatio="none"
      className={cn("h-3 w-10 shrink-0 overflow-visible", className)}
    >
      <defs>
        <linearGradient id="arch-loader-gold" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0">
          {ARCH_STOPS.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
      </defs>
      <path
        d={ARCH_CENTERLINE}
        pathLength={1}
        fill="none"
        stroke="url(#arch-loader-gold)"
        strokeWidth={3}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="arch-loop"
      />
    </svg>
  )
}
