// The not-found page, server-rendered: with JavaScript turned off it still shows the 404
// image, the heading and the link home, in the reader's language (English, then with the
// Spanish cookie), with a real 404 status, and no client-side shell. It's identical for a
// page that doesn't exist, /board signed out, /admin for a non-admin, and a need the viewer
// can't see. Layout in both themes at 320, 390 and 1280px, with JavaScript on and off.
//   npm run e2e:not-found

import { createAudit } from "./audit.mjs"
import { launchBrowser, sleep } from "./browser.mjs"
import { finish, setup } from "./harness.ts"
import { copyFor } from "../../src/lib/copy.ts"

const suite = await setup("not-found")
const browser = await launchBrowser(suite)
const { check } = suite
const { audit } = createAudit(suite)

// outreach1's open need, which outreach2 may not see.
const OTHERS_NEED = "/requests/5eed0000-0000-4000-8000-000000000001"

// What the page shows, read without running any of its scripts.
const PAGE = `(() => {
  const main = document.querySelector("main"), h1 = main?.querySelector("h1"), link = main?.querySelector('a[href="/"]'), img = main?.querySelector("img")
  const nav = performance.getEntriesByType("navigation")[0]
  return {
    status: nav?.responseStatus, lang: document.documentElement.lang,
    h1: h1?.textContent, link: link?.textContent, img: img && { alt: img.alt, loaded: img.complete && img.naturalWidth > 0, src: img.currentSrc.includes("not-found") },
    shell: document.documentElement.id === "__next_error__" || [...document.scripts].some(s => s.textContent.includes("__NEXT_CLIENT_RESUME")),
    header: !!document.querySelector("header"), main: main?.outerHTML ?? "",
    overflow: document.documentElement.scrollWidth > innerWidth,
    visible: [h1, link].every(e => e && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().bottom <= innerHeight + 400),
  }
})()`

/** A tab with JavaScript off from the start, in a language, optionally signed in first. */
async function tabFor(lang, email) {
  const t = await browser.newTab({ width: 1280, height: 900 })
  await t.send("Network.setCookie", { name: "lang", value: lang, url: suite.base })
  if (email) await t.signIn(email)
  await t.send("Emulation.setScriptExecutionDisabled", { value: true })
  return t
}

try {
  for (const lang of ["en", "es"]) {
    const c = copyFor(lang).NOT_FOUND_COPY
    const tabs = { anon: await tabFor(lang), outreach: await tabFor(lang, "test.outreach2@example.com"), org: await tabFor(lang, "test.donor1@example.com") }
    const CASES = [
      ["anon", "/no-such-page", "a page that doesn't exist"],
      ["anon", "/board", "/board, signed out"],
      ["org", "/admin", "/admin for a non-admin (organization)"],
      ["outreach", OTHERS_NEED, "a need the viewer can't see (another outreach account's)"],
    ]
    const mains = []
    for (const [who, path, name] of CASES) {
      const t = tabs[who]
      await t.goto(path, 800)
      const p = await t.evaluate(PAGE)
      mains.push(p.main)
      check(`${lang.toUpperCase()} · JS off · ${name}: HTTP 404, <html lang="${lang}">, the 404 image, "${c.title}" and "${c.home}" (to /), no client shell`,
        p.status === 404 && p.lang === lang && p.h1 === c.title && p.link === c.home && p.img?.alt === c.imageAlt && p.img.loaded && p.img.src && !p.shell && p.header,
        { ...p, main: undefined })
    }
    check(`${lang.toUpperCase()} · JS off · the page is identical in all four cases`, mains.every((m) => m === mains[0]) && mains[0].length > 0)
  }

  // Both themes at 320, 390 and 1280px, with JavaScript on and off. Without JavaScript the
  // theme script doesn't run, so the page shows the stylesheet's default (light) colors.
  for (const js of [true, false]) {
    for (const lang of ["en", "es"]) {
      const t = await browser.newTab({ width: 1280, height: 900 })
      await t.send("Network.setCookie", { name: "lang", value: lang, url: suite.base })
      for (const theme of ["light", "dark"]) {
        await t.send("Emulation.setScriptExecutionDisabled", { value: false })
        await t.goto("/"); await t.theme(theme)
        await t.media(theme)
        if (!js) await t.send("Emulation.setScriptExecutionDisabled", { value: true })
        for (const w of [320, 390, 1280]) {
          await t.size(w, w < 640 ? 700 : 800)
          await t.goto("/no-such-page", 900)
          const tag = `${lang.toUpperCase()} · JS ${js ? "on" : "off"} · ${theme} ${w}px`
          const p = await t.evaluate(PAGE)
          const dark = await t.evaluate(`document.documentElement.classList.contains("dark")`)
          check(`${tag}: 404, heading and link on screen, no overflow${js ? `, ${theme} theme` : " (stylesheet's default colors)"}`,
            p.status === 404 && p.h1 === copyFor(lang).NOT_FOUND_COPY.title && p.visible && !p.overflow && (js ? dark === (theme === "dark") : !dark),
            { status: p.status, h1: p.h1, overflow: p.overflow, dark })
          await audit(t, `not-found · ${lang.toUpperCase()} · JS ${js ? "on" : "off"}`, w, theme)
          if (lang === "es" || w === 390) await t.shot(`not-found-${lang}-${js ? "js" : "nojs"}-${theme}-${w}.png`)
          await sleep(100)
        }
      }
    }
  }
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
