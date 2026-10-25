import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// No red in the palette: errors use full-strength text, a strong border, an icon, and
// wording; warnings use the gold fill with navy text (6.05:1); success uses blue.
const TONES = {
  info: { className: "border-border bg-muted/60 text-foreground", Icon: Info, iconClass: "text-primary-text" },
  success: {
    className: "border-primary/50 bg-primary/10 text-foreground",
    Icon: CircleCheck,
    iconClass: "text-primary-text",
  },
  warning: { className: "border-transparent bg-warning text-warning-foreground", Icon: TriangleAlert, iconClass: "" },
  error: {
    className: "border-2 border-foreground bg-card font-medium text-foreground",
    Icon: CircleAlert,
    iconClass: "",
  },
} as const satisfies Record<string, { className: string; Icon: LucideIcon; iconClass: string }>

/**
 * A message box: banners, the privacy notice, form errors. `label` names it for screen
 * readers (rendered as a labelled section, or `as="aside"` for side information); `alert`
 * announces it as soon as it appears.
 */
export function Notice({
  tone = "info",
  icon,
  label,
  as,
  alert = false,
  className,
  children,
}: {
  tone?: keyof typeof TONES
  icon?: LucideIcon
  label?: string
  as?: "aside" | "section" | "div"
  alert?: boolean
  className?: string
  children: React.ReactNode
}) {
  const t = TONES[tone]
  const Icon = icon ?? t.Icon
  const Tag = as ?? (label ? "section" : "div")
  return (
    <Tag
      aria-label={label}
      role={alert ? "alert" : undefined}
      className={cn("flex items-start gap-3 rounded-xl border p-4 text-base", t.className, className)}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", t.iconClass)} />
      <div className="min-w-0 [&>p+p]:mt-2">{children}</div>
    </Tag>
  )
}
