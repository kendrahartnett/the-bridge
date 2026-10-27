import type { Metadata } from "next"
import { Suspense } from "react"

import { Inbox } from "@/app/[lang]/dashboard/inbox"
import { LoadingState } from "@/components/loading-state"
import { PageHeader } from "@/components/page-header"
import { SiteHeader } from "@/components/site-header"
import { requireUser } from "@/lib/current-user"
import { getCopy } from "@/lib/i18n-server"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getCopy()).INBOX_COPY.heading }
}

export default async function InboxPage() {
  const { INBOX_COPY } = await getCopy()
  return <>
    <SiteHeader signedIn />
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader title={INBOX_COPY.heading} intro={INBOX_COPY.intro} />
      <Suspense fallback={<LoadingState>{INBOX_COPY.loading}</LoadingState>}>
        <InboxContent />
      </Suspense>
    </main>
  </>
}

async function InboxContent() {
  const user = await requireUser()
  return <Inbox userId={user.id} />
}
