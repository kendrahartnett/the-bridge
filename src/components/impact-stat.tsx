import { Card } from "@/components/ui/card"
import { NumberTicker } from "@/components/ui/number-ticker"

/** A dashboard number with its label: the Card "stat" variant, the number in the heading face. */
export function ImpactStat({ value, label }: { value: number; label: string }) {
  return (
    <Card variant="stat">
      <p className="font-heading text-h2 font-bold">
        <NumberTicker value={value} className="text-primary-text" />
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  )
}
