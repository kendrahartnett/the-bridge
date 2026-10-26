import type { Metadata, Viewport } from "next"

import { NotFoundView } from "@/components/not-found-view"
import { Providers } from "@/components/providers"
import { copyFor } from "@/lib/copy"
import { requestLang } from "@/lib/i18n-server"

import { htmlClassName } from "./fonts"
import "./globals.css"

// The branded 404 page for every address that isn't a page, and for pages the visitor may
// not see (proxy.ts sends those to an address that isn't a page). Next.js answers with this
// whole document and a real 404 status, rendered on the server in the reader's language
// (the "lang" cookie), so it's complete without JavaScript. It's its own document because
// the root layout is under app/[lang]; this mirrors that layout.

export async function generateMetadata(): Promise<Metadata> {
  const c = copyFor(await requestLang())
  return { title: `${c.NOT_FOUND_COPY.title} · ${c.META.siteTitle}`, description: c.META.siteDescription }
}

export const viewport: Viewport = { themeColor: "#020617" }

// Rendered on each request (it reads the language cookie), not prerendered.
export const instant = false

export default async function GlobalNotFound() {
  const lang = await requestLang()
  return (
    <html lang={lang} suppressHydrationWarning className={htmlClassName}>
      <body className="min-h-full flex flex-col">
        <Providers lang={lang}>
          <NotFoundView />
        </Providers>
      </body>
    </html>
  )
}
