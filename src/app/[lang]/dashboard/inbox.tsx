import { EmptyState } from "@/components/empty-state"
import { SectionHeader } from "@/components/section-header"
import { Button } from "@/components/ui/button"
import { db } from "@/db"
import { formatDateTime } from "@/lib/chicago-time"
import type { Copy } from "@/lib/copy"
import { currentLang, getCopy } from "@/lib/i18n-server"
import { listNotifications, type InboxItem } from "@/lib/request-rules"
import { cn } from "@/lib/utils"

import { markAllReadAction, openNotificationAction } from "./inbox-actions"

/** An inbox item's text, built now from the need and the people involved (nothing stored). */
export function inboxMessage(item: InboxItem, { INBOX_COPY }: Copy): string {
  const m = INBOX_COPY.messages
  switch (item.type) {
    case "need_claimed":
      return m.needClaimed
        .replace("{org}", item.claimerName ?? INBOX_COPY.someOrganization)
        .replace("{items}", item.items ?? "")
    case "need_fulfilled":
      return m.needFulfilled.replace("{poster}", item.posterName ?? INBOX_COPY.someone)
    case "org_approved":
      return m.orgApproved
    case "org_rejected": {
      const email = process.env.ADMIN_CONTACT_EMAIL?.trim()
      return email ? m.orgRejected.replace("{email}", email) : m.orgRejectedNoEmail
    }
    case "privacy_pending": return m.privacyPending
    case "privacy_approved": return m.privacyApproved
    case "privacy_changes": return m.privacyChanges
    case "privacy_rejected": return m.privacyRejected
    case "privacy_new_review": return m.privacyNewReview
  }
}

/**
 * The dashboard's inbox, for every signed-in account: the 10 newest notifications, newest
 * first. Unread ones have a dot and bold text. Opening one marks it read and goes to the
 * need's page (or the dashboard, for account updates). Updated on each page load.
 */
export async function Inbox({ userId }: { userId: string }) {
  const lang = await currentLang()
  const c = await getCopy()
  const { INBOX_COPY } = c
  const items = await listNotifications(db, userId)
  const unread = items.some((i) => !i.read)
  return (
    <section id="inbox" aria-labelledby="inbox-heading" className="mt-8 scroll-mt-6">
      <SectionHeader
        id="inbox-heading"
        title={INBOX_COPY.heading}
        actions={
          unread && (
            <form action={markAllReadAction}>
              <Button type="submit" variant="outline">
                {INBOX_COPY.markAllRead}
              </Button>
            </form>
          )
        }
      />
      {items.length === 0 ? (
        <EmptyState className="mt-4">{INBOX_COPY.empty}</EmptyState>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          {items.map((item) => (
            <li key={item.id} data-inbox-item={item.read ? "read" : "unread"}>
              <form action={openNotificationAction}>
                <input type="hidden" name="id" value={item.id} />
                <button
                  type="submit"
                  className="flex min-h-tap w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors duration-(--duration-base) hover:bg-muted focus-visible:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none sm:px-5"
                >
                  <span
                    aria-hidden="true"
                    className={cn("mt-2 size-2.5 shrink-0 rounded-full", item.read ? "bg-transparent" : "bg-primary")}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    {!item.read && <span className="sr-only">{INBOX_COPY.unread}: </span>}
                    <span className={cn("[overflow-wrap:anywhere]", !item.read && "font-semibold")}>{inboxMessage(item, c)}</span>
                    <time dateTime={item.createdAt.toISOString()} className="text-sm text-muted-foreground">
                      {formatDateTime(item.createdAt, lang)}
                    </time>
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
