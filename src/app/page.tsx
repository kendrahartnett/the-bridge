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
        <section className="relative isolate overflow-hidden px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <HeroBackground />
          {/* Semi-opaque panel keeps text readable over the moving waves. */}
          <div className="mx-auto flex max-w-3xl flex-col items-center rounded-xl bg-background/90 px-5 py-10 text-center shadow-sm backdrop-blur-sm sm:px-10 sm:py-14">
            <BlurFade delay={0.05}>
              <p className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                Chicago · Food first
              </p>
            </BlurFade>
            <BlurFade delay={0.15}>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                The Bridge
              </h1>
            </BlurFade>
            <BlurFade delay={0.25}>
              <p className="mt-6 text-lg leading-relaxed text-pretty sm:text-xl">{MISSION}</p>
            </BlurFade>
            <BlurFade delay={0.35} className="mt-10 w-full">
              <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="sm:min-w-56">
                  <Link href="/sign-in?role=outreach">I&apos;m an outreach worker</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary bg-transparent text-primary-text hover:bg-primary/10 hover:text-primary-text sm:min-w-56"
                >
                  <Link href="/sign-in?role=donor">I want to donate food</Link>
                </Button>
              </div>
            </BlurFade>
          </div>
        </section>

        <section aria-labelledby="journey" className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <BlurFade inView>
              <h2 id="journey" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                How it works
              </h2>
            </BlurFade>
            <BlurFade inView delay={0.1}>
              <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {JOURNEY.map((step, i) => (
                  <li key={step.label}>
                    <Card className="h-full">
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
              <p className="mt-8 text-center text-lg font-medium">
                Every connection is a step forward.
              </p>
            </BlurFade>
          </div>
        </section>

        <section aria-labelledby="what-is" className="border-t border-border bg-card">
          <div className="mx-auto max-w-2xl px-4 py-16">
            <BlurFade inView>
              <h2 id="what-is" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                What is Bridge?
              </h2>
            </BlurFade>
            <BlurFade inView delay={0.1}>
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
          </div>
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
