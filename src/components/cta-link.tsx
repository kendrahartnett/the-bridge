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
 * A homepage call to action: a 48px link button with an arrow. Motion is cosmetic: hover
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
      className={cn(
        "group inline-flex h-12 items-center justify-center gap-2.5 rounded-lg px-5 text-base font-semibold outline-none",
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
