import Link from "next/link"

import { HeroBackground } from "@/components/hero-background"
import { SiteHeader } from "@/components/site-header"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MISSION } from "@/lib/copy"

// Exact wording; do not edit without sign-off.
const JOURNEY = [
  { label: "Request", description: "An outreach worker describes a need." },
  { label: "Connect", description: "A donor claims it." },
  { label: "Deliver", description: "Food reaches the people who need it." },
  { label: "Support", description: "The outreach worker and the person connect to care." },
  { label: "Rebuild", description: "Work toward lasting stability." },
] as const

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Dark-first hero: `dark` scopes the dark tokens to this section in both themes. */}
        <section className="dark relative isolate flex min-h-[78svh] items-center overflow-hidden bg-background px-4 py-20 text-foreground sm:py-28">
          <HeroBackground />
          <BlurFade className="mx-auto w-full max-w-3xl">
            <div className="flex flex-col items-center text-center">
              <p className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                Chicago · Food first
              </p>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
                The Bridge
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-pretty sm:text-xl">{MISSION}</p>
              <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="sm:min-w-56">
                  <Link href="/sign-in?role=outreach">I&apos;m an outreach worker</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary bg-background/60 text-primary-text backdrop-blur-sm hover:bg-primary/10 hover:text-primary-text sm:min-w-56"
                >
                  <Link href="/sign-in?role=donor">I want to donate food</Link>
                </Button>
              </div>
            </div>
          </BlurFade>
        </section>

        <section aria-labelledby="journey" className="border-t border-border">
          <BlurFade inView className="mx-auto max-w-5xl px-4 py-20 sm:py-24">
            <h2 id="journey" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {JOURNEY.map((step, i) => (
                <li key={step.label}>
                  <Card className="h-full border-primary/20 bg-surface/70 backdrop-blur-md">
                    <CardHeader>
                      <span
                        aria-hidden="true"
                        className="inline-flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary-text"
                      >
                        {i + 1}
                      </span>
                      <CardTitle className="text-lg">{step.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground">
                      {step.description}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
            <p className="mt-10 text-center text-lg font-medium">
              Every connection is a step forward.
            </p>
          </BlurFade>
        </section>

        <section aria-labelledby="what-is" className="border-t border-border bg-card">
          <BlurFade inView className="mx-auto max-w-2xl px-4 py-20 sm:py-24">
            <h2 id="what-is" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              What is Bridge?
            </h2>
            <div className="mt-6 flex flex-col gap-4 text-lg leading-relaxed">
              <p>
                Bridge connects outreach workers with people who have food to give. Outreach
                workers post what they need, how many people, and which neighborhood. Donors
                see those requests and bring food.
              </p>
              <p>
                A meal is often the first step. When people get food from the same friendly
                faces again and again, trust grows. That trust makes it easier to talk about
                other help, like a doctor visit, an ID, or a place to live.
              </p>
              <p>
                We protect the people we serve. Bridge never asks for their names, addresses,
                or where they stay. Requests only show the neighborhood.
              </p>
            </div>
          </BlurFade>
        </section>
      </main>
      <footer className="border-t border-border">
        <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted-foreground">
          The Bridge · Chicago
        </p>
      </footer>
    </>
  )
}
