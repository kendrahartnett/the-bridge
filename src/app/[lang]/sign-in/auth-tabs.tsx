"use client"

import { useRef, useState, type KeyboardEvent } from "react"

import { useCopy } from "@/components/providers"
import { cn } from "@/lib/utils"

import { CreateAccountForm, type AccountType } from "./create-account-form"
import { SignInForm } from "./sign-in-form"

export type AuthTab = "sign-in" | "create"

// Each tab's label is AUTH_COPY.tabs[key], in the page's language.
const TABS = [
  { value: "sign-in", key: "signIn" },
  { value: "create", key: "create" },
] as const

/**
 * "Sign in" and "Create account" tabs (the ARIA tabs pattern): Tab reaches the selected tab,
 * arrow keys, Home, and End move between tabs, and each panel is labelled by its tab.
 */
export function AuthTabs({
  initialTab = "sign-in",
  initialType,
}: {
  initialTab?: AuthTab
  initialType?: AccountType
}) {
  const { AUTH_COPY } = useCopy()
  const [tab, setTab] = useState<AuthTab>(initialTab)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length
    if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length
    if (e.key === "Home") next = 0
    if (e.key === "End") next = TABS.length - 1
    if (next === null) return
    e.preventDefault()
    setTab(TABS[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div role="tablist" aria-label={AUTH_COPY.intro} className="grid grid-cols-2 border-b border-border-strong">
        {TABS.map(({ value, key }, i) => {
          const label = AUTH_COPY.tabs[key]
          const selected = value === tab
          return (
            <button
              key={value}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="tab"
              id={`tab-${value}`}
              aria-selected={selected}
              aria-controls={`panel-${value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "-mb-px min-h-tap rounded-t-md border-b-[3px] px-3 text-base font-semibold transition-colors duration-(--duration-base) outline-none focus-visible:ring-[3px] focus-visible:ring-ring motion-reduce:transition-none",
                selected
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
      {TABS.map(({ value }) => (
        <div
          key={value}
          role="tabpanel"
          id={`panel-${value}`}
          aria-labelledby={`tab-${value}`}
          hidden={value !== tab}
        >
          {value === "sign-in" ? <SignInForm /> : <CreateAccountForm initialType={initialType} />}
        </div>
      ))}
    </div>
  )
}
