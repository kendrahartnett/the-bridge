"use client"

import { MotionConfig } from "motion/react"

import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // "user" turns off transform/layout animations when the OS asks for reduced motion.
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster theme="light" position="top-center" />
    </MotionConfig>
  )
}
