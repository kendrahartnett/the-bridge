// Contact handoff: who can see which email, before and after an organization offers
// support, at 320px and 1280px in both themes. Also checks the raw page HTML (which carries
// the server payload), so an email sent to the page but not shown still fails.
//   npm run e2e:contact

import { launchBrowser, sleep } from "./browser.mjs"
import { finish, setup } from "./harness.ts"

const suite = await setup("contact")
const browser = await launchBrowser(suite)
const { check } = suite

const EMAIL = { o1: "test.outreach1@example.com", o2: "test.outreach2@example.com", d1: "test.donor1@example.com", d2: "test.donor2@example.com" }
const ALL = Object.values(EMAIL)

async function signedInTab(email) {
  const t = await browser.newTab({ width: 1280, height: 900 })
  await t.signIn(email)
  const view = async (w, theme) => {
    await t.size(w)
    await t.theme(theme)
    await t.goto("/dashboard", 1200)
    await t.waitFor(`document.body.innerText.includes("Hi,")`, "dashboard")
  }
  return { ...t, email, view }
}


// Everything the page knows: the rendered cards, and the raw HTML (which also carries the
// React Server Components payload, so data passed to the page but not shown still counts).
const SNAPSHOT = `(() => {
  const cards = [...document.querySelectorAll("[data-slot=card]")].map(c => ({
    title: c.querySelector("[data-slot=card-title]")?.textContent.trim(),
    section: (() => { let n = c.closest("ul"); while (n && n.tagName !== "H2" && !n.querySelector?.("h2")) n = n.previousElementSibling; return (n?.tagName === "H2" ? n : n?.querySelector("h2"))?.textContent.trim() ?? null })(),
    mailto: [...c.querySelectorAll('a[href^="mailto:"]')].map(a => a.getAttribute("href").slice(7)),
    contact: c.querySelector("[data-contact]")?.innerText ?? null,
  }))
  const html = document.documentElement.outerHTML
  const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth
  const links = [...document.querySelectorAll('a[href^="mailto:"]')].map(a => { const r = a.getBoundingClientRect(), c = a.closest("[data-slot=card]").getBoundingClientRect(); return { inside: r.left >= c.left - 1 && r.right <= c.right + 1, h: Math.round(r.height) } })
  return { cards, html, overflow, links }
})()`

const NOTE = "Use this to arrange the handoff. Don't share names or details of the people being served."
const NAMES = { [EMAIL.o1]: ["Posted by", "Test — Northwest Side Outreach"], [EMAIL.o2]: ["Posted by", "Test — West Side Street Team"], [EMAIL.d1]: ["Supported by", "Test — Corner Bakery Co-op"], [EMAIL.d2]: ["Supported by", "Test — Pilsen Community Kitchen"] }

// expected: { "card title": email } — every other card must show no email.
async function verify(tab, label, expected) {
  const s = await tab.evaluate(SNAPSHOT)
  const problems = []
  for (const c of s.cards) {
    const want = expected[c.title]
    if (want) {
      if (c.mailto.length !== 1 || c.mailto[0] !== want) problems.push(`${c.title}: expected ${want}, got ${c.mailto.join(",") || "none"}`)
      const [lbl, name] = NAMES[want]
      if (!c.contact?.includes(`${lbl} ${name}`) || !c.contact.includes(NOTE)) problems.push(`${c.title}: contact text wrong: ${JSON.stringify(c.contact)}`)
    } else if (c.mailto.length) problems.push(`${c.title} (${c.section}): unexpected ${c.mailto.join(",")}`)
  }
  for (const t of Object.keys(expected)) if (!s.cards.some((c) => c.title === t)) problems.push(`missing card ${t}`)
  const others = ALL.filter((e) => e !== tab.email)
  const inHtml = others.filter((e) => s.html.includes(e)).sort()
  const want = [...new Set(Object.values(expected))].sort()
  if (JSON.stringify(inHtml) !== JSON.stringify(want)) problems.push(`emails in page HTML: [${inHtml}] expected [${want}]`)
  if (s.overflow) problems.push("horizontal scroll")
  if (s.links.some((l) => !l.inside || l.h < 44)) problems.push(`email link fit/size: ${JSON.stringify(s.links)}`)
  check(label, problems.length === 0, problems.join(" | ") || `emails shown: ${want.length ? want.join(", ") : "none"}`)
  return s
}

