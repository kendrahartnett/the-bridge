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
        {/* The hero, stacked and centered: the headline artwork (the page's h1), the line and
            description, then the two calls to action. */}
        <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
          <HeroAtmosphere />
          {/* A very small gap under the header: 4px on phones, 8px from 640px. Wider than the
              other sections so the artwork can reach about 1380px. */}
          <div className="mx-auto flex w-full max-w-[90rem] flex-col items-center px-4 pt-1 pb-14 text-center sm:px-6 sm:pt-2 lg:pb-16">
            {/* The headline artwork is the h1, so its alt text ("Bridging the Gap.") is the
                headline for screen readers and search engines. Two versions of the artwork, the
                same size: hero-landing-image.png in light mode and hero-light-mode.png in dark
                mode (CSS shows the one for the theme; the hidden one is out of the
                accessibility tree). Full container width on phones and tablets, at the
                artwork's own shape. From 1024px the frame is 8% wider than the artwork at the
                same height (aspect 1.919), up to 1382px, with the height capped by the screen
                (100svh - 13rem): the artwork fills the width and the extra 8% of its height is
                trimmed from the top, which is transparent padding (the artwork's top 12% is
                empty), so nothing visible is cut and it sits closer to the header. The frame's
                fixed shape reserves the space, so nothing shifts while it loads. */}
            <h1
              id="hero-title"
              className="hero-photo relative aspect-[1672/941] w-full lg:aspect-[1.919] lg:w-[min(100%,1382px,calc((100svh-13rem)*1.919))]"
            >
              <Image
                src={heroArt}
                alt={HERO_IMAGE.alt}
                fill
                sizes="(min-width: 1024px) 1382px, 100vw"
                loading="eager"
                fetchPriority="high"
                className="object-cover object-bottom dark:hidden"
              />
              <Image
                src={heroArtDark}
                alt={HERO_IMAGE.alt}
                fill
                sizes="(min-width: 1024px) 1382px, 100vw"
                loading="eager"
                fetchPriority="high"
                className="hidden object-cover object-bottom dark:block"
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
                  <Card variant="interactive" className="h-full gap-3 rounded-[0.5rem] p-5">
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
            <Card className="mt-6 rounded-[0.5rem] py-5 sm:py-7">
              <CardContent className="flex flex-col gap-4 px-5 text-base leading-relaxed sm:px-7">
                {WHAT_IS_PARAGRAPHS.map((text) => (
                  <p key={text.slice(0, 24)}>{text}</p>
                ))}
              </CardContent>
            </Card>
          </BlurFade>
        </section>

        {/* An illustration between the two sections: centered, up to 662px wide, full
            container width on phones, loaded only when it comes near the screen. */}
        <div className="border-t border-border">
          <BlurFade inView className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <Image
              src={bridgeArt}
              alt={BRIDGE_IMAGE.alt}
              sizes="(min-width: 768px) 662px, 100vw"
              loading="lazy"
              className="mx-auto h-auto w-full max-w-[662px]"
            />
          </BlurFade>
        </div>

        <section aria-labelledby="mission" className="border-t border-border">
          <BlurFade inView className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <SectionHeader id="mission" title={MISSION_HEADING} />
            <Card className="mt-6 rounded-[0.5rem] border-l-4 border-l-gold py-5 sm:py-7">
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
