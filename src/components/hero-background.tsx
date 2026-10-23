"use client"

import { useReducedMotion } from "motion/react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import GradientWaves from "@/components/GradientWaves"

type Palette = { horizon: string; crest: string }

const readToken = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/**
 * Hero backdrop. Renders a static teal gradient on the server, for reduced motion,
 * and as the fallback; swaps in the animated waves on the client otherwise.
 * Wave colors come from the theme tokens, so no off-palette colors appear.
 */
export function HeroBackground() {
  const prefersReducedMotion = useReducedMotion()
  const { resolvedTheme } = useTheme()
  const [palette, setPalette] = useState<Palette | null>(null)

  useEffect(() => {
    // Re-read after each theme change; the .dark class is already applied by now.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from the DOM's CSS variables
    setPalette({ horizon: readToken("--background"), crest: readToken("--surface") })
  }, [resolvedTheme])

  const animate = prefersReducedMotion === false && palette !== null

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10">
      {animate ? (
        <GradientWaves
          key={resolvedTheme}
          waveColor="#287F78"
          amplitude={1.8}
          swell={25}
          lightAngle={150}
          speed={0.5}
          horizonColor={palette.horizon}
          crestColor={palette.crest}
          lightMode={resolvedTheme !== "dark"}
          mouseInteraction={false}
          swellOnClick={false}
        />
      ) : (
        <div className="h-full w-full bg-linear-to-b from-background via-primary/25 to-primary/60" />
      )}
    </div>
  )
}
