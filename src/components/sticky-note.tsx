import { Clock, MapPin, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import type { FoodRequest } from "@/db/schema"
import { formatWindow } from "@/lib/chicago-time"
import { BOARD_COPY, REQUEST_COPY } from "@/lib/copy"
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/labels"
import { neighborhoodLabel } from "@/lib/neighborhoods"
import { cn } from "@/lib/utils"
import noteArt from "../../public/images/sticky-note-card.png"

/**
 * A slight tilt between -1.5° and 1.5°, from the need's id, so a note always sits the same
 * way on the board.
 */
export function noteTilt(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  return (((h % 301) + 301) % 301) / 100 - 1.5
}

const NOTE_SIZES = "(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"

/**
 * A need on the Needs Board, drawn on a sticky note (public/images/sticky-note-card.png,
 * square with a transparent background; the same file for every note, so it loads once).
 * The whole note links to the need's page.
 *
 * The image is square: the paper fills 6.4–93.9% across and 8.5–92.5% down, the adhesive
 * strip runs to 17.2% down, and the small curled corner takes the bottom right from about
 * 85% across and 85% down. Text sits inside 11–90% across and from 20% down; the facts stop
 * at 84% across, so the curl never covers them. Sizes are in container units (cqi, the note's
 * width), so the layout is the same at every note size; e2e:board checks it.
 *
 * Every color here is fixed (the note is yellow in both themes): navy ink and badges, and a
 * deep blue "Claimed" stamp on In Progress needs.
 */
export function StickyNote({
  request,
  own = false,
  href,
}: {
  request: FoodRequest
  /** The viewing organization's own post. */
  own?: boolean
  href: string
}) {
  const claimed = request.status === "claimed"
  const people = `${request.peopleCount} ${request.peopleCount === 1 ? REQUEST_COPY.person : REQUEST_COPY.people}`
  return (
    <Link
      href={href}
      data-note={request.status}
      style={{ "--tilt": `${noteTilt(request.id)}deg` } as React.CSSProperties}
      className="group @container relative block aspect-square rotate-(--tilt) text-note-ink outline-none transition-[rotate,translate] duration-(--duration-base) ease-(--ease-brand) hover:-translate-y-1 hover:rotate-0 focus-visible:-translate-y-1 focus-visible:rotate-0 motion-reduce:transition-none motion-reduce:hover:translate-none motion-reduce:hover:rotate-(--tilt) motion-reduce:focus-visible:translate-none motion-reduce:focus-visible:rotate-(--tilt)"
    >
      <Image
        src={noteArt}
        alt=""
        fill
        sizes={NOTE_SIZES}
        className="object-contain drop-shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-[filter] duration-(--duration-base) group-hover:drop-shadow-[0_12px_14px_rgb(0_0_0/0.28)] group-focus-visible:drop-shadow-[0_12px_14px_rgb(0_0_0/0.28)] motion-reduce:transition-none motion-reduce:group-hover:drop-shadow-[0_1px_2px_rgb(0_0_0/0.2)] motion-reduce:group-focus-visible:drop-shadow-[0_1px_2px_rgb(0_0_0/0.2)]"
      />
      {/* The focus ring, on the paper itself: navy just inside its edge (visible on the
          yellow) and the page's ring color just outside it (visible on the page). */}
      <span
        aria-hidden="true"
        data-note-ring
        className="pointer-events-none absolute top-[8.5%] right-[6.1%] bottom-[7.5%] left-[6.4%] rounded-[1cqi] opacity-0 shadow-[0_0_0_3px_var(--ring)] outline-3 -outline-offset-3 outline-note-ink group-focus-visible:opacity-100"
      />
      <span data-note-body className="absolute top-[20%] right-[10%] bottom-[9%] left-[11%] flex flex-col gap-[2cqi]">
        {/* The badges, and on In Progress notes the "Claimed" stamp at the right end of the
            same row, so the row makes room for it and it never covers the items text. */}
        <span data-note-badges className="flex flex-wrap items-center gap-[1.6cqi]">
          <NoteBadge>{CATEGORY_LABELS[request.category]}</NoteBadge>
          {own && <NoteBadge>{BOARD_COPY.yourPost}</NoteBadge>}
          {claimed && (
            <span
              aria-hidden="true"
              data-note-stamp
              className="ml-auto -rotate-4 rounded-[1cqi] border-[0.6cqi] border-note-stamp px-[2cqi] py-[0.6cqi] text-[max(4.2cqi,0.8125rem)] leading-none font-extrabold tracking-[0.12em] text-note-stamp uppercase"
            >
              {BOARD_COPY.stamp}
            </span>
          )}
        </span>
        <span
          data-note-title
          className="font-heading line-clamp-3 text-[min(6.4cqi,1.5rem)] leading-[1.18] font-semibold [overflow-wrap:anywhere]"
        >
          {request.items}
        </span>
        <span data-note-facts className="flex flex-col gap-[0.6cqi] pr-[8%] text-[max(4.3cqi,0.875rem)] leading-[1.25]">
          <NoteFact Icon={Users} label={REQUEST_COPY.peopleLabel}>{people}</NoteFact>
          <NoteFact Icon={MapPin} label={REQUEST_COPY.where}>{neighborhoodLabel(request.neighborhood)}</NoteFact>
          <NoteFact Icon={Clock} label={REQUEST_COPY.when}>{formatWindow(request.windowStart, request.windowEnd)}</NoteFact>
        </span>
        <span className="sr-only">
          {BOARD_COPY.status} {STATUS_LABELS[request.status]}
        </span>
      </span>
    </Link>
  )
}

/** A solid navy label with ivory text, so it stands out on the yellow. */
function NoteBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      data-note-badge
      className="inline-flex items-center rounded-full bg-note-ink px-[2.2cqi] py-[0.6cqi] text-[max(3.6cqi,0.75rem)] leading-tight font-semibold text-note-badge-foreground"
    >
      {children}
    </span>
  )
}

function NoteFact({
  Icon,
  label,
  children,
}: {
  Icon: typeof Users
  label: string
  children: React.ReactNode
}) {
  return (
    <span className="flex items-start gap-[1.6cqi]">
      <Icon aria-hidden="true" className="mt-[0.3em] size-[1em] shrink-0" />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </span>
  )
}

/** The board's grid: 1 column on phones, 2 on tablets, 3 on desktop, with room between notes. */
export function StickyNoteGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</ul>
}
