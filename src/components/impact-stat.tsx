import { NumberTicker } from "@/components/ui/number-ticker"

export function ImpactStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-3xl font-semibold">
        <NumberTicker value={value} className="text-primary" />
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
