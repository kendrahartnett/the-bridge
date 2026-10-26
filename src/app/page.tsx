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
import heroArtDark from "../../public/images/hero-light-mode.png"
import heroArt from "../../public/images/hero-landing-image.png"

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* The hero, stacked and centered: the bridge illustration, the headline line (the
            page's h1), the lead and description, then the two calls to action. */}
        <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
          <HeroAtmosphere />
          {/* The gap under the header: 4px on phones; from 640px, 5% of the screen height
              plus 8px. (On phones the extra gap would push Post a Need under the chat
              button.) */}
          <div className="mx-auto flex w-full max-w-[90rem] flex-col items-center px-4 pt-1 pb-14 text-center sm:px-6 sm:pt-[calc(5svh+0.5rem)] lg:pb-16">
            {/* The bridge illustration, the same in both themes. Full container width on phones
                and tablets; from 1024px its height is capped by the screen at
                (100svh - 13rem) x 1.15, 15% larger than the headline artwork had here. The import's width and height
                reserve its space, so nothing shifts while it loads. */}
            <Image
              src={bridgeArt}
              alt={BRIDGE_IMAGE.alt}
              sizes="(min-width: 1024px) 1100px, 100vw"
              loading="eager"
              fetchPriority="high"
              className="hero-photo h-auto w-full lg:w-[min(100%,1448px,calc((100svh-13rem)*1.15*1448/1086))]"
            />
            <h1
              id="hero-title"
              className="hero-rise font-heading mt-4 text-h2 font-semibold text-balance text-primary-text [animation-delay:200ms]"
            >
              {HERO_HEADLINE[1]}
            </h1>
            <p className="hero-rise mt-5 text-lead font-semibold tracking-wide text-balance text-foreground [animation-delay:280ms]">
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
                  <Card variant="interactive" className="card-glow h-full gap-3 rounded-[0.5rem] border-primary/45 p-5">
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

        {/* The "Bridging the Gap." artwork between How it works and What is The Bridge?: one
            version per theme (hero-landing-image.png in light mode, hero-light-mode.png in
            dark mode; CSS shows the one for the theme and the hidden one is out of the
            accessibility tree). Full container width on phones and tablets; from 1024px 35%
            smaller (65% of the container, at most 898px). Loaded only when it comes near the
            screen. */}
        <div className="border-t border-border">
          <BlurFade inView className="mx-auto max-w-[90rem] px-4 py-12 sm:px-6">
            <Image
              src={heroArt}
              alt={HERO_IMAGE.alt}
              sizes="(min-width: 1024px) 898px, 100vw"
              loading="lazy"
              className="mx-auto h-auto w-full max-w-[1382px] lg:w-[65%] lg:max-w-[898px] dark:hidden"
            />
            <Image
              src={heroArtDark}
              alt={HERO_IMAGE.alt}
              sizes="(min-width: 1024px) 898px, 100vw"
              loading="lazy"
              className="mx-auto hidden h-auto w-full max-w-[1382px] lg:w-[65%] lg:max-w-[898px] dark:block"
            />
          </BlurFade>
        </div>

        <section aria-labelledby="what-is" className="border-t border-border">
          <BlurFade inView className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <SectionHeader id="what-is" title={WHAT_IS_HEADING} />
            <Card className="card-glow mt-6 rounded-[0.5rem] border-primary/45 py-5 sm:py-7">
              <CardContent className="flex flex-col gap-4 px-5 text-base leading-relaxed sm:px-7">
                {WHAT_IS_PARAGRAPHS.map((text) => (
                  <p key={text.slice(0, 24)}>{text}</p>
                ))}
              </CardContent>
            </Card>
          </BlurFade>
        </section>

        <section aria-labelledby="mission" className="border-t border-border">
          <BlurFade inView className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <SectionHeader id="mission" title={MISSION_HEADING} />
            <Card className="card-glow mt-6 rounded-[0.5rem] border-primary/45 border-l-4 border-l-gold py-5 sm:py-7">
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
