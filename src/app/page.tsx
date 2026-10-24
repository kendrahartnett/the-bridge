import { ClipboardPlus, HandHeart } from "lucide-react"
import Link from "next/link"

import { HeroGlows } from "@/components/hero-glows"
import { SiteHeader } from "@/components/site-header"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  HERO_BADGE,
  HERO_HEADLINE,
  HERO_LINE,
  MISSION,
  ROLE_CTAS,
  WHAT_IS_HEADING,
  WHAT_IS_PARAGRAPHS,
} from "@/lib/copy"

// Exact wording; do not edit without sign-off.
const JOURNEY = [
  { label: "Request", description: "An outreach worker describes a need." },
  { label: "Connect", description: "An organization offers support." },
  { label: "Deliver", description: "Resources reach the people who need them." },
  { label: "Support", description: "The outreach worker and the person connect to care." },
  { label: "Rebuild", description: "Work toward lasting stability." },
] as const

// Homepage calls to action. Routes are unchanged: each still opens sign-in with the
// matching role preselected.
const CTAS = [
  {
    id: "post",
    href: "/sign-in?role=outreach",
    ...ROLE_CTAS.outreach,
    Icon: ClipboardPlus,
    className:
      "bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_color-mix(in_srgb,var(--primary)_60%,transparent)] hover:bg-primary/90",
  },
  {
    id: "respond",
    href: "/sign-in?role=donor",
    ...ROLE_CTAS.donor,
    Icon: HandHeart,
    className:
      "border border-primary bg-background/50 text-primary-text backdrop-blur-md hover:bg-primary/10 hover:text-primary-text",
  },
] as const

// Glass card: translucent page background, blur, hairline border, 12px radius, the soft card
// shadow, plus a light-blue outer glow (--primary-text at 10% light / 20% dark).
const GLASS =
  "border-black/10 bg-background/50 backdrop-blur-md dark:border-white/10 " +
  "shadow-[0_0_24px_color-mix(in_srgb,var(--primary-text)_10%,transparent),var(--soft-shadow-sm)] " +
  "dark:shadow-[0_0_24px_color-mix(in_srgb,var(--primary-text)_20%,transparent),var(--soft-shadow-sm)]"

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pt-6 pb-12 sm:pt-8 sm:pb-16">
          <HeroGlows />
          <BlurFade className="mx-auto w-full max-w-5xl">
            <div className="flex flex-col items-center text-center">
              {/* Metallic gold badge: gradient over a solid gold fallback; navy text (5.24:1 on the darkest stop). */}
              <p className="inline-flex items-center rounded-full bg-gold bg-(image:--gold-gradient) px-3 py-1 text-xs font-semibold tracking-wide text-gold-foreground uppercase shadow-sm sm:tracking-widest">
                {HERO_BADGE}
              </p>
              <h1 className="font-heading mt-5 max-w-5xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
                <span className="block font-extrabold text-foreground">{HERO_HEADLINE[0]}</span>
                {/* One size step below line 1 at every breakpoint. */}
                <span className="block text-3xl text-primary-text sm:text-4xl lg:text-5xl">
                  {HERO_HEADLINE[1]}
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-foreground sm:text-lg dark:text-muted-foreground">
                {HERO_LINE}
              </p>
              <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-5 sm:flex-row sm:items-start">
                {CTAS.map(({ id, href, label, help, Icon, className }) => (
                  <div key={id} className="flex flex-col items-center gap-2 sm:w-64">
                    <Button
                      asChild
                      className={`h-12 w-full rounded-lg px-6 text-base font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
                    >
                      <Link href={href} aria-describedby={`cta-${id}-help`}>
                        <Icon aria-hidden="true" className="size-5" />
                        {label}
                      </Link>
                    </Button>
                    <p id={`cta-${id}-help`} className="text-center text-sm text-foreground dark:text-muted-foreground">
                      {help}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>
        </section>

        <section aria-labelledby="journey" className="overflow-x-clip">
          <BlurFade inView className="mx-auto max-w-5xl px-4 py-10">
            <h2 id="journey" className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
              How it works
            </h2>
            <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {JOURNEY.map((step, i) => (
                <li key={step.label}>
                  {/* Grows 1.1x on hover (mouse/trackpad only; Tailwind's hover: skips touch screens).
                      The hovered card sits on top and turns nearly opaque so overlapped
                      neighbors don't show through. Reduced motion: no animation. */}
                  <Card
                    className={`relative h-full gap-3 p-4 ${GLASS} transition-transform duration-200 ease-out hover:z-10 hover:scale-110 hover:bg-background/95 motion-reduce:transition-none`}
                  >
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
          </BlurFade>
        </section>

        <section aria-labelledby="what-is" className="border-t border-border">
          <BlurFade inView className="mx-auto max-w-2xl px-4 py-10">
            <h2 id="what-is" className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
              {WHAT_IS_HEADING}
            </h2>
            <Card className={`mt-4 ${GLASS}`}>
              <CardContent className="flex max-w-2xl flex-col gap-4 text-base leading-relaxed">
                {WHAT_IS_PARAGRAPHS.map((text) => (
                  <p key={text.slice(0, 24)}>{text}</p>
                ))}
              </CardContent>
            </Card>
          </BlurFade>
        </section>

        <section aria-labelledby="mission" className="border-t border-border">
          <BlurFade inView className="mx-auto max-w-2xl px-4 py-10">
            <h2 id="mission" className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
              Mission Statement
            </h2>
            <Card className={`mt-4 ${GLASS}`}>
              <CardContent className="text-base leading-relaxed">{MISSION}</CardContent>
            </Card>
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
