"use client"

import { MotionConfig } from "motion/react"
import { ThemeProvider } from "next-themes"
import { createContext, useContext } from "react"

import { Toaster } from "@/components/ui/sonner"
import { copyFor, type Copy } from "@/lib/copy"
import { DEFAULT_LANG, type Lang } from "@/lib/i18n"

// The page's language (from the root [lang] segment), for Client Components.
const LangContext = createContext<Lang>(DEFAULT_LANG)

/** The page's language in a Client Component. */
export const useLang = () => useContext(LangContext)

/** The page's copy, in its language, in a Client Component. */
export const useCopy = (): Copy => copyFor(useLang())

export function Providers({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <LangContext value={lang}>
      {/* next-themes injects a tiny blocking script that sets the .dark class before first
          paint, so there is no flash of the wrong theme. The choice is saved in
          localStorage ("theme"); first visits start in dark mode. */}
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        {/* "user" turns off transform/layout animations when the OS asks for reduced motion. */}
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster position="top-center" />
        </MotionConfig>
      </ThemeProvider>
    </LangContext>
  )
}
