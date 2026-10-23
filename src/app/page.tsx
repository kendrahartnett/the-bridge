import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { DotPattern } from "@/components/ui/dot-pattern"
import { MISSION } from "@/lib/copy"
import { cn } from "@/lib/utils"

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden">
          <DotPattern
            width={22}
            height={22}
            cr={1.2}
            aria-hidden="true"
            className={cn(
              "-z-10 text-primary/25",
              "mask-[radial-gradient(520px_circle_at_center,white,transparent)]"
            )}
          />
          <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-16 pb-20 text-center sm:pt-24">
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
                  className="bg-accent text-accent-foreground hover:bg-accent/85 sm:min-w-56"
                >
                  <Link href="/sign-in?role=donor">I want to donate food</Link>
                </Button>
              </div>
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
