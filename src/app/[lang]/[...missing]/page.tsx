import { notFound } from "next/navigation"

// Any address that isn't a page, and any page the visitor may not see (proxy.ts sends those
// here), gets the branded not-found page (app/[lang]/not-found.tsx) in the reader's
// language, with a real 404 status. With Cache Components the response's HTML is a shell;
// the page itself appears once the browser runs the page's scripts.
export default function Missing() {
  notFound()
}
