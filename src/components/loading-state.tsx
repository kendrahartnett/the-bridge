import { ArchLoader } from "@/components/brand/arch-loader"
import { cn } from "@/lib/utils"

/**
 * What a page shows while its content streams in: the arch loader and a short line of
 * text. role="status" announces the text once; the arch is decorative.
 */
export function LoadingState({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="status" className={cn("flex items-center gap-3 text-muted-foreground", className)}>
      <ArchLoader />
      {children}
    </p>
  )
}
