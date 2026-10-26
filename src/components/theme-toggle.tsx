"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { useCopy } from "@/components/providers"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const c = useCopy()

  // Icon and label are switched with CSS (the .dark class is already on <html>
  // before first paint), so they are correct immediately and never mismatch on hydration.
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon aria-hidden="true" className="size-5 dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-5 dark:block" />
      <span className="sr-only dark:hidden">{c.UI.themeToDark}</span>
      <span className="sr-only hidden dark:inline">{c.UI.themeToLight}</span>
    </Button>
  )
}
