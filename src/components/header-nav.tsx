"use client"

import { Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { NAV_COPY } from "@/lib/copy"

/**
 * Signed-in navigation: Dashboard for everyone, the Needs Board for organization accounts,
 * plus Admin for admins. From 640px up the
 * links sit in the header; on phones they're behind a menu button, so the header still fits
 * on one row at 320px. The current page's link is marked with aria-current="page" and shown
 * with a blue bar (the same indicator as the sign-in and admin tabs); the others are muted
 * until hovered.
 * Whether the Needs Board and Admin show is decided on the server; /board and /admin check
 * again on every request.
 */
export function HeaderNav(props: NavProps) {
  return <NavLinks {...props} pathname={usePathname()} />
}

/**
 * The same links with none marked current, for the header's loading state: reading the URL
 * (usePathname) there would stop pages with a dynamic URL, like /requests/[id], from being
 * prerendered.
 */
export function HeaderNavPlaceholder(props: NavProps) {
  return <NavLinks {...props} pathname={null} />
}

type NavProps = { isAdmin: boolean; isOrganization: boolean }

function NavLinks({ isAdmin, isOrganization, pathname }: NavProps & { pathname: string | null }) {
  const links = [
    { href: "/dashboard", label: NAV_COPY.dashboard },
    ...(isOrganization ? [{ href: "/board", label: NAV_COPY.board }] : []),
    ...(isAdmin ? [{ href: "/admin", label: NAV_COPY.admin }] : []),
  ]
  const isCurrent = (href: string) => !!pathname && (pathname === href || pathname.startsWith(`${href}/`))

  return (
    <nav aria-label={NAV_COPY.label}>
      <ul className="hidden items-center gap-1 sm:flex">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Button asChild variant="ghost" className="px-3">
              <Link
                href={href}
                aria-current={isCurrent(href) ? "page" : undefined}
                className="relative text-muted-foreground hover:text-foreground after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity after:duration-(--duration-base) aria-[current=page]:text-foreground aria-[current=page]:after:opacity-100 motion-reduce:after:transition-none"
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
    // the page's right gutter and never runs off the left edge on narrow phones. It's a solid
    // raised surface, not glass: inside the glass header a second blur can't reach the page
    // behind it, so a translucent panel would let page text show through.
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
        className="absolute right-4 top-full z-50 mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface-raised p-1.5 text-foreground shadow-lg animate-in fade-in slide-in-from-top-1 duration-(--duration-base) motion-reduce:animate-none"
      >
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isCurrent(href) ? "page" : undefined}
              onClick={() => setOpen(false)}
              className="relative flex min-h-tap items-center rounded-lg px-3 font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 aria-[current=page]:bg-muted aria-[current=page]:text-foreground aria-[current=page]:before:opacity-100"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
