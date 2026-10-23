"use client"

import { useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"

import GradientWaves from "@/components/GradientWaves"

type Palette = { horizon: string; crest: string }

/**
 * Hero backdrop, always dark: it sits inside a `.dark`-scoped section, so the tokens it
 * reads are the dark palette in both themes. Renders a static teal-on-navy gradient on the
 * server, for reduced motion, and as the fallback; swaps in the animated waves otherwise.
 * A navy overlay (70% at the top to 40% at the bottom) keeps the hero text readable.
 */
export function HeroBackground() {
  const prefersReducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [palette, setPalette] = useState<Palette | null>(null)

  useEffect(() => {
    if (!ref.current) return
    // Read the section's own (dark-scoped) tokens, not the page theme's.
    const cs = getComputedStyle(ref.current)
    setPalette({
      horizon: cs.getPropertyValue("--background").trim(),
      crest: cs.getPropertyValue("--foreground").trim(), // ivory highlight on the crests
    })
  }, [])

  const animate = prefersReducedMotion === false && palette !== null

  return (
    <div ref={ref} aria-hidden="true" className="absolute inset-0 -z-10 bg-background">
      {animate ? (
        <GradientWaves
          waveColor="#287F78"
          amplitude={1.8}
          swell={25}
          lightAngle={150}
          speed={0.5}
          horizonColor={palette.horizon}
          crestColor={palette.crest}
          brightness={1.2}
          sheen={0.4}
          mouseInteraction={false}
          swellOnClick={false}
        />
      ) : (
        <div className="h-full w-full bg-linear-to-br from-primary/10 via-primary/35 to-primary/15" />
      )}
      <div className="absolute inset-0 bg-linear-to-b from-background/70 to-background/40" />
    </div>
  )
}
