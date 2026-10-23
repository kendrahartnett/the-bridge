"use client"

import { MotionConfig } from "motion/react"
import { ThemeProvider } from "next-themes"

import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // next-themes injects a tiny blocking script that sets the .dark class before
    // first paint, so there is no flash of the wrong theme. The choice is saved in
    // localStorage ("theme"); first visits start in dark mode.
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {/* "user" turns off transform/layout animations when the OS asks for reduced motion. */}
      <MotionConfig reducedMotion="user">
        {children}
        <Toaster position="top-center" />
      </MotionConfig>
    </ThemeProvider>
  )
}
