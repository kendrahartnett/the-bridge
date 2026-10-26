import Link from "next/link"

import { cn } from "@/lib/utils"

/**
 * The transition delay for each letter on hover, as a multiple of 0.045s: the design's own
 * sequence (1, 3, 4, 5, then the letter's position), carried on for longer labels.
 */
const letterDelay = (position: number) => (position === 1 ? 1 : position <= 4 ? position + 1 : position)

/**
 * A homepage call to action (the .cta-letters design from Uiverse.io by barisdogansutcu): a
 * 50px blue button with a 7px base. At rest it shows the label; on hover (and keyboard
 * focus) the label drops away and its letters fall into place one after another. Screen
 * readers get the plain label (the letters are hidden from them).
 */
export function CtaLink({ href, label, className }: { href: string; label: string; className?: string }) {
  const text = label
  return (
    <Link href={href} aria-label={label} data-label={text} className={cn("cta-letters", className)}>
      {[...text].map((ch, i) => (
        <i
          key={i}
          aria-hidden="true"
          style={{ "--delay": letterDelay(i + 1) } as React.CSSProperties}
        >
          {ch === " " ? " " : ch}
        </i>
      ))}
    </Link>
  )
}
