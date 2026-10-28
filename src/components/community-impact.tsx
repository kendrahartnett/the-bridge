import { Card } from "@/components/ui/card"
import { NumberTicker } from "@/components/ui/number-ticker"
import { SectionHeader } from "@/components/section-header"
import { db } from "@/db"
import { getCopy } from "@/lib/i18n-server"
import { getCommunityImpact } from "@/lib/request-rules"

/** Shared public and dashboard view of the current aggregate request totals. */
export async function CommunityImpact({ variant = "home" }: { variant?: "home" | "dashboard" }) {
  const { COMMUNITY_IMPACT_COPY: copy } = await getCopy()
  const heading = variant === "dashboard" ? copy.dashboardHeading : copy.homeHeading
  let totals
  try {
    totals = await getCommunityImpact(db)
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && /^[A-Z0-9]{5}$/.test(error.code)
        ? error.code
        : "unknown"
    console.error(`[community-impact] aggregate unavailable code=${code}`)
    return (
      <section aria-labelledby="community-impact-heading" className="border-y border-border bg-background-deep">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <SectionHeader id="community-impact-heading" title={heading} description={copy.unavailable} />
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="community-impact-heading" className="mt-8 rounded-[0.5rem] border border-border bg-background-deep">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <SectionHeader id="community-impact-heading" title={heading} description={copy.description} />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric value={totals.estimatedPeopleReached} label={copy.estimatedPeopleReached} accent />
          <Metric value={totals.needsFulfilled} label={copy.needsFulfilled} />
          <Metric value={totals.openRequests} label={copy.openRequests} />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{copy.explanation}</p>
      </div>
    </section>
  )
}

function Metric({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <Card variant="stat" className={`rounded-[0.5rem] border-primary/35 ${accent ? "border-l-4 border-l-gold" : ""}`}>
      <p className="font-heading text-h2 font-bold">
        <NumberTicker value={value} className="text-primary-text" />
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  )
}
