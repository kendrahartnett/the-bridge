"use client"

import { Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { NAV_COPY } from "@/lib/copy"

/**
 * Signed-in navigation: Dashboard for everyone, plus Admin for admins. From 640px up the
 * links sit in the header; on phones they're behind a menu button, so the header still fits
 * on one row at 320px. The current page's link is marked with aria-current="page".
 * Whether Admin shows is decided on the server; /admin checks again on every request.
 */
export function HeaderNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const links = [
    { href: "/dashboard", label: NAV_COPY.dashboard },
    ...(isAdmin ? [{ href: "/admin", label: NAV_COPY.admin }] : []),
  ]
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav aria-label={NAV_COPY.label}>
      <ul className="hidden items-center gap-1 sm:flex">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Button asChild variant="ghost" className="px-3">
              <Link
                href={href}
                aria-current={isCurrent(href) ? "page" : undefined}
                className="aria-[current=page]:bg-muted aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
              >
                {label}
              </Link>
            </Button>
          </li>
        ))}
      </ul>
      <PhoneMenu links={links} isCurrent={isCurrent} />
    </nav>
  )
}

function PhoneMenu({
  links,
  isCurrent,
}: {
  links: { href: string; label: string }[]
  isCurrent: (href: string) => boolean
}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLUListElement>(null)
  const panelId = useId()

  // Escape closes and returns focus to the button; a tap or click outside closes it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointer)
    panelRef.current?.querySelector("a")?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointer)
    }
  }, [open])

  return (
    // The panel is positioned against the header row (not this button), so it lines up with
    // the page's right gutter and never runs off the left edge on narrow phones.
    <div className="sm:hidden">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label={NAV_COPY.menu}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
      </Button>
      <ul
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="absolute right-4 top-full z-50 mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
      >
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isCurrent(href) ? "page" : undefined}
              onClick={() => setOpen(false)}
              className="flex min-h-tap items-center rounded-md px-3 font-medium outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring aria-[current=page]:bg-muted aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-4"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
