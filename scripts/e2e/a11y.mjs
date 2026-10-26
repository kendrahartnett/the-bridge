// Accessibility basics on every page, signed out and as each kind of account, in both themes
// at 390px and 1280px: text contrast (computed from the styles), one h1, header and main
// landmarks, the page language, alt text on images, a name on every button and link, no
// horizontal scroll, and no hero or entrance animation with reduced motion.
//   npm run e2e:a11y

import { launchBrowser } from "./browser.mjs"
import { TEXT_CONTRAST } from "./contrast.mjs"
import { finish, setup } from "./harness.ts"

const suite = await setup("a11y")
const browser = await launchBrowser(suite)
const { check } = suite

const BASICS = `(() => {
  const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden"
  const name = (e) => (e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") && document.getElementById(e.getAttribute("aria-labelledby"))?.textContent || e.textContent || e.querySelector("img[alt]")?.alt || e.title || "").trim()
  const controls = [...document.querySelectorAll("a[href], button")].filter(vis)
  return {
    lang: document.documentElement.lang,
    h1: document.querySelectorAll("h1").length,
    header: !!document.querySelector("header"), main: document.querySelectorAll("main").length,
    imgsWithoutAlt: [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length,
    unnamed: controls.filter((c) => !name(c)).map((c) => c.outerHTML.slice(0, 80)),
    overflow: document.documentElement.scrollWidth > innerWidth,
  }
})()`

const PAGES = [
  ["signed out", null, ["/", "/sign-in", "/sign-in?role=donor", "/no-such-page"]],
  ["outreach", "test.outreach1@example.com", ["/dashboard", "/requests/new"]],
  ["approved organization", "test.donor1@example.com", ["/dashboard", "/board", "/requests/5eed0000-0000-4000-8000-000000000001?from=board", "/requests/5eed0000-0000-4000-8000-000000000004"]],
  ["pending organization", "test.donor3@example.com", ["/dashboard", "/board"]],
  ["admin", "test.admin@example.com", ["/admin", "/admin?tab=approved"]],
]

try {
  for (const [who, email, paths] of PAGES) {
    // Network log errors aren't counted for the signed-out tab: it opens the 404 page on
    // purpose. Script errors and console warnings still are, everywhere.
    const t = await browser.newTab({ log: !!email })
    if (email) await t.signIn(email)
    for (const theme of ["light", "dark"]) {
      await t.goto("/"); await t.theme(theme)
      for (const w of [390, 1280]) {
        await t.size(w)
        for (const path of paths) {
          const tag = `${who} ${path} · ${theme} ${w}px`
          await t.goto(path, 1500)
          const b = await t.evaluate(BASICS)
          // Sign-in has no site header by design (its back link and theme toggle are in main).
          const wantHeader = !path.startsWith("/sign-in")
          check(`${tag}: lang, one h1, ${wantHeader ? "header" : "no site header (by design)"} and one main, alt text, named controls, no overflow`, b.lang === "en" && b.h1 === 1 && b.header === wantHeader && b.main === 1 && b.imgsWithoutAlt === 0 && b.unnamed.length === 0 && !b.overflow, b)
          const c = await t.evaluate(TEXT_CONTRAST)
          check(`${tag}: all text readable (${c.checked} elements)`, c.failures.length === 0, c.failures.slice(0, 4).join(" | "))
        }
      }
    }
  }

  // Reduced motion: on the pages with entrance motion, nothing animates.
  const r = await browser.newTab()
  await r.media("dark", "reduce")
  for (const path of ["/", "/no-such-page"]) {
    await r.goto(path, 800)
    const running = await r.evaluate(`document.getAnimations().filter((a) => a.playState === "running").map((a) => a.animationName ?? a.constructor.name)`)
    check(`Reduced motion on ${path}: no running animations`, running.length === 0, running.join(", "))
  }
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
