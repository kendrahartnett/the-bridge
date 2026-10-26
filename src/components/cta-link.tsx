import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

const VARIANTS = {
  // Blue fill; hover lifts 2px with the soft blue glow, press drops back without it.
  primary: "bg-primary text-primary-foreground hover:-translate-y-0.5 hover:glow-primary active:translate-y-0 active:shadow-none",
  // Blue outline; hover fills with 8% blue.
  secondary: "border border-primary text-primary-text hover:bg-primary/8",
} as const

/**
 * A homepage call to action: a slim 40px link button with an arrow and 8px corners (below the
 * usual 44px by design; marked data-compact-target so the layout audit holds it to the
 * 24px WCAG 2.2 AA minimum instead). Motion is cosmetic: hover
 * lift and arrow nudge only, and none with reduced motion.
 */
export function CtaLink({
  href,
  label,
  variant,
  className,
}: {
  href: string
  label: string
  variant: keyof typeof VARIANTS
  className?: string
}) {
  return (
    <Link
      href={href}
      data-compact-target
      className={cn(
        "group inline-flex h-10 items-center justify-center gap-2.5 rounded-[0.5rem] px-5 text-base font-semibold outline-none",
        "transition-[translate,box-shadow,background-color] duration-(--duration-base) ease-(--ease-brand) motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        VARIANTS[variant],
        className
      )}
    >
      {label}
      <ArrowRight
        aria-hidden="true"
        className="size-5 transition-transform duration-(--duration-base) ease-(--ease-brand) group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      />
    </Link>
  )
}