const R1 = "Hot meals for 25 people", R4 = "Hot meals for 60 people", R5 = "Breakfast burritos for 30 people"
const VIEWS = [[320, "light"], [320, "dark"], [1280, "light"], [1280, "dark"]]

try {
  const d1 = await signedInTab(EMAIL.d1), d2 = await signedInTab(EMAIL.d2)
  const o1 = await signedInTab(EMAIL.o1), o2 = await signedInTab(EMAIL.o2)

  // Before the offer.
  await d1.view(1280, "light")
  const before = await verify(d1, "Before offer — donor1: open request shows no poster email; only the request donor1 already supports does", { [R4]: EMAIL.o2 })
  check("Before offer — the open request is listed under Open requests", before.cards.some((c) => c.title === R1 && c.section === "Open requests"))
  await verify(d2, "Before offer — donor2: no email on any open request", { [R5]: EMAIL.o1 }).catch(() => {})

  // donor1 offers support on outreach1's open "Hot meals for 25 people".
  const card = `[...document.querySelectorAll("[data-slot=card]")].find(c => c.querySelector("[data-slot=card-title]")?.textContent.trim() === ${JSON.stringify(R1)})`
  await d1.evaluate(`[...(${card}).querySelectorAll("button")].find(b => b.textContent.trim() === "Offer support").click(), true`); await sleep(300)
  const q = await d1.evaluate(`(${card}).innerText`)
  check("Offer confirmation uses the new wording", q.includes("Offer support for this request? You'll see the poster's contact email so you can arrange the handoff."), q.split("\n").find((l) => l.startsWith("Offer support for")))
  await d1.evaluate(`[...(${card}).querySelectorAll("button")].find(b => b.textContent.trim() === "Yes, offer support").click(), true`)
  await d1.waitFor(`(() => { const c = ${card}; return !!(c && c.querySelector('a[href^="mailto:"]')) })()`, "poster email after offer").catch(async (e) => {
    await d1.shot("debug-after-offer.png", { full: true })
    console.log("DEBUG card:", JSON.stringify(await d1.evaluate(`(${card})?.innerText`)))
    throw e
  })
  check("donor1: poster's email appears right after offering", true)

  const expected = {
    d1: { [R1]: EMAIL.o1, [R4]: EMAIL.o2 },
    d2: { [R5]: EMAIL.o1 },
    o1: { [R1]: EMAIL.d1, [R5]: EMAIL.d2 },
    o2: { [R4]: EMAIL.d1 },
  }
  for (const [w, theme] of VIEWS) {
    for (const [key, tab] of Object.entries({ d1, d2, o1, o2 })) {
      await tab.view(w, theme)
      const s = await verify(tab, `${w}px ${theme} — ${tab.email}`, expected[key])
      if (key === "d2") check(`${w}px ${theme} — donor2 does not see the newly supported request at all`, !s.cards.some((c) => c.title === R1))
      if (key === "o2") check(`${w}px ${theme} — outreach2's page never contains outreach1's email`, !s.html.includes(EMAIL.o1))
      await tab.shot(`${key}-${w}-${theme}.png`, { full: true })
    }
  }

  // Contrast of the note and link on the card surface (opaque), both themes.
  for (const theme of ["light", "dark"]) {
    await o1.view(1280, theme)
    const c = await o1.evaluate(`(() => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 1; const ctx = cv.getContext("2d", { willReadFrequently: true })
      const rgb = (c) => { ctx.clearRect(0,0,1,1); ctx.fillStyle = c; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data].slice(0,3) }
      const lum = (c) => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }); return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2] }
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
      const block = document.querySelector("[data-contact]"), card = block.closest("[data-slot=card]")
      const bg = rgb(getComputedStyle(card).backgroundColor)
      return [block.querySelector("a"), block.querySelector("p.text-sm")].map(e => +ratio(rgb(getComputedStyle(e).color), bg).toFixed(2))
    })()`)
    check(`${theme}: email link and note contrast on the card`, c.every((x) => x >= 4.5), `link ${c[0]}:1, note ${c[1]}:1`)
  }
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
