import Image from "next/image"

import { CtaLink } from "@/components/cta-link"
import { HeroAtmosphere } from "@/components/hero-atmosphere"
import { SectionHeader } from "@/components/section-header"
import { SiteHeader } from "@/components/site-header"
import { BlurFade } from "@/components/ui/blur-fade"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BRIDGE_IMAGE,
  FOOTER_TEXT,
  HERO_BADGE,
  HERO_DESCRIPTION,
  HERO_HEADLINE,
  HERO_IMAGE,
  HERO_LEAD,
  HOW_IT_WORKS_HEADING,
  JOURNEY,
  MISSION,
  MISSION_HEADING,
  ROLE_CTAS,
  WHAT_IS_HEADING,
  WHAT_IS_PARAGRAPHS,
} from "@/lib/copy"
import bridgeArt from "../../public/images/new-bridge.png"
import heroArt from "../../public/images/hero-landing-image.png"

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* The hero, stacked and centered: the headline artwork (the page's h1), the line and
            description, then the two calls to action. */}
        <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
          <HeroAtmosphere />
          {/* A small gap under the header: 20px on phones, 24px from 640px. Wider than the other
              sections so the artwork can reach about 1200px. */}
          <div className="mx-auto flex w-full max-w-[78rem] flex-col items-center px-4 pt-5 pb-14 text-center sm:px-6 sm:pt-6 lg:pb-16">
            {/* The headline artwork, exactly as designed (transparent, the same in both themes),
                is the h1, so its alt text ("Bridging the Gap.") is the headline for screen
                readers and search engines. Full container width on phones and tablets; from
                1024px as wide as the page allows (at most 1200px), with its height capped by
                the screen height (100svh - 17rem) so it fills the hero down to about where the
                lead line used to sit. The import's width and height reserve its space, so
                nothing shifts while it loads. */}
            <h1
              id="hero-title"
              className="hero-photo relative w-full lg:w-[min(100%,1200px,calc((100svh-17rem)*1.777))]"
            >
              {/* A very faint blue glow behind the artwork, a little larger than it, to lift it
                  from the page. Decorative and still; the section clips it. */}
              <span aria-hidden="true" className="hero-glow pointer-events-none absolute -inset-[8%] -z-10" />
              <Image
                src={heroArt}
                alt={HERO_IMAGE.alt}
                sizes="(min-width: 1024px) 1200px, 100vw"
                loading="eager"
                fetchPriority="high"
                className="h-auto w-full"
              />
            </h1>
            <p className="hero-rise font-heading mt-4 text-display-sub font-semibold text-balance text-primary-text [animation-delay:200ms]">
              {HERO_HEADLINE[1]}
            </p>
            <p className="hero-rise mt-3 font-semibold tracking-wide text-foreground [animation-delay:280ms]">
              {HERO_LEAD}
            </p>
            <p className="hero-fade mt-2 max-w-[38rem] text-lead text-pretty text-muted-foreground [animation-delay:280ms]">
              {HERO_DESCRIPTION}
            </p>
            {/* Side by side and centered from 640px, stacked (full width) below. */}
            <div className="hero-rise mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center [animation-delay:360ms]">
              <CtaLink href="/sign-in?role=outreach" variant="primary" className="sm:w-56" {...ROLE_CTAS.outreach} />
              <CtaLink href="/sign-in?role=donor" variant="secondary" className="sm:w-56" {...ROLE_CTAS.donor} />
            </div>
          </div>
        </section>

        <section aria-labelledby="journey">
          <BlurFade inView className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <SectionHeader id="journey" title={HOW_IT_WORKS_HEADING} />
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {JOURNEY.map((step, i) => (
                <li key={step.label}>
                  <Card variant="interactive" className="h-full gap-3 p-5">
                    <CardHeader className="gap-3 px-0">
                      <span
                        aria-hidden="true"
                        className="inline-flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary-text"
                      >
                        {i + 1}
                      </span>
                      <CardTitle className="text-h3">{step.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 text-muted-foreground">{step.description}</CardContent>
                  </Card>
                </li>
              ))}
            </ol>
            {/* The closing line under the steps: always one line (see hero-eyebrow in
                globals.css); the gold line before it shows from 640px. */}
            <p className="hero-eyebrow mt-10 flex items-center justify-center gap-3 text-foreground">
              <span aria-hidden="true" className="hidden h-px w-6 shrink-0 bg-gold sm:block" />
              {HERO_BADGE}
            </p>
          </BlurFade>
        </section>

        <section aria-labelledby="what-is" className="border-t border-border">
          <BlurFade inView className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <SectionHeader id="what-is" title={WHAT_IS_HEADING} />
            <Card className="mt-6 py-5 sm:py-7">
              <CardContent className="flex flex-col gap-4 px-5 text-base leading-relaxed sm:px-7">
                {WHAT_IS_PARAGRAPHS.map((text) => (
                  <p key={text.slice(0, 24)}>{text}</p>
                ))}
              </CardContent>
            </Card>
          </BlurFade>
        </section>

        {/* An illustration between the two sections: centered, up to 720px wide, full
            container width on phones, loaded only when it comes near the screen. */}
        <div className="border-t border-border">
          <BlurFade inView className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <Image
              src={bridgeArt}
              alt={BRIDGE_IMAGE.alt}
              sizes="(min-width: 768px) 720px, 100vw"
              loading="lazy"
              className="mx-auto h-auto w-full max-w-[720px]"
            />
          </BlurFade>
        </div>

        <section aria-labelledby="mission" className="border-t border-border">
          <BlurFade inView className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <SectionHeader id="mission" title={MISSION_HEADING} />
            <Card className="mt-6 border-l-4 border-l-gold py-5 sm:py-7">
              <CardContent className="px-5 text-lead leading-relaxed sm:px-7">{MISSION}</CardContent>
            </Card>
          </BlurFade>
        </section>
      </main>
      <footer className="border-t border-border">
        <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted-foreground sm:px-6">{FOOTER_TEXT}</p>
      </footer>
    </>
  )
}
