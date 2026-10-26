import Link from "next/link"

import { ArchMark } from "@/components/empty-state"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { NOT_FOUND_COPY } from "@/lib/copy"

/**
 * The branded 404 page. It's the same for a page that doesn't exist and for one the visitor
 * isn't allowed to see (/admin answers non-admins with this page and a real 404): it never
 * reads the session, and the header is the public one, so the two can't be told apart.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <ArchMark className="h-6 w-28" />
        <p className="eyebrow mt-6 text-muted-foreground">{NOT_FOUND_COPY.eyebrow}</p>
        <h1 className="font-heading mt-3 text-h1 font-bold text-balance">{NOT_FOUND_COPY.title}</h1>
        <p className="mt-3 max-w-md text-lead text-muted-foreground">{NOT_FOUND_COPY.body}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">{NOT_FOUND_COPY.home}</Link>
        </Button>
      </main>
    </>
  )
}
