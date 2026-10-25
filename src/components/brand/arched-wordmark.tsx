import { cn } from "@/lib/utils"

// Geometry in viewBox units (120 x 36). Rendered at 104px wide on the smallest phones
// (under 360px), 120px on other phones, and 150px from 640px up, so 1 unit = 0.87px to 1.25px. A quadratic curve's middle sits at
// (y0 + 2*yControl + y1) / 4, so ends at y=24 with the control at y=12 put the middle at
// y=18: a 6-unit rise, i.e. 6px (mobile) to 7.5px (desktop).
const TEXT_ARC = "M 6 24 Q 60 12 114 24"
// Gold "bridge span": the same curve, 5 units lower.
const SPAN_ARC = "M 4 29 Q 60 17 116 29"
// Only one wordmark renders per page (the site header), so a fixed id is safe.
const ARC_ID = "bridge-wordmark-arc"

/**
 * "The Bridge" set on a gentle upward arc, with a thin gold span under it.
 * Decorative: the surrounding link carries the accessible name, so this is aria-hidden.
 * Text uses currentColor; set the color (e.g. text-primary-text) with a class.
 */
export function ArchedWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 36"
      aria-hidden="true"
      focusable="false"
      className={cn("block h-auto w-[104px] max-w-full overflow-visible min-[360px]:w-[120px] sm:w-[150px]", className)}
    >
      <path id={ARC_ID} d={TEXT_ARC} fill="none" />
      <path
        d={SPAN_ARC}
        fill="none"
        stroke="var(--gold)"
        strokeOpacity={0.8}
        strokeWidth={1.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <text className="font-heading" fill="currentColor" fontSize="18" fontWeight="700" textAnchor="middle">
        <textPath href={`#${ARC_ID}`} startOffset="50%">
          The Bridge
        </textPath>
      </text>
    </svg>
  )
}
