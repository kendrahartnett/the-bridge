import Image from "next/image"
import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { NOT_FOUND_COPY } from "@/lib/copy"
import notFoundArt from "../../public/images/not-found.png"

/**
 * The branded 404 page. It's the same for a page that doesn't exist and for one the visitor
 * isn't allowed to see (/admin answers non-admins with this page and a real 404): it never
 * reads the session, and the header is the public one, so the two can't be told apart.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      {/* overflow-x-clip keeps the glow, which reaches past the image, from widening the page. */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center overflow-x-clip px-4 py-8 text-center sm:px-6">
        {/* The illustration (transparent background): full container width on phones and
            tablets; from 1024px about 720px wide, with its height capped by the screen
            (100svh - 17rem) so the heading and the button stay above the fold on laptop
            screens. The import's width and height reserve its space, so nothing shifts. */}
        <div className="relative isolate w-full lg:w-[min(100%,720px,calc((100svh-17rem)*1447/1087))]">
          {/* The same very faint blue glow the homepage hero had: decorative and static. */}
          <span aria-hidden="true" className="hero-glow pointer-events-none absolute -inset-[8%] -z-10" />
          <Image
            src={notFoundArt}
            alt={NOT_FOUND_COPY.imageAlt}
            sizes="(min-width: 1024px) 720px, 100vw"
            loading="eager"
            fetchPriority="high"
            className="h-auto w-full"
          />
        </div>
        <h1 className="font-heading mt-6 text-h1 font-bold text-balance">{NOT_FOUND_COPY.title}</h1>
        <Button asChild size="lg" className="mt-6">
          <Link href="/">{NOT_FOUND_COPY.home}</Link>
        </Button>
      </main>
    </>
  )
}
