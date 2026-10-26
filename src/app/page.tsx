import Image from "next/image"

import { ARCH_CENTERLINE, ARCH_CENTERLINE_VIEWBOX, ARCH_STOPS } from "@/components/brand/arch"
import { CtaLink } from "@/components/cta-link"
import { HeroAtmosphere } from "@/components/hero-atmosphere"
import { SectionHeader } from "@/components/section-header"
import { SiteHeader } from "@/components/site-header"
import { BlurFade } from "@/components/ui/blur-fade"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
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
import heroArt from "../../public/images/hero-bridge.png"

// Widths of the hero lines at 1em (measured in their fonts, plus 2% to spare), so each can be
// sized to fill its column on one line: "Bridging the Gap." in Zen Tokyo Zoo is 6.98em,
// "Every Connection is a Step Forward." in Raleway 600 is 16.89em.
const HEADLINE_EM = 7.12
const SUBLINE_EM = 17.2

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
          <HeroAtmosphere />
          {/* Phones and tablets: text first (headline and both calls to action), then the
              image. Desktop: text and image share the width, the image's top aligned with
              the eyebrow line. */}
          {/* Top padding: 28px on phones, 36px from 640px (the space under the header). */}
          <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 pt-7 pb-14 sm:px-6 sm:pt-9 lg:grid-cols-12 lg:items-start lg:gap-8 lg:pb-20">
            <div className="@container lg:col-span-6">
              {/* Always one line (see hero-eyebrow in globals.css); the gold line shows from 640px. */}
              <p className="hero-rise hero-eyebrow flex items-center gap-3 text-foreground">
                <span aria-hidden="true" className="hidden h-px w-6 shrink-0 bg-gold sm:block" />
                {HERO_BADGE}
              </p>
              <h1 id="hero-title" className="mt-5">
                {/* Phones: may wrap, never under 2.5rem (the stripes need the size). From
                    768px: one line, sized to fit the text column (cqi) but no larger than the
                    desktop size (3.5rem), so it never shrinks as the screen widens. From 1024px
                    it fills 85% of the column (about 56px), leaving room for the gold arch that
                    runs on to the image's edge. */}
                <span
                  className="hero-rise font-display block text-display text-foreground [--rise:12px] [animation-delay:80ms] md:flex md:items-center md:whitespace-nowrap md:text-(length:--headline-md) lg:text-(length:--headline-lg)"
                  style={
                    {
                      "--headline-md": `min(calc(100cqi / ${HEADLINE_EM}), 3.5rem)`,
                      "--headline-lg": `calc(85cqi / ${HEADLINE_EM})`,
                    } as React.CSSProperties
                  }
                >
                  <span>{HERO_HEADLINE[0]}</span>
                  <HeroArch />
                </span>
                {/* One line from 1024px (fitted to the column, at most 1.625rem), clearly
                    smaller than the headline; may wrap below that. */}
                <span
                  className="hero-rise font-heading mt-4 block text-display-sub font-semibold text-primary-text [animation-delay:200ms] lg:whitespace-nowrap lg:text-(length:--subline-lg)"
                  style={{ "--subline-lg": `min(calc(100cqi / ${SUBLINE_EM}), 1.625rem)` } as React.CSSProperties}
                >
                  {HERO_HEADLINE[1]}
                </span>
              </h1>
              <p className="hero-rise mt-6 font-semibold tracking-wide text-foreground [animation-delay:280ms]">
                {HERO_LEAD}
              </p>
              <p className="hero-fade mt-2 max-w-[34rem] text-lead text-pretty text-muted-foreground [animation-delay:280ms]">
                {HERO_DESCRIPTION}
              </p>
              <div className="hero-rise mt-8 flex flex-col gap-5 sm:flex-row sm:items-start [animation-delay:360ms]">
                <CtaLink href="/sign-in?role=outreach" variant="primary" className="sm:w-64 lg:w-auto lg:min-w-0 lg:flex-1" {...ROLE_CTAS.outreach} />
                <CtaLink href="/sign-in?role=donor" variant="secondary" className="sm:w-64 lg:w-auto lg:min-w-0 lg:flex-1" {...ROLE_CTAS.donor} />
              </div>
            </div>

            {/* Below 1024px the illustration at its own 4:3 shape (nothing cropped). From
                1024px a 7:6 crop at 78% of its column (left edge fixed, so the gold arch still
                meets it), no taller than the text from the eyebrow to the buttons: the widest crop that
                still shows the whole bridge (about 2% to 86% across) and both figures, so it
                sits just left of center. The fixed-aspect frame keeps the layout still while
                the image loads. */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted lg:col-span-6 lg:aspect-[7/6] lg:w-[78%]">
              <Image
                src={heroArt}
                alt={HERO_IMAGE.alt}
                fill
                sizes="(min-width: 1024px) 368px, (min-width: 640px) 90vw, 100vw"
                loading="eager"
                fetchPriority="high"
                placeholder="blur"
                className="hero-photo object-cover object-center lg:object-[5%_50%]"
              />
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

/**
 * Desktop only: a thin gold arch, the logo's curve and gradient, that runs from the end of
 * "the Gap." to the image's edge: the bridge between the words and the picture. It fills
 * the rest of the line and reaches across the column gap (2rem, less a hair so it meets the
 * image without overlapping it).
 */
function HeroArch() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={ARCH_CENTERLINE_VIEWBOX}
      preserveAspectRatio="none"
      className="pointer-events-none ml-[0.25em] -mr-[1.875rem] hidden h-[0.4em] min-w-16 flex-1 overflow-visible lg:block"
    >
      <defs>
        <linearGradient id="hero-arch-gold" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0">
          {ARCH_STOPS.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
      </defs>
      <path
        d={ARCH_CENTERLINE}
        pathLength={1}
        fill="none"
        stroke="url(#hero-arch-gold)"
        strokeWidth={3}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="arch-draw"
      />
    </svg>
  )
}
