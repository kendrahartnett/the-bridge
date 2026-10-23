import Link from "next/link"

import { HeroBackground } from "@/components/hero-background"
import { SiteHeader } from "@/components/site-header"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HERO_LINE } from "@/lib/copy"

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
        {/* One wave layer behind the hero and the journey steps. `dark` scopes the dark
            tokens here, so this area stays dark even when the rest of the page is light. */}
        <div className="dark relative isolate overflow-hidden bg-background text-foreground">
          <HeroBackground />
          <section className="px-4 py-12 sm:py-16">
            <BlurFade className="mx-auto w-full max-w-3xl">
              <div className="flex flex-col items-center text-center">
                <p className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                  Chicago · Food first
                </p>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
                  The Bridge
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty sm:text-lg">{HERO_LINE}</p>
                <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:flex-row">
                  <Button asChild className="px-4 text-sm sm:min-w-48">
                    <Link href="/sign-in?role=outreach">I&apos;m an outreach worker</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-primary bg-background/60 px-4 text-sm text-primary-text backdrop-blur-sm hover:bg-primary/10 hover:text-primary-text sm:min-w-48"
                  >
                    <Link href="/sign-in?role=donor">I want to donate food</Link>
                  </Button>
                </div>
              </div>
            </BlurFade>
          </section>

          <section aria-labelledby="journey">
            <BlurFade inView className="mx-auto max-w-5xl px-4 py-10">
              <h2 id="journey" className="text-xl font-semibold tracking-tight sm:text-2xl">
                How it works
              </h2>
              <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {JOURNEY.map((step, i) => (
                  <li key={step.label}>
                    <Card className="h-full gap-3 border-primary/20 bg-surface/70 p-4 backdrop-blur-md">
                      <CardHeader className="gap-2 px-0">
                        <span
                          aria-hidden="true"
                          className="inline-flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary-text"
                        >
                          {i + 1}
                        </span>
                        <CardTitle className="text-base">{step.label}</CardTitle>
                      </CardHeader>
                      <CardContent className="px-0 text-sm text-muted-foreground">
                        {step.description}
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ol>
              {/* Frosted backing keeps this line readable where the waves are brightest. */}
              <p className="mt-6 text-center">
                <span className="inline-block rounded-full bg-background/80 px-4 py-2 text-base font-medium backdrop-blur-sm">
                  Every connection is a step forward.
                </span>
              </p>
            </BlurFade>
          </section>
        </div>

        <section aria-labelledby="what-is" className="border-t border-border bg-card">
          <BlurFade inView className="mx-auto max-w-2xl px-4 py-10">
            <h2 id="what-is" className="text-xl font-semibold tracking-tight sm:text-2xl">
              What is Bridge?
            </h2>
            <div className="mt-4 flex flex-col gap-3 text-base leading-relaxed">
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
