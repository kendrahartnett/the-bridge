"use client"

import { useRef } from "react"

import { useCopy, useLang } from "@/components/providers"
import { LANGS, saveLangChoice, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const SHORT: Record<Lang, string> = { en: "EN", es: "ES" }

/**
 * EN / ES, as a segmented control (a radio group: Tab reaches the chosen option, arrow keys
 * move between them, each option is 44px). Choosing one saves the "lang" cookie and reloads
 * the page, which proxy.ts then serves in that language (same address).
 */
export function LangSwitch({ className }: { className?: string }) {
  const lang = useLang()
  const c = useCopy()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const names: Record<Lang, string> = { en: c.UI.english, es: c.UI.spanish }

  function choose(next: Lang) {
    if (next === lang) return
    saveLangChoice(next)
    window.location.reload()
  }

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = (i + step + LANGS.length) % LANGS.length
    refs.current[next]?.focus()
    choose(LANGS[next])
  }

  return (
    <div
      role="radiogroup"
      aria-label={c.UI.language}
      data-lang-switch
      className={cn("inline-flex shrink-0 rounded-lg border border-border p-0.5", className)}
    >
      {LANGS.map((l, i) => (
        <button
          key={l}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          role="radio"
          aria-checked={l === lang}
          aria-label={names[l]}
          lang={l}
          tabIndex={l === lang ? 0 : -1}
          onClick={() => choose(l)}
          onKeyDown={(e) => onKeyDown(e, i)}
          className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-md px-2 text-sm font-semibold text-muted-foreground outline-none transition-colors duration-(--duration-base) hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring aria-checked:bg-primary aria-checked:text-primary-foreground motion-reduce:transition-none"
        >
          {SHORT[l]}
        </button>
      ))}
    </div>
  )
}
