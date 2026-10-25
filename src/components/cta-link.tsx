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
 * A homepage call to action: a 52px link button with an arrow, and its help text below
 * (linked with aria-describedby). Motion is cosmetic: hover lift and arrow nudge only, and
 * none with reduced motion.
 */
export function CtaLink({
  id,
  href,
  label,
  help,
  variant,
  className,
}: {
  id: string
  href: string
  label: string
  help: string
  variant: keyof typeof VARIANTS
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Link
        href={href}
        aria-describedby={`${id}-help`}
        className={cn(
          "group inline-flex h-13 items-center justify-center gap-3 rounded-lg px-6 text-base font-semibold outline-none",
          "transition-[translate,box-shadow,background-color] duration-(--duration-base) ease-(--ease-brand) motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          VARIANTS[variant]
        )}
      >
        {label}
        <ArrowRight
          aria-hidden="true"
          className="size-5 transition-transform duration-(--duration-base) ease-(--ease-brand) group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        />
      </Link>
      <p id={`${id}-help`} className="text-sm text-muted-foreground">
        {help}
      </p>
    </div>
  )
}
