// The Post a Need page: the privacy notice (exact wording, lock icon, above the form), text
// contrast for everything on the page, and no horizontal scroll, at 390px and 1280px in
// both themes.
//   npm run e2e:form

import { launchBrowser, sleep } from "./browser.mjs"
import { TEXT_CONTRAST } from "./contrast.mjs"
import { finish, setup } from "./harness.ts"
import { NEW_REQUEST_COPY } from "../../src/lib/copy.ts"

const suite = await setup("form")
const browser = await launchBrowser(suite)
const { check } = suite

try {
  const t = await browser.newTab({ log: true })
  await t.signIn("test.outreach1@example.com")
  for (const width of [390, 1280]) for (const theme of ["light", "dark"]) {
    const tag = `${theme} @${width}px`
    await t.size(width, 900)
    await t.goto("/requests/new"); await t.theme(theme); await t.reload(); await sleep(1200)
    await t.shot(`form-${theme}-${width}.png`)
    const n = await t.evaluate(`(() => { const a = document.querySelector("aside[aria-label=Privacy]"); if (!a) return null; const form = document.querySelector("main form"); return { text: a.innerText.trim(), lock: !!a.querySelector("svg.lucide-lock"), aboveForm: !!form && !!(a.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING) } })()`)
    check(`${tag}: privacy notice shown, exact text, lock icon, above the form`, !!n && n.text === NEW_REQUEST_COPY.privacy && n.lock && n.aboveForm, n)
    const a = await t.evaluate(TEXT_CONTRAST)
    check(`${tag}: all text readable (${a.checked} elements)`, a.failures.length === 0, a.failures.join(" | "))
    check(`${tag}: no horizontal scroll`, (await t.evaluate("document.documentElement.scrollWidth")) <= width)
  }
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
