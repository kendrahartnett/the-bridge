"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useCopy, useLang } from "@/components/providers"
import { LANGS, saveLangChoice, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const SHORT: Record<Lang, string> = { en: "EN", es: "ES" }

// The same delay as the chat button's tooltip, so passing over the switch doesn't flash it.
const TOOLTIP_DELAY_MS = 300
// On touch screens: hold this long to see the tooltip; it then shows this long.
const LONG_PRESS_MS = 500
const TOUCH_TOOLTIP_MS = 1500

/**
 * EN / ES, as a compact segmented control (a radio group named "Language": Tab reaches the
 * chosen option, arrow keys move between them; the options are named "English" and
 * "Español"). Each option shows at 36×24px; an invisible extension (::after) makes each one a
 * 44×44px tap target, growing up, down and outward only, so the two never overlap. The
 * margin around the pill keeps the extensions clear of the neighboring buttons.
 *
 * A tooltip ("English / Español") opens below it on hover and keyboard focus after the same
 * short delay as the chat button's, and hides on Escape, when the pointer leaves, or on
 * blur. It's decorative (screen readers hear the options' names, not the tooltip) and never
 * takes clicks. On touch screens a long press shows it briefly; a tap switches at once.
 *
 * Choosing an option saves the "lang" cookie and reloads the page, which proxy.ts then
 * serves in that language (same address).
 */
export function LangSwitch({ className }: { className?: string }) {
  const lang = useLang()
  const c = useCopy()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const names: Record<Lang, string> = { en: c.UI.english, es: c.UI.spanish }
  const [tooltip, setTooltip] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const showTooltip = useCallback((delay = TOOLTIP_DELAY_MS) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setTooltip(true), delay)
  }, [])
  const hideTooltip = useCallback(() => {
    window.clearTimeout(timer.current)
    setTooltip(false)
  }, [])

  // Escape hides the tooltip without moving focus.
  useEffect(() => {
    if (!tooltip) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideTooltip()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [tooltip, hideTooltip])
  useEffect(() => () => window.clearTimeout(timer.current), [])

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
      className={cn("relative mx-2 inline-flex shrink-0 rounded-full border border-border p-0.5", className)}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") showTooltip()
      }}
      onPointerLeave={hideTooltip}
      onPointerDown={(e) => {
        // Touch: a long press shows the tooltip for a moment. A tap still switches at once.
        if (e.pointerType !== "touch") return
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
          setTooltip(true)
          timer.current = window.setTimeout(() => setTooltip(false), TOUCH_TOOLTIP_MS)
        }, LONG_PRESS_MS)
      }}
      onPointerUp={(e) => {
        if (e.pointerType === "touch" && !tooltip) window.clearTimeout(timer.current)
      }}
      onPointerCancel={hideTooltip}
      onFocus={() => showTooltip()}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hideTooltip()
      }}
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
          className={cn(
            "relative inline-flex h-6 w-9 items-center justify-center rounded-full text-xs font-semibold text-muted-foreground outline-none transition-colors duration-(--duration-base) hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring aria-checked:bg-primary aria-checked:text-primary-foreground motion-reduce:transition-none",
            // The 44×44 tap target: 10px above and below, 8px outward.
            "after:absolute after:-inset-y-2.5 after:content-['']",
            i === 0 ? "after:-left-2 after:right-0" : "after:left-0 after:-right-2"
          )}
        >
          {SHORT[l]}
        </button>
      ))}
      <span
        aria-hidden="true"
        data-lang-tooltip
        data-shown={tooltip || undefined}
        className="pointer-events-none invisible absolute top-full left-1/2 z-50 mt-3 -translate-x-1/2 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium whitespace-nowrap text-foreground opacity-0 shadow-md transition-[opacity,visibility] duration-(--duration-base) motion-reduce:transition-none data-shown:visible data-shown:opacity-100"
      >
        {c.UI.langTooltip}
        <span className="absolute -top-[5px] left-1/2 size-2.5 -translate-x-1/2 rotate-45 border-t border-l border-border bg-surface-raised" />
      </span>
    </div>
  )
}
