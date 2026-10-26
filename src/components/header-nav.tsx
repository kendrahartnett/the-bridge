"use client"

import { Bell, Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"

import { LangSwitch } from "@/components/lang-switch"
import { useCopy } from "@/components/providers"
import { Button } from "@/components/ui/button"
import type { Copy } from "@/lib/copy"
import { cn } from "@/lib/utils"

/**
 * Signed-in navigation: Dashboard for everyone, the Needs Board for organization accounts,
 * plus Admin for admins. From 640px up the
 * links sit in the header; on phones they're behind a menu button, so the header still fits
 * on one row at 320px. The current page's link is marked with aria-current="page" and shown
 * with a blue bar (the same indicator as the sign-in and admin tabs); the others are muted
 * until hovered.
 * Whether the Needs Board and Admin show is decided on the server; /board and /admin check
 * again on every request.
 *
 * After the links, the inbox bell (every signed-in account) with the unread count, linking
 * to the dashboard's inbox. Below 360px it doesn't fit on the row beside the menu, theme
 * and sign-out buttons, so it moves into the phone menu as "Inbox", and the menu button
 * shows a dot while anything is unread.
 *
 * The phone menu also holds the language switch (EN / ES); from 640px it's in the header.
 * Signed-out visitors get the menu with only the language switch, and no bell.
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

/** unread: the count for the bell, or null while it's still loading (no count shown). */
type NavProps = { signedIn: boolean; isAdmin: boolean; isOrganization: boolean; unread: number | null }

const bellLabel = (n: number | null, c: Copy) =>
  n ? c.INBOX_COPY.bellLabel.replace("{n}", String(n)) : c.INBOX_COPY.bellLabelNone
const countText = (n: number) => (n > 9 ? "9+" : String(n))

function NavLinks({ signedIn, isAdmin, isOrganization, unread, pathname }: NavProps & { pathname: string | null }) {
  const c = useCopy()
  const links = signedIn
    ? [
        { href: "/dashboard", label: c.NAV_COPY.dashboard },
        ...(isOrganization ? [{ href: "/board", label: c.NAV_COPY.board }] : []),
        ...(isAdmin ? [{ href: "/admin", label: c.NAV_COPY.admin }] : []),
      ]
    : []
  const isCurrent = (href: string) => !!pathname && (pathname === href || pathname.startsWith(`${href}/`))

  return (
    <>
      <nav aria-label={c.NAV_COPY.label}>
        <ul className={cn("hidden items-center gap-1", links.length > 0 && "sm:flex")}>
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
        <PhoneMenu links={links} isCurrent={isCurrent} unread={unread} signedIn={signedIn} c={c} />
      </nav>
      {signedIn && (
      <Button asChild variant="ghost" size="icon" className="relative hidden min-[360px]:inline-flex">
        <Link href="/dashboard#inbox" aria-label={bellLabel(unread, c)} data-inbox-bell>
          <Bell aria-hidden="true" className="size-5" />
          {!!unread && (
            <span
              aria-hidden="true"
              data-inbox-count
              className="absolute top-1 right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] leading-none font-bold text-primary-foreground"
            >
              {countText(unread)}
            </span>
          )}
        </Link>
      </Button>
      )}
    </>
  )
}

function PhoneMenu({
  links,
  isCurrent,
  unread,
  signedIn,
  c,
}: {
  links: { href: string; label: string }[]
  isCurrent: (href: string) => boolean
  unread: number | null
  signedIn: boolean
  c: Copy
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
    panelRef.current?.querySelector<HTMLElement>("a, [role=radio][tabindex='0']")?.focus()
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
        className="relative"
        aria-label={c.NAV_COPY.menu}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        {/* Below 360px, where the bell is in this menu: a dot while anything is unread. */}
        {!!unread && (
          <span aria-hidden="true" data-menu-unread className="absolute top-2 right-2 size-2.5 rounded-full bg-primary min-[360px]:hidden" />
        )}
      </Button>
      <ul
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="absolute right-4 top-full z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface-raised p-1.5 text-foreground shadow-lg animate-in fade-in slide-in-from-top-1 duration-(--duration-base) motion-reduce:animate-none"
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
        {/* The bell's place below 360px. The count is drawn from data-count (not text), so
            the item reads as "Inbox"; its name carries the count. */}
        {signedIn && (
        <li className="min-[360px]:hidden">
          <Link
            href="/dashboard#inbox"
            aria-label={bellLabel(unread, c)}
            data-count={unread ? countText(unread) : undefined}
            onClick={() => setOpen(false)}
            className={cn(
              "relative flex min-h-tap items-center gap-2 rounded-lg px-3 font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring",
              !!unread &&
                "after:ml-auto after:rounded-full after:bg-primary after:px-1.5 after:text-xs after:leading-5 after:font-bold after:text-primary-foreground after:content-[attr(data-count)]"
            )}
          >
            <Bell aria-hidden="true" className="size-4" />
            {c.INBOX_COPY.menuItem}
          </Link>
        </li>
        )}
        {/* The language switch's place on phones. */}
        <li className={cn("flex items-center justify-between gap-3 px-3 py-1", links.length > 0 && "mt-1 border-t border-border pt-2")}>
          <span className="font-medium text-muted-foreground">{c.UI.language}</span>
          <LangSwitch />
        </li>
      </ul>
    </div>
  )
}
